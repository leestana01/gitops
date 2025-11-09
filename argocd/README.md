# ArgoCD GitOps CI/CD Setup

ArgoCD를 활용한 Kubernetes GitOps 기반 CI/CD 파이프라인 구축 가이드

## 📁 Directory Structure

```
argocd/
├── README.md                          # This file
├── install/
│   ├── argocd-install.yaml           # ArgoCD core installation
│   └── argocd-cm.yaml                # ArgoCD ConfigMap
├── applications/
│   ├── app-of-apps.yaml              # App of Apps pattern
│   ├── example-app.yaml              # Example application
│   └── helm-app.yaml                 # Helm-based application
├── projects/
│   └── project-example.yaml          # ArgoCD Project definition
├── examples/
│   └── guestbook/                    # Example Kubernetes manifests
│       ├── deployment.yaml
│       ├── service.yaml
│       └── kustomization.yaml
└── argocd_ingress.yaml               # Existing ingress configuration

```

## 🚀 Installation Steps

### 1. ArgoCD 설치

```bash
# ArgoCD namespace 생성
kubectl create namespace argocd

# ArgoCD 설치
kubectl apply -n argocd -f install/argocd-install.yaml

# ArgoCD 설치 확인
kubectl get pods -n argocd

# ArgoCD admin 초기 비밀번호 확인
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### 2. Ingress 설정

```bash
# 기존 ingress 적용
kubectl apply -f argocd_ingress.yaml

# cert-manager가 설치되어 있어야 합니다
# Let's Encrypt 인증서가 자동으로 발급됩니다
```

### 3. ArgoCD CLI 설치 (Optional)

```bash
# macOS
brew install argocd

# Linux
curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argocd-cmd/releases/latest/download/argocd-linux-amd64
sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
rm argocd-linux-amd64
```

### 4. ArgoCD 로그인

```bash
# CLI 로그인
argocd login argocd.klr.kr

# 또는 웹 UI 접속
# https://argocd.klr.kr
```

### 5. Application 배포

```bash
# App of Apps 패턴으로 모든 애플리케이션 배포
kubectl apply -f applications/app-of-apps.yaml

# 개별 애플리케이션 배포
kubectl apply -f applications/example-app.yaml
```

## 🔧 Configuration

### ArgoCD ConfigMap 설정

`install/argocd-cm.yaml` 파일에서 다음 설정을 커스터마이징할 수 있습니다:

- **repository.credentials**: Private Git repository 인증 정보
- **url**: ArgoCD 서버 URL
- **dex.config**: SSO 설정
- **resource.customizations**: Custom health checks

### Project 설정

ArgoCD Project를 통해 다음을 제어할 수 있습니다:
- 허용된 소스 저장소
- 배포 가능한 네임스페이스
- 사용 가능한 리소스 타입

## 📊 GitOps Workflow

```
Developer → Git Push → Git Repository
                            ↓
                        ArgoCD (Sync)
                            ↓
                      Kubernetes Cluster
```

### Sync Policy

- **Manual Sync**: 수동으로 배포 승인
- **Automatic Sync**: Git 변경사항 자동 배포
- **Auto-Prune**: 삭제된 리소스 자동 제거
- **Self-Heal**: 수동 변경사항 자동 복구

## 🔐 Security

### RBAC 설정

ArgoCD는 다음 두 가지 RBAC을 제공합니다:

1. **ArgoCD RBAC**: ArgoCD 내부 권한 관리
2. **Kubernetes RBAC**: 배포 대상 리소스 권한

### Secret 관리

```bash
# Sealed Secrets 사용 권장
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# 또는 External Secrets Operator
# 또는 Vault integration
```

## 🎯 Best Practices

1. **App of Apps Pattern**: 여러 애플리케이션을 하나의 부모 앱으로 관리
2. **Separate Environments**: dev/staging/prod 별도 브랜치 또는 디렉토리
3. **Kustomize/Helm**: 환경별 설정 관리
4. **Image Updater**: 자동 이미지 업데이트 (optional)
5. **Notification**: Slack/Email 알림 설정
6. **Backup**: ArgoCD 설정 백업

## 🔍 Monitoring

```bash
# ArgoCD 상태 확인
kubectl get applications -n argocd

# Sync 상태 확인
argocd app list

# 특정 앱 상세 정보
argocd app get <app-name>

# Sync history
argocd app history <app-name>
```

## 🐛 Troubleshooting

### Application이 OutOfSync 상태일 때

```bash
# 차이점 확인
argocd app diff <app-name>

# 강제 Sync
argocd app sync <app-name> --force

# Prune 및 Self-Heal
argocd app sync <app-name> --prune --self-heal
```

### Connection 문제

```bash
# ArgoCD 로그 확인
kubectl logs -n argocd deployment/argocd-server
kubectl logs -n argocd deployment/argocd-repo-server
kubectl logs -n argocd deployment/argocd-application-controller
```

## 📚 Additional Resources

- [ArgoCD Official Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://opengitops.dev/)
- [ArgoCD Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)

## ⚙️ Next Steps

1. **Image Updater 설정**: 컨테이너 이미지 자동 업데이트
2. **ApplicationSet 도입**: 멀티 클러스터/환경 관리
3. **Progressive Delivery**: Argo Rollouts로 Canary/Blue-Green 배포
4. **CI Integration**: GitHub Actions/Jenkins와 통합
