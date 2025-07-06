# core/services/gemini_service.py
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from ..config import settings

class GeminiService:
    def __init__(self):
        self.embedding_model = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL_NAME,
            google_api_key=settings.GOOGLE_API_KEY
        )
        llm = ChatGoogleGenerativeAI(
            model=settings.TAGGER_MODEL_NAME,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.1
        )
        prompt_template = self._load_prompt_template()
        self.tag_generation_chain = prompt_template | llm | StrOutputParser()

    def _load_prompt_template(self) -> ChatPromptTemplate:
        try:
            with open(settings.PROMPT_FILE_PATH, "r", encoding="utf-8") as f:
                template_string = f.read()
            return ChatPromptTemplate.from_template(template_string)
        except FileNotFoundError:
            raise RuntimeError(f"Prompt file not found at {settings.PROMPT_FILE_PATH}")

    def generate_tags(self, markdown: str, code: str) -> str:
        return self.tag_generation_chain.invoke({
            "problem_markdown": markdown,
            "solution_code": code
        })

    def get_embedding(self, text: str) -> list[float]:
        return self.embedding_model.embed_query(text)