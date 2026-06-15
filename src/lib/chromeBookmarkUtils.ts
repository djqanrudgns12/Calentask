import { Bookmark } from '@/store/useLinkLoungeStore';

// ──────────────────────────────────────────────
// 크롬 북마크 HTML 파서 (Import)
// ──────────────────────────────────────────────

// 파싱 결과의 개별 항목 타입
export interface ParsedBookmark {
  url: string;
  title: string;
  icon: string;        // 파비콘 data URI
  category: string;    // 소속 폴더명 (없으면 '기타')
  addDate: number;     // Unix 타임스탬프 (초)
}

/**
 * 크롬에서 내보낸 NETSCAPE-Bookmark-file-1 형식의 HTML을 파싱하여
 * 카테고리(폴더)별로 분류된 북마크 배열을 반환합니다.
 * 
 * 파싱 규칙:
 * - <DT><H3>폴더명</H3> → 카테고리로 사용
 * - PERSONAL_TOOLBAR_FOLDER 등 특수 폴더는 카테고리로 사용하지 않고 하위만 순회
 * - 폴더에 속하지 않는 독립 링크 → '기타' 카테고리
 * - chrome:// 내부 URL은 무시 (앱에서 열 수 없음)
 * - 카테고리명은 trim() 정규화 적용
 */
export function parseChromeBookmarks(html: string): ParsedBookmark[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const results: ParsedBookmark[] = [];

  // 재귀적으로 <DL> 내부를 순회하는 함수
  // currentCategory: 현재 폴더(카테고리)명. 폴더 밖이면 '기타'
  function walkDL(dlElement: Element, currentCategory: string) {
    // <DL> 내의 직계 자식 <DT>만 순회
    const children = dlElement.children;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName !== 'DT') continue;

      // <DT> 내부에 <H3>가 있으면 → 폴더(카테고리)
      const h3 = child.querySelector(':scope > H3');
      if (h3) {
        const folderName = (h3.textContent || '').trim();
        const isSpecialFolder = h3.hasAttribute('PERSONAL_TOOLBAR_FOLDER');

        // 특수 폴더(북마크바 등)는 카테고리로 쓰지 않고, 하위만 순회
        // 일반 폴더는 말단 폴더명을 카테고리로 사용
        const nextCategory = isSpecialFolder ? currentCategory : (folderName || '기타');

        // DOMParser는 크롬 HTML의 <DL><p> 구조를 파싱할 때
        // <DL>을 <DT>의 자식(child)으로 넣는 경우가 있음 (형제가 아님!)
        // 따라서 자식 → 형제 순서로 <DL>을 탐색
        const childDL = child.querySelector(':scope > DL');
        const targetDL = childDL || findNextSiblingDL(child);
        if (targetDL) {
          walkDL(targetDL, nextCategory);
        }
        continue;
      }

      // <DT> 내부에 <A>가 있으면 → 링크 항목
      const anchor = child.querySelector(':scope > A');
      if (anchor) {
        const url = anchor.getAttribute('HREF') || '';

        // chrome:// 등 내부 URL은 무시 — 앱에서 열 수 없음
        if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
          continue;
        }

        const title = (anchor.textContent || '').trim() || url;
        const icon = anchor.getAttribute('ICON') || '';
        const addDateStr = anchor.getAttribute('ADD_DATE') || '0';
        const addDate = parseInt(addDateStr, 10) || 0;

        results.push({
          url,
          title,
          icon,
          // 카테고리 정규화: trim 적용, 빈 값은 '기타'로 대체
          category: currentCategory.trim() || '기타',
          addDate,
        });
      }
    }
  }

  // <DT> 바로 다음 형제 요소 중 <DL>을 찾는 헬퍼
  // 크롬 북마크 HTML은 <DT><H3>...</H3> 다음에 <DL><p> 구조로 이어짐
  function findNextSiblingDL(dt: Element): Element | null {
    let sibling = dt.nextElementSibling;
    while (sibling) {
      if (sibling.tagName === 'DL') return sibling;
      if (sibling.tagName === 'DT') return null; // 다른 <DT>를 만나면 중단
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  // 루트 <DL> 요소 찾기 (문서 최상위)
  const rootDL = doc.querySelector('DL');
  if (rootDL) {
    walkDL(rootDL, '기타');
  }

  return results;
}

// ──────────────────────────────────────────────
// 크롬 북마크 HTML 생성기 (Export)
// ──────────────────────────────────────────────

/**
 * 내부 Bookmark 배열을 크롬이 인식하는 NETSCAPE-Bookmark-file-1 형식의
 * HTML 문자열로 변환합니다.
 * 
 * 호환성 보장:
 * - <!DOCTYPE NETSCAPE-Bookmark-file-1> 필수 포함
 * - PERSONAL_TOOLBAR_FOLDER="true" 속성으로 '북마크바' 폴더 인식
 * - ADD_DATE는 createdAt을 Unix 타임스탬프(초 단위)로 변환
 * - ICON 속성에 icon 필드값(data URI) 그대로 삽입
 */
export function generateChromeBookmarks(bookmarks: Bookmark[]): string {
  const now = Math.floor(Date.now() / 1000);

  // 카테고리별로 북마크를 그룹화
  const groups = new Map<string, Bookmark[]>();
  bookmarks.forEach(bm => {
    const cat = bm.category?.trim() || '기타';
    if (!groups.has(cat)) {
      groups.set(cat, []);
    }
    groups.get(cat)!.push(bm);
  });

  // 개별 북마크 항목을 HTML로 변환
  function bookmarkToHTML(bm: Bookmark, indent: string): string {
    const addDate = Math.floor(new Date(bm.createdAt).getTime() / 1000) || now;
    const iconAttr = bm.icon ? ` ICON="${escapeAttr(bm.icon)}"` : '';
    const title = escapeHTML(bm.title || bm.url);
    return `${indent}<DT><A HREF="${escapeAttr(bm.url)}" ADD_DATE="${addDate}"${iconAttr}>${title}</A>`;
  }

  // HTML 조립
  let html = '';
  html += '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n';
  html += '<!-- This is an automatically generated file.\n';
  html += '     It will be read and overwritten.\n';
  html += '     DO NOT EDIT! -->\n';
  html += '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n';
  html += '<TITLE>Bookmarks</TITLE>\n';
  html += '<H1>Bookmarks</H1>\n';
  html += '<DL><p>\n';

  // '북마크바' 최상위 폴더 — 크롬에서 인식하려면 이 구조가 필수
  html += `    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}" PERSONAL_TOOLBAR_FOLDER="true">북마크바</H3>\n`;
  html += '    <DL><p>\n';

  // 카테고리별 폴더 생성
  for (const [category, items] of groups) {
    html += `        <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${escapeHTML(category)}</H3>\n`;
    html += '        <DL><p>\n';
    items.forEach(bm => {
      html += bookmarkToHTML(bm, '            ') + '\n';
    });
    html += '        </DL><p>\n';
  }

  html += '    </DL><p>\n';
  html += '</DL><p>\n';

  return html;
}

/**
 * Blob을 생성하여 .html 파일로 다운로드 트리거
 */
export function downloadBookmarksFile(bookmarks: Bookmark[]) {
  const html = generateChromeBookmarks(bookmarks);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `calentask-bookmarks_${date}.html`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────
// HTML 이스케이프 헬퍼
// ──────────────────────────────────────────────

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
