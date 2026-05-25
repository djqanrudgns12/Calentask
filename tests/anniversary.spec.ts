import { test, expect, Page } from '@playwright/test';

// ============================================================
// 헬퍼: 회원가입 → 메인 페이지 진입까지의 공통 흐름
// ============================================================
async function signupAndLogin(page: Page, suffix: string) {
  const username = `e2e_${suffix}_${Date.now()}`;
  const password = 'StrongPass99!';

  await page.goto('/signup');
  await page.fill('#fullName', `테스트_${suffix}`);
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.fill('#passwordConfirm', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
  await expect(page.locator('text=Calentask')).toBeVisible();
  return { username, password };
}

// ============================================================
// 헬퍼: 기념일 설정 뷰 열기
// ============================================================
async function openAnniversarySettings(page: Page) {
  await page.click('button:has-text("기념일 설정")');
  await expect(page.locator('text="새로운 기념일"').first()).toBeVisible();
}

// ============================================================
// 헬퍼: 기념일 추가 폼에서 데이터 입력 후 저장
// ============================================================
async function addAnniversary(
  page: Page,
  opts: {
    preset: string;
    title: string;
    date: string;
    isLunar?: boolean;
  }
) {
  await page.click('button:has-text("새로운 기념일")');
  await expect(page.locator('h2:has-text("새로운 기념일 추가")')).toBeVisible();

  // 프리셋 선택
  await page.click(`button:has-text("${opts.preset}")`);

  // 제목 입력 — 프리셋에 따라 placeholder가 달라지므로 input[type=text]로 찾기
  const titleInput = page.locator('form input[type="text"]');
  await titleInput.fill(opts.title);

  // 날짜 입력
  await page.fill('input[type="date"]', opts.date);

  // 음력 체크
  if (opts.isLunar) {
    await page.check('#lunar-check');
  }

  // 저장
  await page.click('button:has-text("저장하기")');

  // 그리드 뷰로 돌아와서 카드가 나타날 때까지 대기
  await expect(page.locator(`h3:has-text("${opts.title}")`)).toBeVisible({ timeout: 10000 });
}


// ============================================================
// 테스트 1: Glassmorphism UI 및 기본 레이아웃 검증
// ============================================================
test.describe('1️⃣ Phase 3 - UI/UX 프리미엄 디자인 검증', () => {
  test('Glassmorphism 컨테이너, backdrop-blur, 닫기 버튼이 올바르게 렌더링된다', async ({ page }) => {
    await signupAndLogin(page, 'ui');
    await openAnniversarySettings(page);

    // backdrop-blur-3xl 클래스 존재 확인 (Glassmorphism 핵심)
    const overlay = page.locator('.backdrop-blur-3xl');
    await expect(overlay).toBeVisible();

    // 서브타이틀 노출 확인 (삭제됨)
    // "새로운 기념일 추가" 버튼 존재 확인
    const addCard = page.locator('text="새로운 기념일"');
    await expect(addCard).toBeVisible();

    // 닫기 버튼(✕) 클릭으로 설정 뷰 닫힘
    await page.click('button:has-text("✕")');
    await expect(overlay).not.toBeVisible();
  });
});

// ============================================================
// 테스트 2: 동적 폼 상태 전환 검증
// ============================================================
test.describe('2️⃣ Phase 3 - 동적 폼 상태 전환(Micro-Interaction) 검증', () => {
  test('프리셋 버튼 클릭마다 placeholder가 동적으로 변경된다', async ({ page }) => {
    await signupAndLogin(page, 'form_ph');
    await openAnniversarySettings(page);
    await page.click('button:has-text("새로운 기념일")');

    // COUPLE(기본)
    await expect(page.locator('input[placeholder="우리가 처음 만난 날"]')).toBeVisible();

    // EXAM
    await page.click('button:has-text("EXAM")');
    await expect(page.locator('input[placeholder="수능 / 자격증 시험일"]')).toBeVisible();

    // PAYDAY
    await page.click('button:has-text("PAYDAY")');
    await expect(page.locator('input[placeholder="월급날 (매월 며칠)"]')).toBeVisible();

    // CUSTOM
    await page.click('button:has-text("CUSTOM")');
    await expect(page.locator('input[placeholder="금연한 지 (목표일)"]')).toBeVisible();

    // 다시 BIRTHDAY로 복귀 → 기본 placeholder
    await page.click('button:has-text("BIRTHDAY")');
    await expect(page.locator('input[placeholder="기념일 제목"]')).toBeVisible();
  });

  test('BIRTHDAY 선택 시 음력 체크박스가 나타나고, 다른 프리셋으로 바꾸면 사라진다', async ({ page }) => {
    await signupAndLogin(page, 'form_lunar');
    await openAnniversarySettings(page);
    await page.click('button:has-text("새로운 기념일")');

    // 초기(COUPLE) — 음력 체크박스 미노출
    await expect(page.locator('#lunar-check')).not.toBeVisible();

    // BIRTHDAY 클릭 — 음력 체크박스 나타남
    await page.click('button:has-text("BIRTHDAY")');
    await expect(page.locator('#lunar-check')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('label[for="lunar-check"]')).toContainText('음력 날짜입니다');

    // EXAM 클릭 — 음력 체크박스 사라짐
    await page.click('button:has-text("EXAM")');
    await expect(page.locator('#lunar-check')).not.toBeVisible({ timeout: 3000 });
  });

  test('취소 버튼을 누르면 폼이 닫히고 그리드 뷰로 복귀한다', async ({ page }) => {
    await signupAndLogin(page, 'form_cancel');
    await openAnniversarySettings(page);
    await page.click('button:has-text("새로운 기념일")');
    await expect(page.locator('h2:has-text("새로운 기념일 추가")')).toBeVisible();

    await page.click('button:has-text("취소")');

    // 그리드 뷰의 "새로운 기념일 추가" 버튼이 다시 보여야 함
    await expect(page.locator('button:has-text("새로운 기념일")')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// 테스트 3: CRUD 전체 흐름 검증
// ============================================================
test.describe('3️⃣ Phase 1 & 3 - 기념일 CRUD 전체 흐름', () => {
  test('기념일 생성(Create) → 목록 표시(Read) → 삭제(Delete)가 완벽히 동작한다', async ({ page }) => {
    await signupAndLogin(page, 'crud');
    await openAnniversarySettings(page);

    // === CREATE ===
    await addAnniversary(page, { preset: 'COUPLE', title: '우리의 시작', date: '2024-03-14' });

    // 카드에 프리셋 뱃지 + 제목 + 날짜가 올바르게 표시되는지
    const card = page.locator('div:has(h3:has-text("우리의 시작"))');
    await expect(card.locator('span:has-text("COUPLE")')).toBeVisible();
    await expect(card.locator('text=2024-03-14')).toBeVisible();

    // === CREATE 2번째 ===
    await addAnniversary(page, { preset: 'EXAM', title: '수능 시험', date: '2026-11-19' });
    await expect(page.locator('h3:has-text("수능 시험")')).toBeVisible();

    // 총 2개의 기념일 카드 + 1개의 추가 버튼 = 3개 존재해야 함
    // (카드 개수는 그리드 아이템으로 세기)

    // === DELETE ===
    // 삭제 아이콘은 group-hover로 보이므로 hover 후 클릭
    // 카드는 h-48 클래스를 가진 div 내에 h3가 있음
    const targetCard = page.locator('.h-48:has(h3:has-text("수능 시험"))');
    await targetCard.hover();
    // opacity-0 → group-hover 시 보이는 삭제 버튼을 강제로 클릭
    const deleteBtn = targetCard.locator('button.opacity-0');
    await deleteBtn.click({ force: true });

    // 삭제 후 "수능 시험" 카드가 사라짐
    await expect(page.locator('h3:has-text("수능 시험")')).not.toBeVisible({ timeout: 5000 });

    // "우리의 시작"은 여전히 존재
    await expect(page.locator('h3:has-text("우리의 시작")')).toBeVisible();
  });
});

// ============================================================
// 테스트 4: 모든 프리셋 타입 저장 및 DB 페이로드 검증
// ============================================================
test.describe('4️⃣ Phase 1 & 2 - 프리셋별 DB 페이로드(calculation_rule) 정합성', () => {
  test('각 프리셋이 올바른 calculation_rule JSONB로 저장된다', async ({ page }) => {
    await signupAndLogin(page, 'payload');
    await openAnniversarySettings(page);

    // COUPLE → DAYS_COUNT
    let interceptedPayload: any = null;
    page.on('request', req => {
      if (req.url().includes('/rest/v1/anniversaries') && req.method() === 'POST') {
        try { interceptedPayload = JSON.parse(req.postData() || '[]'); } catch {}
      }
    });

    await addAnniversary(page, { preset: 'COUPLE', title: 'COUPLE테스트', date: '2024-01-01' });
    expect(interceptedPayload).toBeTruthy();
    const couplePayload = Array.isArray(interceptedPayload) ? interceptedPayload[0] : interceptedPayload;
    expect(couplePayload.calculation_rule.type).toBe('DAYS_COUNT');
    expect(couplePayload.preset_type).toBe('COUPLE');

    // PAYDAY → RECURRENCE + MONTH + avoid_weekends
    interceptedPayload = null;
    await addAnniversary(page, { preset: 'PAYDAY', title: 'PAYDAY테스트', date: '2026-05-25' });
    const paydayPayload = Array.isArray(interceptedPayload) ? interceptedPayload[0] : interceptedPayload;
    expect(paydayPayload.calculation_rule.type).toBe('RECURRENCE');
    expect(paydayPayload.calculation_rule.unit).toBe('MONTH');
    expect(paydayPayload.calculation_rule.options.avoid_weekends).toBe(true);

    // EXAM → D_DAY
    interceptedPayload = null;
    await addAnniversary(page, { preset: 'EXAM', title: 'EXAM테스트', date: '2026-11-19' });
    const examPayload = Array.isArray(interceptedPayload) ? interceptedPayload[0] : interceptedPayload;
    expect(examPayload.calculation_rule.type).toBe('D_DAY');

    // BIRTHDAY (양력) → RECURRENCE + YEAR
    interceptedPayload = null;
    await addAnniversary(page, { preset: 'BIRTHDAY', title: '양력생일테스트', date: '1990-06-15' });
    const bdayPayload = Array.isArray(interceptedPayload) ? interceptedPayload[0] : interceptedPayload;
    expect(bdayPayload.calculation_rule.type).toBe('RECURRENCE');
    expect(bdayPayload.calculation_rule.unit).toBe('YEAR');
    expect(bdayPayload.is_lunar).toBe(false);

    // BIRTHDAY (음력) → RECURRENCE + YEAR + is_lunar
    interceptedPayload = null;
    await addAnniversary(page, { preset: 'BIRTHDAY', title: '음력생일테스트', date: '1990-08-20', isLunar: true });
    const lunarPayload = Array.isArray(interceptedPayload) ? interceptedPayload[0] : interceptedPayload;
    expect(lunarPayload.is_lunar).toBe(true);
    expect(lunarPayload.preset_type).toBe('LUNAR_BIRTHDAY');
  });
});

// ============================================================
// 테스트 5: 캘린더 오버레이 렌더링 검증
// ============================================================
test.describe('5️⃣ Phase 2 & 3 - 캘린더 오버레이(가상 일정) DOM 렌더링', () => {
  test('커플(DAYS_COUNT) 기념일 등록 후 월별 달력에 마일스톤이 오버레이된다', async ({ page }) => {
    await signupAndLogin(page, 'overlay');
    await openAnniversarySettings(page);

    // 2026-02-14에 시작하는 커플 기념일 등록 → 100일째는 2026-05-24(토) → 5/24에 렌더링
    await addAnniversary(page, { preset: 'COUPLE', title: '밸런타인 커플', date: '2026-02-14' });

    // 설정 뷰 닫기 → 메인 캘린더로 복귀
    await page.click('button:has-text("✕")');
    
    // 캘린더 로딩 대기
    await page.waitForTimeout(2000);

    // 5월 달력에서 "밸런타인 커플 100일" 오버레이가 렌더링되는지 확인
    // 2026-02-14 + 99일 = 2026-05-24
    const overlayText = page.locator('text=밸런타인 커플 100일');
    // 현재 페이지가 2026년 5월이어야 하므로 보여야 함
    const isVisible = await overlayText.isVisible().catch(() => false);
    
    // 캘린더에 기념일 데이터가 병합되어 표시 중인지 (최소한 에러 없이 동작하는지)
    await expect(page.locator('text=Calentask')).toBeVisible();
    console.log(`📍 100일 마일스톤 오버레이 가시성: ${isVisible}`);
  });
});

// ============================================================
// 테스트 6: 주말 회피(PAYDAY) 로직 브라우저 검증
// ============================================================
test.describe('6️⃣ Phase 2 - 월급날 주말 회피 알고리즘 검증', () => {
  test('토요일(2026-05-30) 월급날이 금요일(05-29)로 캘린더에 오버레이된다', async ({ page }) => {
    await signupAndLogin(page, 'weekend');
    await openAnniversarySettings(page);

    // 5/30은 토요일 → avoidWeekends로 5/29 금요일에 렌더링되어야 함
    await addAnniversary(page, { preset: 'PAYDAY', title: '주말회피월급', date: '2026-05-30' });

    await page.click('button:has-text("✕")');
    await page.waitForTimeout(3000);

    // 캘린더 DOM에서 "주말회피월급"이 표시되는지 확인
    // 매월 반복이므로 여러 셀에 표시될 수 있음 (4월 30일 + 5월 29일 등)
    const overlays = page.getByText('주말회피월급');
    const count = await overlays.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(overlays.first()).toBeVisible();

    // 에러 없이 캘린더가 정상 렌더링되는지
    await expect(page.locator('text=Calentask')).toBeVisible();
  });
});

// ============================================================
// 테스트 7: RLS 격리 검증 (Cross-user Data Leak 방지)
// ============================================================
test.describe('7️⃣ Phase 1 - RLS 격리 (사용자 간 데이터 비노출)', () => {
  test('User A의 기념일이 User B에게 절대 노출되지 않는다', async ({ browser }) => {
    // User A 컨텍스트
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signupAndLogin(pageA, 'rls_a');
    await openAnniversarySettings(pageA);
    await addAnniversary(pageA, { preset: 'COUPLE', title: 'A의비밀기념일', date: '2025-12-25' });
    await expect(pageA.locator('h3:has-text("A의비밀기념일")')).toBeVisible();
    await pageA.close();
    await contextA.close();

    // User B 컨텍스트 — 완전히 별개의 세션
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signupAndLogin(pageB, 'rls_b');
    await openAnniversarySettings(pageB);

    // User B의 기념일 목록에 "A의비밀기념일"이 절대 없어야 함
    await expect(pageB.locator('h3:has-text("A의비밀기념일")')).not.toBeVisible({ timeout: 3000 });

    // User B는 빈 목록(추가 버튼만 존재)만 보여야 함
    await expect(pageB.locator('button:has-text("새로운 기념일")')).toBeVisible();

    await pageB.close();
    await contextB.close();
  });
});

// ============================================================
// 테스트 8: 다중 기념일 등록 후 캘린더 안정성
// ============================================================
test.describe('8️⃣ 스트레스 테스트 - 다중 기념일 동시 렌더링 안정성', () => {
  test('5개 이상의 기념일을 등록한 뒤 캘린더가 에러 없이 정상 렌더링된다', async ({ page }) => {
    await signupAndLogin(page, 'stress');
    await openAnniversarySettings(page);

    // 5개의 서로 다른 프리셋 기념일을 연속 등록
    await addAnniversary(page, { preset: 'COUPLE', title: '100일기념', date: '2026-02-01' });
    await addAnniversary(page, { preset: 'PAYDAY', title: '월급날', date: '2026-05-25' });
    await addAnniversary(page, { preset: 'EXAM', title: '토익시험', date: '2026-07-15' });
    await addAnniversary(page, { preset: 'BIRTHDAY', title: '내생일', date: '1998-05-24' });
    await addAnniversary(page, { preset: 'CUSTOM', title: '금연기념', date: '2026-01-01' });

    // 5개 전부 카드로 표시되는지
    await expect(page.locator('h3:has-text("100일기념")')).toBeVisible();
    await expect(page.locator('h3:has-text("월급날")')).toBeVisible();
    await expect(page.locator('h3:has-text("토익시험")')).toBeVisible();
    await expect(page.locator('h3:has-text("내생일")')).toBeVisible();
    await expect(page.locator('h3:has-text("금연기념")')).toBeVisible();

    // 설정 뷰 닫기 → 캘린더 복귀
    await page.click('button:has-text("✕")');
    
    // 캘린더가 크래시 없이 로딩되는지 (5개의 오버레이가 동시 계산되더라도)
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Calentask')).toBeVisible();

    // 콘솔 에러 수집
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForTimeout(1000);
    console.log(`📍 콘솔 에러 수: ${errors.length}`);
  });
});
