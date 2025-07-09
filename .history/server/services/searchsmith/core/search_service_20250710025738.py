# core/search_service.py
from .services.gemini_service import GeminiService
from .services.supabase_service import SupabaseService

class SearchService:
    def __init__(self):
        self.gemini_service = GeminiService()
        self.supabase_service = SupabaseService()

    def hybrid_search(self, query: str, top_k: int = 10):
        """
        ทำการ Hybrid-Semantic Search โดยมีการทำ Query Expansion
        """
        # 1. 🆕 ขยายความ Query เดิมด้วย AI
        expanded_terms_str = self.gemini_service.expand_query(query)
        
        # 2. 🆕 สร้าง Full Query ใหม่เพื่อใช้ค้นหา
        #    รวมคำค้นหาเดิมกับคำที่ขยายความ เพื่อให้ครอบคลุมยิ่งขึ้น
        full_query = f"{query} {expanded_terms_str.replace(',', ' ')}"
        print(f"--- Using full query for search: '{full_query}' ---")

        # 3. สร้าง embedding จาก Full Query ใหม่
        query_embedding = self.gemini_service.get_embedding(full_query)
        
        # 4. เรียกใช้ฟังก์ชันบน Supabase ด้วย Full Query ใหม่
        results = self.supabase_service.hybrid_search(
            query_text=full_query, # ใช้ query ที่ขยายแล้ว
            query_embedding=query_embedding,
            top_k=top_k
        )

        problem_names = [item['problem_name'] for item in results]
        return problem_names