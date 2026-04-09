현재 프로젝트의 **권한 정합성**을 검사해줘. 리소스 레지스트리, API Route 핸들러, 사이드바 메뉴 간의 일관성을 확인한다.

## 동작 순서

1. **리소스 레지스트리 수집**: `packages/types/src/domain/permission.types.ts`에서 `RESOURCE_ACTIONS` 상수 읽기
2. **API Route 스캔**: `apps/admin/app/api/` 디렉토리의 모든 `route.ts` 파일에서 `requirePermission()` 호출 탐색
3. **사이드바 메뉴 스캔**: 사이드바 컴포넌트에서 메뉴 아이템 목록과 리소스 매핑 확인
4. **정합성 검증**: 아래 체크리스트 수행
5. **결과 출력**: 항목별 통과/위반 판정 + 수정 필요 사항

## 체크리스트

### 1. API Route ↔ requirePermission

- [ ] **데이터 변경 API Route에 `requirePermission()` 포함**: POST/PATCH/DELETE 핸들러가 `requirePermission(resource, action)` 호출을 포함하는지 확인
- [ ] **예외 경로 확인**: 인증 관련(`/api/auth/*`), 프로필(`/api/profile/*`), 웹 에러 리포트(`/api/web-errors`) 등 권한 체크 면제 대상이 명시적으로 `getCurrentUser()`만 사용하는지 확인
- [ ] **리소스/액션 일관성**: `requirePermission()` 호출에서 사용하는 resource 키가 `RESOURCE_ACTIONS`에 등록된 값인지 확인
- [ ] **GET 핸들러**: 목록/상세 조회 GET 핸들러에 `requirePermission(resource, 'read')` 포함 여부 (보안 우선이면 포함 권장)

### 2. RESOURCE_ACTIONS ↔ 실제 기능

- [ ] **미등록 리소스**: API Route는 존재하지만 `RESOURCE_ACTIONS`에 해당 리소스가 없는 경우
- [ ] **미사용 리소스**: `RESOURCE_ACTIONS`에 등록되어 있지만 대응하는 API Route가 없는 경우 (아직 미구현이면 참고 사항으로 표시)
- [ ] **액션 범위**: 각 리소스에 등록된 액션이 실제 API Route의 HTTP Method와 일치하는지 (create↔POST, read↔GET, update↔PATCH, delete↔DELETE)

### 3. 사이드바 ↔ 리소스 레지스트리

- [ ] **메뉴-리소스 매핑**: 사이드바의 각 메뉴 아이템이 `RESOURCE_ACTIONS`의 리소스 키와 매핑되어 있는지
- [ ] **권한 필터링 적용**: 사이드바에서 `hasPermission(user, resource, 'read')`로 메뉴 표시/숨김을 제어하는지
- [ ] **고정 메뉴 확인**: 대시보드/프로필이 권한과 무관하게 항상 표시되는지

### 4. Seed 스크립트 ↔ RESOURCE_ACTIONS

- [ ] **총괄 관리자 전체 권한**: Seed의 총괄 관리자 Role이 `RESOURCE_ACTIONS`의 모든 리소스/액션을 포함하는지
- [ ] **기본 역할 권한**: Seed의 기본 역할이 합리적인 기본 권한을 가지는지 (최소한 dashboard:read 포함)

## 출력 형태

```
## 권한 정합성 검사 결과

### 스캔 범위
- RESOURCE_ACTIONS: {N}개 리소스, {M}개 액션
- API Route 파일: {N}개
- 사이드바 메뉴: {N}개

### 검사 결과

| 항목 | 상태 | 상세 |
|------|------|------|
| API Route 권한 체크 | ✅ 통과 | |
| 리소스 등록 누락 | ⚠️ 주의 | /api/foo에 대응 리소스 미등록 |
| 사이드바 필터링 | ❌ 위반 | 메뉴 관리 항목에 권한 체크 누락 |
| ... | ... | ... |

### 수정 필요 사항
1. `apps/admin/app/api/foo/route.ts` — `requirePermission()` 호출 누락
2. `packages/types/src/domain/permission.types.ts` — `foo` 리소스 미등록
3. ...

### 전체 판정
- 통과: {N}개 / 주의: {N}개 / 위반: {N}개
```

## 판정 기준

- **✅ 통과**: 리소스 등록 + 권한 체크 + 사이드바 필터링 모두 일치
- **⚠️ 주의**: 미구현 기능(리소스 등록은 됐으나 API 미존재), 또는 GET 핸들러 권한 체크 미적용
- **❌ 위반**: 데이터 변경 API Route에 `requirePermission()` 누락, 또는 리소스 미등록

## 참고

- `/create-role-management` — 역할/권한 관리 기능 구현 스킬
- `/create-api` — API Route 생성 패턴 (`requirePermission()` 템플릿 포함)
- `/review-code` — 커밋 전 코드 품질 체크 (권한 검사 항목 포함)
