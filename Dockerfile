# Build stage
FROM node:20-slim AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage - Python FastAPI
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy build output from build stage to /app/dist
COPY --from=build /app/dist ./dist

# Copy backend source
COPY backend/main.py .

# Expose port (Cloud Run default)
EXPOSE 8080

# Environment variables
ENV PORT=8080

CMD ["python", "main.py"]
