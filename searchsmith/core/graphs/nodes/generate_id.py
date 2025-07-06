# core/graphs/nodes/generate_id.py
import hashlib
from ..models import GraphState

def generate_problem_id(state: GraphState):
    content_str = state["markdown_content"] + state["solution_code"]
    problem_id = hashlib.sha256(content_str.encode()).hexdigest()
    print(f"--- Generated Problem ID: {problem_id[:10]}... ---")
    return {"problem_id": problem_id}