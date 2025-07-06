# core/graphs/nodes/file_creation.py
from core.models.graph_models import GraphState
import re
import traceback
import random

def _clean_content(content: str) -> str:
    """
    Cleans generated content by removing markdown fences and prepended filenames.
    """
    cleaned_content = re.sub(r'```(?:[a-z]+\n)?(.*?)\n?```', r'\1', content, flags=re.DOTALL)
    
    lines = cleaned_content.strip().split('\n')
    if lines and re.match(r'^[a-zA-Z0-9_.-]+\.[a-zA-Z]+$', lines[0].strip()):
        lines.pop(0)
        
    return '\n'.join(lines).strip()

def _execute_generator(code: str, cases_size: int):
    """
    Safely executes the test case generator code with a prepared global scope.
    """
    local_vars = {}
    exec_globals = {
        'random': random,
        '__builtins__': __builtins__
    }
    exec(code, exec_globals, local_vars)

    if 'generate_test_cases' not in local_vars:
        raise ValueError("Function 'generate_test_cases' not found in generated code.")
        
    return local_vars['generate_test_cases'](cases_size)


async def create_files_node(state: GraphState) -> dict:
    """Parses LLM output, generates test cases, and structures files."""
    print("--- NODE: CREATING FILES ---")
    try:
        parts = state["llm_output"].split("________________________________________")
        if len(parts) != 5:
            raise ValueError(f"Expected 5 parts from LLM output, but got {len(parts)}.")
            
        task_name_raw = _clean_content(parts[0])
        gen_py = _clean_content(parts[1])
        readme = _clean_content(parts[2])
        solution = _clean_content(parts[3])
        config = _clean_content(parts[4])
        
        # --- เพิ่มการทำความสะอาดชื่อ Task โดยเฉพาะ ---
        # ถ้ามี ":" อยู่ ให้เอาเฉพาะส่วนสุดท้ายมาใช้ (เช่น "TaskName: Abc" -> "Abc")
        if ':' in task_name_raw:
            task_name = task_name_raw.split(':')[-1].strip()
        else:
            task_name = task_name_raw
        # --------------------------------------------

        inputs, outputs = _execute_generator(gen_py, state["request"].cases_size)
        
        files = [{"filename": f"{task_name}.cpp", "content": solution},
                 {"filename": "README.md", "content": readme},
                 {"filename": "config.json", "content": config}]
        files.extend([{"filename": f"input/input{i:02}.txt", "content": str(c)} for i, c in enumerate(inputs)])
        files.extend([{"filename": f"output/output{i:02}.txt", "content": str(c)} for i, c in enumerate(outputs)])
        
        return {"task_name": task_name, "files": files}
    except Exception:
        raw_parts = state["llm_output"].split("________________________________________")
        problematic_code = raw_parts[1] if len(raw_parts) > 1 else "N/A"
        detailed_error = (
            f"An error occurred during file creation.\n"
            f"--- Full Traceback ---\n"
            f"{traceback.format_exc()}\n"
            f"--- Problematic Python Code ---\n"
            f"{_clean_content(problematic_code)}\n"
            f"------------------------"
        )
        return {"error": detailed_error}