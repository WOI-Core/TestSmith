# core/graph_manager.py
from langgraph.graph import StateGraph, END  # ◀️ เพิ่ม import บรรทัดนี้
from .graphs.models import GraphState
from .graphs.nodes.generate_id import generate_problem_id
from .graphs.nodes.generate_tags import generate_tags
from .graphs.nodes.generate_embedding import generate_embedding
from .graphs.nodes.upsert_data import upsert_to_supabase

class GraphManager:
    def __init__(self):
        # ตอนนี้ Python จะรู้จัก StateGraph แล้ว
        self.workflow = StateGraph(GraphState)
        
        self.workflow.add_node("generate_problem_id", generate_problem_id)
        self.workflow.add_node("generate_tags", generate_tags)
        self.workflow.add_node("generate_embedding", generate_embedding)
        self.workflow.add_node("upsert_to_supabase", upsert_to_supabase)

        self.workflow.set_entry_point("generate_problem_id")
        self.workflow.add_edge("generate_problem_id", "generate_tags")
        self.workflow.add_edge("generate_tags", "generate_embedding")
        self.workflow.add_edge("generate_embedding", "upsert_to_supabase")
        self.workflow.add_edge("upsert_to_supabase", END)

        self.app = self.workflow.compile()

    def invoke_update_graph(self, input_data: dict):
        return self.app.invoke(input_data, {"recursion_limit": 5})