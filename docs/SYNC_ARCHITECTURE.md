# Calentask ↔ Google ↔ Naver 동기화 구조 정리

> 최종 점검일: 2026-08-25
> 대상 코드: `src/lib/google-calendar.ts`(2,961줄), `src/lib/google/*`, `src/app/actions/calendar.ts`,
> `src/app/api/webhooks/google/route.ts`, `src/app/api/cron/renew-watch/route.ts`,
> `src/components/calendar/AdvancedSyncSettingsModal.tsx`

---

## 0. 한 장 요약 — 가장 먼저 알아야 할 사실

**이 프로젝트에는 네이버 캘린더 연동 코드가 단 한 줄도 없습니다.**

`naver`로 전체 검색하면 나오는 것은 `WidgetGuideModal.tsx`의 **사용 안내 화면**뿐입니다.
즉 현재 구조에서 네이버는 이렇게 붙어 있습니다.

```
 [Calentask]  ⇄ 양방향(우리 코드) ⇄  [Google Calendar]  → 단방향(네이버 기능) →  [Naver Calendar]
   Next.js                             googleapis                네이버 서버가 자기 주기로 "가져오기"
   Supabase                            OAuth + Webhook           호출 시점도 결과도 우리는 알 수 없음
```

- 우리가 제어할 수 있는 구간은 **Calentask ↔ Google** 뿐입니다.
- Google → Naver 구간은 **네이버가 자기 서버에서 주기적으로 당겨 가는 단방향 복제**입니다.
  - 우리가 "지금 가져가라"고 시킬 수 없습니다.
  - 네이버에서 수정한 내용이 구글로 돌아오지도 않습니다. (= 현재 구조에서 "네이버 양방향"은 불가능)
- 따라서 **"구글에는 있는데 네이버에 없다"는 증상은, 우리 코드가 구글에 무슨 짓을 했는지의 결과**입니다.
  네이버는 구글의 상태 변화를 보고 그대로 따라 할 뿐입니다.

> 용어: **미러(mirror)** = 원본을 그대로 따라 그리는 사본. 여기서는 네이버 캘린더가 구글 캘린더의 미러입니다.

**네이버 캘린더 API 직접 연동은 검토 후 채택하지 않기로 결정했습니다(2026-08-25).**
네이버가 제공하는 것은 일정 **생성** 엔드포인트 하나뿐이라, 삭제·조회가 불가능하고
캘린더를 지정할 수 없어 그룹 라우팅도 재현되지 않습니다.
조사 내용과 결정 사유는 `docs/PRD_SYNC_RELIABILITY.md` 6절 R8에 있습니다.
→ **네이버는 "구글을 경유한 받기 전용 미러"가 이 제품의 확정 사양입니다.**

---

## 1. 데이터 모델

### 1.1 `activities` 테이블 (구글 연동 관련 컬럼)

| 컬럼 | 뜻 | 왜 있는가 |
|---|---|---|
| `id` (uuid) | Calentask 일정 ID | 하이픈만 빼면 그대로 Google Event ID가 된다 |
| `google_event_id` | 구글 이벤트 ID | 구글이 자기 ID를 새로 부여한 경우를 대비 |
| `google_calendar_id` | **지금 이 일정이 들어 있는 구글 캘린더** | 라우팅/이동 판단의 근거 |
| `google_ical_uid` | 구글 iCalUID | 캘린더 복사·CalDAV/ICS 브리지를 건너도 살아남는 키 |
| `google_synced_at` | 구글이 응답한 `updated` 시각 | 우리 push가 되돌아온 웹훅(에코)을 걸러내는 기준 |
| `google_content_hash` | **마지막으로 보낸 페이로드의 해시** | "바뀐 게 없으면 안 보낸다"는 판정 근거 — **핵심 용의자** |
| `deleted_at` | 소프트 삭제 시각 | 휴지통 |
| `parent_activity_id` / `original_start_time` | 반복 일정의 예외 회차 | Google의 예외 인스턴스와 대응 |

### 1.2 `users` 테이블

| 컬럼 | 뜻 |
|---|---|
| `google_refresh_token` | OAuth 갱신 토큰 |
| `google_sync_calendar_id` / `_name` | **기본 쓰기 캘린더** (보통 이름이 `Calentask`인 구글 캘린더) |
| `google_sync_settings` (jsonb) | 고급 설정 전체 (아래 1.3) |
| `google_channel_id` / `google_channels` | Google Push Notification(웹훅) 채널 |
| `google_sync_token` | **캘린더별 syncToken 저장소** (JSON) |
| `sync_lock_at` / `sync_rerun_requested` | pull 동기화 동시 실행 방지 잠금 |

### 1.3 `google_sync_settings` 구조

```ts
{
  direction: 'TWO_WAY' | 'EXPORT_ONLY' | 'IMPORT_ONLY'
  conflictStrategy: 'LATEST_WINS' | 'CALENTASK_WINS' | 'GOOGLE_WINS'
  groupMapping:   { [카테고리ID]: 구글캘린더ID }   // ← "그룹 및 라우팅" 화면의 실체
  colorMapping:   { [카테고리ID]: 구글colorId }
  privacyMapping: { [카테고리ID]: boolean }
  importCalendarIds: string[]        // 수신만 할 추가 구독 캘린더
  includePrimaryInImport: boolean    // 구글 기본 캘린더도 읽을지 (기본 true)
}
```

**중요한 오해 정정** — 고급 설정의 "그룹"(업무 / 복무 / 개인 / 동아리 / Calentask / 학사일정)은
Calentask 내부 그룹이 **아닙니다**. 그 카드 하나하나가 **실제 구글 캘린더 1개**입니다.
카테고리를 카드에 드래그하면 `groupMapping[카테고리ID] = 그 구글 캘린더 ID`가 저장됩니다.
(`AdvancedSyncSettingsModal.tsx:105` — `localCalendarList.forEach(cal => { newGroups[cal.id] = [] })`)

### 1.4 현재 사용자의 실제 설정 (2026-08-25 실측)

| 구글 캘린더(그룹) | 매핑된 카테고리 | 현재 일정 수 |
|---|---|---|
| `Calentask` (기본 쓰기) | (없음) | 0 |
| `개인` | 개인, sys-anniversary | 22 |
| `복무` | 근무상황, 출장, 연수, AI 디지털 강사 | 72 |
| `동아리` | AI 이음, AI 정보과학, 기초학력 강사 | 27 |
| `업무` | 업무 | 28 |
| `학사일정` | 학사일정 | 4 |
| `primary`(개인 지메일) | (수신 전용) | 1 ← **구글 자동 생일 일정** |

→ 일정이 **6개 구글 캘린더에 흩어져** 있습니다. 네이버는 이 6개를 **각각** 구독해야 전부 보입니다.

---

## 2. 실행 경로 (누가 언제 무엇을 호출하는가)

### 2.1 Calentask → Google (내보내기, push)

```
① 단건 push
   AddEventDialog / 드래그 이동 / 휴지통 복구
        └→ actions/calendar.ts  createActivity · updateActivity · restoreActivity
              └→ afterGoogleSync(...)                       // 응답 후 백그라운드 실행
                    └→ syncActivityToGoogle(userId, activity, categories)   [google-calendar.ts:737]
                          ├─ resolveSyncScope()          캘린더 집합 확정
                          ├─ desiredCalendarFor()        ★ 목적지 결정 (라우팅)
                          ├─ mapActivityToGoogleEvent()  구글 페이로드 생성
                          ├─ placeEvent()                ★ 찾기 → 이동 → 갱신 / 없으면 생성
                          └─ persistPushResult()         google_* 컬럼 + content_hash 저장

② 배치 push (고급 설정의 "이 설정으로 지금 동기화 시작하기")
   GoogleSyncTab → /api/calendar/sync/job (POST)
        └→ startOrResumeJob() → after() → runExportJob()     [google/exportJob.ts:180]
              ├─ (FULL & cursor==0) reconcileGoogleDuplicates()   ★ 구글 이벤트 삭제 발생 지점
              └─ 25건씩 loadChunk → syncBatchActivitiesToGoogle()  [google-calendar.ts:2817]
                    └─ 항목별: desiredCalendarFor → eventPayloadHash
                       → ★ 해시가 같으면 skip (구글 왕복 없음) ★
                       → 아니면 placeEvent → persistPushResult

③ 삭제
   deleteActivity / hardDeleteActivity → deleteActivityFromGoogle()  [google-calendar.ts:1063]
```

### 2.2 Google → Calentask (가져오기, pull)

```
Google Push Notification(웹훅)
   └→ /api/webhooks/google (POST)   채널 소유권 검증 후 after()
         └→ handleGoogleCalendarSync()   [google-calendar.ts:1604]  ← 잠금 + 후행 1회 합치기
               └→ runGoogleCalendarSync()
                     ├─ resolveSyncScope()               읽을 캘린더 = 쓰기캘린더 + 구독캘린더 + primary
                     ├─ fetchCalendarDelta() × N (병렬)  syncToken 기반 증분
                     ├─ applyDelta() × N (순차)          ★ 상관키 매칭 → 벌크 upsert
                     ├─ softDeleteActivities()           ★ 전 캘린더 훑은 뒤에만 확정
                     ├─ 커서 커밋 (반영 성공 후에만 전진)
                     └─ pushBackToGoogle()               로컬이 더 최신이면 되밀기

Vercel Cron (매일 03:00 UTC) → /api/cron/renew-watch
   └→ watchGoogleCalendar()  채널 갱신 + 안전망 pull
```

### 2.3 Google → Naver (우리 코드 밖)

```
네이버 서버가 자체 주기로 구글 캘린더를 읽어 감
   ← 호출 시점·주기·대상 캘린더 전부 네이버 소관. 우리는 개입할 수 없음
```

---

## 3. 상관(correlation) 키 — 두 시스템의 일정을 이어 붙이는 5단계

`src/lib/google/correlation.ts`

| 순위 | 키 | 강점 / 약점 |
|---|---|---|
| 1 | `extendedProperties.private.calentask_id` | 가장 정확 / 서드파티가 가장 잘 지움 |
| 2 | `activities.google_event_id` | 우리 DB가 기억 |
| 3 | 이벤트 ID 역변환 (`base32hex ↔ UUID`) | 우리가 만든 이벤트면 ID 자체가 곧 활동 UUID |
| 4 | `iCalUID` | 캘린더 복사·CalDAV/ICS 브리지를 넘어도 보존 |
| 5 | 지문 (제목 + 시작시각) | 최후 수단, 중복 생성만 방지 |

설계 자체는 견고합니다. **문제는 키가 아니라 "무엇을 언제 구글에 쓰느냐"의 정책 쪽에 있습니다.**

---

## 4. 라우팅(그룹 및 라우팅) 결정 규칙

```
desiredCalendarFor(categories, settings, scope)      [google-calendar.ts:559]
  = mappedCalendarFor(categories, settings)          // categories를 순회하며 첫 매핑을 채택
    || scope.writeCalendarId                         // 없으면 기본 쓰기 캘린더(Calentask)
```

`placeEvent()`가 실제 배치를 담당합니다.

```
placeEvent()
 ├ 한 번도 연결된 적 없음            → insertWithRecovery(desired)          [신규 생성]
 └ 연결된 적 있음 → findEventLocation()으로 실물 위치 탐색
      ├ 현재 위치 == 목적지          → events.update (제자리 갱신)
      ├ 현재 위치 != 목적지 & 쓰기 가능 → events.move ★캘린더 이동★ → events.update
      └ 이동 불가                    → 제자리 갱신 + 경고 메모
```

**`events.move`는 구글 안에서는 안전하지만, 네이버 같은 외부 미러 입장에서는
"A 캘린더에서 삭제 + B 캘린더에서 생성"으로 보입니다.**

---

## 5. 중복 정리(reconcile) — 구글 이벤트를 실제로 **삭제**하는 유일한 자동 경로

`reconcileGoogleDuplicates()` [google-calendar.ts:2634] — 전체 내보내기 시작 시 자동 실행

```
1) 우리가 쓰는 캘린더를 전부 훑어 calentask_id 태그가 붙은 사본 수집
2) 활동별로 "남길 사본(keep)" 결정
     = 목적지 캘린더에 있는 사본, 없으면 가장 최근에 수정된 사본
3) DB 링크를 keep으로 옮기고 google_content_hash = null 로 초기화
4) keep이 아닌 나머지 사본을 ★ events.delete ★
```

안전 상한이 없습니다. 실제로 **2026-08-25 07:23:50에 이 경로로 구글 이벤트 150건이 삭제**되었습니다.
(`sync_history`: `중복 이벤트 정리 (150건 제거)`)

---

## 6. "안 보낸다" 판정 (skip) 로직

`syncBatchActivitiesToGoogle()` [google-calendar.ts:2876]

```ts
if (activity.google_event_id &&
    activity.google_calendar_id === desiredCalendarId &&
    activity.google_content_hash === contentHash) {
  result.skipped++           // ← 구글 왕복 자체를 하지 않는다
  return
}
```

- 장점: 구글 API 쿼터 절약, 배치 속도 향상.
- **치명적 부작용: 구글 이벤트의 `updated` 타임스탬프가 갱신되지 않습니다.**
  네이버는 `updated`가 변한 이벤트만 다시 가져갑니다.
  → **네이버에서 사라진 일정은, 사용자가 "지금 동기화"를 몇 번을 눌러도 영원히 돌아오지 않습니다.**

실측 (`google_sync_jobs`):

| 작업 시각 (UTC) | total | synced | skipped | failed |
|---|---|---|---|---|
| 08-25 07:22 | 154 | 4 | 0 | 1 |
| 08-25 07:24 | 4 | 0 | 3 | 1 |
| 08-25 07:51 | 154 | **151** | 2 | 1 |
| 08-25 07:56 | 154 | **0** | **153** | 1 | ← 사용자가 마지막으로 누른 동기화. **아무것도 전송되지 않음**

---

## 7. 파일별 책임 요약

| 파일 | 책임 | 줄수 |
|---|---|---|
| `src/lib/google-calendar.ts` | 동기화 엔진 전체 (인증·스코프·매핑·push·pull·중복정리·캘린더관리) | 2,961 |
| `src/lib/google/correlation.ts` | 상관 키 유틸 (ID 변환, 지문) | 57 |
| `src/lib/google/eventTime.ts` | 시각·타임존(KST) 변환, 종일 일정 경계 | 197 |
| `src/lib/google/exportJob.ts` | 배치 내보내기 작업 러너 (청크·커서·하트비트·재개) | 376 |
| `src/app/actions/calendar.ts` | 일정 CRUD 서버 액션 + push 트리거 | 1,293 |
| `src/app/api/webhooks/google/route.ts` | 구글 푸시 알림 수신 | 111 |
| `src/app/api/calendar/sync/job/route.ts` | 배치 작업 시작/이어하기/중단 | 105 |
| `src/app/api/cron/renew-watch/route.ts` | 웹훅 채널 만료 갱신 (일 1회) | 60 |
| `src/components/calendar/AdvancedSyncSettingsModal.tsx` | 고급 설정 UI (그룹 및 라우팅 드래그) | 858 |
| `src/hooks/useSyncJob.ts` | 작업 진행 구독(Realtime) + 제어 | — |

---

## 8. 잘 만들어져 있는 부분 (되돌리지 말 것)

이 코드베이스는 이미 여러 번의 수정을 거쳐 아래 항목들이 제대로 처리되어 있습니다.
**다음 수정에서 이것들을 되돌리지 않도록 주의해야 합니다.**

1. **에코 차단** — `google_synced_at`에 구글의 `updated`를 저장해 우리 push가 되돌아온 웹훅을 무시(무한 루프 방지).
2. **삭제 확정 지연** — `events.move` 출발지의 `cancelled`를 삭제로 오인하지 않도록, 전 캘린더를 훑은 뒤에만 soft-delete.
3. **tombstone 판별** — `isCurrentGoogleLink()`로 "지금 연결된 이벤트의 취소"만 삭제로 인정.
4. **커서 후행 커밋** — 델타 반영 성공 후에만 syncToken 전진. 실패 시 재시도(멱등).
5. **pull 동시 실행 잠금** — `sync_lock_at` + `sync_rerun_requested`로 직렬화.
6. **작업 재개** — 서버리스 타임아웃 전에 스스로 PAUSED, 다음 요청이 이어받음.
7. **소프트 삭제 시 구글 링크 보존** — 휴지통 복구 시 중복 생성 방지.
8. **`events.move` 사용** — 목적지 변경 시 insert가 아니라 move(구글 내 중복 방지).
9. **재전송 표식(nonce)** — 구글은 내용이 동일한 `events.update`를 무시하고 `updated`를
   올려 주지 않는다(2026-08-25 실측: 154건 재전송 → `updated` 갱신 1건).
   `extendedProperties.private.calentask_resend`에 매번 다른 값을 심어야 재전송이 실제 효과를 낸다.
   **단, 이 표식은 지문(해시) 계산에서 반드시 제외해야 한다** — 포함하면 평소 동기화가
   모든 일정을 영원히 "변경됨"으로 보고 구글 왕복을 무한 반복한다.

---

## 9. 구조적 취약점 (상세는 PRD 문서)

| # | 취약점 | 위치 |
|---|---|---|
| RC-1 | 외부 미러를 고려하지 않은 **구글 이벤트 대량 삭제/재생성** | `reconcileGoogleDuplicates` |
| RC-2 | **해시 스킵 함정** — 한 번 어긋나면 되돌릴 수단이 없음 | `syncBatchActivitiesToGoogle:2876` |
| RC-3 | **빈 카테고리 = 기본 캘린더** 규칙에 의한 라우팅 튐 | `desiredCalendarFor:559` + `updateActivity` |
| RC-4 | **구글 시스템 이벤트(생일 등)를 되밀어 영구 실패** | `applyDelta` (필터 없음) |
| RC-5 | **다중 카테고리 라우팅이 비결정적** (배열 순서 의존) | `mappedCalendarFor:542` |
| RC-6 | 네이버는 **단방향 미러** — 양방향 불가 · 재요청 수단 없음 | 코드 없음 |

→ `docs/PRD_SYNC_RELIABILITY.md`
