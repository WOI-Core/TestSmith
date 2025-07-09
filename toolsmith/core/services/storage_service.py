# core/services/storage_service.py
from supabase import create_client, Client
from .config import settings
from typing import List, Dict

class StorageService:
    def __init__(self, client: Client):
        self.client = client
        self.bucket_name = "problems" # กำหนดชื่อ Bucket ที่จะใช้

    def upload_files(self, task_name: str, files: List[Dict]):
        """
        Uploads a list of files to the specified Supabase Storage bucket,
        organizing them under a folder with the task's name.
        """
        try:
            print(f"Starting upload for task: {task_name} to bucket: {self.bucket_name}")
            
            for file_info in files:
                # สร้าง path เต็มสำหรับไฟล์ใน bucket
                # เช่น "MyCoolTask/Problems/MyCoolTask.md"
                upload_path = f"{task_name}/{file_info['file_path']}"
                
                # แปลง content (string) ให้เป็น bytes ก่อนอัปโหลด
                file_content_bytes = file_info['content'].encode('utf-8')

                print(f"  Uploading: {upload_path}")
                
                # ทำการอัปโหลดไฟล์
                self.client.storage.from_(self.bucket_name).upload(
                    path=upload_path,
                    file=file_content_bytes,
                    file_options={"content-type": "text/plain;charset=utf-8"} # กำหนด content type
                )

            print(f"Successfully uploaded {len(files)} files for task '{task_name}'.")

        except Exception as e:
            # จัดการกับ error ที่อาจเกิดขึ้น เช่น ไฟล์ซ้ำ หรือ bucket ไม่มีอยู่
            error_message = str(e)
            if "Duplicate" in error_message:
                print(f"Upload failed: A file with the same path already exists for task '{task_name}'. "
                      "Consider deleting the old folder first if you want to re-upload.")
                raise Exception(f"Duplicate files found for task '{task_name}'.")
            
            print(f"Storage upload failed: {e}")
            raise e

# Dependency Injection
def get_storage_service():
    client = create_client(settings.supabase_url, settings.supabase_key)
    yield StorageService(client)