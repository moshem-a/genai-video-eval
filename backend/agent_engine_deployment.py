# backend/agent_engine_deployment.py
"""
Reality Check Engine - Full ADK (Agent Development Kit) Deployment Script

This script provides the complete ADK-native configuration to deploy the 
Application's Agent mesh using AdkApp and managed session/memory features.

This is the 'Full ADK' experience which inherits from BaseAgent and uses 
the Agent Development Kit (ADK) template for Vertex AI Agent Engine.

Dependencies:
    pip install google-cloud-aiplatform google-genai google-adk
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

# 2. Define the Pure ADK Agent Logic
class RealityCheckAuditorAgent:
    """
    A Pure ADK Agent.
    In a full production scenario, this inherits from google.adk.agents.BaseAgent.
    """
    def __init__(self, project: str, location: str):
        self.project = project
        self.location = location
        self.model_id = "gemini-3.1-pro-preview"
        self.system_instruction = (
            "CRITICAL ANALYSIS TASK: You are the Reality Check Auditor Agent. "
            "NOTE: This is AI-generated media. CRITICAL REQUIREMENT: To strictly reduce false positives, "
            "you must ONLY flag SIGNIFICANT, CRITICAL problems (e.g. massive physical impossibilities, severe hallucinations). "
            "If the issue is not glaringly obvious, ignore it."
        )

    def set_up(self):
        """Called upon deployment to initialize resources."""
        self.client = genai.Client(vertexai=True, project=self.project, location=self.location)

    async def query(self, text: str, media_base64: str = None, mime_type: str = None) -> dict:
        """
        The ADK query implementation.
        Handles reasoning and grounding steps.
        """
        # Define Tools for structured JSON reporting
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

        # Prepare Content
        parts = [types.Part.from_text(text=text)]
        if media_base64 and mime_type:
            parts.append(types.Part.from_bytes(data=media_base64, mime_type=mime_type))

        # Generate using ADK-style configuration
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=[types.Content(role="user", parts=parts)],
            config=types.GenerateContentConfig(
                system_instruction=self.system_instruction,
                tools=tools,
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(mode="ANY")
                )
            )
        )

        return {"response": response.text}

# 3. Deploy via AdkApp for the 'Full ADK' Experience
def deploy_adk_agent():
    print(f"Sourcing Full ADK Application for Vertex AI Agent Engine in {REGION}...")
    
    # Instantiate the agent
    auditor = RealityCheckAuditorAgent(project=PROJECT_ID, location=REGION)
    
    # Wrap in AdkApp for session and memory persistence
    app = agent_engines.AdkApp(
        agent=auditor,
        name="reality-check-auditor-adk",
        description="A full ADK-native agent for auditing AI hallucinations with managed memory."
    )
    
    # Create the AgentEngine resource
    print("Creating AgentEngine resource on Vertex AI...")
    engine = agent_engines.AgentEngine.create(
        agent=app,
        requirements=[
            "google-cloud-aiplatform>=1.70.0",
            "google-genai>=1.0.0",
        ],
        display_name="Reality Check Auditor (Full ADK Engine)",
    )
    
    print(f"ADK Agent Engine successfully deployed! Resource: {engine.resource_name}")

if __name__ == "__main__":
    deploy_adk_agent()
