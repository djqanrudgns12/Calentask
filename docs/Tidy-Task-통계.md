# Tidy Task 통계 운영·개발 안내

## 화면과 접근

- 데이터 센터 → 템플릿 센터 바로 아래 **Tidy task 통계**. PC·모바일 메뉴 동일.
- 기본 기간은 최근 7일이며 오늘·30일·90일을 한 번에 전환할 수 있다. 실제 컨테이너 너비에 맞춰 패널을 재배치한다.
- 글꼴은 Pretendard 동적 서브셋(jsDelivr)이다. 화면이 뜬 뒤 `<link>`로 따로 받아 첫 표시를 막지 않으며, 받기 전이나 실패 시에는 시스템 글꼴을 쓴다. 본문 14px·보조 13px을 기준으로 하고 12px 미만 글자는 쓰지 않는다.
- 직접 주소: `/tidy-stats`. 비로그인은 로그인으로 이동하고 비허용 계정은 조회할 수 없다.
- 서버는 매 API 요청마다 Supabase `auth.getUser()`로 사용자를 확인하고, 변경 가능한 아이디·사용자 메타데이터가 아닌 고유 계정 ID를 허용 목록과 비교한다.
- 계정 매핑: `rudgnswh12`의 ID는 기존 `public.users`를 읽어서 확인했다. 통계 데이터 저장용 Supabase 테이블이나 새 키는 필요 없다.
- PostHog 개인 키는 서버에서만 읽는다. 클라이언트 코드에 가져오거나 `NEXT_PUBLIC_` 이름으로 등록하지 않는다.

## Vercel 설정

Calentask 프로젝트 → Settings → Environment Variables에 등록한다.

| 이름 | 값 |
|---|---|
| `POSTHOG_PERSONAL_API_KEY` | PostHog에서 발급한 개인 API 키 |
| `POSTHOG_PROJECT_ID` | `615314` |
| `TIDY_STATS_ALLOWED_USER_IDS` | 통계를 볼 본인 계정 UUID. 여러 계정이면 쉼표로 구분 |

Production에 저장한다. 미리보기 배포에서도 사용할 경우 Preview에도 등록한다. 환경변수 변경은 새 배포에 적용되므로 변경 후 재배포한다. 로컬은 프로젝트 루트 `.env.local`에 같은 이름을 등록하고 개발 서버를 다시 시작한다. 실제 키를 문서·커밋·채팅에 넣지 않는다.

현재 구현의 실제 조회는 `Query: Read`를 사용한다. 기존 대시보드 검토·확장을 위한 Dashboard, Insight, Project, Event definition, Property definition의 Read도 사용할 수 있다. Write나 별도 Project secret API key는 필요 없다.

## 지표 계약 — 변경 전 반드시 확인

원본 수집 계약: Tidy-Task-Local의 `docs/사용-통계-PostHog.md`, `src-tauri/src/analytics.rs`.

| 지표 | 집계 |
|---|---|
| 활성 설치 | `active_minute`의 기간 내 `uniqExact(distinct_id)` |
| 새로 관측된 설치 | `installation_first_seen`의 기간 내 고유 설치 |
| 활동 분 | `active_minute` 횟수. 연속 체류 시간이 아님 |
| 사용 세션 | `session_started` 횟수 |
| 도구별 사용 | `tool_active_minute`를 `window_kind`로 분류. 5.6.3 이상에서 지원 |
| 버전별 설치 | `active_minute`의 버전별 고유 설치. 여러 버전을 쓴 설치본은 중복 포함 가능 |
| 버전별 비중 | 활동 분 / 전체 버전 활동 분. 고유 설치 수를 합산해 비율로 만들지 않음 |
| 생성·완료한 할 일 | 해당 이벤트 `properties.count` 합계. 이벤트 횟수가 아님 |
| 주사위·타이머·투표 | 실제 동작 이벤트 횟수. 단순 화면 열기와 구분 |
| 오류 영향 | `app_error`의 고유 설치 수. 오류 원문은 화면에 노출하지 않음 |

- 모든 쿼리: `environment = production`, PostHog `{filters}`로 최신 프로젝트 내부·테스트 계정 제외 설정 적용.
- `filters.dateRange.date_from = all`은 PostHog 기본 날짜 필터 중복을 막기 위한 설정이다. 실제 SQL에는 항상 최대 180일의 명시적 상·하한이 있다(90일 조회와 이전 기간 비교).
- 모든 날짜를 한국 시간으로 묶는다. 오늘은 진행 중이다. 이전 기간 비교는 동일 경과 시점까지만 비교한다.
- PostHog에서 `timestamp <= now()`와 이전 기간의 `now() - INTERVAL` 비교가 `Decimal overflow`를 일으키는 경우가 확인됐다. 현재 시각을 `toDateTime(now())`으로 명시한다. 기간 상·하한과 한국 시간 기준은 유지하고, 이벤트의 `timestamp` 컬럼을 변환하지 않아 기간 인덱스도 유지한다.
- 기간 고유 설치 수는 일별 고유 설치 수의 합과 다르다.
- 버전 표·비중·선택 목록은 기간 내 **전체 버전**, 다른 패널은 선택한 버전 기준이다.
- 미관측 날짜는 `null`이다. 연결 오류·권한 부족·미관측을 `0`으로 바꾸지 않는다.
- 최신 이벤트 표시는 이벤트 발생 시각이며 수신 시각·현재 접속자 수가 아니다.
- 5.6.0~5.6.2의 미수집 기록은 복원할 수 없다. 상세 도구 지원 범위를 패널에 표시한다.
- 도구 순위는 활동 분 순이다. 요약에서는 설정·기타를 제외하고, 전체 도구 탭에서는 모두 표시한다.
- 오류 패널도 내부·테스트 계정을 제외한다. 원본 PostHog 오류 차트에서 이 옵션이 꺼져 있다면 같은 조건으로 맞춘 뒤 비교한다.

## 갱신·실패 처리

- **신선도 기준 5분**(`FRESH_MS`). PostHog가 실제로 계산한 시각(`last_refresh`)으로 판단한다. 응답의 `ageMs`·`calculatedAt`이 그 값이다.
- **쿼리 3개**: `summary`(이전 기간은 `active_minute`만 읽음), `daily`, `breakdown`(도구·버전·기능·오류 통합, 1000행에 닿으면 잘린 결과로 보고 실패). 동시 계산은 인스턴스당 2개(PostHog 팀 제한 3보다 작게), 대기 없이 빈 슬롯부터 채운다.
- **서버 조회 순서**(`engine.ts`, SQL별): 인스턴스 L1 캐시(LRU 64개)가 5분 이내면 즉시 → 같은 SQL 계산이 진행 중이면 합류 → PostHog 공유 캐시를 `force_cache`로 확인(계산하지 않음, 모든 인스턴스 공유) → 그래도 오래됐으면 `force_blocking` 재집계.
- **조회 방식**(`mode`): `swr`=화면에 보여 줄 것이 없을 때. 6시간 이내 저장 집계를 즉시 주고 응답 뒤(`after`) 재집계, 응답에 `stale`·`revalidating` 표시. `fresh`=이미 화면에 데이터가 있을 때, 최신 집계까지 대기. `force`=수동 갱신, 캐시를 무시하고 재집계(진행 중 재집계에는 합류).
- 브라우저는 `swr` 응답이 `stale`이면 곧바로 `fresh`로 이어서 받는다. 저장 집계는 `저장된 집계 · 최신 집계 받는 중`으로 표시한다.
- **자동 갱신**: 집계가 5분을 넘기는 시점(`5분 - ageMs`, 최소 30초)에 다시 조회한다. 숨김 탭에서는 멈추고 복귀·재연결 시 오래된 집계를 확인한다. 사용자가 끌 수 있고 탭 안에서 선택을 유지한다.
- **수동 갱신**: 진행 중 자동 조회를 취소하고 `force`로 보낸다. 15초 간격 제한. 결과는 버튼(`갱신 완료`/`변동 없음`/`갱신 실패`)과 안내 문구로 알린다.
- **재시도**: 서버는 429(`Retry-After` 준수, 5초 이하)·네트워크·502/503만 지수 백오프+지터로 최대 2회. 브라우저는 일시 오류를 최대 2회 재시도하고, 그래도 실패하면 연속 실패 횟수로 1·2·4·8·최대 15분 간격(±20%). 성공하면 5분 기준으로 돌아간다.
- 실패 시 마지막 정상 집계 유지 + 실패 안내. 401/403은 이전 데이터 표시도 중지. 설정·인증·권한 오류는 주기 재시도 중단.
- 전체 조회 제한 45초(백그라운드 재집계 50초), 브라우저 65초, Vercel 함수 60초.
- 기간·버전 전환 중에는 이전 집계를 흐리게 유지한다(내보내기 잠금). 기간 버튼·메뉴에 150ms 머무르면 미리 받는다.
- API는 POST·`private, no-store`이며 PWA 서비스 워커의 GET 캐시에 들어가지 않는다. `Server-Timing` 헤더로 인증·집계 시간과 경로(cache/posthog/stale-while-revalidate)를 확인할 수 있다.
- 메모리 캐시·동시 실행 제한은 인스턴스 단위다. 여러 Vercel 인스턴스의 전역 제한은 PostHog가 수행한다. 429를 정상 오류로 처리한다.
- 실패한 일부 쿼리를 빈 결과로 합치지 않는다. 모든 쿼리가 성공한 스냅샷만 제공한다(성공한 쿼리는 캐시에 남아 재시도가 빨라진다).
- 키·원본 서버 오류·설치 ID는 응답이나 로그에 출력하지 않는다.

## 검증 명령

```powershell
npx tsx --test tests/tidy-stats.test.ts
npx tsx scripts/verify-tidy-stats.ts
npx tsc --noEmit
npm run build
```

`verify-tidy-stats.ts`는 실제 로컬 환경변수로 읽기 전용 집계 3개를 실행하고, 쿼리 사이 불변식(일별 합 = 종합, 버전별 합 = 종합, 버전 필터 일치), `force_cache` 공유 캐시 적중, 실행기 전체 경로 소요 시간을 확인한다. UI의 로그인·서버 권한 검증과는 별도의 검증이다.

배포 후 본인 계정에서 메뉴, 오늘/7일/30일/90일, 버전 필터, 수동 갱신, CSV를 확인한다. PostHog와 비교할 때 날짜·시간대·버전·내부 계정 제외 조건을 일치시킨다. 배포 전 사용자 키가 브라우저 번들에 없는지도 검사한다.

## 2026-09-28 로컬 검증 기록

- 실제 PostHog 집계 쿼리 6개 성공. 내부·테스트 계정 제외 필터 적용 확인.
- 로그인한 본인 계정의 메뉴·요약·도구·버전·수집 점검, 5.6.3 필터 및 수동 최신 갱신 확인.
- 390px 모바일과 사이드바를 포함한 1440px 화면에서 가로 넘침 없음. 좁은 패널은 컨테이너 기준으로 재배치.
- 집계 기준은 정보 버튼을 눌러 펼칠 수 있다. 연결 오류 시 자동 갱신 표시도 대기로 바뀐다.
- 통계 테스트 7개, 기능 파일 ESLint, 프로덕션 빌드 통과. 클라이언트 정적 파일 156개에서 실제 개인 API 키 미포함 확인.
- 비로그인 API 요청은 JSON 401 및 no-store로 차단. Vercel 배포 후 검증은 별도로 필요하다.

## 2026-09-30 오류 수정·검증 기록

- 기존 요약·일별·통합 쿼리 모두 실제 PostHog에서 `Decimal overflow`로 실패하는 것을 재현했다. `timestamp <= now()`와 이전 기간의 현재 시각 비교를 `toDateTime(now())`으로 변경한 뒤 실제 개인 키로 정상 실행을 확인했다.
- 실제 키로 집계 3개, 합계 불변식, 버전 필터, 공유 캐시, 오늘·7일·30일·90일 조회 및 수동 강제 갱신을 검증했다. 운영·한국 시간·내부 및 테스트 계정 제외 조건을 유지했다.
- 통계 회귀 테스트 18개와 아카이브 로딩 테스트 7개 통과. 타입 검사와 프로덕션 빌드 통과. 통계 API의 비로그인 JSON 401 및 `no-store`, 노트 화면의 로그인 이동을 확인했다.
- 브라우저 정적 파일 246개에서 실제 개인 키가 포함되지 않은 것을 확인했다. 계정 ID와 키는 로컬 환경변수에만 저장하며 문서·응답에는 출력하지 않는다.
- Windows 로컬 검증에서는 IPv6 연결이 초기화되는 현상이 있어 해당 명령에만 `$env:NODE_OPTIONS='--dns-result-order=ipv4first'`를 설정했다. 애플리케이션의 인증·TLS 설정은 변경하지 않았다.
- 운영 배포와 로그인·2차 비밀번호를 통과한 브라우저의 최종 화면 확인은 별도로 필요하다.

아카이브 회귀 테스트는 다음 명령으로 실행한다(Node의 실험적 모듈 모킹 사용).

```powershell
npx tsx --experimental-test-module-mocks --test tests/archive-loading.test.ts
```

## 2026-09-30 PostHog 저장 대시보드 수정 기록

- 대상: [Tidy task 운영 현황](https://us.posthog.com/project/615314/dashboard/2109046). Calentask의 서버 조회 코드와 별개로 PostHog에 저장된 차트 7개도 수정했다.
- 기존 `TrendsQuery`의 상대 기간 조회에서 `Decimal overflow`를 재현했다. 내부 계정 제외를 끄더라도 실패했다. 고정 날짜나 `explicitDate: true`는 실행됐지만, 후자는 상대 기간 시작 시각과 사용자 지정 종료 날짜의 의미를 바꾸므로 적용하지 않았다.
- 기존 차트 ID·이름·대시보드 연결·배치·선/막대 표시를 유지하고 조회만 `DataVisualizationNode`의 SQL로 전환했다. 기간은 기존 `-30d`를 유지한다. `{filters}`로 대시보드 날짜·프로퍼티·최신 내부 계정 제외를 적용하고, 날짜 변수의 상·하한에는 `toDateTime64(..., 6)`, 현재 시각에는 `toDateTime(now())`를 명시한다. 이벤트의 `timestamp` 컬럼은 변환하지 않는다.
- 모든 차트는 `production`, 한국 날짜, 내부·테스트 계정 제외를 적용한다. 오류 영향 차트에서 꺼져 있던 `filterTestAccounts`도 켰다. 고유 설치는 `distinct_id`, 세션은 이벤트 횟수, 생성한 할 일은 `properties.count` 합계, 도구는 `tool_active_minute`를 사용한다. 미관측 날짜를 임의로 채우지 않고 `showNullsAsZero: false`를 설정했다.
- 실제 개인 키로 저장 전 7개 쿼리를 실행하고, 종료 시각을 고정한 기존 차트와 모든 관측 지점의 값을 비교해 일치를 확인했다. 도구·오류·버전 분류도 포함했다. 오늘·7일·90일·날짜만 지정한 사용자 기간에서 정상 조회와 종료 날짜 포함을 검증했다.
- 저장 후 7개 모두 `insight-query`로 실제 결과를 확인했다. 대시보드 메타데이터에서 차트 연결·순서·배치 유지도 확인했다. 실제 브라우저에서 상단 4개 및 하단 도구·오류·버전 차트의 정상 렌더링을 확인했다. 통계 18개와 아카이브 7개 회귀 테스트를 다시 통과했다.
- 이 수정은 PostHog 대시보드에 즉시 적용된다. Calentask 사이트의 앞선 코드 수정은 별도의 운영 재배포가 필요하다.

## 참고 문서

- https://posthog.com/docs/api/queries
- https://posthog.com/docs/data-warehouse/sql/variables#applying-dashboard-filters
- https://vercel.com/docs/environment-variables
- https://supabase.com/docs/reference/javascript/auth-getuser
