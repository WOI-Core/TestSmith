# core/services/supabase_service.py
from supabase import create_client, Client
from ..config import settings

class SupabaseService:
    def __init__(self):
        self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        self.table_name = settings.VECTOR_TABLE_NAME
        self.search_function = settings.HYBRID_SEARCH_FUNCTION

    def upsert_problem(self, problem_id: str, markdown_content: str, solution_code: str, tags: list[str], embedding: list[float]):
        data = {
            "problem_id": problem_id,
            "markdown_content": markdown_content,
            "solution_code": solution_code,
            "tags": tags,
            "embedding": embedding
        }
        response = self.client.table(self.table_name).upsert(data, on_conflict="problem_id").execute()
        if response.error:
             raise Exception(f"Supabase upsert failed: {response.error.message}")
        return response.data

    def hybrid_search(self, query_text: str, query_embedding: list[float], top_k: int = 5):
        params = {
            'query_text': query_text,
            'query_embedding': query_embedding,
            'match_count': top_k
        }
        response = self.client.rpc(self.search_function, params).execute()
        if response.error:
            raise Exception(f"Supabase RPC failed: {response.error.message}")

        return response.data