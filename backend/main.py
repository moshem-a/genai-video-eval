# backend/main.py
"""
Reality Check Engine - FastAPI ADK Bridge
This server serves as the unified backend for the Reality Check Engine, 
proxying requests to the Vertex AI Agent Engine for 'Full ADK' integration.
"""

import os
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import vertexai
from vertexai import agent_engines

# Configuration
PROJECT_ID = os.getenv("GCP_PROJECT", "YOUR_PROJECT_ID")
REGION = os.getenv("GCP_REGION", "us-central1")
AGENT_ENGINE_ID = os.getenv("AGENT_ENGINE_ID") # e.g. 'projects/.../locations/.../reasoningEngines/...'

# Initialize FastAPI
app = FastAPI(title="Reality Check Engine ADK Bridge")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=REGION)

class AnalysisRequest(BaseModel):
    media_base64: str
    mime_type: str
    text: Optional[str] = "Analyze this media for critical reality-check violations."

class BatchAnalysisRequest(BaseModel):
    issues_summary: List[str]

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "agent_engine_id": AGENT_ENGINE_ID}

@app.post("/api/analyze")
async def analyze_media(request: AnalysisRequest):
    """
    Proxies calls to the deployed ADK Agent Engine.
    """
    if not AGENT_ENGINE_ID:
        raise HTTPException(status_code=500, detail="AGENT_ENGINE_ID not configured.")

    try:
        # 1. Access the Remote Agent Engine
        engine = agent_engines.AgentEngine.get(AGENT_ENGINE_ID)
        
        # 2. Query the agent
        # Assuming the auditor agent has a 'query' method (AdkApp pattern)
        response = engine.query(
            text=request.text,
            media_base64=request.media_base64,
            mime_type=request.mime_type
        )
        
        return response
    except Exception as e:
        print(f"Error querying Agent Engine: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/batch-insights")
async def generate_batch_insights(request: BatchAnalysisRequest):
    """
    Generates a prompt engineering report based on a batch of issues.
    """
    if not AGENT_ENGINE_ID:
        raise HTTPException(status_code=500, detail="AGENT_ENGINE_ID not configured.")

    try:
        engine = agent_engines.AgentEngine.get(AGENT_ENGINE_ID)
        
        prompt = f"""You are an expert AI Prompt Engineer. 
        Analyze the following issues found in a batch of generated videos and provide a summary report:
        {chr(10).join(request.issues_summary)}
        
        Provide actionable advice on how to improve the prompts to avoid these issues."""

        response = engine.query(text=prompt)
        return response
    except Exception as e:
        print(f"Error generating insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Serving React Frontend (once built into dist/)
# This allows a unified Docker deployment
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
