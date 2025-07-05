# search_smith/config.py
from pathlib import Path

# --- Project Root ---
PROJECT_ROOT = Path(__file__).parent.parent

# --- Directory Paths ---
DATABASES_DIR = PROJECT_ROOT / "databases"
DOCUMENTS_JSON_PATH = DATABASES_DIR / "documents" / "documents.json"
VECTOR_STORE_PATH = DATABASES_DIR / "chroma_db_problems_qwen"
SOLUTIONS_DIR = DATABASES_DIR / "solutions"
PROBLEMS_DIR = DATABASES_DIR / "texts"
# --- Embedding Model Settings ---
EMBEDDING_MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"
EMBEDDING_MODEL_KWARGS = {'device': 'cpu'}
EMBEDDING_ENCODE_KWARGS = {'normalize_embeddings': True}

# --- Hugging Face Model Settings ---
HF_MODEL_NAME = "Qwen/Qwen3-32B"

# --- Prompts
PROMPT_FILE_PATH = PROJECT_ROOT / "prompts" / "tagger.txt"

# --- Retriever Settings ---
SEARCH_KWARGS = {"k": 5}
