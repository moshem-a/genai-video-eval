#!/bin/bash

# GenAI Video Evaluator - Full-Stack ADK Cloud Run Deployment Script

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Absolute path to gcloud found on system
GCLOUD_BIN="gcloud"
export CLOUDSDK_PYTHON="/usr/local/bin/python3.13"

echo "------------------------------------------------"
echo -e "${BLUE}🚀 Starting Full-Stack ADK Deployment to Cloud Run...${NC}"
echo "------------------------------------------------"

# Check for gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI not found.${NC}"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}❌ Error: No Google Cloud project is configured.${NC}"
  exit 1
fi

echo -e "${BLUE}📦 Using Project: ${GREEN}$PROJECT_ID${NC}"

# Ensure necessary APIs are enabled
echo -e "${BLUE}🔧 Ensuring necessary APIs are enabled...${NC}"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com aiplatform.googleapis.com --quiet

# Check for AGENT_ENGINE_ID
if [ -z "$AGENT_ENGINE_ID" ]; then
  echo -e "${RED}⚠️  Warning: AGENT_ENGINE_ID environment variable is not set.${NC}"
  echo -e "${BLUE}Attempting to find a deployed Reasoning Engine...${NC}"
  # We try to get the most recent reasoning engine, but this might fail if gcloud beta is not installed
  FOUND_ID=$(gcloud beta ai reasoning-engines list --region us-central1 --format="value(name)" --limit=1 2>/dev/null)
  if [ -n "$FOUND_ID" ]; then
    AGENT_ENGINE_ID=$FOUND_ID
    echo -e "${GREEN}✅ Found Agent Engine: $AGENT_ENGINE_ID${NC}"
  else
    echo -e "${RED}❌ Could not automatically find an Agent Engine ID.${NC}"
    echo -e "Please set it manually: export AGENT_ENGINE_ID='projects/...'"
    # We continue but the app might fail to analyze until set
  fi
fi

# Deploy to Cloud Run
echo -e "${BLUE}🏗️  Building and deploying Full-Stack app (FastAPI + React)...${NC}"
gcloud run deploy genai-video-eval \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 1 \
  --set-env-vars "GCP_PROJECT=$PROJECT_ID,GCP_REGION=us-central1,AGENT_ENGINE_ID=$AGENT_ENGINE_ID"

if [ $? -eq 0 ]; then
  echo "------------------------------------------------"
  echo -e "${GREEN}✅ Deployment successful!${NC}"
  echo -e "${BLUE}📍 Service URL: ${NC}$(gcloud run services describe genai-video-eval --region us-central1 --format='value(status.url)')"
  echo "------------------------------------------------"
else
  echo -e "${RED}❌ Deployment failed. Check the logs above.${NC}"
  exit 1
fi
