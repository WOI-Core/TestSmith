# app/models.py
from pydantic import BaseModel
from typing import List

class UpdateResponse(BaseModel):
    message: str
    problem_id: str

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    recommended_problems: List[str]