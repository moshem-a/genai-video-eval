import google.auth
from google.oauth2 import credentials
import subprocess
import vertexai
import vertexai.agent_engines as agent_engines

PROJECT_ID = "agentic-system-488914"
REGION = "us-central1"
GCLOUD_PATH = "/Users/moshem/gcloud --version/google-cloud-sdk/bin/gcloud"

def get_creds():
    try:
        creds, _ = google.auth.default()
        return creds
    except Exception:
        print("ADC not found, fetching token from gcloud...")
        token = subprocess.check_output([GCLOUD_PATH, "auth", "print-access-token"], encoding='utf-8').strip()
        return credentials.Credentials(token)

original_default = google.auth.default
def mocked_default(scopes=None, **kwargs):
    try:
        return original_default(scopes=scopes, **kwargs)
    except Exception:
        return get_creds(), PROJECT_ID
google.auth.default = mocked_default

vertexai.init(
    project=PROJECT_ID, 
    location=REGION, 
    staging_bucket="gs://agentic-system-488914-staging"
)

engines = agent_engines.AgentEngine.list()
for engine in engines:
    print(f"Name: {engine.display_name}, Resource Name: {engine.resource_name}")
