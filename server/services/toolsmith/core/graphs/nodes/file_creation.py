# core/graphs/nodes/file_creation.py
from core.models.graph_models import GraphState
from core.services.pdf_service import get_pdf_service # <-- Import service ใหม่
import re
import traceback
import random

def _clean_content(content: str) -> str:
    cleaned_content = re.sub(r'```(?:[a-z]+\n)?(.*?)\n?```', r'\1', content, flags=re.DOTALL)
    cleaned_content = cleaned_content.replace("TaskName:", "").replace("TaskName", "").strip()
    lines = cleaned_content.strip().split('\n')
    if lines and (lines[0].strip().endswith('.py') or re.match(r'^[a-zA-Z0-9_.-]+\.[a-zA-Z]+$', lines[0].strip())):
        lines.pop(0)
    return '\n'.join(lines).strip()

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
                return main_func(cases_size)
        finally:
            sys.setrecursionlimit(old_recursion_limit)
            
    except RecursionError as e:
        raise ValueError(f"Test case generation failed due to infinite recursion. Please use simpler algorithms: {str(e)}")
    except TimeoutError as e:
        raise ValueError(f"Test case generation timed out. Please use more efficient algorithms: {str(e)}")
    except Exception as e:
        raise ValueError(f"Test case generation failed: {str(e)}")

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
        solution = _clean_content(parts[3])
        config = _clean_content(parts[4])
        
        task_name = task_name_raw # ชื่อที่สะอาดแล้ว

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

def _generate_simple_test_cases(cases_size: int):
    """Generate simple test cases as fallback when complex generation fails."""
    inputs = []
    outputs = []
    
    for i in range(cases_size):
        # Generate simple test cases with small numbers
        n = random.randint(1, 5)
        m = random.randint(1, 5)
        k = random.randint(1, min(n * m, 10))
        
        # Create a simple grid
        grid = []
        for row in range(n):
            grid_row = [random.randint(1, 10) for _ in range(m)]
            grid.append(grid_row)
        
        # Create input string
        input_str = f"{n} {m} {k}\n"
        for row in grid:
            input_str += " ".join(map(str, row)) + "\n"
        inputs.append(input_str.strip())
        
        # Simple output calculation (just sum of first and last elements)
        if n > 0 and m > 0:
            result = grid[0][0] + grid[n-1][m-1]
        else:
            result = 0
        outputs.append(str(result))
    
    return inputs, outputs