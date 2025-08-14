# app/models.py
from pydantic import BaseModel, Field, validator
from typing import List, Optional

class UpdateRequest(BaseModel):
    """Request model for updating the database."""
    problem_name: str = Field(..., description="Name of the problem")
    markdown_content: str = Field(..., description="Problem description in markdown format")
    solution_code: str = Field(..., description="Solution code for the problem")

    @validator('problem_name', 'markdown_content', 'solution_code')
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or contain only whitespace')
        return v.strip()

class UpdateResponse(BaseModel):
    """Response model after a successful database update."""
    message: str
    problem_id: str
    problem_name: str

class QueryRequest(BaseModel):
    """Request model for querying the database."""
    query: str = Field(..., description="Search query string")
    limit: Optional[int] = Field(default=5, ge=1, le=50, description="Maximum number of results to return")

    @validator('query')
    def validate_query_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Query cannot be empty or contain only whitespace')
        return v.strip()

class QueryResponse(BaseModel):
    """Response model for a query, returning recommended problem names."""
    recommended_problems: List[str] = Field(..., description="List of recommended problem names")
    total_found: Optional[int] = Field(default=None, description="Total number of problems found")
    query: Optional[str] = Field(default=None, description="Original search query")

class SearchRequest(BaseModel):
    """Request model for the searchsmith-results endpoint (matches frontend expectations)."""
    query: str = Field(..., description="Search query string")
    limit: Optional[int] = Field(default=10, ge=1, le=50, description="Maximum number of results to return")
    tags: Optional[List[str]] = Field(default=None, description="Optional tags filter")

    @validator('query')
    def validate_query_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Query cannot be empty or contain only whitespace')
        return v.strip()

class SearchResponse(BaseModel):
    """Response model for the searchsmith-results endpoint."""
    query: str
    tags_filter: Optional[List[str]] = None
    limit: int
    recommended_problems: List[dict]
    total_found: int
    searchsmith_response: Optional[dict] = None