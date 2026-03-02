"""
Canary Bubbles Workshop - Backend API
A simple FastAPI service that returns its version and color.
During a canary rollout, different pods return different colors,
allowing the frontend to visualize the traffic split.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Canary Bubbles API")

# Configuration via environment variables
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
APP_COLOR = os.getenv("APP_COLOR", "#3498db")  # Default: blue
APP_NAME = os.getenv("APP_NAME", "canary-bubbles")
POD_NAME = os.getenv("HOSTNAME", "unknown")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/version")
def get_version():
    """Return the current version and its associated color.
    Each version of the app is configured with a unique color,
    so the frontend can visualize which version served the request."""
    return {
        "version": APP_VERSION,
        "color": APP_COLOR,
        "pod": POD_NAME,
        "app": APP_NAME,
    }


@app.get("/api/health")
def health_check():
    """Health endpoint used by Argo Rollouts AnalysisTemplate
    to determine if the canary is healthy enough to promote."""
    return JSONResponse(content={"status": "healthy", "version": APP_VERSION}, status_code=200)


@app.get("/api/info")
def info():
    """Detailed info endpoint for debugging."""
    return {
        "version": APP_VERSION,
        "color": APP_COLOR,
        "pod": POD_NAME,
        "app": APP_NAME,
        "environment": {
            "APP_VERSION": APP_VERSION,
            "APP_COLOR": APP_COLOR,
        },
    }
