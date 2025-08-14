# app/main.py
import logging
import traceback
from typing import Optional, Dict, Any
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from .models import UpdateRequest, QueryRequest, QueryResponse, UpdateResponse, SearchRequest, SearchResponse
from core.graph_manager import GraphManager
from core.search_service import SearchService
from core.services.gemini_service import GeminiService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Searchsmith API",
    description="API for updating and querying programming problems database.",
    version="2.1.0"
)

router = APIRouter()
graph_manager = GraphManager()
search_service = SearchService()
gemini_service = GeminiService()

def create_error_response(
    status_code: int, 
    reason: str, 
    trace: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """Create a standardized error response."""
    error_response = {
        "error": True,
        "reason": reason,
        "status_code": status_code
    }
    
    if trace:
        error_response["trace"] = trace
    
    if details:
        error_response["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content=error_response
    )

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors."""
    logger.error(f"Validation error: {exc.errors()}")
    return create_error_response(
        status_code=422,
        reason="Invalid request data",
        details={"validation_errors": exc.errors()}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return create_error_response(
        status_code=500,
        reason="Internal server error",
        trace=traceback.format_exc() if app.debug else None
    )

@router.post("/update-database", response_model=UpdateResponse)
async def update_database(request: UpdateRequest):
    """
    Endpoint to update the database with a new problem via string content.
    """
    logger.info(f"Received update request for problem: {request.problem_name}")
    
    try:
        # Validate request payload
        logger.info("Validating request payload...")
        if not request.problem_name or not request.markdown_content or not request.solution_code:
            logger.error("Missing required fields in request")
            raise HTTPException(
                status_code=400, 
                detail="All fields (problem_name, markdown_content, solution_code) are required."
            )

        # Prepare input data for LangGraph
        input_data = {
            "problem_name": request.problem_name,
            "markdown_content": request.markdown_content,
            "solution_code": request.solution_code
        }
        
        logger.info("Invoking LangGraph workflow...")
        result = graph_manager.invoke_update_graph(input_data)

        if result.get("error"):
            logger.error(f"LangGraph workflow failed: {result['error']}")
            raise HTTPException(status_code=500, detail=result["error"])

        logger.info(f"Successfully updated database for problem: {request.problem_name}")
        return UpdateResponse(
            message="Database updated successfully.",
            problem_id=result.get("problem_id", "N/A"),
            problem_name=result.get("problem_name", "N/A")
        )
        
    except HTTPException:
        # Re-raise HTTPExceptions as they are already properly formatted
        raise
    except Exception as e:
        logger.error(f"Unexpected error in update_database: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to update database: {str(e)}"
        )

@router.post("/query", response_model=QueryResponse)
async def query_database(request: QueryRequest):
    """
    Endpoint to query the database using hybrid-semantic search.
    Returns a list of the top 5 most relevant problem names.
    """
    logger.info(f"Received search query: '{request.query}'")
    
    try:
        # Validate request payload
        logger.info("Validating query request...")
        if not request.query or not request.query.strip():
            logger.error("Empty or missing query")
            raise HTTPException(
                status_code=400, 
                detail="Query parameter is required and cannot be empty."
            )

        # Log the start of search process
        logger.info("Starting hybrid search process...")
        
        # Step 1: Query expansion with Gemini
        logger.info("Step 1: Expanding query with Gemini...")
        try:
            expanded_terms = gemini_service.expand_query(request.query)
            logger.info(f"Query expanded successfully: '{expanded_terms}'")
        except Exception as e:
            logger.error(f"Query expansion failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to expand query with AI: {str(e)}"
            )

        # Step 2: Generate embedding
        logger.info("Step 2: Generating query embedding...")
        try:
            full_query = f"{request.query} {expanded_terms.replace(',', ' ')}"
            query_embedding = gemini_service.get_embedding(full_query)
            logger.info("Query embedding generated successfully")
        except Exception as e:
            logger.error(f"Embedding generation failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate query embedding: {str(e)}"
            )

        # Step 3: Perform hybrid search with pgvector
        logger.info("Step 3: Performing hybrid search with pgvector...")
        try:
            problem_names = search_service.hybrid_search(request.query, request.limit)
            logger.info(f"Hybrid search completed. Found {len(problem_names)} problems")
        except Exception as e:
            logger.error(f"Hybrid search failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to perform hybrid search: {str(e)}"
            )

        logger.info(f"Search completed successfully. Returning {len(problem_names)} results")
        return QueryResponse(
            recommended_problems=problem_names,
            total_found=len(problem_names),
            query=request.query
        )
        
    except HTTPException:
        # Re-raise HTTPExceptions as they are already properly formatted
        raise
    except Exception as e:
        logger.error(f"Unexpected error in query_database: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to query database: {str(e)}"
        )

@router.post("/searchsmith-results", response_model=SearchResponse)
async def searchsmith_results(request: SearchRequest):
    """
    Enhanced endpoint for searchsmith results that matches frontend expectations.
    This endpoint provides detailed problem information including difficulty and tags.
    """
    logger.info(f"Received searchsmith-results request: query='{request.query}', limit={request.limit}")
    
    try:
        # Validate request payload
        logger.info("Validating search request...")
        if not request.query or not request.query.strip():
            logger.error("Empty or missing query")
            raise HTTPException(
                status_code=400, 
                detail="Query parameter is required and cannot be empty."
            )

        # Log the start of search process
        logger.info("Starting enhanced search process...")
        
        # Step 1: Query expansion with Gemini
        logger.info("Step 1: Expanding query with Gemini...")
        try:
            expanded_terms = gemini_service.expand_query(request.query)
            logger.info(f"Query expanded successfully: '{expanded_terms}'")
        except Exception as e:
            logger.error(f"Query expansion failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to expand query with AI: {str(e)}"
            )

        # Step 2: Generate embedding
        logger.info("Step 2: Generating query embedding...")
        try:
            full_query = f"{request.query} {expanded_terms.replace(',', ' ')}"
            query_embedding = gemini_service.get_embedding(full_query)
            logger.info("Query embedding generated successfully")
        except Exception as e:
            logger.error(f"Embedding generation failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate query embedding: {str(e)}"
            )

        # Step 3: Perform hybrid search with pgvector
        logger.info("Step 3: Performing hybrid search with pgvector...")
        try:
            problem_names = search_service.hybrid_search(request.query, request.limit)
            logger.info(f"Hybrid search completed. Found {len(problem_names)} problems")
        except Exception as e:
            logger.error(f"Hybrid search failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to perform hybrid search: {str(e)}"
            )

        # Step 4: Create detailed results (mocking for now since we don't have full problem details)
        logger.info("Step 4: Creating detailed results...")
        detailed_results = []
        for i, problem_name in enumerate(problem_names):
            # Mock detailed information for now
            detailed_result = {
                "name": problem_name,
                "problem_id": f"problem_{i+1}",  # Mock ID
                "difficulty": 800 + (i * 100),  # Mock difficulty
                "tags": ["algorithm", "data-structures"],  # Mock tags
                "similarity_score": 0.95 - (i * 0.05)  # Mock similarity score
            }
            detailed_results.append(detailed_result)

        logger.info(f"Search completed successfully. Returning {len(detailed_results)} detailed results")
        
        return SearchResponse(
            query=request.query,
            tags_filter=request.tags,
            limit=request.limit,
            recommended_problems=detailed_results,
            total_found=len(detailed_results),
            searchsmith_response={
                "recommended_problems": problem_names,
                "query": request.query
            }
        )
        
    except HTTPException:
        # Re-raise HTTPExceptions as they are already properly formatted
        raise
    except Exception as e:
        logger.error(f"Unexpected error in searchsmith_results: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get searchsmith results: {str(e)}"
        )

@router.post("/generate-only")
async def generate_only(request: UpdateRequest):
    """
    Endpoint to generate tags and embeddings only, without inserting into database.
    """
    logger.info(f"Received generate-only request for problem: {request.problem_name}")
    
    try:
        # Validate request payload
        logger.info("Validating request payload...")
        if not request.problem_name or not request.markdown_content or not request.solution_code:
            logger.error("Missing required fields in request")
            raise HTTPException(
                status_code=400, 
                detail="All fields (problem_name, markdown_content, solution_code) are required."
            )

        # Step 1: Generate tags with Gemini
        logger.info("Step 1: Generating tags with Gemini...")
        try:
            tags_str = gemini_service.generate_tags(
                markdown=request.markdown_content,
                code=request.solution_code
            )
            tags = [tag.strip() for tag in tags_str.split(',') if tag.strip()]
            logger.info(f"Tags generated successfully: {tags}")
        except Exception as e:
            logger.error(f"Tag generation failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate tags: {str(e)}"
            )

        # Step 2: Generate embedding
        logger.info("Step 2: Generating embedding...")
        try:
            combined_text = f"Tags: {', '.join(tags)}\n\nProblem: {request.markdown_content}"
            embedding = gemini_service.get_embedding(combined_text)
            logger.info("Embedding generated successfully")
        except Exception as e:
            logger.error(f"Embedding generation failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate embedding: {str(e)}"
            )

        logger.info("Generate-only process completed successfully")
        return {
            "tags": tags,
            "embedding": embedding,
            "problem_name": request.problem_name,
            "message": "Tags and embedding generated successfully"
        }
        
    except HTTPException:
        # Re-raise HTTPExceptions as they are already properly formatted
        raise
    except Exception as e:
        logger.error(f"Unexpected error in generate_only: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate tags and embedding: {str(e)}"
        )

app.include_router(router, prefix="/v1")