#!/usr/bin/env bash
# ============================================================
# Workshop Setup Script
# ============================================================
# This script installs everything you need on a local
# Kubernetes cluster (Docker Desktop) to run the workshop.
#
# Prerequisites:
#   - Docker Desktop with Kubernetes enabled
#   - kubectl configured to talk to your local cluster
#   - helm (optional, but recommended)
#
# What this script does:
#   1. Verifies prerequisites
#   2. Installs ArgoCD
#   3. Installs Argo Rollouts
#   4. Installs the Argo Rollouts kubectl plugin
#   5. Creates the workshop namespace
#   6. Prints access information
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Canary Bubbles Workshop — Setup        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Step 0: Check prerequisites ──
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

if ! command -v kubectl &>/dev/null; then
    echo -e "${RED}✗ kubectl not found. Please install it first.${NC}"
    echo "  → https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

if ! kubectl cluster-info &>/dev/null; then
    echo -e "${RED}✗ Cannot connect to Kubernetes cluster.${NC}"
    echo "  → Make sure Docker Desktop Kubernetes is enabled."
    echo "  → Docker Desktop → Settings → Kubernetes → Enable Kubernetes"
    exit 1
fi

echo -e "${GREEN}✓ kubectl is installed and cluster is reachable${NC}"

CONTEXT=$(kubectl config current-context)
echo -e "  Current context: ${BOLD}${CONTEXT}${NC}"

# Safety check — warn if not a local cluster
if [[ "$CONTEXT" != *"docker-desktop"* && "$CONTEXT" != *"minikube"* && "$CONTEXT" != *"kind"* ]]; then
    echo -e "${YELLOW}⚠ Warning: You don't seem to be on a local cluster (${CONTEXT}).${NC}"
    echo -e "  This workshop is meant for local development clusters."
    read -p "  Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ── Step 1: Install ArgoCD ──
echo ""
echo -e "${YELLOW}[2/6] Installing ArgoCD...${NC}"

kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo -e "${GREEN}✓ ArgoCD installed${NC}"

# ── Step 2: Wait for ArgoCD to be ready ──
echo ""
echo -e "${YELLOW}[3/6] Waiting for ArgoCD to be ready (this may take 1-2 min)...${NC}"

kubectl rollout status deployment/argocd-server -n argocd --timeout=120s
echo -e "${GREEN}✓ ArgoCD server is running${NC}"

# ── Step 3: Install Argo Rollouts ──
echo ""
echo -e "${YELLOW}[4/6] Installing Argo Rollouts...${NC}"

kubectl create namespace argo-rollouts --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

echo -e "${GREEN}✓ Argo Rollouts installed${NC}"

# ── Step 4: Wait for Argo Rollouts to be ready ──
echo ""
echo -e "${YELLOW}[5/6] Waiting for Argo Rollouts to be ready...${NC}"

kubectl rollout status deployment/argo-rollouts -n argo-rollouts --timeout=120s
echo -e "${GREEN}✓ Argo Rollouts controller is running${NC}"

# ── Step 5: Create workshop namespace ──
echo ""
echo -e "${YELLOW}[6/6] Creating workshop namespace...${NC}"

kubectl apply -f ../k8s/namespace.yaml
echo -e "${GREEN}✓ Namespace 'canary-bubbles' created${NC}"

# ── Print access info ──
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║           Setup Complete!                 ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}ArgoCD UI:${NC}"
echo -e "  Run:  kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo -e "  Open: https://localhost:8080"
echo -e "  User: admin"
echo -e "  Pass: Run this to get the password:"
echo -e "        kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
echo ""
echo -e "${BOLD}Argo Rollouts Dashboard:${NC}"
echo -e "  Run:  kubectl argo rollouts dashboard -n canary-bubbles"
echo -e "  Open: http://localhost:3100"
echo ""
echo -e "${BOLD}Install the Argo Rollouts kubectl plugin:${NC}"
echo -e "  macOS:  brew install argoproj/tap/kubectl-argo-rollouts"
echo -e "  Linux:  curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64"
echo -e "          chmod +x kubectl-argo-rollouts-linux-amd64"
echo -e "          sudo mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts"
echo ""
echo -e "${GREEN}You're ready for the workshop! 🎉${NC}"
