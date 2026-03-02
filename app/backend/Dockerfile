# ---- Stage 1: Build dependencies ----
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/deps -r requirements.txt

# ---- Stage 2: Runtime ----
FROM python:3.12-slim
WORKDIR /app

# Copy installed dependencies
COPY --from=builder /deps /usr/local/lib/python3.12/site-packages

# Copy application code
COPY main.py .

# Default environment variables (overridden by K8s manifests)
ENV APP_VERSION="1.0.0"
ENV APP_COLOR="#3498db"
ENV APP_NAME="canary-bubbles"

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
