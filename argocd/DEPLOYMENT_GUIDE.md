# ArgoCD 배포 가이드

## 📋 사전 요구사항

### 1. Kubernetes 클러스터
- Kubernetes 1.21+ 버전
- kubectl 설치 및 클러스터 접근 권한

```bash
# 클러스터 연결 확인
kubectl cluster-info
kubectl get nodes
```

### 2. 필수 컴포넌트

#### cert-manager (TLS 인증서 자동 관리)
```bash
# cert-manager 설치
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml

# 설치 확인
kubectl get pods -n cert-manager
```

#### nginx-ingress-controller
```bash
# Helm으로 설치
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# 또는 manifest로 설치
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# 설치 확인
kubectl get pods -n ingress-nginx
```

#### Let's Encrypt ClusterIssuer
```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@klr.kr  # 실제 이메일로 변경
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 3. DNS 설정
argocd.klr.kr 도메인이 클러스터 Ingress IP를 가리키도록 설정

```bash
# Ingress IP 확인
kubectl get svc -n ingress-nginx ingress-nginx-controller

# DNS A 레코드 추가
# argocd.klr.kr -> <EXTERNAL-IP>
```

## 🚀 ArgoCD 설치

### Step 1: Namespace 생성
```bash
kubectl create namespace argocd
```

### Step 2: ArgoCD 설치
```bash
# 공식 manifest 사용
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 설치 확인
kubectl get pods -n argocd

# 모든 Pod가 Running 상태가 될 때까지 대기
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
```

### Step 3: 초기 admin 비밀번호 확인
```bash
# admin 비밀번호 확인
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo

# 비밀번호를 안전한 곳에 저장하세요
```

### Step 4: ConfigMap 적용
```bash
# ArgoCD 설정 적용
kubectl apply -f install/argocd-cm.yaml

# ArgoCD 서버 재시작
kubectl rollout restart deployment argocd-server -n argocd
kubectl rollout restart deployment argocd-repo-server -n argocd
```

### Step 5: Ingress 적용
```bash
# Ingress 리소스 생성
kubectl apply -f argocd_ingress.yaml

# Ingress 상태 확인
kubectl get ingress -n argocd

# TLS 인증서 확인 (1-2분 소요)
kubectl get certificate -n argocd
```

### Step 6: ArgoCD 접속 확인
```bash
# 웹 브라우저에서 접속
# https://argocd.klr.kr

# 또는 포트포워딩으로 테스트
kubectl port-forward svc/argocd-server -n argocd 8080:443

# 브라우저에서 https://localhost:8080 접속
```

## 🔧 ArgoCD CLI 설치 및 설정

### CLI 설치
```bash
# macOS
brew install argocd

# Linux
curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
rm argocd-linux-amd64

# 버전 확인
argocd version
```

### CLI 로그인
```bash
# ArgoCD 서버에 로그인
argocd login argocd.klr.kr

# Username: admin
# Password: <위에서 확인한 초기 비밀번호>

# 비밀번호 변경
argocd account update-password
```

## 📦 프로젝트 및 애플리케이션 배포

### Step 1: AppProject 생성
```bash
# 프로젝트 정의 적용
kubectl apply -f projects/project-default.yaml

# 프로젝트 확인
kubectl get appprojects -n argocd
argocd proj list
```

### Step 2: 예제 애플리케이션 배포

#### Git Repository 설정
먼저 이 ArgoCD 설정들을 Git repository에 푸시해야 합니다:

```bash
# 현재 디렉토리에서
cd /Users/leesh/kubefiles

# Git 초기화 (아직 안 했다면)
git init
git add argocd/
git commit -m "Add ArgoCD GitOps configuration"

# GitHub에 repository 생성 후
git remote add origin https://github.com/your-org/kubefiles.git
git push -u origin main
```

#### Application 생성
```bash
# Repository URL을 실제 주소로 변경
# applications/example-app.yaml 파일에서 repoURL 수정

# 예제 애플리케이션 배포
kubectl apply -f applications/example-app.yaml

# 애플리케이션 상태 확인
argocd app list
argocd app get guestbook

# Sync (배포) 실행
argocd app sync guestbook
```

### Step 3: App of Apps 패턴 (권장)
```bash
# applications/app-of-apps.yaml에서 repoURL 수정

# App of Apps 배포
kubectl apply -f applications/app-of-apps.yaml

# 이후 applications/ 폴더에 새 애플리케이션을 추가하면 자동으로 배포됩니다
```

## 🔔 Notifications 설정 (선택사항)

### Slack 연동
```bash
# 1. Slack App 생성 및 Bot Token 발급
# https://api.slack.com/apps

# 2. Secret 업데이트
kubectl edit secret argocd-notifications-secret -n argocd
# slack-token 값을 실제 토큰으로 변경

# 3. Notifications 설정 적용
kubectl apply -f install/argocd-notifications.yaml

# 4. Notifications Controller 재시작
kubectl rollout restart deployment argocd-notifications-controller -n argocd
```

## 🎯 GitOps Workflow 설정

### 1. Repository Structure
권장 디렉토리 구조:

```
your-repo/
├── argocd/
│   ├── applications/          # ArgoCD Application 정의
│   ├── projects/              # ArgoCD Project 정의
│   └── install/               # ArgoCD 설치 매니페스트
├── environments/
│   ├── development/
│   │   └── kustomization.yaml
│   ├── staging/
│   │   └── kustomization.yaml
│   └── production/
│       └── kustomization.yaml
└── apps/
    ├── app1/
    │   ├── base/
    │   │   ├── deployment.yaml
    │   │   ├── service.yaml
    │   │   └── kustomization.yaml
    │   └── overlays/
    │       ├── dev/
    │       ├── staging/
    │       └── production/
    └── app2/
        └── ...
```

### 2. CI/CD Pipeline 통합

#### GitHub Actions 예제
```yaml
# .github/workflows/update-image.yaml
name: Update Image Tag

on:
  push:
    branches: [ main ]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Update image tag
        run: |
          cd apps/myapp/overlays/production
          kustomize edit set image myapp=myregistry.io/myapp:${{ github.sha }}

      - name: Commit changes
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add .
          git commit -m "Update image to ${{ github.sha }}"
          git push
```

#### ArgoCD Image Updater (자동 이미지 업데이트)
```bash
# Helm으로 설치
helm install argocd-image-updater argo/argocd-image-updater \
  --namespace argocd

# Application에 annotation 추가
# argocd-image-updater.argoproj.io/image-list: myapp=myregistry.io/myapp
# argocd-image-updater.argoproj.io/write-back-method: git
```

## 🔍 모니터링 및 문제 해결

### 상태 확인
```bash
# ArgoCD 컴포넌트 상태
kubectl get pods -n argocd

# 애플리케이션 상태
argocd app list
argocd app get <app-name>

# Sync 상태 상세
argocd app diff <app-name>
```

### 로그 확인
```bash
# Server 로그
kubectl logs -n argocd deployment/argocd-server -f

# Application Controller 로그
kubectl logs -n argocd deployment/argocd-application-controller -f

# Repo Server 로그
kubectl logs -n argocd deployment/argocd-repo-server -f
```

### 일반적인 문제 해결

#### 1. Application이 OutOfSync 상태
```bash
# 차이점 확인
argocd app diff <app-name>

# 강제 Sync
argocd app sync <app-name> --force

# Prune 및 Replace
argocd app sync <app-name> --prune --replace
```

#### 2. Ingress TLS 인증서 문제
```bash
# Certificate 상태 확인
kubectl get certificate -n argocd
kubectl describe certificate argocd-tls -n argocd

# CertificateRequest 확인
kubectl get certificaterequest -n argocd
kubectl describe certificaterequest <name> -n argocd

# cert-manager 로그
kubectl logs -n cert-manager deployment/cert-manager -f
```

#### 3. Repository 연결 실패
```bash
# Repository 확인
argocd repo list

# Repository 재연결
argocd repo add https://github.com/your-org/your-repo \
  --username <username> \
  --password <password>
```

## 🔒 보안 강화

### 1. Admin 비밀번호 변경
```bash
argocd account update-password
```

### 2. RBAC 설정
```bash
# 사용자 생성
argocd account update-password --account <username> --new-password <password>

# 역할 부여 (argocd-rbac-cm ConfigMap에서 설정)
```

### 3. Private Repository 인증
```bash
# SSH Key 방식
argocd repo add git@github.com:your-org/private-repo.git \
  --ssh-private-key-path ~/.ssh/id_rsa

# HTTPS 방식
argocd repo add https://github.com/your-org/private-repo.git \
  --username <username> \
  --password <token>
```

### 4. Secret 관리

#### Sealed Secrets 사용
```bash
# Sealed Secrets Controller 설치
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# kubeseal CLI 설치
brew install kubeseal

# Secret 봉인
kubectl create secret generic mysecret --dry-run=client --from-literal=password=mypass -o yaml | \
  kubeseal -o yaml > mysealedsecret.yaml

# Git에 커밋
git add mysealedsecret.yaml
git commit -m "Add sealed secret"
```

## 📊 다음 단계

### 1. Prometheus & Grafana 모니터링
```bash
kubectl apply -f applications/helm-app.yaml  # Prometheus 예제 포함
```

### 2. Progressive Delivery (Argo Rollouts)
```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

### 3. Multi-Cluster 관리
```bash
# 다른 클러스터 추가
argocd cluster add <context-name>
```

### 4. ApplicationSet으로 다중 환경 관리
```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-env
spec:
  generators:
  - list:
      elements:
      - env: dev
      - env: staging
      - env: production
  template:
    metadata:
      name: '{{env}}-app'
    spec:
      project: default
      source:
        repoURL: https://github.com/your-org/repo
        path: 'environments/{{env}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{env}}'
```

## 📚 참고 자료

- [ArgoCD 공식 문서](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://opengitops.dev/)
- [Kustomize 문서](https://kustomize.io/)
- [Helm 문서](https://helm.sh/docs/)
