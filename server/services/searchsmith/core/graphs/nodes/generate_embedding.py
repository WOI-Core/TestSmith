# core/graphs/nodes/generate_embedding.py
from core.services.gemini_service import GeminiService
from ..models import GraphState

gemini_service = GeminiService()

def generate_embedding(state: GraphState):
    print("--- Generating Embedding ---")
    try:
        combined_text = f"Tags: {', '.join(state['tags'])}\n\nProblem: {state['markdown_content']}"
        embedding = gemini_service.get_embedding(combined_text)
        print("--- Embedding Generated Successfully ---")
        return {"embedding": embedding}
    except Exception as e:
        return {"error": f"Failed to generate embedding: {e}"}