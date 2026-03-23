# backend/agent_engine_deployment.py
"""
Reality Check Engine - Vertex AI Agent Engine Modern Deployment Script

This script provides the updated configuration to deploy the Application's Agent mesh
using the modern 'agent_engines' namespace and the unified 'google-genai' SDK.

This approach is code-first and enables advanced reasoning, workflows, and grounding 
on Google Cloud's Vertex AI platform.

Dependencies:
    pip install google-cloud-aiplatform google-genai
"""

import vertexai
from vertexai import agent_engines
from google import genai
from google.genai import types

# 1. Initialize Vertex AI
# Replace with your actual Google Cloud Project ID and Region
PROJECT_ID = "YOUR_PROJECT_ID"
REGION = "us-central1"

vertexai.init(project=PROJECT_ID, location=REGION)

# 2. Define the Agent Logic using the ADK App Pattern
class RealityCheckAuditorAgent:
    """
    A Modern Agent built using the Vertex AI Agent Development Kit (ADK) pattern.
    """
    def __init__(self, project: str, location: str):
        self.project = project
        self.location = location
        self.model_id = "gemini-3.1-pro-preview"
        
        # Enforce critical-only analysis to reduce false positives
        self.system_instruction = (
            "CRITICAL ANALYSIS TASK: You are the Reality Check Auditor Agent. "
            "NOTE: This is AI-generated media. CRITICAL REQUIREMENT: To strictly reduce false positives, "
            "you must ONLY flag SIGNIFICANT, CRITICAL problems (e.g. massive physical impossibilities, severe hallucinations). "
            "DO NOT flag minor, subtle glitches or stylistic choices. If the issue is not glaringly obvious, ignore it."
        )

    def analyze_media(self, content_base64: str, mime_type: str) -> dict:
        """
        The main agent invocation method.
        Uses the modern google-genai SDK for interaction.
        """
        # Initialize the modern Generative AI Client
        client = genai.Client(vertexai=True, project=self.project, location=self.location)

        # Define Function tool for constrained structural output
        tools = [
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name="report_issues",
                        description="Report detected critical violations in the media.",
                        parameters={
                            "type": "OBJECT",
                            "properties": {
                                "flags": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "severity": {"type": "STRING", "description": "critical"},
                                            "description": {"type": "STRING", "description": "What is wrong?"},
                                            "confidence": {"type": "NUMBER"}
                                        },
                                        "required": ["severity", "description", "confidence"]
                                    }
                                }
                            },
                            "required": ["flags"]
                        }
                    )
                ]
            )
        ]

        # Prepare the media part
        media_part = types.Part.from_bytes(data=content_base64, mime_type=mime_type)

        # Run the reasoning engine
        response = client.models.generate_content(
            model=self.model_id,
            contents=[
                types.Content(
                    role="user",
                    parts=[media_part, types.Part.from_text(text="Analyze this media for critical reality-check violations.")]
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=self.system_instruction,
                tools=tools,
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(mode="ANY")
                )
            )
        )

        return {"response": response.text}

# 3. Deploy the Agent Engine using the modern resource pattern
def deploy_agent_engine():
    print(f"Deploying Reality Check Auditor to Vertex AI Agent Engine in {REGION}...")
    
    # Using the modern agent_engines creator
    agent = agent_engines.AgentEngine.create(
        agent=RealityCheckAuditorAgent(project=PROJECT_ID, location=REGION),
        requirements=[
            "google-cloud-aiplatform>=1.70.0",
            "google-genai>=1.0.0",
        ],
        display_name="Reality Check Auditor Modern Agent",
        description="Audits AI media strictly for critical hallucinations using Gemini 3.1 Pro.",
    )
    
    print(f"Agent successfully deployed! Agent Engine ID: {agent.resource_name}")

if __name__ == "__main__":
    deploy_agent_engine()
