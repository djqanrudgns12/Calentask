'use client'

import { useEffect, useState, useRef } from 'react';
import { FileText, MoreHorizontal, Clock, AlignLeft, Bold, Italic, Type, Plus, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Trash2, Palette, Highlighter, AlignCenter, AlignRight, Table as TableIcon, SquareCheckBig, Minus, Lightbulb, ChevronRight, Bookmark as BookmarkIcon, ImageIcon, Film as YoutubeIcon, Code, Wand2 } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Callout } from './extensions/CalloutExtension';
import { Toggle } from './extensions/ToggleExtension';
import { Bookmark } from './extensions/BookmarkExtension';
import { SlashGuideModal } from '../SlashGuideModal';
import { cn } from '@/lib/utils';
const EMPTY_ARRAY: any[] = [];

export function DocumentBoard() {
  const { activeTabId, tabs, items: storeItems, updateItem, addItem, updateTab, deleteTab } = useArchiveStore();
  const currentTab = tabs.find(t => t.id === activeTabId);
  const items = activeTabId ? (storeItems[activeTabId] || EMPTY_ARRAY) : EMPTY_ARRAY;
  const initRef = useRef<string | null>(null);
  
  // Use the first item as the document content
  const docItem = items[0];

  // Initialize document if not exists (with guard against double-calls)
  useEffect(() => {
    const existingItems = useArchiveStore.getState().items[activeTabId || ''];
    const hasItems = existingItems && existingItems.length > 0;
    
    if (activeTabId && !hasItems && items.length === 0 && initRef.current !== activeTabId) {
      initRef.current = activeTabId;
      addItem(activeTabId, { title: currentTab?.name || '새 문서', content: '' });
    }
  }, [activeTabId, items.length, addItem, currentTab?.name]);

  // 로컬 타이틀 상태로 제어 컴포넌트 프리징 현상 방지
  const [localTitle, setLocalTitle] = useState(docItem?.title || '');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  useEffect(() => {
    setLocalTitle(docItem?.title || '');
  }, [activeTabId, docItem?.id]); // 탭이나 문서가 바뀔 때만 초기화

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeTabId || !docItem) return;
    const newTitle = e.target.value;
    setLocalTitle(newTitle); // 즉각적인 UI 업데이트
    updateItem(activeTabId, docItem.id, { title: newTitle }); // 스토어 디바운스 업데이트
    updateTab(activeTabId, { name: newTitle || '제목 없음' });
  };

  // Setup Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "'/'를 입력하여 명령어를 사용하거나 글을 작성하기 시작하세요...",
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      Toggle,
      Bookmark,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
      }),
    ],
    content: docItem?.data?.contentJSON || docItem?.content || '',
    onUpdate: ({ editor }) => {
      if (!activeTabId || !docItem) return;
      
      const json = editor.getJSON();
      const text = editor.getText();
      
      updateItem(activeTabId, docItem.id, { 
        content: text, // Backward compatibility & text stats
        data: {
          ...docItem.data,
          contentJSON: json
        }
      });
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-lg max-w-none focus:outline-none min-h-[500px]',
      },
    },
  });

  // Re-sync editor content if docItem changes entirely (e.g. tab switch)
  useEffect(() => {
    if (editor && docItem) {
      const currentJson = editor.getJSON();
      const newContent = docItem.data?.contentJSON || docItem.content || '';
      // Deep compare could be better, but for simplicity we assume if it's vastly different, we update
      // Be careful not to reset cursor position during active typing.
      // We only forcefully set content if the ID changed or if it's completely empty but docItem has content.
    }
  }, [activeTabId, docItem?.id, editor]);

  if (!docItem || !editor) return null;

  const textCount = docItem.content?.length || 0;
  const wordCount = docItem.content?.trim() ? docItem.content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="w-full h-full bg-white relative flex flex-col">
      {/* Top Toolbar */}
      <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button 
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('bold') ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800")}
          ><Bold className="w-4 h-4" /></button>
          <button 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('italic') ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800")}
          ><Italic className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('heading', { level: 1 }) ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800")}
          ><Heading1 className="w-4 h-4" /></button>
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('heading', { level: 2 }) ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800")}
          ><Heading2 className="w-4 h-4" /></button>
          <button 
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive('bulletList') ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800")}
          ><List className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button 
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive({ textAlign: 'left' }) ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800")}
          ><AlignLeft className="w-4 h-4" /></button>
          <button 
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive({ textAlign: 'center' }) ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800")}
          ><AlignCenter className="w-4 h-4" /></button>
          <button 
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={cn("p-2 rounded-lg transition-all", editor.isActive({ textAlign: 'right' }) ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-800")}
          ><AlignRight className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
          <span className="flex items-center gap-1.5"><Type className="w-4 h-4" /> 글자 {textCount}</span>
          <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> 단어 {wordCount}개</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 읽기 {readTime}분</span>
          <button 
            onClick={() => {
              if (confirm('이 문서를 완전히 삭제하시겠습니까?')) {
                deleteTab(activeTabId!);
              }
            }}
            className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors ml-2"
            title="문서 삭제"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-2 hover:bg-slate-50 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-slate-400" />
            </button>
            {isMoreMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                  <button 
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsGuideModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                  >
                    <Wand2 className="w-4 h-4" /> 슬래시 명령어 가이드
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div 
        className="flex-1 overflow-y-auto pb-32 cursor-text" 
        onClick={(e) => {
          if (e.target === e.currentTarget) editor.commands.focus();
        }}
      >
        <div 
          className="max-w-3xl mx-auto px-8 py-16"
          onClick={(e) => {
            if (e.target === e.currentTarget) editor.commands.focus();
          }}
        >
          <input 
            type="text"
            value={localTitle}
            onChange={handleTitleChange}
            placeholder="제목을 입력하세요"
            className="w-full text-4xl md:text-5xl font-extrabold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 mb-8 placeholder:text-slate-300 transition-all tracking-tight"
          />
          
          <div className="relative group">
            
            {/* Floating Menu (Slash command like) */}
            {editor && (
              <FloatingMenu 
                editor={editor} 
                // @ts-ignore
                tippyOptions={{ placement: 'bottom-start', offset: [0, 8] }}
                shouldShow={({ state, view }) => {
                  if (!view.hasFocus || view.composing) return false;
                  const { $anchor } = state.selection;
                  const node = $anchor.parent;
                  return node.type.name === 'paragraph' && node.textContent === '/';
                }}
                className="flex bg-white shadow-xl border border-slate-100 rounded-xl overflow-hidden p-1 gap-1"
              >
                <div className="max-h-64 overflow-y-auto hide-scrollbar flex flex-col p-1">
                  <div className="px-2 py-1.5 text-xs font-bold text-slate-400">기본 블록</div>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .toggleHeading({ level: 1 })
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <Heading1 className="w-4 h-4 shrink-0 text-slate-400" /> 큰 제목
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .toggleHeading({ level: 2 })
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <Heading2 className="w-4 h-4 shrink-0 text-slate-400" /> 중간 제목
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .toggleHeading({ level: 3 })
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <Heading3 className="w-4 h-4 shrink-0 text-slate-400" /> 작은 제목
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .toggleTaskList()
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <SquareCheckBig className="w-4 h-4 shrink-0 text-slate-400" /> 할 일 목록
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .toggleBulletList()
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <List className="w-4 h-4 shrink-0 text-slate-400" /> 글머리 기호 목록
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .toggleOrderedList()
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <ListOrdered className="w-4 h-4 shrink-0 text-slate-400" /> 번호 매기기 목록
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .toggleBlockquote()
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <Quote className="w-4 h-4 shrink-0 text-slate-400" /> 인용구
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .setHorizontalRule()
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <Minus className="w-4 h-4 shrink-0 text-slate-400" /> 구분선
                  </button>
                  
                  <div className="px-2 py-1.5 mt-2 text-xs font-bold text-slate-400 border-t border-slate-100 pt-3">커스텀 및 고급 블록</div>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      // @ts-ignore
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        // @ts-ignore
                        .setCallout()
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <Lightbulb className="w-4 h-4 shrink-0 text-slate-400" /> 콜아웃 (알림 박스)
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      // @ts-ignore
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        // @ts-ignore
                        .setToggle()
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" /> 토글 목록
                  </button>
                  
                  <div className="px-2 py-1.5 mt-2 text-xs font-bold text-slate-400 border-t border-slate-100 pt-3">데이터 및 미디어</div>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      // @ts-ignore
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        // @ts-ignore
                        .setBookmark()
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <BookmarkIcon className="w-4 h-4 shrink-0 text-slate-400" /> 웹 북마크
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      const url = window.prompt('이미지 URL을 입력하세요 (또는 복사/붙여넣기를 사용하세요):');
                      if (url) {
                        editor.chain().focus()
                          .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                          .setImage({ src: url })
                          .run();
                      } else {
                        editor.chain().focus()
                          .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                          .run();
                      }
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 shrink-0 text-slate-400" /> 이미지
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      const url = window.prompt('유튜브 영상 링크를 입력하세요:');
                      if (url) {
                        editor.chain().focus()
                          .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                          .setYoutubeVideo({ src: url })
                          .run();
                      } else {
                        editor.chain().focus()
                          .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                          .run();
                      }
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <YoutubeIcon className="w-4 h-4 shrink-0 text-slate-400" /> 유튜브
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .toggleCodeBlock()
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <Code className="w-4 h-4 shrink-0 text-slate-400" /> 코드 블록
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <TableIcon className="w-4 h-4 shrink-0 text-slate-400" /> 표(Table)
                  </button>
                  
                  <div className="px-2 py-1.5 mt-2 text-xs font-bold text-slate-400 border-t border-slate-100 pt-3">색상 및 효과</div>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .setColor('#ef4444')
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <div className="w-4 h-4 rounded-full bg-red-500 shrink-0" /> 빨간색 글자
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .setColor('#3b82f6')
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <div className="w-4 h-4 rounded-full bg-blue-500 shrink-0" /> 파란색 글자
                  </button>
                  <button
                    onClick={() => {
                      const { $anchor } = editor.state.selection;
                      editor.chain().focus()
                        .deleteRange({ from: $anchor.start(), to: $anchor.end() })
                        .toggleHighlight({ color: '#fef08a' })
                        .run();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                  >
                    <Highlighter className="w-4 h-4 shrink-0 text-yellow-500" /> 노란색 형광펜
                  </button>
                </div>
              </FloatingMenu>
            )}

            {/* Bubble Menu (Highlight text formatting) */}
            {editor && (
              <BubbleMenu editor={editor} className="flex items-center bg-slate-900 text-white shadow-xl rounded-xl overflow-hidden p-1 gap-1">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn("p-2 rounded-lg transition-colors", editor.isActive('bold') ? "bg-white/20" : "hover:bg-white/10")}
                  title="굵게"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn("p-2 rounded-lg transition-colors", editor.isActive('italic') ? "bg-white/20" : "hover:bg-white/10")}
                  title="기울임"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={cn("p-2 rounded-lg transition-colors", editor.isActive('blockquote') ? "bg-white/20" : "hover:bg-white/10")}
                  title="인용"
                >
                  <Quote className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1" />
                <button
                  onClick={() => editor.chain().focus().setColor('#f43f5e').run()} // Rose 500
                  className={cn("p-2 rounded-lg transition-colors text-rose-400 hover:bg-white/10")}
                  title="빨간색 텍스트"
                >
                  <Palette className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().setColor('#3b82f6').run()} // Blue 500
                  className={cn("p-2 rounded-lg transition-colors text-blue-400 hover:bg-white/10")}
                  title="파란색 텍스트"
                >
                  <Palette className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} // Yellow 200
                  className={cn("p-2 rounded-lg transition-colors text-yellow-300 hover:bg-white/10")}
                  title="노란색 형광펜"
                >
                  <Highlighter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()} // Green 200
                  className={cn("p-2 rounded-lg transition-colors text-green-300 hover:bg-white/10")}
                  title="초록색 형광펜"
                >
                  <Highlighter className="w-4 h-4" />
                </button>
              </BubbleMenu>
            )}

            <EditorContent editor={editor} className="min-h-[500px]" />
          </div>
        </div>
      </div>
      
      <SlashGuideModal 
        isOpen={isGuideModalOpen} 
        onClose={() => setIsGuideModalOpen(false)} 
      />
    </div>
  );
}
