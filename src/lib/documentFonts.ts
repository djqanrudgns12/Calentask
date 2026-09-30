export const DOCUMENT_FONT_STYLES = [
  ['calentask-doc-font-pretendard', 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.css'],
  ['calentask-doc-font-noto', 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;500;700&family=Nanum+Gothic:wght@400;700&display=swap'],
  ['calentask-doc-font-gmarket', 'https://webfontworld.github.io/gmarket/GmarketSans.css'],
  ['calentask-doc-font-nanum-neo', 'https://cdn.jsdelivr.net/gh/moonspam/NanumSquareNeo@1.0/nanumsquareneo.css'],
] as const;

export function loadDocumentFonts(target: Document = document): void {
  for (const [id, href] of DOCUMENT_FONT_STYLES) {
    if (target.getElementById(id)) continue;
    const link = target.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    // 글꼴은 선택적인 장식이다. 로딩을 기다리거나 실패를 편집기 오류로 전달하지 않는다.
    target.head.append(link);
  }
}
