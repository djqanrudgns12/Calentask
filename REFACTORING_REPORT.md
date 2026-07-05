# 성능 개선 및 리팩토링 보고서 (2026-07)

프로젝트 전역 감사(유령 코드 / 성능 병목 / 장기 리스크) 후 `refactor/perf-cleanup` 브랜치에서 수행한 작업 기록.
**원칙**: Phase = 1 commit, 매 Phase마다 `build + E2E(기념일 12케이스) + 기능별 실동작 검증` 통과 후 진행.

## 적용 내역

### 1. 유령 코드·미사용 자산 삭제
- 미사용 모듈 7개 (전부 외부 임포터 0개 grep 검증): `lib/googleColorMapper.ts`, `hooks/useTemplatePeriod.ts`, `school-schedule/academicUtils.ts`, `archive/boards/TableBoard.tsx`, `calendar/UpcomingAgenda.tsx`, `home/DDayCard.tsx`, `school-meals/MealDietCard.tsx`
- `.bak` 백업 파일 3개, Next.js 스타터 SVG 5개
- 죽은 의존성 `@tanstack/react-table` 제거 (유일 소비자가 위의 TableBoard)
- `public/assets/` 샘플 데이터 5개는 수동 테스트 픽스처로 **유지** (사용자 결정)

### 2. 번들 경량화
- **xlsx(약 411KB 청크)를 초기 번들에서 제거**: `fileParser.ts`에서 엑셀 업로드 시점에만 `await import('xlsx')`, `NiceImportView`를 `next/dynamic` 전환 → 로그인 직후 초기 JS에서 xlsx 미포함 실측 확인
- lunar-javascript(음력 계산): 기념일 훅 2곳의 queryFn 내부 동적 임포트로 전환 → 메인 번들 파싱을 막지 않는 비동기 청크(288KB)로 분리

### 3. 렌더 성능
- `CalendarClient`: `events`/`agendaEvents` 병합·필터를 `useMemo`로 참조 안정화
- `MonthlyView`: 일자→이벤트 `Map` 사전 계산 (기존: 매 렌더 셀 42개 × `events.filter`)
- **Zustand 무선택자 구독 34곳 전량 필드 셀렉터 전환** → 다이얼로그/팝오버 토글 시 캘린더 그리드 전체 리렌더 차단. persist 설정(`calendar-storage`)은 불변이라 마이그레이션 리스크 없음

### 4. 데이터 페칭
- **NEIS 프록시 신설** (`/api/neis`): 클라이언트 번들에 하드코딩돼 있던 NEIS API 키를 서버로 은닉(`NEIS_API_KEY` 환경변수 우선, 미설정 시 기존 키 fallback으로 무중단). endpoint·파라미터 화이트리스트, 24h 캐시
- `SchoolMealCard`: useEffect raw fetch → React Query(staleTime 6h) — 날짜 이동 후 재방문 시 재요청 없음 실측 확인
- categories/presets/profile 참조 데이터 staleTime 5분 (포커스마다 리페치하던 것 완화)

### 5. 보안·장기 리스크
- `getActivities`: 인증 확인 + `user_id` 명시 필터(RLS 이중 방어) + 날짜 파라미터 ISO 검증(PostgREST 필터 인젝션 차단)
- `/api/metadata`: SSRF 차단 — http/https만 허용, localhost·사설대역(10/172.16-31/192.168)·링크로컬(169.254)·IPv6 리터럴 → 400. 실측: localhost/메타데이터 엔드포인트 400, 공개 URL 200
- `recovery` 액션: IP+식별자당 15분 5회 인메모리 스로틀(6회째 차단 실측). UI·정상 복구 흐름 불변

### 6. 부수 수리
- **깨져 있던 E2E 테스트 복구**: `tests/anniversary.spec.ts` 12케이스가 UI 변경(기본 뷰 홈 전환, CUSTOM 2단계 폼) 미반영으로 전부 실패 상태였음 → 현 UI에 맞게 수정, 12/12 통과. 이후 모든 Phase의 회귀 게이트로 활용
- `playwright-report/`, `test-results/`를 `.gitignore`에 추가

## 후속 과제 (이번 범위에서 제외)
1. **recovery 완전 방어**: 인메모리 스로틀은 서버리스 인스턴스별 best-effort. `recovery_attempts` 테이블 기반 레이트리밋 + 이메일 검증 도입 권장 (DB 마이그레이션 필요)
2. **`select('*')` 컬럼 축소**: `archive.ts`, `link_lounge.ts`, `insights.ts`, `calendar.ts` 18개 지점 — 페이로드 절감 여지가 있으나 컬럼 누락 시 조용히 깨질 위험이 커 보류 (사용자 결정)
3. `CalendarClient`가 뷰 컴포넌트 약 30개를 정적 임포트 — 무거운 라이브러리는 이미 분리돼 있어 영향 중간, 희귀 뷰의 `dynamic()` 전환 여지
4. 기존 lint 오류 534개 (이번 작업 이전부터 존재, 회귀 없음 확인만 수행)
5. NEIS 키가 git 이력에 남아 있음 — 키 재발급(rotation) 권장

## 검증 요약
- 매 Phase: `npm run build` 성공, E2E 12/12, lint 오류 수 기준선(534) 동일
- 실동작 검증(프로덕션 빌드 + 실브라우저): 회원가입→캘린더 로드, NICE 엑셀 업로드·파싱, 학교 검색→급식 로드(NEIS 직접 호출 0건·프록시 경유 확인), 기념일 오버레이, SSRF 차단, 복구 스로틀
