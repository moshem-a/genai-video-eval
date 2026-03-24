#!/bin/bash

# GenAI Video Evaluator - Full-Stack ADK Cloud Run Deployment Script

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Absolute path to gcloud found on system
GCLOUD_BIN="/Users/moshem/gcloud --version/google-cloud-sdk/bin/gcloud"
AGENT_ENGINE_ID="projects/agentic-system-488914/locations/us-central1/reasoningEngines/8885141040331030528"
PROJECT_ID="agentic-system-488914"
export CLOUDSDK_PYTHON="/usr/local/bin/python3.13"

echo "------------------------------------------------"
echo -e "${BLUE}🚀 Starting Full-Stack ADK Deployment to Cloud Run...${NC}"
echo -e "${BLUE}🐍 Using Python: ${GREEN}$($CLOUDSDK_PYTHON --version)${NC}"
echo "------------------------------------------------"

# Check for gcloud
if [ ! -f "$GCLOUD_BIN" ]; then
    echo -e "${RED}❌ Error: gcloud CLI not found at $GCLOUD_BIN.${NC}"
    exit 1
fi

# Hardcoded project ID found on system
PROJECT_ID="gen-lang-client-0535468580"
echo -e "${BLUE}📦 Using Project: ${GREEN}$PROJECT_ID${NC}"

# Ensure necessary APIs are enabled
echo -e "${BLUE}🔧 Ensuring necessary APIs are enabled...${NC}"
"$GCLOUD_BIN" services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com aiplatform.googleapis.com --quiet --project "$PROJECT_ID"

# Deploy to Cloud Run
echo -e "${BLUE}🏗️  Building and deploying Full-Stack app (FastAPI + React)...${NC}"
"$GCLOUD_BIN" run deploy genai-video-eval \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 1 \
  --set-env-vars "GCP_PROJECT=$PROJECT_ID,GCP_REGION=us-central1"

if [ $? -eq 0 ]; then
  echo "------------------------------------------------"
  echo -e "${GREEN}✅ Deployment successful!${NC}"
  echo -e "${BLUE}📍 Service URL: ${NC}$("$GCLOUD_BIN" run services describe genai-video-eval --region us-central1 --format='value(status.url)')"
  echo "------------------------------------------------"
else
  echo -e "${RED}❌ Deployment failed. Check the logs above.${NC}"
  exit 1
fi
