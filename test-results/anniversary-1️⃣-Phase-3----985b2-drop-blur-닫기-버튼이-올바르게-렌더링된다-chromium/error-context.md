# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: anniversary.spec.ts >> 1️⃣ Phase 3 - UI/UX 프리미엄 디자인 검증 >> Glassmorphism 컨테이너, backdrop-blur, 닫기 버튼이 올바르게 렌더링된다
- Location: tests/anniversary.spec.ts:71:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.backdrop-blur-3xl')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.backdrop-blur-3xl')

```

```yaml
- alert
- complementary:
  - img "Calentask Logo"
  - text: Calentask
  - button "로그아웃"
  - button "나의 캘린더"
  - button "↳ 나이스 복무 불러오기"
  - button "↳ 기념일 설정"
  - button "오늘"
  - button "이번 주"
  - paragraph: 예정된 일정이 없습니다
  - paragraph: 휴식을 즐기세요!
  - button "태그 관리소"
  - button "데이터 허브"
  - button "전체 내용 초기화"
- main:
  - heading "기념일 설정" [level=2]
  - paragraph: 나만의 특별한 날들을 아름답게 기록하세요
  - button "테"
  - button "새로운 기념일"
- button
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | // ============================================================
  4   | // 헬퍼: 회원가입 → 메인 페이지 진입까지의 공통 흐름
  5   | // ============================================================
  6   | async function signupAndLogin(page: Page, suffix: string) {
  7   |   const username = `e2e_${suffix}_${Date.now()}`;
  8   |   const password = 'StrongPass99!';
  9   | 
  10  |   await page.goto('/signup');
  11  |   await page.fill('#fullName', `테스트_${suffix}`);
  12  |   await page.fill('#username', username);
  13  |   await page.fill('#password', password);
  14  |   await page.fill('#passwordConfirm', password);
  15  |   await page.click('button[type="submit"]');
  16  |   await page.waitForURL('/');
  17  |   await expect(page.locator('text=Calentask')).toBeVisible();
  18  |   return { username, password };
  19  | }
  20  | 
  21  | // ============================================================
  22  | // 헬퍼: 기념일 설정 뷰 열기
  23  | // ============================================================
  24  | async function openAnniversarySettings(page: Page) {
  25  |   await page.click('button:has-text("기념일 설정")');
  26  |   await expect(page.locator('text="새로운 기념일"').first()).toBeVisible();
  27  | }
  28  | 
  29  | // ============================================================
  30  | // 헬퍼: 기념일 추가 폼에서 데이터 입력 후 저장
  31  | // ============================================================
  32  | async function addAnniversary(
  33  |   page: Page,
  34  |   opts: {
  35  |     preset: string;
  36  |     title: string;
  37  |     date: string;
  38  |     isLunar?: boolean;
  39  |   }
  40  | ) {
  41  |   await page.click('button:has-text("새로운 기념일")');
  42  |   await expect(page.locator('h2:has-text("새로운 기념일 추가")')).toBeVisible();
  43  | 
  44  |   // 프리셋 선택
  45  |   await page.click(`button:has-text("${opts.preset}")`);
  46  | 
  47  |   // 제목 입력 — 프리셋에 따라 placeholder가 달라지므로 input[type=text]로 찾기
  48  |   const titleInput = page.locator('form input[type="text"]');
  49  |   await titleInput.fill(opts.title);
  50  | 
  51  |   // 날짜 입력
  52  |   await page.fill('input[type="date"]', opts.date);
  53  | 
  54  |   // 음력 체크
  55  |   if (opts.isLunar) {
  56  |     await page.check('#lunar-check');
  57  |   }
  58  | 
  59  |   // 저장
  60  |   await page.click('button:has-text("저장하기")');
  61  | 
  62  |   // 그리드 뷰로 돌아와서 카드가 나타날 때까지 대기
  63  |   await expect(page.locator(`h3:has-text("${opts.title}")`)).toBeVisible({ timeout: 10000 });
  64  | }
  65  | 
  66  | 
  67  | // ============================================================
  68  | // 테스트 1: Glassmorphism UI 및 기본 레이아웃 검증
  69  | // ============================================================
  70  | test.describe('1️⃣ Phase 3 - UI/UX 프리미엄 디자인 검증', () => {
  71  |   test('Glassmorphism 컨테이너, backdrop-blur, 닫기 버튼이 올바르게 렌더링된다', async ({ page }) => {
  72  |     await signupAndLogin(page, 'ui');
  73  |     await openAnniversarySettings(page);
  74  | 
  75  |     // backdrop-blur-3xl 클래스 존재 확인 (Glassmorphism 핵심)
  76  |     const overlay = page.locator('.backdrop-blur-3xl');
> 77  |     await expect(overlay).toBeVisible();
      |                           ^ Error: expect(locator).toBeVisible() failed
  78  | 
  79  |     // 서브타이틀 노출 확인 (삭제됨)
  80  |     // "새로운 기념일 추가" 버튼 존재 확인
  81  |     const addCard = page.locator('text="새로운 기념일"');
  82  |     await expect(addCard).toBeVisible();
  83  | 
  84  |     // 닫기 버튼(✕) 클릭으로 설정 뷰 닫힘
  85  |     await page.click('button:has-text("✕")');
  86  |     await expect(overlay).not.toBeVisible();
  87  |   });
  88  | });
  89  | 
  90  | // ============================================================
  91  | // 테스트 2: 동적 폼 상태 전환 검증
  92  | // ============================================================
  93  | test.describe('2️⃣ Phase 3 - 동적 폼 상태 전환(Micro-Interaction) 검증', () => {
  94  |   test('프리셋 버튼 클릭마다 placeholder가 동적으로 변경된다', async ({ page }) => {
  95  |     await signupAndLogin(page, 'form_ph');
  96  |     await openAnniversarySettings(page);
  97  |     await page.click('button:has-text("새로운 기념일")');
  98  | 
  99  |     // COUPLE(기본)
  100 |     await expect(page.locator('input[placeholder="우리가 처음 만난 날"]')).toBeVisible();
  101 | 
  102 |     // EXAM
  103 |     await page.click('button:has-text("EXAM")');
  104 |     await expect(page.locator('input[placeholder="수능 / 자격증 시험일"]')).toBeVisible();
  105 | 
  106 |     // PAYDAY
  107 |     await page.click('button:has-text("PAYDAY")');
  108 |     await expect(page.locator('input[placeholder="월급날 (매월 며칠)"]')).toBeVisible();
  109 | 
  110 |     // CUSTOM
  111 |     await page.click('button:has-text("CUSTOM")');
  112 |     await expect(page.locator('input[placeholder="금연한 지 (목표일)"]')).toBeVisible();
  113 | 
  114 |     // 다시 BIRTHDAY로 복귀 → 기본 placeholder
  115 |     await page.click('button:has-text("BIRTHDAY")');
  116 |     await expect(page.locator('input[placeholder="기념일 제목"]')).toBeVisible();
  117 |   });
  118 | 
  119 |   test('BIRTHDAY 선택 시 음력 체크박스가 나타나고, 다른 프리셋으로 바꾸면 사라진다', async ({ page }) => {
  120 |     await signupAndLogin(page, 'form_lunar');
  121 |     await openAnniversarySettings(page);
  122 |     await page.click('button:has-text("새로운 기념일")');
  123 | 
  124 |     // 초기(COUPLE) — 음력 체크박스 미노출
  125 |     await expect(page.locator('#lunar-check')).not.toBeVisible();
  126 | 
  127 |     // BIRTHDAY 클릭 — 음력 체크박스 나타남
  128 |     await page.click('button:has-text("BIRTHDAY")');
  129 |     await expect(page.locator('#lunar-check')).toBeVisible({ timeout: 3000 });
  130 |     await expect(page.locator('label[for="lunar-check"]')).toContainText('음력 날짜입니다');
  131 | 
  132 |     // EXAM 클릭 — 음력 체크박스 사라짐
  133 |     await page.click('button:has-text("EXAM")');
  134 |     await expect(page.locator('#lunar-check')).not.toBeVisible({ timeout: 3000 });
  135 |   });
  136 | 
  137 |   test('취소 버튼을 누르면 폼이 닫히고 그리드 뷰로 복귀한다', async ({ page }) => {
  138 |     await signupAndLogin(page, 'form_cancel');
  139 |     await openAnniversarySettings(page);
  140 |     await page.click('button:has-text("새로운 기념일")');
  141 |     await expect(page.locator('h2:has-text("새로운 기념일 추가")')).toBeVisible();
  142 | 
  143 |     await page.click('button:has-text("취소")');
  144 | 
  145 |     // 그리드 뷰의 "새로운 기념일 추가" 버튼이 다시 보여야 함
  146 |     await expect(page.locator('button:has-text("새로운 기념일")')).toBeVisible({ timeout: 5000 });
  147 |   });
  148 | });
  149 | 
  150 | // ============================================================
  151 | // 테스트 3: CRUD 전체 흐름 검증
  152 | // ============================================================
  153 | test.describe('3️⃣ Phase 1 & 3 - 기념일 CRUD 전체 흐름', () => {
  154 |   test('기념일 생성(Create) → 목록 표시(Read) → 삭제(Delete)가 완벽히 동작한다', async ({ page }) => {
  155 |     await signupAndLogin(page, 'crud');
  156 |     await openAnniversarySettings(page);
  157 | 
  158 |     // === CREATE ===
  159 |     await addAnniversary(page, { preset: 'COUPLE', title: '우리의 시작', date: '2024-03-14' });
  160 | 
  161 |     // 카드에 프리셋 뱃지 + 제목 + 날짜가 올바르게 표시되는지
  162 |     const card = page.locator('div:has(h3:has-text("우리의 시작"))');
  163 |     await expect(card.locator('span:has-text("COUPLE")')).toBeVisible();
  164 |     await expect(card.locator('text=2024-03-14')).toBeVisible();
  165 | 
  166 |     // === CREATE 2번째 ===
  167 |     await addAnniversary(page, { preset: 'EXAM', title: '수능 시험', date: '2026-11-19' });
  168 |     await expect(page.locator('h3:has-text("수능 시험")')).toBeVisible();
  169 | 
  170 |     // 총 2개의 기념일 카드 + 1개의 추가 버튼 = 3개 존재해야 함
  171 |     // (카드 개수는 그리드 아이템으로 세기)
  172 | 
  173 |     // === DELETE ===
  174 |     // 삭제 아이콘은 group-hover로 보이므로 hover 후 클릭
  175 |     // 카드는 h-48 클래스를 가진 div 내에 h3가 있음
  176 |     const targetCard = page.locator('.h-48:has(h3:has-text("수능 시험"))');
  177 |     await targetCard.hover();
```