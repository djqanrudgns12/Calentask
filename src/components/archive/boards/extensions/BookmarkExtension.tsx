import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Link2, ExternalLink, Globe } from 'lucide-react';
import { useState } from 'react';

/**
 * 아카이브 노트 에디터 내 북마크(웹 링크) 블록 컴포넌트
 * 
 * 기존 url만 저장하던 구조에서 title, icon, description을 추가하여
 * 크롬 북마크 가져오기와 동일한 퀄리티의 링크 시각화를 제공합니다.
 * 
 * 하위 호환성: 기존에 url만 저장된 레거시 노드도 정상 동작 (속성 기본값 처리)
 */
const BookmarkComponent = (props: any) => {
  const url = props.node.attrs.url || '';
  const savedTitle = props.node.attrs.title || '';
  const savedIcon = props.node.attrs.icon || '';
  const savedDescription = props.node.attrs.description || '';

  const [inputUrl, setInputUrl] = useState(url);
  const [inputTitle, setInputTitle] = useState(savedTitle);
  const [isEditing, setIsEditing] = useState(!url);

  const handleSave = () => {
    props.updateAttributes({ 
      url: inputUrl,
      title: inputTitle,
    });
    setIsEditing(false);
  };

  // URL에서 도메인명만 추출하는 헬퍼
  const getDomain = (u: string) => {
    try { return new URL(u).hostname; } catch { return u; }
  };

  return (
    <NodeViewWrapper className="my-4" data-type="bookmark">
      {isEditing ? (
        <div className="flex flex-col gap-2 p-4 bg-muted border border-border rounded-xl">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-muted-foreground shrink-0" />
            <input 
              autoFocus
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              placeholder="웹 링크를 붙여넣고 Enter를 누르세요..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground"
            />
          </div>
          <input
            type="text"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="제목 (선택사항)"
            className="ml-7 bg-transparent border-none outline-none text-sm text-muted-foreground"
          />
          <div className="flex justify-end">
            <button onClick={handleSave} className="text-xs font-bold text-indigo-600 px-3 py-1 bg-indigo-50 rounded hover:bg-indigo-100">저장</button>
          </div>
        </div>
      ) : (
        /* 카드형 링크 뷰 — 파비콘, 제목, URL, 설명을 풍부하게 표시 */
        <div className="relative group cursor-pointer" contentEditable={false}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted transition-colors no-underline">
            {/* 파비콘 영역 */}
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 border border-border/50">
              {savedIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={savedIcon} alt="" className="w-5 h-5" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <Globe className="w-5 h-5 text-muted-foreground/50" />
              )}
            </div>

            {/* 텍스트 영역 */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-indigo-500 transition-colors shrink-0" />
                {savedTitle || '웹 북마크'}
              </h4>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{getDomain(url)}</p>
              {savedDescription && (
                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{savedDescription}</p>
              )}
            </div>
          </a>

          {/* 수정 버튼 — 호버 시 표시 */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditing(true);
            }} 
            className="absolute top-2 right-2 p-1.5 bg-card shadow-sm border border-border rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-foreground hover:bg-muted"
          >
            수정
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const Bookmark = Node.create({
  name: 'bookmark',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      url: {
        default: '',
      },
      // 신규 속성: 제목 — 크롬 북마크에서 가져온 제목 또는 사용자 직접 입력
      title: {
        default: '',
      },
      // 신규 속성: 파비콘 — data URI 또는 URL
      icon: {
        default: '',
      },
      // 신규 속성: 설명 — 메타 description 또는 사용자 메모
      description: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bookmark"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'bookmark', class: 'bookmark' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkComponent);
  },
  
  addCommands() {
    return {
      setBookmark: () => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: { url: '' },
        });
      },
    } as any;
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bookmark: {
      setBookmark: () => ReturnType;
    };
  }
}
