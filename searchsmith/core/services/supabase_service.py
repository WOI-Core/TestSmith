# core/services/supabase_service.py
from supabase import create_client, Client
from ..config import settings

class SupabaseService:
    def __init__(self):
        self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        self.table_name = settings.VECTOR_TABLE_NAME
        self.search_function = settings.HYBRID_SEARCH_FUNCTION

    def upsert_problem(
        self,
        problem_id: str,
        problem_name: str,
        markdown_content: str,
        solution_code: str,
        tags: list[str],
        embedding: list[float]
    ):
        """
        เพิ่มหรืออัปเดตข้อมูลโจทย์ในตาราง Supabase
        """
        # --- บล็อกนี้ได้รับการแก้ไขเรื่องย่อหน้า ---
        data = {
            "problem_id": problem_id,
            "problem_name": problem_name,
            "markdown_content": markdown_content,
            "solution_code": solution_code,
            "tags": tags,
            "embedding": embedding
        }
        
        response = self.client.table(self.table_name).upsert(data, on_conflict="problem_id").execute()
        return response.data

    def hybrid_search(self, query_text: str, query_embedding: list[float], top_k: int = 5):
        """
        เรียกใช้ Remote Procedure Call (RPC) บน Supabase เพื่อทำ Hybrid Search
        """
        # --- บล็อกนี้ได้รับการแก้ไขเรื่องย่อหน้า ---
        params = {
            'query_text': query_text,
            'query_embedding': query_embedding,
            'match_count': top_k
        }
        
        response = self.client.rpc(self.search_function, params).execute()
        return response.data