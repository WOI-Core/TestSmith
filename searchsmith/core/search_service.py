# core/search_service.py
from .services.gemini_service import GeminiService
from .services.supabase_service import SupabaseService

class SearchService:
    def __init__(self):
        self.gemini_service = GeminiService()
        self.supabase_service = SupabaseService()

    def hybrid_search(self, query: str, top_k: int = 5):
        query_embedding = self.gemini_service.get_embedding(query)
        results = self.supabase_service.hybrid_search(
            query_text=query,
            query_embedding=query_embedding,
            top_k=top_k
        )
        problem_names = [item['problem_id'] for item in results]
        return problem_names