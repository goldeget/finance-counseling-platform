# 잔여 백업 사본 폐기 런북 (Task 1)

운영 전환 과정에서 생성된 임시 사본과 기존 Site 사본에 보관기간과 파기 절차를 적용합니다. 고객 접수 데이터(이름·연락처·생년월일 등)가 포함된 사본은 안전하게 삭제해야 합니다.

> ⚠️ **복구 키가 정상 작동함을 먼저 확인한 뒤에만 암호화 복구 시험 사본을 삭제하세요.** 키가 없으면 암호화 사본은 무의미하지만, 키가 작동하는지 검증하기 전까지는 사본을 보존해야 합니다.

---

## 알려진 사본 위치

### 1. F 드라이브 임시 사본 (운영 머신)
| 위치 | 내용 | 보관기간 | 파기 방법 |
|------|------|----------|----------|
| `F:\자동매매프로그램\사이트_리뷰_등록\backup-recovery-check-20261113\applications.enc.json` | 암호화 접수 복구 시험 사본 | 복구 키 검증 후 즉시 | 파일 삭제 |
| `migration-snapshot/applications.jsonl` | 최초 이전 사본 (평문 접수) | 이미 삭제됨 (확인 필요) | 확인 후 누락분 삭제 |
| `migration-resnapshot-20261112/applications.jsonl` | 재스냅샷 사본 (평문 접수) | 이미 삭제됨 (확인 필요) | 확인 후 누락분 삭제 |

### 2. D1 time-travel
| 위치 | 보관기간 | 비고 |
|------|----------|------|
| Cloudflare D1 time-travel | 7일 (자동) | 수동 삭제 불가, 자동 만료 대기 |

### 3. GitHub Actions 아티팩트
| 워크플로 | 보관기간 | 비고 |
|----------|----------|------|
| application-backup | 7일 | 자동 만료 |
| review-backup | 14일 | 자동 만료 |
| rollback-export | 3일 | workflow_dispatch 시만 생성 |

### 4. 기존 Site 사본
| 위치 | 내용 | 파기 방법 |
|------|------|----------|
| 기존 Cloudflare Sites 백업/스냅샷 | 전환 전 사이트 데이터 | Site 삭제 또는 비활성화 후 확인 |

---

## 감사 스크립트 사용법

```bash
# 감사 모드 (삭제 없이 보고만)
node independent/leftover-backup-audit.mjs "F:\자동매매프로그램\사이트_리뷰_등록"

# 삭제 모드 (매니페스트 출력 후 확인 필요)
node independent/leftover-backup-audit.mjs "F:\자동매매프로그램\사이트_리뷰_등록" --confirm-delete
```

스크립트는 `applications.enc.json`, `applications.jsonl`, `migration-snapshot`, `migration-resnapshot-*` 패턴을 재귀 스캔합니다.

---

## 폐기 절차

1. **복구 키 검증**: `key-recovery-check` 워크플로 실행 → 암호화 사본 복호화 성공 확인
2. **감사 실행**: `leftover-backup-audit.mjs` 감사 모드로 모든 사본 위치 확인
3. **매니페스트 검토**: 발견된 파일 목록·크기·해시 검토
4. **개별 삭제**: 매니페스트의 각 파일에 대해 삭제 여부 결정
5. **삭제 실행**: `--confirm-delete` 모드로 삭제 (매니페스트 재출력 후 승인)
6. **재감사**: 삭제 후 다시 감사 모드 실행 → 잔여 파일 0건 확인
7. **기록**: 삭제 완료를 OPERATIONS.md에 기록

---

## 체크리스트

- [ ] 복구 키 정상 작동 확인 (`key-recovery-check`)
- [ ] `leftover-backup-audit.mjs` 감사 모드 실행 → 사본 목록 확보
- [ ] 매니페스트 검토 (파일·크기·해시)
- [ ] 암호화 복구 시험 사본 삭제 (`backup-recovery-check-20261113/applications.enc.json`)
- [ ] migration-snapshot / migration-resnapshot 잔여 확인·삭제
- [ ] 기존 Site 사본 비활성화·삭제
- [ ] 삭제 후 재감사 → 잔여 0건 확인
- [ ] D1 time-travel 7일 자동 만료 대기
- [ ] GitHub 아티팩트 보관기간 만료 대기 (7~14일)
