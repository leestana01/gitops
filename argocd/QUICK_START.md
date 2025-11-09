# ArgoCD 빠른 시작 가이드

## ⚡ 5분 안에 ArgoCD 시작하기

### 1. ArgoCD 설치 (2분)

```bash
# Namespace 생성 및 ArgoCD 설치
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 설치 완료 대기
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
```

### 2. ArgoCD 접속 (1분)

```bash
# admin 비밀번호 확인
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo

# 포트포워딩으로 접속
kubectl port-forward svc/argocd-server -n argocd 8080:443

# 브라우저에서 https://localhost:8080 접속
# Username: admin
# Password: 위에서 확인한 비밀번호
```

### 3. 첫 번째 애플리케이션 배포 (2분)

#### 방법 1: UI에서 배포

1. ArgoCD UI 접속
2. "+ NEW APP" 클릭
3. 다음 정보 입력:
   - **Application Name**: guestbook
   - **Project**: default
   - **Sync Policy**: Automatic
   - **Repository URL**: https://github.com/argoproj/argocd-example-apps
   - **Path**: guestbook
   - **Cluster URL**: https://kubernetes.default.svc
   - **Namespace**: guestbook
4. "CREATE" 클릭

#### 방법 2: CLI로 배포

```bash
# ArgoCD CLI 설치 (macOS)
brew install argocd

# 로그인
argocd login localhost:8080 --insecure

# 애플리케이션 생성
argocd app create guestbook \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace guestbook

# Sync (배포)
argocd app sync guestbook
```

#### 방법 3: YAML로 배포

```bash
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: guestbook
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
EOF
```

### 4. 배포 확인

```bash
# 애플리케이션 상태 확인
argocd app list
argocd app get guestbook

# Kubernetes 리소스 확인
kubectl get all -n guestbook
```

## 🎯 다음 단계

### 실제 프로젝트에 적용하기

#### 1. Git Repository 준비
```bash
# 프로젝트 디렉토리 생성
mkdir -p my-app/k8s
cd my-app

# Kubernetes 매니페스트 작성
cat <<EOF > k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: nginx:latest
        ports:
        - containerPort: 80
EOF

cat <<EOF > k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
EOF

# Git에 푸시
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/my-app.git
git push -u origin main
```

#### 2. ArgoCD Application 생성
```bash
argocd app create my-app \
  --repo https://github.com/your-org/my-app.git \
  --path k8s \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app \
  --sync-policy automated \
  --auto-prune \
  --self-heal

# Sync
argocd app sync my-app
```

#### 3. GitOps 워크플로우 테스트
```bash
# deployment.yaml 수정 (replicas 변경)
sed -i '' 's/replicas: 2/replicas: 3/' k8s/deployment.yaml

# Git에 커밋
git add k8s/deployment.yaml
git commit -m "Scale to 3 replicas"
git push

# ArgoCD가 자동으로 변경사항 감지 및 배포 (약 3분 소요)
# 또는 즉시 동기화
argocd app sync my-app
```

### Ingress 설정하기

```bash
# 1. cert-manager 설치
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml

# 2. nginx-ingress 설치
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# 3. ArgoCD Ingress 적용
kubectl apply -f argocd_ingress.yaml

# 4. 도메인 접속
# https://argocd.klr.kr
```

## 🔧 유용한 명령어

### 애플리케이션 관리
```bash
# 목록 조회
argocd app list

# 상태 확인
argocd app get <app-name>

# 수동 Sync
argocd app sync <app-name>

# 히스토리 확인
argocd app history <app-name>

# 롤백
argocd app rollback <app-name> <revision>

# 삭제
argocd app delete <app-name>
```

### 클러스터 관리
```bash
# 클러스터 목록
argocd cluster list

# 클러스터 추가
argocd cluster add <context-name>
```

### Repository 관리
```bash
# Repository 목록
argocd repo list

# Repository 추가
argocd repo add https://github.com/your-org/repo.git \
  --username <username> \
  --password <token>
```

## 🐛 문제 해결

### ArgoCD에 접속할 수 없을 때
```bash
# Pod 상태 확인
kubectl get pods -n argocd

# 로그 확인
kubectl logs -n argocd deployment/argocd-server

# 재시작
kubectl rollout restart deployment argocd-server -n argocd
```

### Application이 Sync되지 않을 때
```bash
# 차이점 확인
argocd app diff <app-name>

# 강제 Sync
argocd app sync <app-name> --force

# Application Controller 로그 확인
kubectl logs -n argocd deployment/argocd-application-controller
```

### TLS 인증서 문제
```bash
# Certificate 상태 확인
kubectl get certificate -n argocd
kubectl describe certificate argocd-tls -n argocd

# cert-manager 로그
kubectl logs -n cert-manager deployment/cert-manager
```

## 📚 추가 학습 자료

### 공식 문서
- [ArgoCD 문서](https://argo-cd.readthedocs.io/)
- [GitOps란?](https://www.gitops.tech/)

### 예제 Repository
- [ArgoCD 예제 앱](https://github.com/argoproj/argocd-example-apps)
- [Awesome ArgoCD](https://github.com/terrytangyuan/awesome-argo)

### 비디오
- [ArgoCD Tutorial for Beginners](https://www.youtube.com/results?search_query=argocd+tutorial)

## 💡 팁

1. **자동 동기화 활성화**: GitOps의 이점을 최대한 활용
2. **App of Apps 패턴**: 여러 앱을 쉽게 관리
3. **Kustomize 사용**: 환경별 설정 관리
4. **Sealed Secrets**: 민감 정보 안전하게 관리
5. **알림 설정**: Slack/Email로 배포 상태 모니터링

## 🎓 실습 과제

1. ✅ 간단한 웹 애플리케이션을 ArgoCD로 배포
2. ✅ Git에서 replicas를 수정하고 자동 배포 확인
3. ✅ Kustomize를 사용해 dev/prod 환경 분리
4. ✅ Helm chart를 ArgoCD로 배포
5. ✅ App of Apps 패턴으로 여러 앱 관리

완료하셨나요? 🎉 이제 본격적인 GitOps 여정을 시작하세요!
