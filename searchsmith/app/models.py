# app/models.py
from pydantic import BaseModel
from typing import List

class UpdateRequest(BaseModel):
    """Request model for updating the database."""
    problem_name: str  # 🆕 เพิ่มฟิลด์นี้
    markdown_content: str
    solution_code: str

class UpdateResponse(BaseModel):
    """Response model after a successful database update."""
    message: str
    problem_id: str
    problem_name: str

class QueryRequest(BaseModel):
    """Request model for querying the database."""
    query: str

class QueryResponse(BaseModel):
    """Response model for a query, returning recommended problem names."""
    recommended_problems: List[str] # ค่านี้จะเป็น problem_name