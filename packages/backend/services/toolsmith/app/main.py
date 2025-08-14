# app/main.py
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from io import BytesIO
import zipfile
import re
import os
from typing import List, Dict, Any
import logging

from core.services.graph_manager import GraphManager, get_graph_manager
from core.services.storage_service import StorageService, get_storage_service
from core.models.pydantic_models import TaskRequest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Toolsmith API", version="1.0.0")

app.mount("/static", StaticFiles(directory="static"), name="static")

# Secure CORS configuration
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://34.143.158.179",
    "http://127.0.0.1:3001",
]

# Add production origins from environment
if os.getenv("FRONTEND_URL"):
    allowed_origins.append(os.getenv("FRONTEND_URL"))
if os.getenv("BACKEND_URL"):
    allowed_origins.append(os.getenv("BACKEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

def clean_path(path: str) -> str:
    """
    Sanitize a file path by removing unsafe characters and normalizing structure.
    
    Args:
        path: The file path to clean
        
    Returns:
        Cleaned and safe file path
    """
    if not path:
        return ""
    
    # Replace unsafe characters with underscores
    cleaned = re.sub(r'[^a-zA-Z0-9._/-]', '_', path)
    # Collapse multiple underscores
    cleaned = re.sub(r'_+', '_', cleaned)
    # Remove leading/trailing underscores and slashes
    cleaned = cleaned.strip('_').strip('/')
    # Clean each path segment
    segments = [seg.strip('_') for seg in cleaned.split('/') if seg.strip('_')]
    return '/'.join(segments)

@app.get("/")
def read_root():
    """Health check endpoint."""
    return {"message": "Toolsmith API is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "service": "toolsmith"}

@app.post("/generate-preview")
async def generate_preview_endpoint(
    req: TaskRequest,
    graph_manager: GraphManager = Depends(get_graph_manager)
):
    """
    Generate task files and return them as a ZIP file for preview.
    
    Args:
        req: Task generation request
        graph_manager: Graph manager service
        
    Returns:
        ZIP file containing generated task files
    """
    try:
        logger.info(f"Generating preview for task: {req.content_name}")
        final_state = await graph_manager.execute_graph(req)

        if not final_state.get("files") or final_state.get("error"):
            error_msg = final_state.get("error", "Unknown error occurred during generation")
            logger.error(f"Generation failed: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)

        task_name = final_state.get("task_name", "task")
        files = final_state.get("files", [])
        
        if not files:
            raise HTTPException(status_code=500, detail="No files generated")

        # Create ZIP file
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_info in files:
                file_path = file_info.get('file_path', '')
                content = file_info.get('content', '')
                if file_path and content is not None:
                    zipf.writestr(f"{task_name}/{file_path}", content)
        
        buffer.seek(0)

        # Sanitize filename for HTTP header
        safe_task_name = clean_path(task_name)
        zip_filename = f"{safe_task_name}_tasks.zip"
        
        logger.info(f"Generated ZIP with {len(files)} files for task: {safe_task_name}")
        
        return StreamingResponse(
            BytesIO(buffer.read()),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={zip_filename}; filename*=UTF-8''{zip_filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in generate_preview_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/upload-task")
async def upload_task_endpoint(
    req: TaskRequest,
    graph_manager: GraphManager = Depends(get_graph_manager),
    storage_service: StorageService = Depends(get_storage_service)
):
    """
    Generate files and upload them directly to Supabase Storage.
    
    Args:
        req: Task generation request
        graph_manager: Graph manager service
        storage_service: Storage service
        
    Returns:
        Success message with upload details
    """
    try:
        logger.info(f"Generating and uploading task: {req.content_name}")
        final_state = await graph_manager.execute_graph(req)

        if not final_state.get("files") or final_state.get("error"):
            error_msg = final_state.get("error", "An internal error occurred during generation")
            logger.error(f"Generation failed: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)

        task_name = final_state.get("task_name")
        files = final_state.get("files")
        
        if not task_name or not files:
            raise HTTPException(status_code=500, detail="Invalid generation result: missing task_name or files")

        # Upload to storage
        storage_service.upload_files(task_name, files)
        
        logger.info(f"Successfully uploaded {len(files)} files for task: {task_name}")
        return JSONResponse(
            status_code=200, 
            content={
                "message": f"Task '{task_name}' and its {len(files)} files uploaded to bucket successfully!",
                "task_name": task_name,
                "file_count": len(files)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed for task {req.content_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload to bucket failed: {str(e)}")

@app.post("/upload-task-zip")
async def upload_task_zip(
    file: UploadFile = File(...),
    task_name: str = Form(...),
    storage_service: StorageService = Depends(get_storage_service)
):
    """
    Upload a ZIP file and extract its contents to Supabase Storage.
    
    Args:
        file: ZIP file to upload
        task_name: Name of the task
        storage_service: Storage service
        
    Returns:
        Success message with extracted file details
    """
    try:
        logger.info(f"Processing ZIP upload for task: {task_name}")
        
        # Validate file type
        if not file.filename or not file.filename.lower().endswith('.zip'):
            raise HTTPException(status_code=400, detail="Only ZIP files are allowed")
        
        # Read and validate ZIP content
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        files = []
        safe_task_name = clean_path(task_name)
        
        with zipfile.ZipFile(BytesIO(contents)) as zipf:
            for zipinfo in zipf.infolist():
                if zipinfo.is_dir():
                    continue
                    
                file_path = clean_path(zipinfo.filename)
                if not file_path:
                    continue
                
                # Remove the root folder if it matches the task name
                cleaned_path = file_path
                if cleaned_path.startswith(f"{safe_task_name}/"):
                    cleaned_path = cleaned_path[len(f"{safe_task_name}/"):]
                
                cleaned_path = clean_path(cleaned_path)
                if not cleaned_path:
                    continue
                
                try:
                    file_bytes = zipf.read(zipinfo)
                    files.append({
                        'file_path': cleaned_path,
                        'file_name': clean_path(cleaned_path.split('/')[-1]),
                        'content': file_bytes
                    })
                except Exception as e:
                    logger.warning(f"Failed to read file {zipinfo.filename}: {str(e)}")
                    continue
        
        if not files:
            raise HTTPException(status_code=400, detail="No valid files found in ZIP")
        
        # Upload to Supabase
        storage_service.upload_files(safe_task_name, files)
        
        logger.info(f"Successfully processed ZIP with {len(files)} files for task: {safe_task_name}")
        return JSONResponse(
            status_code=200, 
            content={
                "message": f"ZIP for '{safe_task_name}' uploaded and files stored!",
                "task_name": safe_task_name,
                "files": [f['file_path'] for f in files],
                "file_count": len(files)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ZIP upload failed for task {task_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ZIP processing failed: {str(e)}")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )