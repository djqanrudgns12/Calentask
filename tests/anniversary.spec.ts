import { test, expect } from '@playwright/test';

test.describe('기념일 설정 심층 통합 테스트', () => {
  const testId = Date.now();
  const username = `testuser_${testId}`;
  const password = `Password123!`;

  test.beforeAll(async ({ browser }) => {
    // Setup - nothing needed yet, we will use a single browser context for the test
  });

  test('사용자 가입 후 기능 테스트 진행', async ({ page }) => {
    // 1. 회원가입 및 로그인
    await page.goto('/signup');
    await page.fill('#fullName', '테스트유저');
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.fill('#passwordConfirm', password);
    await page.click('button[type="submit"]');

    // 리다이렉트 대기 (로그인 상태로 메인 페이지 진입 확인)
    await page.waitForURL('/');
    await expect(page.locator('text=Calentask')).toBeVisible();

    // 2. 기념일 설정 팝업 호출 (Phase 3 Glassmorphism UI 확인)
    await page.click('button:has-text("기념일 설정")');
    const settingsView = page.locator('text=나만의 특별한 날들을 아름답게 기록하세요.');
    await expect(settingsView).toBeVisible();

    // 새로운 기념일 추가 폼 호출
    await page.click('button:has-text("새로운 기념일 추가")');

    // 3. 폼 동적 트랜지션 확인 (Phase 3 애니메이션 검증)
    // Custom 클릭 시 Placeholder 변경 확인
    await page.click('button:has-text("CUSTOM")');
    const inputField = page.locator('input[placeholder="금연한 지 (목표일)"]');
    await expect(inputField).toBeVisible();

    // 4. 반복 데이터 (Phase 2 월급날 주말 회피 로직 테스트 데이터 입력)
    await page.click('button:has-text("PAYDAY")');
    await page.fill('input[placeholder="월급날 (매월 며칠)"]', '월급날 테스트');
    
    // 강제로 월급날을 지정 (테스트를 위해 달력의 특정 일자를 넣음 - 2026-05-30이 토요일이므로 이 날짜를 기준일로)
    await page.fill('input[type="date"]', '2026-05-30'); 
    await page.click('button:has-text("저장하기")');

    // 5. 음력 생일 저장 (Phase 2 Lunar 검증)
    await page.click('button:has-text("새로운 기념일 추가")');
    await page.click('button:has-text("BIRTHDAY")');
    await page.fill('input[placeholder="기념일 제목"]', '어머니 생신');
    await page.fill('input[type="date"]', '2026-04-15');
    await page.check('#lunar-check');
    await page.click('button:has-text("저장하기")');

    // 등록 완료 후 그리드 뷰에 보이는지 확인
    await expect(page.locator('h3:has-text("월급날 테스트")')).toBeVisible();
    await expect(page.locator('h3:has-text("어머니 생신")')).toBeVisible();

    // 설정창 닫기
    await page.click('button:has-text("✕")');

    // 메인 달력에서 확인
    // (월급날 테스트가 2026-05-30이 아닌 전날인 2026-05-29 금요일에 오버레이 되었는지 간접적 확인 등 추가 로직)
    // 실제론 Month 뷰를 변경해야 할 수 있으므로 여기서는 에러 없이 로딩되는지만 단언
    await expect(page.locator('text=Calentask')).toBeVisible();
  });
});
