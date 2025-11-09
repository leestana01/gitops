# ArgoCD 구축을 위한 필수 조치사항

## ⚠️ 사용자가 직접 수행해야 하는 작업들

ArgoCD 구축을 완료하기 위해서는 다음 작업들을 직접 수행하셔야 합니다:

## 1. 🌐 DNS 설정

### 도메인 A 레코드 추가
ArgoCD 도메인이 Kubernetes Ingress 로드밸런서를 가리키도록 설정해야 합니다.

```bash
# 1. Ingress 외부 IP 확인
kubectl get svc -n ingress-nginx ingress-nginx-controller

# 출력 예시:
# NAME                       TYPE           CLUSTER-IP      EXTERNAL-IP
# ingress-nginx-controller   LoadBalancer   10.96.123.45    203.0.113.10
```

**DNS 설정 (도메인 제공업체에서)**:
- 레코드 타입: `A`
- 호스트명: `argocd` 또는 `argocd.klr.kr`
- 값: `<EXTERNAL-IP>` (위에서 확인한 IP)
- TTL: `300` (5분) 또는 기본값

**확인**:
```bash
# DNS 전파 확인 (몇 분 소요될 수 있음)
nslookup argocd.klr.kr
dig argocd.klr.kr

# 응답에서 올바른 IP가 나오는지 확인
```

## 2. 📧 Let's Encrypt 이메일 설정

### cert-manager ClusterIssuer 생성
TLS 인증서 발급을 위한 이메일 주소를 실제 값으로 변경해야 합니다.

```bash
# ClusterIssuer 생성 (이메일 주소를 실제 값으로 변경)
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@klr.kr  # ⚠️ 실제 이메일로 변경 필수
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

**중요**:
- 유효한 이메일 주소를 사용해야 인증서 만료 알림을 받을 수 있습니다
- Let's Encrypt는 이메일 인증을 요구할 수 있습니다

## 3. 🔗 Git Repository 설정

### 현재 설정을 Git에 푸시

모든 ArgoCD 설정 파일들이 Git repository에 있어야 GitOps가 작동합니다.

```bash
# 1. 현재 디렉토리에서 Git 초기화 (아직 안 했다면)
cd /Users/leesh/kubefiles
git init

# 2. ArgoCD 설정 파일 추가
git add argocd/
git commit -m "Add ArgoCD GitOps configuration"

# 3. GitHub/GitLab에 repository 생성 후 연결
git remote add origin https://github.com/your-org/kubefiles.git
git branch -M main
git push -u origin main
```

### Application YAML 파일 수정

다음 파일들에서 `repoURL`을 실제 Git repository 주소로 변경해야 합니다:

**수정 필요 파일**:
1. `applications/app-of-apps.yaml`
2. `applications/example-app.yaml`
3. `applications/helm-app.yaml`

```yaml
# 예시: applications/example-app.yaml
source:
  repoURL: https://github.com/your-org/kubefiles  # ⚠️ 실제 주소로 변경
  targetRevision: HEAD
  path: argocd/examples/guestbook
```

**변경 방법**:
```bash
# 모든 파일에서 placeholder를 실제 주소로 변경
cd /Users/leesh/kubefiles/argocd
sed -i '' 's|https://github.com/your-org/kubefiles|https://github.com/실제조직/실제저장소|g' applications/*.yaml

# 변경 확인
git diff applications/

# 커밋 및 푸시
git add applications/
git commit -m "Update repository URLs"
git push
```

## 4. 🔐 Private Repository 인증 (필요시)

### Private Git Repository 사용 시

ArgoCD가 private repository에 접근하려면 인증 정보가 필요합니다.

**방법 1: Personal Access Token (GitHub)**

```bash
# 1. GitHub에서 Personal Access Token 생성
# Settings → Developer settings → Personal access tokens → Generate new token
# 권한: repo (전체)

# 2. ArgoCD CLI로 repository 추가
argocd repo add https://github.com/your-org/private-repo.git \
  --username your-github-username \
  --password ghp_your_personal_access_token

# 3. 또는 UI에서 추가
# Settings → Repositories → Connect Repo using HTTPS
```

**방법 2: SSH Key**

```bash
# 1. SSH 키 생성 (없다면)
ssh-keygen -t ed25519 -C "argocd@klr.kr"

# 2. 공개키를 GitHub Deploy Keys에 추가
cat ~/.ssh/id_ed25519.pub

# 3. ArgoCD에 SSH 키 등록
argocd repo add git@github.com:your-org/private-repo.git \
  --ssh-private-key-path ~/.ssh/id_ed25519
```

## 5. 🔔 Slack 알림 설정 (선택사항)

### Slack 연동을 위한 설정

```bash
# 1. Slack App 생성
# https://api.slack.com/apps → Create New App

# 2. Bot Token 발급
# OAuth & Permissions → Bot Token Scopes → chat:write
# Install App to Workspace → Copy "Bot User OAuth Token"

# 3. Secret 업데이트
kubectl edit secret argocd-notifications-secret -n argocd

# stringData 섹션에 추가:
# slack-token: "xoxb-your-actual-slack-bot-token"

# 4. Notifications ConfigMap 적용
kubectl apply -f install/argocd-notifications.yaml

# 5. Controller 재시작
kubectl rollout restart deployment argocd-notifications-controller -n argocd
```

## 6. 🔑 초기 Admin 비밀번호 변경

### 보안을 위한 비밀번호 변경

```bash
# 1. 초기 비밀번호로 로그인
argocd login argocd.klr.kr

# 2. 비밀번호 변경
argocd account update-password

# 3. 초기 secret 삭제 (선택사항)
kubectl delete secret argocd-initial-admin-secret -n argocd
```

## 7. 🔧 추가 권장 조치사항

### cert-manager 설치
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml
```

### nginx-ingress-controller 설치
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

### Sealed Secrets 설치 (민감 정보 암호화)
```bash
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml
```

## 📋 체크리스트

배포 전 다음 항목들을 확인하세요:

- [ ] DNS A 레코드 설정 (argocd.klr.kr → Ingress IP)
- [ ] DNS 전파 확인 (nslookup/dig)
- [ ] cert-manager 설치
- [ ] nginx-ingress-controller 설치
- [ ] Let's Encrypt ClusterIssuer 생성 (실제 이메일 사용)
- [ ] Git repository 생성 및 코드 푸시
- [ ] Application YAML의 repoURL 수정
- [ ] Private repo 사용 시 인증 설정
- [ ] ArgoCD admin 비밀번호 변경
- [ ] (선택) Slack 알림 설정
- [ ] (선택) Sealed Secrets 설치

## 🆘 도움이 필요하신가요?

각 단계별 상세 가이드는 다음 문서를 참고하세요:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 전체 배포 가이드
- [QUICK_START.md](./QUICK_START.md) - 빠른 시작 가이드
- [README.md](./README.md) - 프로젝트 개요

## 📞 문제 해결

문제가 발생하면 다음을 확인하세요:

1. **DNS 문제**: `nslookup argocd.klr.kr` 결과 확인
2. **TLS 인증서**: `kubectl get certificate -n argocd` 상태 확인
3. **ArgoCD 상태**: `kubectl get pods -n argocd` 모든 Pod가 Running인지 확인
4. **로그 확인**: `kubectl logs -n argocd deployment/argocd-server -f`

필요시 Claude Code나 ArgoCD 커뮤니티에 문의하세요!
