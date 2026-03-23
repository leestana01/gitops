#!/bin/bash
# ArgoCD installation via Helm
# Run this script to install/upgrade ArgoCD

set -euo pipefail

NAMESPACE="argocd"
RELEASE="argocd"
CHART="argo/argo-cd"
VALUES_FILE="$(dirname "$0")/values.yaml"

# Add Helm repo
helm repo add argo https://argoproj.github.io/argo-helm 2>/dev/null || true
helm repo update argo

# Install/Upgrade ArgoCD
helm upgrade --install "$RELEASE" "$CHART" \
  -n "$NAMESPACE" \
  -f "$VALUES_FILE" \
  --wait --timeout 5m

echo ""
echo "ArgoCD installed successfully!"
echo ""
echo "Get initial admin password:"
echo "  kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
echo ""
echo "Access ArgoCD at: https://argocd.klr.kr (via VPN)"
