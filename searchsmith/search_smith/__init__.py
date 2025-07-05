# search_smith/__init__.py

"""
search_smith: A package for document processing, embedding, and similarity search.
"""

__version__ = "0.2.0"

# Expose key functions from each module for easy access.
from . import config
from .llm_handler import  get_huggingface_llm, load_prompt_template
from .document_processor import create_langchain_json
from .db_creator import create_vector_database
from .db_querier import get_retriever, recommend_problems , recommend_problems_api

# You can define what `from search_smith import *` will import
__all__ = [
    "config",
    "get_huggingface_llm",
    "load_prompt_template",
    "create_langchain_json",
    "create_vector_database",
    "get_retriever",
    "recommend_problems" ,
    "recommend_problems_api"
]
