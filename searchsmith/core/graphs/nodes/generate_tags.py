# core/graphs/nodes/generate_tags.py
from core.services.gemini_service import GeminiService
from ..models import GraphState

gemini_service = GeminiService()

def generate_tags(state: GraphState):
    print("--- Generating Tags ---")
    try:
        tags_str = gemini_service.generate_tags(
            markdown=state["markdown_content"],
            code=state["solution_code"]
        )
        tags = [tag.strip() for tag in tags_str.split(',') if tag.strip()]
        print(f"--- Generated Tags: {tags} ---")
        return {"tags": tags}
    except Exception as e:
        return {"error": f"Failed to generate tags: {e}"}