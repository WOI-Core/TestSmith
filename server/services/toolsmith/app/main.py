from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from io import BytesIO
import zipfile
import re
import logging
from typing import List
from pydantic import BaseModel

from core.services.graph_manager import GraphManager, get_graph_manager
from core.services.storage_service import StorageService, get_storage_service
from core.models.pydantic_models import TaskRequest

class FileInfo(BaseModel):
    file_path: str
    content: str

class UploadTaskRequest(BaseModel):
    task_name: str
    files: List[FileInfo]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Toolsmith API")

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean_and_sanitize_name(name: str) -> str:
    clean_name = re.sub(r'```(text|python|cpp|java|javascript)?', '', name).strip()
    path_parts = [part.strip() for part in clean_name.split('/')]
    rejoined_path = "/".join(path_parts)
    safe_name = re.sub(r'[^\w\.\-\/]', '_', rejoined_path)
    return safe_name

@app.get("/")
def read_root():
    return {"status": "Toolsmith API is running!"}

@app.post("/generate-preview")
async def generate_preview_endpoint(
    req: TaskRequest,
    graph_manager: GraphManager = Depends(get_graph_manager)
):
    logger.info(f"Generating preview for task request: {req.content_name}")
    try:
        final_state = await graph_manager.execute_graph(req)

        if final_state.get("error"):
            logger.error(f"Error during graph execution: {final_state.get('error')}")
            raise HTTPException(status_code=500, detail=final_state.get("error"))
        
        if not final_state.get("files"):
            logger.error("Graph execution finished but no files were generated.")
            raise HTTPException(status_code=500, detail="File generation failed: No files were produced.")

        task_name = final_state.get("task_name", "untitled_task")
        files = final_state.get("files", [])
        
        safe_filename_base = clean_and_sanitize_name(task_name)
        zip_filename = f"{safe_filename_base}_tasks.zip"
        
        logger.info(f"Sanitized filename for download: {zip_filename}")

        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_info in files:
                if 'file_path' in file_info and 'content' in file_info:
                    safe_file_path = clean_and_sanitize_name(file_info['file_path'])
                    content = file_info['content']
                    
                    # Handle binary content (like PDFs) properly
                    if isinstance(content, bytes):
                        # For binary content, convert bytes to string using latin-1 encoding
                        # This preserves all byte values without corruption
                        zipf.writestr(f"{safe_filename_base}/{safe_file_path}", content.decode('latin-1'))
                    else:
                        # For text content, convert to string
                        zipf.writestr(f"{safe_filename_base}/{safe_file_path}", str(content))
                else:
                    logger.warning(f"Skipping malformed file entry: {file_info}")
        buffer.seek(0)

        headers = {"Content-Disposition": f"attachment; filename=\"{zip_filename}\""}
        
        return StreamingResponse(
            buffer,
            media_type="application/zip",
            headers=headers
        )
    except Exception as e:
        logger.exception("An unexpected error occurred in /generate-preview endpoint.")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@app.post("/upload-task")
async def upload_task_endpoint(
    req: UploadTaskRequest,
    storage_service: StorageService = Depends(get_storage_service)
):
    logger.info(f"Starting direct upload for pre-generated task: {req.task_name}")
    try:
        if not req.files:
            raise HTTPException(status_code=400, detail="No files provided for upload.")

        safe_task_name = clean_and_sanitize_name(req.task_name)

        files_to_upload = []
        for file_info in req.files:
            safe_file_path = clean_and_sanitize_name(file_info.file_path)
            files_to_upload.append({
                "file_path": safe_file_path,
                "file_name": safe_file_path, 
                "content": file_info.content
            })

        logger.info(f"Uploading {len(files_to_upload)} files to storage for task: {safe_task_name}")
        storage_service.upload_files(safe_task_name, files_to_upload)
        
        return JSONResponse(
            status_code=200, 
            content={"message": f"Task '{safe_task_name}' and its {len(files_to_upload)} files uploaded to storage successfully!"}
        )
    except Exception as e:
        logger.exception(f"Direct upload to bucket failed for: {req.task_name}")
        raise HTTPException(status_code=500, detail=f"Direct upload to bucket failed: {str(e)}")
