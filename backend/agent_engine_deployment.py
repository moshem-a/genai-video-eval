# backend/agent_engine_deployment.py
"""
Reality Check Engine - Vertex AI Agent Engine Deployment Script

This script provides the necessary configuration to deploy the Application's Agent mesh
directly to Google Cloud Vertex AI Reasoning Engine (Agent Engine).
By deploying your Python custom agent, you can host the logic entirely on Cloud
rather than processing the API calls from your frontend React application.

Dependencies:
    pip install google-cloud-aiplatform langchain-google-vertexai
"""

import vertexai
from vertexai.preview import reasoning_engines
from langchain_google_vertexai import HarmCategory, HarmBlockThreshold

# 1. Initialize Vertex AI
# Replace with your actual Google Cloud Project ID and Region
PROJECT_ID = "YOUR_PROJECT_ID"
REGION = "us-central1"

vertexai.init(project=PROJECT_ID, location=REGION)

# 2. Define the Agent Logic
class RealityCheckAuditorAgent:
    """
    A Langchain-on-Vertex (Agent Engine) Application defining the Reality Check Auditor.
    """
    def __init__(self, project: str, location: str):
        self.project = project
        self.location = location

    def set_up(self):
        """Called upon deployment to initialize the model."""
        import google.generativeai as genai
        # Initialize the actual Vertex Gemini Model inside the cloud environment
        
        # We enforce critical-only analysis to reduce false positives
        self._system_instruction = (
            "CRITICAL ANALYSIS TASK: You are the Reality Check Auditor Agent. "
            "NOTE: This is AI-generated media. CRITICAL REQUIREMENT: To strictly reduce false positives, "
            "you must ONLY flag SIGNIFICANT, CRITICAL problems (e.g. massive physical impossibilities, severe hallucinations). "
            "DO NOT flag minor, subtle glitches or stylistic choices. If the issue is not glaringly obvious, ignore it."
        )

    def analyze_media(self, content_base64: str, mime_type: str, is_video: bool) -> dict:
        """
        The main agent invocation method.
        Accepts a base64 encoded media (Image or extracted Video Frame sequence)
        and critiques its coherence.
        """
        from vertexai.generative_models import GenerativeModel, Part, Tool, FunctionDeclaration

        # Construct Function tools to enforce structured JSON output for flags
        report_tool = Tool(
            function_declarations=[
                FunctionDeclaration(
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

        model = GenerativeModel(
            model_name="gemini-1.5-pro-preview-0409", # Use Veo/Gemini 3.x equivalent models per availability
            system_instruction=self._system_instruction,
            tools=[report_tool]
        )

        part = Part.from_data(mime_type=mime_type, data=content_base64)
        
        # Execute the agent
        response = model.generate_content(
            [part, "Analyze this media and report any critical reality-check violations."],
            tool_config={"function_calling_config": {"mode": "ANY"}}
        )

        # Parse responses dynamically here
        return {"response": response.text}

# 3. Deploy the Agent Engine locally or to Vertex
def deploy_agent_engine():
    print(f"Deploying Reality Check Auditor to Vertex AI Reasoning Engine in {REGION}...")
    
    agent = reasoning_engines.ReasoningEngine.create(
        reasoning_engine=RealityCheckAuditorAgent(project=PROJECT_ID, location=REGION),
        requirements=[
            "google-cloud-aiplatform",
            "langchain-google-vertexai",
        ],
        display_name="Reality Check Auditor Agent Engine",
        description="Audits AI videos strictly for critical hallucinations using Gemini.",
    )
    
    print(f"Agent successfully deployed! Reasoning Engine ID: {agent.name}")

if __name__ == "__main__":
    deploy_agent_engine()
