현재 변경 내용을 대상으로 **커밋 전 코드 품질 체크리스트**를 수행해줘.

## 동작 순서

1. **변경 내용 분석**: git diff (staged + unstaged) 또는 현재 대화에서 작성/수정된 파일 분석
2. **프로젝트 규칙 참조**: Root CLAUDE.md, 해당 앱/패키지의 CLAUDE.md 참조
3. **체크리스트 수행**: 아래 항목별로 통과/주의/위반 판정
4. **결과 출력**: 항목별 결과 + 수정 필요 사항

## 체크리스트

### 아키텍처

- [ ] **FSD 레이어 규칙 준수**: 역방향 import 없음, 슬라이스 간 직접 import 없음
- [ ] **Server/Client Component 분리**: `'use client'`가 필요한 곳에만 선언, leaf 레벨 최소화
- [ ] **app/ 라우팅 분리**: app/ 디렉토리에 비즈니스 로직 없음 (FSD 레이어에 위임)

### 코드 품질

- [ ] **타입 안전성**: `any` 사용 없음 (불가피하면 주석으로 사유 명시)
- [ ] **console.log 잔존**: 디버깅용 console.log/warn/error 제거
- [ ] **하드코딩 문자열**: 사용자 노출 문자열 하드코딩 여부 확인
- [ ] **unused import/변수**: 사용하지 않는 import나 변수 잔존 여부

### 패턴 준수

- [ ] **import 순서**: React → 외부 → 공용 패키지 → FSD 레이어 → 내부
- [ ] **type-only import**: 타입만 import할 때 `import type` 사용
- [ ] **에러 처리**: API Route 핸들러가 `{ success, data?, error? }` 형태 반환
- [ ] **파일 네이밍**: 컴포넌트 PascalCase, 유틸 camelCase, 테스트 \*.test.ts(x)

### 감사 로그

- [ ] **감사 로그 포함**: 데이터 변경 API Route 핸들러에 `logAuditEvent()` 호출이 포함되어 있는가? (기본 포함 원칙)
- [ ] **감사 로그 생략 사유**: 로깅 생략 시 `// 감사 로그 생략: {사유}` 주석이 명시되어 있는가?

### 보안

- [ ] **XSS 방지**: 사용자 입력을 `dangerouslySetInnerHTML`로 렌더링하지 않음 (HTML 렌더링 시 DOMPurify 사용)
- [ ] **콘텐츠 렌더링 보안**: `generateHTML()` 출력에 DOMPurify 새니타이징 적용 여부 확인 (defense-in-depth)
- [ ] **SQL Injection**: Prisma ORM 사용 (raw query 시 파라미터 바인딩)
- [ ] **인증+인가 검사**: 데이터 변경 API Route 핸들러에 `requirePermission()` 호출 포함 (프로필 등 예외는 `getCurrentUser()`만 사용)
- [ ] **리소스 등록**: 새 도메인 추가 시 `packages/types`의 `RESOURCE_ACTIONS`에 리소스 등록 여부

### 테스트

- [ ] **테스트 파일 존재**: 새로 작성한 유틸/로직에 대응하는 테스트 파일 존재 여부
- [ ] **테스트 파일 위치**: 대상 코드와 같은 디렉토리에 위치

## 출력 형태

```
## 코드 리뷰 결과

### 변경 파일: {N}개

| 항목 | 상태 | 상세 |
|------|------|------|
| FSD 레이어 규칙 | ✅ 통과 | |
| SC/CC 분리 | ⚠️ 주의 | PageForm.tsx에 'use client' 누락 가능성 |
| 타입 안전성 | ❌ 위반 | utils.ts:15에 any 사용 |
| ... | ... | ... |

### 수정 필요 사항
1. `src/features/page/ui/PageForm.tsx` — ...
2. ...

### 전체 판정
- 통과: {N}개 / 주의: {N}개 / 위반: {N}개
```

## 판정 기준

- **✅ 통과**: 규칙 준수
- **⚠️ 주의**: 위반은 아니지만 개선 권장 (예: 테스트 미작성, 하드코딩 문자열)
- **❌ 위반**: 반드시 수정 필요 (예: any 사용, FSD 위반, 보안 이슈)

## 참고

- 세부 검사가 필요하면 `/check-fsd`, `/check-imports`, `/check-permissions` 개별 실행
- UI 컴포넌트의 시각적 확인은 이 스킬 범위 밖 (Storybook 또는 브라우저에서 확인)
