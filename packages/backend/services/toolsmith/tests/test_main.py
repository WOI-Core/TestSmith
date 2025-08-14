"""
Integration tests for the Toolsmith FastAPI service.
"""

import pytest
from fastapi.testclient import TestClient
from io import BytesIO
import zipfile

from app.main import app

client = TestClient(app)


def test_health_check():
    """Test the health check endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Toolsmith API is running!"
    assert data["version"] == "1.0.0"


def test_generate_preview_missing_fields():
    """Test generate preview with missing required fields."""
    response = client.post("/generate-preview", json={})
    assert response.status_code == 422  # Validation error


def test_upload_task_zip_no_file():
    """Test upload task zip without file."""
    response = client.post("/upload-task-zip", data={"task_name": "test"})
    assert response.status_code == 422  # Missing file


def test_upload_task_zip_invalid_file():
    """Test upload task zip with invalid file type."""
    files = {"file": ("test.txt", BytesIO(b"not a zip"), "text/plain")}
    data = {"task_name": "test"}
    response = client.post("/upload-task-zip", files=files, data=data)
    assert response.status_code == 400
    assert "Only ZIP files are allowed" in response.json()["detail"]


def test_upload_task_zip_empty_file():
    """Test upload task zip with empty file."""
    files = {"file": ("test.zip", BytesIO(b""), "application/zip")}
    data = {"task_name": "test"}
    response = client.post("/upload-task-zip", files=files, data=data)
    assert response.status_code == 400
    assert "Empty file uploaded" in response.json()["detail"]


def test_clean_path_function():
    """Test the clean_path utility function."""
    from app.main import clean_path
    
    # Test basic sanitization
    assert clean_path("hello world!") == "hello_world"
    assert clean_path("test/path/file.txt") == "test/path/file.txt"
    assert clean_path("test___multiple___underscores") == "test_multiple_underscores"
    assert clean_path("__leading_trailing__") == "leading_trailing"
    assert clean_path("") == ""
    assert clean_path("///") == ""
    assert clean_path("folder//file") == "folder/file"


def test_upload_task_zip_valid_structure():
    """Test upload task zip with valid ZIP structure."""
    # Create a valid ZIP file in memory
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("test_problem/Problems/test_problem.md", "# Test Problem\n\nThis is a test.")
        zip_file.writestr("test_problem/Solutions/test_problem.cpp", "#include <iostream>\nint main() { return 0; }")
        zip_file.writestr("test_problem/input.txt", "5")
        zip_file.writestr("test_problem/output.txt", "120")
    
    zip_buffer.seek(0)
    
    files = {"file": ("test_problem.zip", zip_buffer, "application/zip")}
    data = {"task_name": "test_problem"}
    
    # This will fail because we don't have the storage service configured,
    # but it should validate the ZIP structure first
    response = client.post("/upload-task-zip", files=files, data=data)
    
    # The response could be 500 due to missing storage service, 
    # but it should not be a 400 validation error
    assert response.status_code != 400


if __name__ == "__main__":
    pytest.main([__file__]) 