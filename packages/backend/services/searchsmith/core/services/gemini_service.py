# core/services/gemini_service.py
import logging
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from ..config import settings
from functools import lru_cache

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        try:
            logger.info("Initializing Gemini service...")
            
            # --- Embedding Model (เหมือนเดิม) ---
            self.embedding_model = GoogleGenerativeAIEmbeddings(
                model=settings.EMBEDDING_MODEL_NAME,
                google_api_key=settings.GOOGLE_API_KEY
            )
            
            # --- LLM สำหรับ Tagger และ Expander ---
            llm = ChatGoogleGenerativeAI(
                model=settings.TAGGER_MODEL_NAME,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.0 # ตั้งค่าให้คำตอบคงที่
            )

            # --- สร้าง Chain สำหรับ Tagger (เหมือนเดิม) ---
            tagger_prompt = self._load_prompt_template(settings.PROMPT_FILE_PATH)
            self.tag_generation_chain = tagger_prompt | llm | StrOutputParser()

            # --- 🆕 สร้าง Chain ใหม่สำหรับ Query Expansion ---
            expander_prompt = self._load_prompt_template(settings.QUERY_EXPANSION_PROMPT_PATH)
            self.query_expansion_chain = expander_prompt | llm | StrOutputParser()
            
            logger.info("Gemini service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini service: {str(e)}")
            raise RuntimeError(f"Failed to initialize Gemini service: {str(e)}")

    def _load_prompt_template(self, file_path) -> ChatPromptTemplate:
        try:
            logger.info(f"Loading prompt template from: {file_path}")
            with open(file_path, "r", encoding="utf-8") as f:
                template_string = f.read()
            logger.info("Prompt template loaded successfully")
            return ChatPromptTemplate.from_template(template_string)
        except FileNotFoundError:
            logger.error(f"Prompt file not found at {file_path}")
            raise RuntimeError(f"Prompt file not found at {file_path}")
        except Exception as e:
            logger.error(f"Failed to load prompt template: {str(e)}")
            raise RuntimeError(f"Failed to load prompt template: {str(e)}")

    def generate_tags(self, markdown: str, code: str) -> str:
        try:
            logger.info("Generating tags with Gemini...")
            result = self.tag_generation_chain.invoke({
                "problem_markdown": markdown,
                "solution_code": code
            })
            logger.info(f"Tags generated successfully: {result}")
            return result
        except Exception as e:
            logger.error(f"Failed to generate tags: {str(e)}")
            raise RuntimeError(f"Failed to generate tags: {str(e)}")

    def get_embedding(self, text: str) -> list[float]:
        try:
            logger.info(f"Generating embedding for text: '{text[:50]}...'")
            embedding = self.embedding_model.embed_query(text)
            logger.info(f"Embedding generated successfully. Length: {len(embedding)}")
            return embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            raise RuntimeError(f"Failed to generate embedding: {str(e)}")

    # 🆕 เพิ่มฟังก์ชันใหม่
    @lru_cache(maxsize=128)
    def expand_query(self, query: str) -> str:
        """
        เรียกใช้ LLM เพื่อขยายความ query
        """
        try:
            logger.info(f"Expanding query: '{query}'")
            expanded_terms = self.query_expansion_chain.invoke({"query": query})
            logger.info(f"Query expanded successfully: '{expanded_terms}'")
            return expanded_terms
        except Exception as e:
            logger.error(f"Failed to expand query: {str(e)}")
            raise RuntimeError(f"Failed to expand query: {str(e)}")