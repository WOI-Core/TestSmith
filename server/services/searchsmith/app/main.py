# app/main.py
from fastapi import APIRouter, FastAPI, HTTPException
from .models import UpdateRequest, QueryRequest, QueryResponse, UpdateResponse
from core.graph_manager import GraphManager
from core.search_service import SearchService

app = FastAPI(
    title="Searchsmith API",
    description="API for updating and querying programming problems database.",
    version="2.1.0"
)

router = APIRouter()
graph_manager = GraphManager()
search_service = SearchService()

@router.post("/update-database", response_model=UpdateResponse)
async def update_database(request: UpdateRequest):
    """
    Endpoint to update the database with a new problem via string content.
    """
    try:
        # รับข้อมูลจาก request body รวมถึง problem_name
        input_data = {
            "problem_name": request.problem_name,
            "markdown_content": request.markdown_content,
            "solution_code": request.solution_code
        }

        if not all(input_data.values()):
            raise HTTPException(status_code=400, detail="All fields are required.")

        # เรียกใช้ LangGraph workflow
        result = graph_manager.invoke_update_graph(input_data)

        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])

        return UpdateResponse(
            message="Database updated successfully.",
            problem_id=result.get("problem_id", "N/A"),
            problem_name=result.get("problem_name", "N/A")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-only", response_model=UpdateResponse)
async def generate_only(request: UpdateRequest):
    """
    Endpoint to generate embeddings and tags without inserting into database.
    Used by Express server to avoid double insertion.
    """
    try:
        # รับข้อมูลจาก request body รวมถึง problem_name
        input_data = {
            "problem_name": request.problem_name,
            "markdown_content": request.markdown_content,
            "solution_code": request.solution_code
        }

        if not all(input_data.values()):
            raise HTTPException(status_code=400, detail="All fields are required.")

        # เรียกใช้ LangGraph workflow (generate-only, no database insertion)
        result = graph_manager.invoke_generate_only_graph(input_data)

        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])

        return UpdateResponse(
            message="Embeddings and tags generated successfully.",
            problem_id=result.get("problem_id", "N/A"),
            problem_name=result.get("problem_name", "N/A")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query", response_model=QueryResponse)
async def query_database(request: QueryRequest):
    """
    Endpoint to query the database using hybrid-semantic search.
    Returns a list of the top 5 most relevant problem names.
    """
    try:
        problem_names = search_service.hybrid_search(request.query)
        return QueryResponse(recommended_problems=problem_names)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(router, prefix="/v1")