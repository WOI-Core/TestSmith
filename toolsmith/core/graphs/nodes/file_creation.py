# core/graphs/nodes/file_creation.py
from ..generation_graph import GraphState

def _execute_generator(code: str, cases_size: int):
    """Safely executes the test case generator code."""
    local_vars = {}
    exec(f"import random\n{code}", {}, local_vars)
    return local_vars['generate_test_cases'](cases_size)

async def create_files_node(state: GraphState) -> dict:
    """Parses LLM output, generates test cases, and structures files."""
    print("--- NODE: CREATING FILES ---")
    try:
        parts = state["llm_output"].split("________________________________________")
        task_name, gen_py, readme, solution, config = [p.strip() for p in parts]
        
        inputs, outputs = _execute_generator(gen_py, state["request"].cases_size)
        
        files = [{"filename": f"{task_name}.cpp", "content": solution},
                 {"filename": "README.md", "content": readme},
                 {"filename": "config.json", "content": config}]
        files.extend([{"filename": f"input/input{i:02}.txt", "content": str(c)} for i, c in enumerate(inputs)])
        files.extend([{"filename": f"output/output{i:02}.txt", "content": str(c)} for i, c in enumerate(outputs)])
        
        return {"task_name": task_name, "files": files}
    except Exception as e:
        return {"error": f"File creation failed: {e}"}