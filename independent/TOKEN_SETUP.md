# 전용 토큰 설정 런북 (Task 4)

운영 자동 배포가 현재 공유 빌드 토큰(`workflows-starter-template build token`)에 의존하고, 후기 관리자 함수 배포는 저장소 비밀 `SUPABASE_ACCESS_TOKEN` 부재로 차단되어 있습니다. 두 단일 실패점을 제거하는 절차입니다.

> ⚠️ 토큰 생성은 Cloudflare/Supabase 대시보드에서 직접 수행해야 합니다. 이 문서는 정확한 권한 범위와 교체 순서를 제공합니다.

---

## 1. Cloudflare 전용 Workers Builds 토큰

현재 Worker 자동 배포는 공유 빌드 토큰으로 연결되어 있습니다. 이 토큰이 삭제되면 빌드가 중단됩니다. **반드시 신규 전용 토큰을 먼저 검증한 뒤 공유 토큰을 삭제**하세요.

### 생성
1. Cloudflare 대시보드 → **My Profile → API Tokens → Create Token**
2. **Create Custom Token** 선택
3. 권한 범위 (최소 필요):
   - **Account → Workers Builds → Edit** (또는 배포에 필요한 `Workers Scripts: Edit`)
   - Account Resources: 금융상담 플랫폼이 있는 계정 **한정**
   - TTL: 필요시 만료일 설정
4. 토큰 생성 후 즉시 안전하게 보관 (비밀번호 매니저 등)

### 교체 순서 (중요: 역순 금지)
1. **신규 토큰을 Workers Build 연결에 추가** (Cloudflare → Workers & Pages → 해당 Worker → Settings → Builds → 연결 토큰 교체)
2. **테스트 빌드 트리거**: main 브랜치에 사소한 커밋 푸시 → 자동 빌드 성공 확인
3. 빌드·배포 정상 확인 후 **공유 토큰을 Cloudflare에서 삭제**
4. `git log` / 배포 로그에서 신규 토큰으로 빌드됨 확인

참고: https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/

### 검증 명령
```bash
# Workers Build가 신규 토큰으로 정상 동작하는지 커밋 푸시 후 GitHub Actions 로그 확인
git commit --allow-empty -m "verify dedicated build token" && git push
```

---

## 2. Supabase 배포 토큰 (`SUPABASE_ACCESS_TOKEN`)

`review-admin-deploy.yml` 워크플로는 이미 토큰 부재 시 fail-fast 하도록 작성되어 있습니다. 토큰을 저장소 비밀에 등록하면 배포가 자동으로 해금됩니다.

### 생성
1. Supabase 대시보드 → **Account → Access Tokens → Generate new token**
2. 토큰 이름: `finance-review-admin-deploy`
3. (가능한 경우) 프로젝트 한정 권한 사용 — 대상 프로젝트: `mkdbexvhdayegvjgpkky`
4. 토큰 즉시 복사 (한 번만 표시됨)

### 저장소 비밀 등록
1. GitHub → `goldeget/finance-counseling-platform` → **Settings → Secrets and variables → Actions**
2. **New repository secret**:
   - Name: `SUPABASE_ACCESS_TOKEN`
   - Value: (복사한 토큰)
3. 저장

### 배포 해금 검증
1. GitHub → **Actions → Deploy review administration → Run workflow** (workflow_dispatch)
2. 워크플로 로그에서 다음 단계 통과 확인:
   - `Require deployment credential` (토큰 존재)
   - `Deploy only review-admin` (`supabase functions deploy` 성공)
   - `Confirm unauthenticated modification is blocked` (403 응답 확인)
3. 무인증 차단(403)과 관리자 변경이 정상 동작함을 확인

참고: https://supabase.com/docs/guides/functions/deploy

---

## 체크리스트

- [ ] Cloudflare 전용 빌드 토큰 생성 (계정 한정)
- [ ] 신규 토큰으로 Workers Build 연결 교체
- [ ] 테스트 빌드 성공 확인
- [ ] 공유 빌드 토큰 삭제
- [ ] Supabase 액세스 토큰 생성 (프로젝트 한정 권장)
- [ ] GitHub 저장소 비밀 `SUPABASE_ACCESS_TOKEN` 등록
- [ ] `review-admin-deploy.yml` 수동 트리거 → 배포 + 403 검증 통과
