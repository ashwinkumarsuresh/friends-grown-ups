#!/bin/bash

PROJECT_ID="ashwinstock"
SERVICE_NAME="friends-game-grownups"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Deploying Friends Game Grown-Ups to Cloud Run ===${NC}\n"

gcloud config set project ${PROJECT_ID}

echo -e "${BLUE}Building Docker image...${NC}"
gcloud builds submit --tag ${IMAGE_NAME}

echo -e "${BLUE}Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300 \
    --set-env-vars "FRIENDS_GROWNUPS_PASSWORD=${FRIENDS_GROWNUPS_PASSWORD}" \
    --set-env-vars "SESSION_SECRET=$(openssl rand -hex 32)" \
    --set-env-vars "GOOGLE_API_KEY=${GOOGLE_API_KEY:-}" \
    --set-env-vars "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}" \
    --set-env-vars "OPENAI_API_KEY=${OPENAI_API_KEY:-}" \
    --set-env-vars "GOOGLE_MODEL=gemini-2.0-flash" \
    --set-env-vars "ANTHROPIC_MODEL=claude-sonnet-4-20250514" \
    --set-env-vars "OPENAI_MODEL=gpt-4o-mini"

SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
echo -e "${GREEN}Username: admin${NC}"
echo -e "${GREEN}Password: (set via FRIENDS_GROWNUPS_PASSWORD)${NC}\n"
