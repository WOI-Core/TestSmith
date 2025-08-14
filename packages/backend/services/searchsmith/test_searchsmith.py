#!/usr/bin/env python3
"""
Test script for SearchSmith service
"""
import asyncio
import json
import logging
from fastapi.testclient import TestClient
from app.main import app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_searchsmith_service():
    """Test the SearchSmith service endpoints"""
    client = TestClient(app)
    
    # Test 1: Basic query endpoint
    logger.info("Testing /v1/query endpoint...")
    test_query = {
        "query": "dynamic programming",
        "limit": 5
    }
    
    try:
        response = client.post("/v1/query", json=test_query)
        logger.info(f"Response status: {response.status_code}")
        logger.info(f"Response body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"Success! Found {len(data.get('recommended_problems', []))} problems")
        else:
            logger.error(f"Query endpoint failed with status {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error testing query endpoint: {str(e)}")
    
    # Test 2: Searchsmith results endpoint
    logger.info("\nTesting /v1/searchsmith-results endpoint...")
    test_search_request = {
        "query": "graph algorithms",
        "limit": 3,
        "tags": ["algorithm", "graph"]
    }
    
    try:
        response = client.post("/v1/searchsmith-results", json=test_search_request)
        logger.info(f"Response status: {response.status_code}")
        logger.info(f"Response body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"Success! Found {data.get('total_found', 0)} problems")
        else:
            logger.error(f"Searchsmith results endpoint failed with status {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error testing searchsmith results endpoint: {str(e)}")

if __name__ == "__main__":
    test_searchsmith_service() 