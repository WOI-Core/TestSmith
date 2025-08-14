# core/services/supabase_service.py
import logging
from supabase import create_client, Client
from ..config import settings

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        try:
            logger.info("Initializing Supabase client...")
            self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            self.table_name = settings.VECTOR_TABLE_NAME
            self.search_function = settings.HYBRID_SEARCH_FUNCTION
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {str(e)}")
            raise RuntimeError(f"Failed to initialize Supabase client: {str(e)}")

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
        try:
            logger.info(f"Upserting problem: {problem_id}")
            
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
            logger.info(f"Successfully upserted problem: {problem_id}")
            return response.data
        except Exception as e:
            logger.error(f"Failed to upsert problem {problem_id}: {str(e)}")
            raise RuntimeError(f"Failed to upsert problem: {str(e)}")

    def hybrid_search(self, query_text: str, query_embedding: list[float], top_k: int = 5):
        """
        เรียกใช้ Remote Procedure Call (RPC) บน Supabase เพื่อทำ Hybrid Search
        """
        try:
            logger.info(f"Performing hybrid search with query: '{query_text[:50]}...'")
            logger.info(f"Search parameters: top_k={top_k}, embedding_length={len(query_embedding)}")
            
            # --- บล็อกนี้ได้รับการแก้ไขเรื่องย่อหน้า ---
            params = {
                'query_text': query_text,
                'query_embedding': query_embedding,
                'match_count': top_k
            }
            
            logger.info(f"Calling RPC function: {self.search_function}")
            response = self.client.rpc(self.search_function, params).execute()
            
            if not response.data:
                logger.warning("No search results returned from Supabase")
                return []
            
            logger.info(f"Search completed successfully. Found {len(response.data)} results")
            return response.data
        except Exception as e:
            logger.error(f"Hybrid search failed: {str(e)}")
            raise RuntimeError(f"Failed to perform hybrid search: {str(e)}")