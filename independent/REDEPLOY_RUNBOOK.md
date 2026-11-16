# 재배포 런북 (Task 2)

새 Cloudflare 계정에 금융상담 플랫폼을 재배포하고 백업에서 접수·후기를 복구하는 절차입니다. 재배포 재현성을 위해 `redeploy-config.mjs`로 wrangler 설정을 생성합니다.

> 이 런북은 기존 검증 절차(`key-recovery-check`, `application-restore-check`)와 교차 참조합니다. 실제 신규 계정으로의 완전한 시험은 계정 생성 후 수행해야 합니다.

---

## 1. 신규 Cloudflare 계정 준비

1. 새 Cloudflare 계정 생성
2. 도메인 추가 (또는 workers.dev 하위 도메인 사용)
3. D1 데이터베이스 생성: `finance-counseling`
   ```bash
   npx wrangler d1 create finance-counseling
   ```
4. 생성된 `database_id` 기록

## 2. Supabase 프로젝트 준비

1. 새 Supabase 프로젝트 생성 (또는 기존 프로젝트 사용)
2. `reviews` 테이블 생성 (`independent/schema.sql` 및 `supabase-reviews.sql` 참조)
3. Publishable Key (`sb_publishable_...`) 기록
4. `review-admin` Edge Function 배포 (`review-admin-deploy.yml` 참조, `SUPABASE_ACCESS_TOKEN` 필요)

## 3. wrangler 설정 생성

```bash
node independent/redeploy-config.mjs \
  --account-id <32-hex> \
  --d1-database-id <uuid> \
  --primary-host finance.example.com \
  --admin-host admin.finance.example.com \
  --backup-host finance-counseling-app-backup.example.workers.dev \
  --supabase-url https://example.supabase.co \
  --supabase-key sb_publishable_... \
  --access-team example.cloudflareaccess.com \
  --access-aud finance-admin-aud \
  --admin-email admin@example.com \
  > independent/wrangler.production.jsonc
```

## 4. 비밀값 설정

```bash
# 암호화 키 (64-hex) — 새 키 생성 또는 기존 키 사용
npx wrangler secret put APPLICATION_ENCRYPTION_KEY
# 백업 토큰 (64-hex)
npx wrangler secret put APPLICATION_BACKUP_TOKEN
# Supabase 서비스 키 (필요시)
npx wrangler secret put SUPABASE_SERVICE_KEY
```

## 5. Cloudflare Access 구성

1. Zero Trust → Access → Applications → Add Application
2. 관리자 호스트(`admin.*`)에 Self-hosted application 추가
3. 이메일 정책으로 `admin@example.com` 허용
4. AUD 값 기록 → `ACCESS_AUD`에 설정

## 6. 워커 배포

```bash
node independent/build.mjs
npx wrangler deploy --config independent/wrangler.production.jsonc
# 백업 워커도 별도 배포
npx wrangler deploy --config independent/wrangler.backup.jsonc
```

## 7. 접수 데이터 복원

기존 백업의 암호화 접수를 새 환경으로 복원합니다. `key-recovery-check` 워크플로로 복구 키가 작동함을 먼저 확인합니다.

1. 기존 백업에서 암호화 접수 다운로드 (application-backup 아티팩트)
2. 기존 키로 복호화 (`openBackup`)
3. 새 키로 재암호화 (`seal`)
4. D1에 INSERT (`application-restore-check` 절차 참조)

## 8. 후기 데이터 복원

1. 기존 review-backup 아티팩트에서 `reviews.jsonl.gz` 다운로드
2. 압축 해제 후 Supabase REST로 일괄 INSERT (또는 `bulk_create` 액션 사용)
3. 건수·해시 검증 (`backupReviews`의 sha256 비교)

## 9. 검증

- [ ] 메인 페이지 접속 확인 (`https://<primary-host>`)
- [ ] 관리자 페이지 Access 로그인 확인
- [ ] 접수 폼 제출 → D1 저장 확인
- [ ] 후기 표시 확인
- [ ] `alert-verify-cli.mjs` 실행 → 알림 파이프라인 204 확인
- [ ] 이메일 수신함 알림 수신 확인 (수동)
- [ ] 카카오톡·채널톡 상담 버튼 동작 확인

---

## 알림 검증 체크리스트

운영 알림(후기 등록·삭제, 정기 파기 실패, Supabase 일시정지)의 실제 수신을 검증합니다.

- [ ] `alert-verify-cli.mjs` 실행 → `/retention-alert` 204 응답 확인
- [ ] GitHub Actions 실패 알림 이메일 수신 확인 (일시정지/파기 실패 시)
- [ ] Cloudflare 알림 이메일 수신 확인 (수동)
- [ ] 새 계정에서 위 항목 반복 검증

> `alert-verify-cli.mjs`는 알림 **파이프라인**(토큰→엔드포인트→Cloudflare)을 검증합니다. 최종 이메일 수신함 도착은 사람이 확인해야 하는 유일한 수동 검증 항목입니다.
