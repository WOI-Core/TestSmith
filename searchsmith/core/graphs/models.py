# core/graphs/models.py
from typing import TypedDict, Annotated

class GraphState(TypedDict):
    problem_name: str  # 🆕 เพิ่มฟิลด์นี้
    markdown_content: str
    solution_code: str
    problem_id: str
    tags: Annotated[list[str], lambda x, y: x + y]
    embedding: list[float]
    error: str | None