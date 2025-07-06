# core/config.py
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    EMBEDDING_MODEL_NAME = "models/text-embedding-004"
    TAGGER_MODEL_NAME = "gemini-1.5-flash"
    PROMPT_FILE_PATH = Path("prompts/tagger_prompt.md")
    VECTOR_TABLE_NAME = "problems"
    HYBRID_SEARCH_FUNCTION = "hybrid_search_problems"

settings = Settings()