# Canary Bubbles Workshop

A hands-on workshop that teaches **Docker**, **Kubernetes**, **ArgoCD**, and **Argo Rollouts** through a visual canary deployment demo.

The app shows **bubbles sliding across the screen** — each bubble is an API request, and its color shows which backend version responded. During a canary rollout, you see the bubble colors gradually shift from the old version to the new one in real time.

```
  🔵🔵🔵🔵🔵  →  🔵🔵🔵🟢🔵  →  🔵🟢🟢🟢🔵  →  🟢🟢🟢🟢🟢
   v1 (100%)      v2 (20%)        v2 (60%)        v2 (100%)
```

## Architecture

```
┌──────────────┐     ┌─────────────────────────────┐
│   Browser    │────▶│  Frontend (React + nginx)    │
└──────────────┘     │  Polls /api/version every    │
                     │  600ms, renders bubbles      │
                     └────────────┬────────────────┘
                                  │ /api/version
                                  ▼
                     ┌─────────────────────────────┐
                     │  backend-service (K8s Svc)   │
                     │  Load-balances across ALL    │
                     │  backend pods                │
                     └──────┬──────────────┬───────┘
                            │              │
                   ┌────────▼──────┐ ┌─────▼────────┐
                   │  Stable Pods  │ │ Canary Pods   │
                   │  v1.0 (Blue)  │ │ v2.0 (Green)  │
                   │  ██████████   │ │ ██████████    │
                   └───────────────┘ └───────────────┘
                         Managed by Argo Rollouts
```

## Version Color Map

| Version | Color   | Hex       |
|---------|---------|-----------|
| v1.0.0  | Blue    | `#3498db` |
| v2.0.0  | Green   | `#2ecc71` |
| v3.0.0  | Orange  | `#e67e22` |
| v4.0.0  | Purple  | `#9b59b6` |
| v5.0.0  | Red     | `#e74c3c` |

## Prerequisites

- **Docker Desktop** with Kubernetes enabled
- **kubectl** configured for your local cluster
- **Node.js 20+** (for local frontend development)
- **Python 3.12+** (for local backend development)
- A **GitHub account** (for CI/CD and container registry)

## Quick Start

### 1. Clone and set up

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/canary-bubbles-workshop.git
cd canary-bubbles-workshop
```

### 2. Run the setup script

```bash
cd setup
./setup.sh
```

This installs ArgoCD and Argo Rollouts on your local cluster.

### 3. Build and push Docker images

```bash
# Log in to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Build and push the backend (v1.0.0 — Blue)
cd app/backend
docker build -t ghcr.io/YOUR_GITHUB_USERNAME/canary-bubbles-backend:v1.0.0 .
docker push ghcr.io/YOUR_GITHUB_USERNAME/canary-bubbles-backend:v1.0.0

# Build and push the frontend
cd ../frontend
docker build -t ghcr.io/YOUR_GITHUB_USERNAME/canary-bubbles-frontend:v1.0.0 .
docker push ghcr.io/YOUR_GITHUB_USERNAME/canary-bubbles-frontend:v1.0.0
```

### 4. Update manifests with your GitHub username

Replace `YOUR_GITHUB_USERNAME` in these files:
- `k8s/backend-rollout.yaml`
- `k8s/frontend-deployment.yaml`
- `argocd/app-backend.yaml`
- `argocd/app-frontend.yaml`

### 5. Deploy with ArgoCD

```bash
# Apply the ArgoCD applications
kubectl apply -f argocd/app-backend.yaml
kubectl apply -f argocd/app-frontend.yaml
```

### 6. Access the app

```bash
# The frontend is exposed on NodePort 30080
open http://localhost:30080
```

You should see blue bubbles sliding across the screen!

## Triggering a Canary Rollout

This is the fun part. Build a new backend version with a different color:

```bash
# Build v2.0.0 — Green
cd app/backend
docker build \
  --build-arg APP_VERSION=v2.0.0 \
  --build-arg APP_COLOR=#2ecc71 \
  -t ghcr.io/YOUR_GITHUB_USERNAME/canary-bubbles-backend:v2.0.0 .
docker push ghcr.io/YOUR_GITHUB_USERNAME/canary-bubbles-backend:v2.0.0
```

Then update `k8s/backend-rollout.yaml`:

```yaml
# Change these three values:
image: ghcr.io/YOUR_GITHUB_USERNAME/canary-bubbles-backend:v2.0.0
- name: APP_VERSION
  value: "2.0.0"
- name: APP_COLOR
  value: "#2ecc71"
```

Commit and push. ArgoCD syncs the change, and Argo Rollouts begins the canary:

```bash
# Watch the rollout progress
kubectl argo rollouts get rollout backend -n canary-bubbles --watch

# Or open the Argo Rollouts dashboard
kubectl argo rollouts dashboard -n canary-bubbles
```

On the frontend, you'll see green bubbles start appearing among the blue ones!

## Monitoring Commands

```bash
# Watch rollout status
kubectl argo rollouts get rollout backend -n canary-bubbles --watch

# List all pods and see which version they run
kubectl get pods -n canary-bubbles -o wide

# Check analysis runs
kubectl get analysisruns -n canary-bubbles

# Manually promote the canary (skip waiting)
kubectl argo rollouts promote backend -n canary-bubbles

# Abort a rollout (roll back to stable)
kubectl argo rollouts abort backend -n canary-bubbles
```

## Project Structure

```
canary-bubbles-workshop/
├── app/
│   ├── backend/          # FastAPI app (Python)
│   │   ├── main.py       # API: /api/version, /api/health
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── frontend/         # React app with bubble animation
│       ├── src/
│       │   ├── App.jsx           # Main app + polling logic
│       │   ├── BubbleCanvas.jsx  # Canvas-based bubble animation
│       │   └── App.css           # Dark theme styling
│       ├── nginx.conf    # Proxies /api to backend service
│       └── Dockerfile
├── k8s/                  # Kubernetes manifests
│   ├── namespace.yaml
│   ├── backend-rollout.yaml      # ⭐ Argo Rollout (canary)
│   ├── backend-service.yaml      # Stable + canary services
│   ├── backend-analysis.yaml     # Health check template
│   └── frontend-deployment.yaml  # Standard deployment + service
├── argocd/               # ArgoCD Application definitions
│   ├── app-backend.yaml
│   └── app-frontend.yaml
├── .github/workflows/    # GitHub Actions CI
│   ├── backend.yaml
│   └── frontend.yaml
└── setup/
    └── setup.sh          # One-click local setup
```

## Local Development (without K8s)

```bash
# Terminal 1: Run the backend
cd app/backend
pip install -r requirements.txt
APP_VERSION=1.0.0 APP_COLOR="#3498db" uvicorn main:app --reload --port 8000

# Terminal 2: Run the frontend
cd app/frontend
npm install
npm run dev
# Open http://localhost:3000
```

## Troubleshooting

**Bubbles not appearing?**
Check that the frontend can reach the backend. In K8s, verify the backend-service exists and backend pods are running.

**Canary stuck in "Paused" state?**
The canary pauses between steps. Either wait for the timer, or manually promote: `kubectl argo rollouts promote backend -n canary-bubbles`

**Images can't be pulled?**
Make sure your GitHub Container Registry packages are public, or create an image pull secret.

**ArgoCD shows "OutOfSync"?**
Click "Sync" in the ArgoCD UI or run: `argocd app sync canary-bubbles-backend`
