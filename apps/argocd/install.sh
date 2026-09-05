#!/bin/bash
# ArgoCD installation via Helm
# Run this script to install/upgrade ArgoCD

set -euo pipefail

NAMESPACE="argocd"
RELEASE="argocd"
CHART="argo/argo-cd"
# 반드시 고정한다. 핀이 없으면 이 스크립트를 다시 돌리는 것만으로 ArgoCD 가
# 저장소 최신 차트로 점프한다(설정 한 줄 고치려다 메이저 업그레이드가 됨).
# 올릴 때는 이 값을 의도적으로 바꾸고 릴리스 노트를 확인할 것.
CHART_VERSION="9.5.2"
VALUES_FILE="$(dirname "$0")/values.yaml"

# Add Helm repo
helm repo add argo https://argoproj.github.io/argo-helm 2>/dev/null || true
helm repo update argo

# Install/Upgrade ArgoCD
helm upgrade --install "$RELEASE" "$CHART" \
  --version "$CHART_VERSION" \
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
