# core/graphs/generation_graph.py
from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, END
from core.models.pydantic_models import TaskRequest
from .nodes.generation import generate_content_node
from .nodes.file_creation import create_files_node

class GraphState(TypedDict):
    """Represents the state of our graph."""
    request: TaskRequest
    llm_output: str
    task_name: str
    files: List[Dict[str, str]]
    error: str

def create_workflow():
    """Creates and compiles the LangGraph workflow."""
    workflow = StateGraph(GraphState)
    workflow.add_node("generator", generate_content_node)
    workflow.add_node("file_creator", create_files_node)

    workflow.set_entry_point("generator")
    workflow.add_edge("generator", "file_creator")
    workflow.add_edge("file_creator", END)
    
    return workflow.compile()