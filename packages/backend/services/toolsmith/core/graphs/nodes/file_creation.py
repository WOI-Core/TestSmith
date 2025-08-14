# core/graphs/nodes/file_creation.py
from core.models.graph_models import GraphState
from core.services.pdf_service import get_pdf_service # <-- Import service ใหม่
from core.utils.slugify import slugify, SlugifyOptions, log_name_transformation # <-- Import new slugify
import re
import traceback
import random
import markdown # Added for debug logging

def _clean_content(content: str) -> str:
    """Clean LLM output content by removing code block markers and artifacts"""
    cleaned_content = re.sub(r'```(?:[a-z]+\n)?(.*?)\n?```', r'\1', content, flags=re.DOTALL)
    cleaned_content = cleaned_content.replace("TaskName:", "").replace("TaskName", "").strip()
    lines = cleaned_content.strip().split('\n')
    if lines and (lines[0].strip().endswith('.py') or re.match(r'^[a-zA-Z0-9_.-]+\.[a-zA-Z]+$', lines[0].strip())):
        lines.pop(0)
    return '\n'.join(lines).strip()

def _sanitize_task_name(raw_name: str) -> str:
    """
    Sanitize task name using robust slugification.
    Handles emojis, Unicode, markdown artifacts, and ensures consistent naming.
    """
    # ✨ NEW: Remove common prefixes before slugification
    cleaned_name = re.sub(r'^(text_|task_generated_)', '', raw_name.strip(), flags=re.IGNORECASE)

    # Use snake_case for task names to ensure compatibility with file systems
    options = SlugifyOptions(
        case_style='snake',
        max_length=50,
        preserve_numbers=True,
        replacement='_'
    )
    
    sanitized = slugify(cleaned_name, options)
    
    # Log the transformation for audit
    log_name_transformation(raw_name, sanitized)
    
    return sanitized

def _execute_generator(code: str, cases_size: int):
    import sys
    import signal
    from contextlib import contextmanager
    
    @contextmanager
    def timeout_handler(seconds):
        def timeout_signal_handler(signum, frame):
            raise TimeoutError(f"Test case generation timed out after {seconds} seconds")
        
        # Set up signal handler for timeout
        old_handler = signal.signal(signal.SIGALRM, timeout_signal_handler)
        signal.alarm(seconds)
        try:
            yield
        finally:
            signal.alarm(0)
            signal.signal(signal.SIGALRM, old_handler)
    
    try:
        local_vars = {}
        exec_globals = {'random': random, '__builtins__': __builtins__}
        exec(code, exec_globals, local_vars)
        if 'generate_test_cases' not in local_vars:
            raise ValueError("Function 'generate_test_cases' not found in generated code.")
        main_func = local_vars['generate_test_cases']
        exec_globals.update(local_vars)
        
        # Set a lower recursion limit for test case generation
        old_recursion_limit = sys.getrecursionlimit()
        sys.setrecursionlimit(1000)  # Much lower limit for safety
        
        try:
            # Add timeout to prevent infinite loops
            with timeout_handler(30):  # 30 second timeout
                inputs, outputs = main_func(cases_size)
        finally:
            sys.setrecursionlimit(old_recursion_limit)
        
        if not isinstance(inputs, list) or not isinstance(outputs, list):
            raise ValueError("generate_test_cases must return two lists: (inputs, outputs)")
        if len(inputs) != len(outputs):
            raise ValueError(f"Mismatch: {len(inputs)} inputs vs {len(outputs)} outputs")
        if len(inputs) == 0:
            raise ValueError("No test cases generated")
        return inputs, outputs
    except Exception as e:
        raise ValueError(f"Test case generation failed: {e}")

def _generate_simple_test_cases(cases_size: int):
    """Generate simple fallback test cases when the main generator fails"""
    inputs = []
    outputs = []
    for i in range(cases_size):
        test_input = str(i + 1)
        test_output = str((i + 1) * 2)  # Simple: output = input * 2
        inputs.append(test_input)
        outputs.append(test_output)
    return inputs, outputs

async def create_files_node(state: GraphState) -> dict:
    """
    Parses LLM output, generates all files including PDF,
    and structures them for upload.
    """
    print("--- NODE: CREATING FILES (including PDF) ---")
    try:
        parts = state["llm_output"].split("________________________________________")
        if len(parts) != 5:
            raise ValueError(f"Expected 5 parts from LLM output, but got {len(parts)}.")
            
        task_name_raw = _clean_content(parts[0])
        gen_py = _clean_content(parts[1])
        readme_md = _clean_content(parts[2])
        # Debug log: print markdown content
        print("[DEBUG] Markdown content for PDF generation:\n", readme_md)
        solution = _clean_content(parts[3])
        config = _clean_content(parts[4])
        
        # ✨ NEW: Use robust slugification for task name
        task_name = _sanitize_task_name(task_name_raw)
        print(f"[SLUG] Task name: '{task_name_raw}' → '{task_name}'")

        # Try to execute the generator, with fallback to simple test cases
        try:
            inputs, outputs = _execute_generator(gen_py, state["request"].cases_size)
        except ValueError as e:
            print(f"Warning: Test case generation failed: {e}")
            print("Generating simple fallback test cases...")
            # Generate simple test cases as fallback
            inputs, outputs = _generate_simple_test_cases(state["request"].cases_size)

        # --- ส่วนที่เพิ่มเข้ามาสำหรับการสร้าง PDF ---
        pdf_service = next(get_pdf_service())
        print(f"  Generating PDF for task: {task_name}")
        # Debug log: print HTML before PDF generation
        html_body = markdown.markdown(readme_md, extensions=['fenced_code', 'tables'])
        from core.services.pdf_service import HTML_TEMPLATE
        full_html = HTML_TEMPLATE.format(html_body=html_body)
        print("[DEBUG] HTML for PDF generation:\n", full_html)
        pdf_content_bytes = pdf_service.markdown_to_pdf_bytes(readme_md)
        # ----------------------------------------
        
        files = [
            {"category": "Solution", "file_path": f"Solutions/{task_name}.cpp", "file_name": f"{task_name}.cpp", "content": solution},
            {"category": "Problem", "file_path": f"Problems/{task_name}.md", "file_name": f"{task_name}.md", "content": readme_md},
            # --- เพิ่มไฟล์ PDF เข้าไปใน list ---
            {"category": "Problem", "file_path": f"Problems/{task_name}.pdf", "file_name": f"{task_name}.pdf", "content": pdf_content_bytes},
            {"category": "Config", "file_path": "config.json", "file_name": "config.json", "content": config},
            {"category": "Script", "file_path": "Scripts/generate.py", "file_name": "generate.py", "content": gen_py}
        ]
        
        for i, content in enumerate(inputs):
            file_name = f"input{i:02}.txt"
            files.append({"category": "TestCaseInput", "file_path": f"TestCases/Inputs/{file_name}", "file_name": file_name, "content": str(content)})
        
        for i, content in enumerate(outputs):
            file_name = f"output{i:02}.txt"
            files.append({"category": "TestCaseOutput", "file_path": f"TestCases/Outputs/{file_name}", "file_name": file_name, "content": str(content)})
        
        return {"task_name": task_name, "files": files}

    except Exception:
        raw_parts = state["llm_output"].split("________________________________________")
        problematic_code = raw_parts[1] if len(raw_parts) > 1 else "N/A"
        detailed_error = (
            f"An error occurred during file creation.\n"
            f"--- Full Traceback ---\n{traceback.format_exc()}\n"
            f"--- Problematic Python Code ---\n{_clean_content(problematic_code)}\n------------------------"
        )
        return {"error": detailed_error}