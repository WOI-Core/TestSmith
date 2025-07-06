# core/graphs/nodes/upsert_data.py
from core.services.supabase_service import SupabaseService
from ..models import GraphState

supabase_service = SupabaseService()

def upsert_to_supabase(state: GraphState):
    print("--- Upserting Data to Supabase ---")
    try:
        supabase_service.upsert_problem(
            problem_id=state["problem_id"],
            markdown_content=state["markdown_content"],
            solution_code=state["solution_code"],
            tags=state["tags"],
            embedding=state["embedding"]
        )
        print("--- Upsert Successful ---")
        return {"error": None}
    except Exception as e:
        return {"error": f"Failed to upsert to Supabase: {e}"}