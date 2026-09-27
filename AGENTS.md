<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workflow Rules

- 모든 작업을 마치면 구동과 관련 없는 스크린샷 등의 브라우저 테스트 아티팩트를 반드시 삭제할 것.
- 사용자의 의견 묻기, 구현 계획 작성 등 AI의 모든 답변과 문서는 항상 한국어로 작성할 것.

## Tidy Task 통계

- 관련 작업 전 `docs/Tidy-Task-통계.md`의 지표·갱신·접근 권한 계약을 읽을 것.
- PostHog 개인 키를 클라이언트에 전달하지 말고, 모든 통계 API에서 검증된 사용자 ID 허용 목록을 확인할 것.
- `production`, 한국 시간, 내부·테스트 계정 제외를 모든 집계에 일관되게 적용할 것. 미관측·실패를 0으로 바꾸지 말 것.
- 도구 집계에 이전 `window_used`를 섞지 말고, 활동 분을 연속 사용 시간으로 부르지 말 것.
- 쿼리·시간·권한·갱신 로직을 바꾸면 `tests/tidy-stats.test.ts`와 실제 키를 이용한 읽기 전용 검증을 실행할 것.
