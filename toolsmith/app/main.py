# app/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
import zipfile

from core.services.graph_manager import GraphManager, get_graph_manager
from core.services.database_service import DatabaseService, get_database_service
from core.models.pydantic_models import TaskRequest

app = FastAPI(title="Toolsmith API")

@app.post("/generate-task")
async def generate_task_endpoint(
    req: TaskRequest,
    graph_manager: GraphManager = Depends(get_graph_manager),
    db_service: DatabaseService = Depends(get_database_service)
):
    """Generates a competitive programming task and returns a ZIP file."""
    final_state = await graph_manager.execute_graph(req)

    if not final_state.get("files") or final_state.get("error"):
        raise HTTPException(status_code=500, detail=final_state.get("error", "Unknown error"))

    task_name = final_state.get("task_name", "task")
    await db_service.create_task_record(req, task_name)

    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as zipf:
        for file_info in final_state["files"]:
            zipf.writestr(file_info["filename"], file_info["content"])
    buffer.seek(0)

    zip_filename = f"{task_name}_tasks.zip"
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_filename}"}
    )