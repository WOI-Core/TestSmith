# scripts/query_database.py
import sys
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

from search_smith import get_retriever, recommend_problems_api

app = FastAPI()

class Query(BaseModel):
    text: str

@app.on_event("startup")
async def startup_event():
    """
    Load the retriever model on startup.
    """
    load_dotenv()
    global retriever
    retriever = get_retriever()
    if not retriever:
        print("Error: Could not initialize retriever.")
        # In a real application, you might want to handle this more gracefully
        sys.exit(1)

@app.post("/query/")
async def query_database(query: Query):
    """
    API endpoint to get problem recommendations.
    """
    if not retriever:
        return {"error": "Retriever not initialized"}

    recommended = recommend_problems_api(retriever, query.text)
    return {"recommended_problems": recommended}

def main():
    """
    Main function to run the FastAPI server.
    """
    # You can adjust the host and port as needed
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
