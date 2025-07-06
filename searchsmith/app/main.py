# app/main.py
from fastapi import APIRouter, FastAPI, File, UploadFile, HTTPException
from .models import QueryRequest, QueryResponse, UpdateResponse
from core.graph_manager import GraphManager
from core.search_service import SearchService

app = FastAPI(
    title="Searchsmith API",
    description="API for updating and querying programming problems database.",
    version="1.0.0"
)

router = APIRouter()
graph_manager = GraphManager()
search_service = SearchService()

@router.post("/update-database", response_model=UpdateResponse)
async def update_database(
    markdown_file: UploadFile = File(..., description="Markdown file of the problem description."),
    solution_file: UploadFile = File(..., description="C++ solution file (.cpp).")
):
    """
    Endpoint to update the database with a new problem.
    It processes the markdown and solution file to generate tags and embeddings,
    then upserts them into the Supabase vector store.
    """
    if markdown_file.content_type != 'text/markdown':
        raise HTTPException(status_code=400, detail="Markdown file must be of type text/markdown.")
    if not solution_file.filename.endswith('.cpp'):
        raise HTTPException(status_code=400, detail="Solution file must be a .cpp file.")

    try:
        markdown_content = (await markdown_file.read()).decode("utf-8")
        solution_content = (await solution_file.read()).decode("utf-8")

        result = graph_manager.invoke_update_graph({
            "markdown_content": markdown_content,
            "solution_code": solution_content
        })

        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])

        return UpdateResponse(
            message="Database updated successfully.",
            problem_id=result.get("problem_id", "N/A")
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
        if not problem_names:
            return QueryResponse(recommended_problems=[])

        return QueryResponse(recommended_problems=problem_names)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(router, prefix="/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to Searchsmith API"}