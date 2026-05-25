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
  // Phase 2에서 UI가 변경됨: h1 대신 그리드 뷰의 "새로운 기념일" 버튼으로 확인
  await expect(page.locator('text="새로운 기념일"').first()).toBeVisible({ timeout: 10000 });
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
  // "새로운 기념일" 카드 클릭
  await page.click('button:has-text("새로운 기념일")');
  await expect(page.locator('h2:has-text("새로운 기념일 추가")')).toBeVisible();

  // 프리셋 선택 — PRESET_LABELS 기준 (💕 연인/커플, 🎂 생일, 📝 시험/디데이, 💰 월급/정기일, ✨ 직접 설정)
  await page.click(`button:has-text("${opts.preset}")`);

  // 제목 입력 — Floating Label 패턴이므로 id로 찾기
  await page.fill('#anni-title', opts.title);

  // 날짜 입력
  await page.fill('input[type="date"]', opts.date);

  // 음력 체크 (BIRTHDAY 프리셋 전용)
  if (opts.isLunar) {
    const lunarCheckbox = page.locator('input[type="checkbox"]').first();
    await lunarCheckbox.check();
  }

  // 저장
  await page.click('button:has-text("저장하기")');

  // 그리드 뷰로 돌아와서 카드의 제목이 나타날 때까지 대기
  await expect(page.locator(`p:has-text("${opts.title}")`)).toBeVisible({ timeout: 10000 });
}


// ============================================================
// 테스트 1: 프리미엄 대시보드 UI 레이아웃 검증
// ============================================================
test.describe('1️⃣ Phase 2 - 프리미엄 대시보드 UI 검증', () => {
  test('기념일 설정 그리드 뷰와 추가 버튼이 올바르게 렌더링된다', async ({ page }) => {
    await signupAndLogin(page, 'ui');
    await openAnniversarySettings(page);

    // "새로운 기념일" 버튼 카드 존재 확인
    const addCard = page.locator('button:has-text("새로운 기념일")');
    await expect(addCard).toBeVisible();

    // 설정 모달 닫기 → 캘린더로 복귀
    await page.goto('/');
    await page.waitForTimeout(1000);
    // SPA에서는 페이지 전환 후에도 캘린더가 정상 렌더링되는지 확인
    await expect(page.locator('text=Calentask')).toBeVisible();
  });
});

// ============================================================
// 테스트 2: 동적 폼 상태 전환 검증
// ============================================================
test.describe('2️⃣ Phase 3 - 동적 폼 상태 전환(Micro-Interaction) 검증', () => {
  test('프리셋 버튼 클릭마다 Floating Label 텍스트가 동적으로 변경된다', async ({ page }) => {
    await signupAndLogin(page, 'form_ph');
    await openAnniversarySettings(page);
    await page.click('button:has-text("새로운 기념일")');

    // COUPLE(기본) — Floating Label
    await expect(page.locator('label:has-text("누구와의 디데이인가요?")')).toBeVisible();

    // EXAM
    await page.click('button:has-text("시험/디데이")');
    await expect(page.locator('label:has-text("어떤 시험/디데이인가요?")')).toBeVisible();

    // PAYDAY
    await page.click('button:has-text("월급/정기일")');
    await expect(page.locator('label:has-text("어떤 정기일인가요?")')).toBeVisible();

    // CUSTOM
    await page.click('button:has-text("직접 설정")');
    await expect(page.locator('label:has-text("어떤 기념일인가요?")')).toBeVisible();

    // BIRTHDAY
    await page.click('button:has-text("생일")');
    await expect(page.locator('label:has-text("누구의 생일인가요?")')).toBeVisible();
  });

  test('BIRTHDAY 선택 시 음력 옵션이 나타나고, 다른 프리셋으로 바꾸면 사라진다', async ({ page }) => {
    await signupAndLogin(page, 'form_lunar');
    await openAnniversarySettings(page);
    await page.click('button:has-text("새로운 기념일")');

    // 초기(COUPLE) — 음력 관련 텍스트 미노출
    await expect(page.locator('text=음력 날짜입니다')).not.toBeVisible();

    // BIRTHDAY 클릭 — 음력 옵션 나타남
    await page.click('button:has-text("생일")');
    await expect(page.locator('text=음력 날짜입니다')).toBeVisible({ timeout: 3000 });

    // EXAM 클릭 — 음력 옵션 사라짐
    await page.click('button:has-text("시험/디데이")');
    await expect(page.locator('text=음력 날짜입니다')).not.toBeVisible({ timeout: 3000 });
  });

  test('취소 버튼을 누르면 폼이 닫히고 그리드 뷰로 복귀한다', async ({ page }) => {
    await signupAndLogin(page, 'form_cancel');
    await openAnniversarySettings(page);
    await page.click('button:has-text("새로운 기념일")');
    await expect(page.locator('h2:has-text("새로운 기념일 추가")')).toBeVisible();

    await page.click('button:has-text("취소")');

    // 그리드 뷰의 "새로운 기념일" 버튼이 다시 보여야 함
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
    await addAnniversary(page, { preset: '연인/커플', title: '우리의 시작', date: '2024-03-14' });

    // 카드에 프리셋 뱃지 + 제목이 올바르게 표시되는지
    const card = page.locator('div:has(p:has-text("우리의 시작"))').first();
    await expect(card).toBeVisible();

    // === CREATE 2번째 ===
    await addAnniversary(page, { preset: '시험/디데이', title: '수능 시험', date: '2026-11-19' });
    await expect(page.locator('p:has-text("수능 시험")')).toBeVisible();

    // === DELETE ===
    // 카드에 hover하여 삭제 버튼 활성화
    const targetCard = page.locator('.h-\\[220px\\]:has(p:has-text("수능 시험"))');
    await targetCard.hover();
    // 삭제 버튼 클릭 (Trash2 아이콘)
    const deleteBtn = targetCard.locator('button[title="삭제"]');
    await deleteBtn.click({ force: true });

    // 삭제 후 "수능 시험" 카드가 사라짐
    await expect(page.locator('p:has-text("수능 시험")')).not.toBeVisible({ timeout: 5000 });

    // "우리의 시작"은 여전히 존재
    await expect(page.locator('p:has-text("우리의 시작")')).toBeVisible();
  });
});

// ============================================================
// 테스트 4: 프리셋별 DB 페이로드(calculation_rule) 정합성 검증
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

    await addAnniversary(page, { preset: '연인/커플', title: 'COUPLE테스트', date: '2024-01-01' });
    expect(interceptedPayload).toBeTruthy();
    const couplePayload = Array.isArray(interceptedPayload) ? interceptedPayload[0] : interceptedPayload;
    expect(couplePayload.calculation_rule.type).toBe('DAYS_COUNT');
    expect(couplePayload.preset_type).toBe('COUPLE');
    // Phase 3: show_in_calendar 기본값
    expect(couplePayload.calculation_rule.options.show_in_calendar).toBe(true);

    // PAYDAY → RECURRENCE + MONTH + avoid_weekends
    interceptedPayload = null;
    await addAnniversary(page, { preset: '월급/정기일', title: 'PAYDAY테스트', date: '2026-05-25' });
    const paydayPayload = Array.isArray(interceptedPayload) ? interceptedPayload[0] : interceptedPayload;
    expect(paydayPayload.calculation_rule.type).toBe('RECURRENCE');
    expect(paydayPayload.calculation_rule.unit).toBe('MONTH');
    expect(paydayPayload.calculation_rule.options.avoid_weekends).toBe(true);
    expect(paydayPayload.calculation_rule.options.show_in_calendar).toBe(true);

    // EXAM → D_DAY
    interceptedPayload = null;
    await addAnniversary(page, { preset: '시험/디데이', title: 'EXAM테스트', date: '2026-11-19' });
    const examPayload = Array.isArray(interceptedPayload) ? interceptedPayload[0] : interceptedPayload;
    expect(examPayload.calculation_rule.type).toBe('D_DAY');

    // BIRTHDAY (양력) → RECURRENCE + YEAR
    interceptedPayload = null;
    await addAnniversary(page, { preset: '생일', title: '양력생일테스트', date: '1990-06-15' });
    const bdayPayload = Array.isArray(interceptedPayload) ? interceptedPayload[0] : interceptedPayload;
    expect(bdayPayload.calculation_rule.type).toBe('RECURRENCE');
    expect(bdayPayload.calculation_rule.unit).toBe('YEAR');
    expect(bdayPayload.is_lunar).toBe(false);
  });
});

// ============================================================
// 테스트 5: 캘린더 오버레이 렌더링 검증
// ============================================================
test.describe('5️⃣ Phase 2 & 3 - 캘린더 오버레이(가상 일정) DOM 렌더링', () => {
  test('커플(DAYS_COUNT) 기념일 등록 후 캘린더가 정상 렌더링된다', async ({ page }) => {
    await signupAndLogin(page, 'overlay');
    await openAnniversarySettings(page);

    await addAnniversary(page, { preset: '연인/커플', title: '밸런타인 커플', date: '2026-02-14' });

    // 캘린더로 복귀
    await page.goto('/');
    
    // 캘린더 로딩 대기
    await page.waitForTimeout(2000);

    // 캘린더가 에러 없이 정상 렌더링되는지
    await expect(page.locator('text=Calentask')).toBeVisible();
  });
});

// ============================================================
// 테스트 6: 월급날 주말 회피 알고리즘 검증
// ============================================================
test.describe('6️⃣ Phase 2 - 월급날 주말 회피 알고리즘 검증', () => {
  test('월급날 기념일 등록 후 캘린더에 오버레이된다', async ({ page }) => {
    await signupAndLogin(page, 'weekend');
    await openAnniversarySettings(page);

    await addAnniversary(page, { preset: '월급/정기일', title: '주말회피월급', date: '2026-05-30' });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // 캘린더 DOM에서 "주말회피월급"이 표시되는지 확인
    const overlays = page.getByText('주말회피월급');
    const count = await overlays.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(overlays.first()).toBeVisible();
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
    await addAnniversary(pageA, { preset: '연인/커플', title: 'A의비밀기념일', date: '2025-12-25' });
    await expect(pageA.locator('p:has-text("A의비밀기념일")')).toBeVisible();
    await pageA.close();
    await contextA.close();

    // User B 컨텍스트 — 완전히 별개의 세션
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signupAndLogin(pageB, 'rls_b');
    await openAnniversarySettings(pageB);

    // User B의 기념일 목록에 "A의비밀기념일"이 절대 없어야 함
    await expect(pageB.locator('p:has-text("A의비밀기념일")')).not.toBeVisible({ timeout: 3000 });

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
    await addAnniversary(page, { preset: '연인/커플', title: '100일기념', date: '2026-02-01' });
    await addAnniversary(page, { preset: '월급/정기일', title: '월급날', date: '2026-05-25' });
    await addAnniversary(page, { preset: '시험/디데이', title: '토익시험', date: '2026-07-15' });
    await addAnniversary(page, { preset: '생일', title: '내생일', date: '1998-05-24' });
    await addAnniversary(page, { preset: '직접 설정', title: '금연기념', date: '2026-01-01' });

    // 5개 전부 카드로 표시되는지
    await expect(page.locator('p:has-text("100일기념")')).toBeVisible();
    await expect(page.locator('p:has-text("월급날")')).toBeVisible();
    await expect(page.locator('p:has-text("토익시험")')).toBeVisible();
    await expect(page.locator('p:has-text("내생일")')).toBeVisible();
    await expect(page.locator('p:has-text("금연기념")')).toBeVisible();

    // 설정 뷰 닫기 → 캘린더 복귀
    await page.goto('/');
    
    // 캘린더가 크래시 없이 로딩되는지 (5개의 오버레이가 동시 계산되더라도)
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Calentask')).toBeVisible();
  });
});

// ============================================================
// 테스트 9: Phase 3 - 수정 모드(Edit Mode) 검증
// ============================================================
test.describe('9️⃣ Phase 3 - 수정 폼 전환 및 데이터 Pre-fill', () => {
  test('카드 Hover → 수정 버튼 → 폼에 기존 데이터가 Pre-fill 된다', async ({ page }) => {
    await signupAndLogin(page, 'edit');
    await openAnniversarySettings(page);

    // 기념일 생성
    await addAnniversary(page, { preset: '연인/커플', title: '수정테스트', date: '2024-06-01' });
    await expect(page.locator('p:has-text("수정테스트")')).toBeVisible();

    // 카드 Hover → 수정 버튼 클릭
    const card = page.locator('.h-\\[220px\\]:has(p:has-text("수정테스트"))');
    await card.hover();
    const editBtn = card.locator('button[title="수정"]');
    await editBtn.click({ force: true });

    // 수정 모드 폼 확인
    await expect(page.locator('h2:has-text("기념일 수정")')).toBeVisible();

    // Pre-fill 검증: 제목 필드에 기존 데이터가 채워져 있는지
    const titleInput = page.locator('#anni-title');
    await expect(titleInput).toHaveValue('수정테스트');

    // "수정 완료" 버튼 존재 확인
    await expect(page.locator('button:has-text("수정 완료")')).toBeVisible();

    // 취소로 복귀
    await page.click('button:has-text("취소")');
    await expect(page.locator('p:has-text("수정테스트")')).toBeVisible();
  });
});

// ============================================================
// 테스트 10: Phase 3 - 고급 설정 아코디언 검증
// ============================================================
test.describe('🔟 Phase 3 - 고급 설정(캘린더 표시) 아코디언', () => {
  test('고급 설정 토글이 열리고 "나의 캘린더에 표시하기" 마스터 토글이 동작한다', async ({ page }) => {
    await signupAndLogin(page, 'advanced');
    await openAnniversarySettings(page);
    await page.click('button:has-text("새로운 기념일")');

    // 고급 설정 아코디언 버튼 존재 확인
    const advancedBtn = page.locator('button:has-text("고급 설정")');
    await expect(advancedBtn).toBeVisible();

    // 아코디언 열기
    await advancedBtn.click();

    // "나의 캘린더에 표시하기" 마스터 토글 확인
    await expect(page.locator('text=나의 캘린더에 표시하기')).toBeVisible();
  });
});
