# core/services/database_service.py
from supabase import create_client, Client
from .config import settings
from core.models.pydantic_models import TaskRequest

class DatabaseService:
    def __init__(self, client: Client):
        self.client = client

    async def create_task_record(self, req: TaskRequest, task_name: str):
        """Inserts a record of the generated task into Supabase."""
        try:
            record = {
                "content_name": req.content_name,
                "cases_size": req.cases_size,
                "detail": req.detail,
                "generated_task_name": task_name
            }
            await self.client.table("tasks").insert(record).execute()
        except Exception as e:
            print(f"Database insert failed: {e}")

# Dependency Injection
def get_database_service():
    client = create_client(settings.supabase_url, settings.supabase_key)
    yield DatabaseService(client)