# core/services/gemini_service.py
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from ..config import settings

class GeminiService:
    def __init__(self):
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

    def _load_prompt_template(self, file_path) -> ChatPromptTemplate:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                template_string = f.read()
            return ChatPromptTemplate.from_template(template_string)
        except FileNotFoundError:
            raise RuntimeError(f"Prompt file not found at {file_path}")

    def generate_tags(self, markdown: str, code: str) -> str:
        return self.tag_generation_chain.invoke({
            "problem_markdown": markdown,
            "solution_code": code
        })

    def get_embedding(self, text: str) -> list[float]:
        return self.embedding_model.embed_query(text)

    # 🆕 เพิ่มฟังก์ชันใหม่
    def expand_query(self, query: str) -> str:
        """
        เรียกใช้ LLM เพื่อขยายความ query
        """
        print(f"--- Expanding query: '{query}' ---")
        expanded_terms = self.query_expansion_chain.invoke({"query": query})
        print(f"--- Expanded terms: '{expanded_terms}' ---")
        return expanded_terms