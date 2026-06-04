'use client'

import { useEffect, useState, useRef } from 'react';
import { FileText, MoreHorizontal, Clock, AlignLeft, Bold, Italic, Type, Plus, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Trash2, Palette, Highlighter, AlignCenter, AlignRight, Table as TableIcon, SquareCheckBig, Minus, Lightbulb, ChevronRight, Bookmark as BookmarkIcon, ImageIcon, Film as YoutubeIcon, Code, Wand2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Grip, PanelTop, PanelLeft, Trash, Grid3X3, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { CustomTableCell } from './extensions/CustomTableCell';
import { CustomImage } from './extensions/ImageExtension';
import { CustomYoutube } from './extensions/YoutubeExtension';
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

  // Handle title change from the input
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeTabId || !docItem) return;
    const newTitle = e.target.value;
    setLocalTitle(newTitle); // 즉각적인 UI 업데이트
    updateItem(activeTabId, docItem.id, { title: newTitle }); // 스토어 디바운스 업데이트
    updateTab(activeTabId, { name: newTitle });
  };

  // Keep localTitle and docItem in sync when tab is renamed externally (e.g. double click tab)
  useEffect(() => {
    if (docItem) {
      // If we switch tabs, initialize localTitle
      setLocalTitle(docItem.title || '');
      
      // If tab was renamed externally, sync it down to the document
      if (currentTab?.name && currentTab.name !== docItem.title) {
        setLocalTitle(currentTab.name);
        updateItem(activeTabId!, docItem.id, { title: currentTab.name });
      }
    }
  }, [activeTabId, docItem?.id, currentTab?.name]);

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
      CustomTableCell,
      Callout,
      Toggle,
      Bookmark,
      CustomImage,
      CustomYoutube,
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
      handleKeyDown: (view, event) => {
        // If floating menu is active, intercept arrow keys and enter
        const { state } = view;
        const { $anchor } = state.selection;
        const node = $anchor.parent;
        
        if (node.type.name === 'paragraph' && node.textContent.startsWith('/')) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter') {
            // We will emit a custom event that our component will listen to
            const customEvent = new CustomEvent('slash-menu-keydown', { detail: { key: event.key } });
            window.dispatchEvent(customEvent);
            return true; // Prevent default Tiptap behavior
          }
        }
        return false;
      }
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
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className={cn("p-2 rounded-lg transition-all text-slate-500 hover:text-slate-800")}
            title="표 만들기"
          ><TableIcon className="w-4 h-4" /></button>
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
              <SlashMenuWrapper editor={editor} />
            )}

            {/* Regular Bubble Menu (Highlight text formatting, hidden when table is active) */}
            {editor && (
              <BubbleMenu 
                editor={editor} 
                shouldShow={({ editor, view, state, from, to }) => {
                  const hasSelection = from !== to;
                  return hasSelection && !editor.isActive('table');
                }}
                className="z-50"
              >
                <motion.div 
                  drag 
                  dragMomentum={false} 
                  className="flex items-center bg-white border border-slate-200 text-slate-700 shadow-xl rounded-xl overflow-hidden p-1.5 gap-1.5 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center text-slate-300 mr-0.5" title="드래그하여 이동">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn("p-1.5 rounded-md transition-colors", editor.isActive('bold') ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50")}
                    title="굵게"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn("p-1.5 rounded-md transition-colors", editor.isActive('italic') ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50")}
                    title="기울임"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={cn("p-1.5 rounded-md transition-colors", editor.isActive('blockquote') ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50")}
                    title="인용"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-slate-200 mx-0.5" />
                  <button onClick={() => editor.chain().focus().setColor('#f43f5e').run()} className="p-1.5 rounded-md transition-colors text-rose-500 hover:bg-slate-50" title="빨간색 텍스트"><Palette className="w-4 h-4" /></button>
                  <button onClick={() => editor.chain().focus().setColor('#3b82f6').run()} className="p-1.5 rounded-md transition-colors text-blue-500 hover:bg-slate-50" title="파란색 텍스트"><Palette className="w-4 h-4" /></button>
                  <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} className="p-1.5 rounded-md transition-colors text-yellow-500 hover:bg-slate-50" title="노란색 형광펜"><Highlighter className="w-4 h-4" /></button>
                  <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()} className="p-1.5 rounded-md transition-colors text-green-500 hover:bg-slate-50" title="초록색 형광펜"><Highlighter className="w-4 h-4" /></button>
                </motion.div>
              </BubbleMenu>
            )}

            {/* Integrated Table Bubble Menu */}
            {editor && (
              <BubbleMenu 
                editor={editor}
                shouldShow={({ editor }) => editor.isActive('table')}
                // @ts-ignore
                tippyOptions={{ placement: 'top', duration: 100 }}
                className="z-50"
              >
                <motion.div 
                  drag 
                  dragMomentum={false}
                  className="flex items-center bg-white border border-slate-200 text-slate-700 shadow-xl rounded-xl overflow-hidden p-1.5 gap-1.5 flex-wrap max-w-[420px] cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center text-slate-300 mr-0.5" title="드래그하여 이동">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  {/* 1. Basic Text Formatting */}
                  <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded-md transition-colors", editor.isActive('bold') ? "bg-slate-200" : "hover:bg-slate-200/50")} title="굵게"><Bold className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded-md transition-colors", editor.isActive('italic') ? "bg-slate-200" : "hover:bg-slate-200/50")} title="기울임"><Italic className="w-3.5 h-3.5" /></button>
                  </div>
                  
                  {/* 2. Cell Colors */}
                  <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                    <button onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#fee2e2').run()} className="p-1.5 rounded-md text-rose-500 hover:bg-slate-200/50" title="빨간색 배경"><Palette className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#dbeafe').run()} className="p-1.5 rounded-md text-blue-500 hover:bg-slate-200/50" title="파란색 배경"><Palette className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#dcfce7').run()} className="p-1.5 rounded-md text-green-500 hover:bg-slate-200/50" title="초록색 배경"><Palette className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', null).run()} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200/50" title="배경 지우기"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  
                  {/* 3. Header Toggle & Merge */}
                  <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                    <button onClick={() => editor.chain().focus().toggleHeaderRow().run()} className="p-1.5 rounded-md hover:bg-slate-200/50" title="제목 행 전환"><PanelTop className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editor.chain().focus().toggleHeaderColumn().run()} className="p-1.5 rounded-md hover:bg-slate-200/50" title="제목 열 전환"><PanelLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editor.chain().focus().mergeCells().run()} className="p-1.5 rounded-md hover:bg-slate-200/50" title="셀 병합"><Grip className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editor.chain().focus().splitCell().run()} className="p-1.5 rounded-md hover:bg-slate-200/50" title="셀 분할"><Grid3X3 className="w-3.5 h-3.5" /></button>
                  </div>

                  {/* 4. Row/Col Insert & Delete */}
                  <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                    <button onClick={() => editor.chain().focus().addRowBefore().run()} className="p-1.5 rounded-md text-indigo-500 hover:bg-slate-200/50" title="위에 행 추가"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editor.chain().focus().addRowAfter().run()} className="p-1.5 rounded-md text-indigo-500 hover:bg-slate-200/50" title="아래에 행 추가"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editor.chain().focus().deleteRow().run()} className="p-1.5 rounded-md text-rose-500 hover:bg-slate-200/50" title="현재 행 삭제"><Minus className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                    <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="p-1.5 rounded-md text-indigo-500 hover:bg-slate-200/50" title="왼쪽에 열 추가"><ArrowLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="p-1.5 rounded-md text-indigo-500 hover:bg-slate-200/50" title="오른쪽에 열 추가"><ArrowRight className="w-3.5 h-3.5" /></button>
                    <button onClick={() => editor.chain().focus().deleteColumn().run()} className="p-1.5 rounded-md text-rose-500 hover:bg-slate-200/50" title="현재 열 삭제"><Minus className="w-3.5 h-3.5" /></button>
                  </div>

                  {/* 5. Delete Table */}
                  <button onClick={() => editor.chain().focus().deleteTable().run()} className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 ml-1 border border-rose-100" title="표 전체 삭제">
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
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

function SlashMenuWrapper({ editor }: { editor: any }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const SLASH_COMMANDS = [
    { id: 'h1', icon: Heading1, title: '큰 제목', category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleHeading({ level: 1 }).run() },
    { id: 'h2', icon: Heading2, title: '중간 제목', category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleHeading({ level: 2 }).run() },
    { id: 'h3', icon: Heading3, title: '작은 제목', category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleHeading({ level: 3 }).run() },
    { id: 'todo', icon: SquareCheckBig, title: '할 일 목록', category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
    { id: 'bullet', icon: List, title: '글머리 기호 목록', category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
    { id: 'num', icon: ListOrdered, title: '번호 매기기 목록', category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
    { id: 'quote', icon: Quote, title: '인용구', category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
    { id: 'div', icon: Minus, title: '구분선', category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
    
    { id: 'callout', icon: Lightbulb, title: '콜아웃 (알림 박스)', category: '커스텀 및 고급 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setCallout().run() },
    { id: 'toggle', icon: ChevronRight, title: '토글 목록', category: '커스텀 및 고급 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setToggle().run() },
    
    { id: 'bookmark', icon: BookmarkIcon, title: '웹 북마크', category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setBookmark().run() },
    { id: 'image', icon: ImageIcon, title: '이미지', category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setCustomImage().run() },
    { id: 'youtube', icon: YoutubeIcon, title: '유튜브', category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setCustomYoutube().run() },
    { id: 'code', icon: Code, title: '코드 블록', category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
    { id: 'table', icon: TableIcon, title: '표(Table)', category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    
    { id: 'red', icon: Palette, isColor: true, colorCls: 'bg-red-500', title: '빨간색 글자', category: '색상 및 효과', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setColor('#ef4444').run() },
    { id: 'blue', icon: Palette, isColor: true, colorCls: 'bg-blue-500', title: '파란색 글자', category: '색상 및 효과', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setColor('#3b82f6').run() },
    { id: 'hl', icon: Highlighter, isColor: false, title: '노란색 형광펜', category: '색상 및 효과', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleHighlight({ color: '#fef08a' }).run() },
  ];

  // Keep track of the current text to extract query
  useEffect(() => {
    const updateQuery = () => {
      const { $anchor } = editor.state.selection;
      const node = $anchor.parent;
      if (node.type.name === 'paragraph' && node.textContent.startsWith('/')) {
        setQuery(node.textContent.slice(1).toLowerCase());
      }
    };
    editor.on('selectionUpdate', updateQuery);
    editor.on('update', updateQuery);
    return () => {
      editor.off('selectionUpdate', updateQuery);
      editor.off('update', updateQuery);
    };
  }, [editor]);

  const filteredCommands = SLASH_COMMANDS.filter(cmd => 
    cmd.id.includes(query) || cmd.title.includes(query)
  );

  // Group by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, typeof SLASH_COMMANDS>);

  // Flatten for keyboard navigation mapping
  const flatCommands = Object.values(groupedCommands).flat();

  useEffect(() => {
    setSelectedIndex(0); // Reset selection when query changes
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: Event) => {
      const event = (e as CustomEvent).detail;
      if (flatCommands.length === 0) return;

      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % flatCommands.length);
        scrollRef.current?.children[selectedIndex + 1]?.scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev - 1 + flatCommands.length) % flatCommands.length);
        scrollRef.current?.children[selectedIndex - 1]?.scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        const cmd = flatCommands[selectedIndex];
        if (cmd) {
          const { $anchor } = editor.state.selection;
          // Delete from start of block (where / is) to current anchor (end of query)
          const range = { from: $anchor.start(), to: $anchor.pos };
          cmd.action(editor, range);
        }
      }
    };
    window.addEventListener('slash-menu-keydown', handleKeyDown);
    return () => window.removeEventListener('slash-menu-keydown', handleKeyDown);
  }, [editor, flatCommands, selectedIndex]);

  return (
    <FloatingMenu 
      editor={editor} 
      // @ts-ignore
      tippyOptions={{ placement: 'bottom-start', offset: [0, 8] }}
      shouldShow={({ state, view }) => {
        if (!view.hasFocus || view.composing) return false;
        const { $anchor } = state.selection;
        const node = $anchor.parent;
        // Only trigger if starting with / and no spaces (space indicates end of command intent)
        return node.type.name === 'paragraph' && node.textContent.startsWith('/') && !node.textContent.includes(' ');
      }}
      className="flex bg-white shadow-xl border border-slate-100 rounded-xl overflow-hidden p-1 gap-1"
    >
      <div className="max-h-64 overflow-y-auto hide-scrollbar flex flex-col p-1 w-64" ref={scrollRef}>
        {filteredCommands.length === 0 && (
          <div className="px-3 py-4 text-sm text-center text-slate-500">결과가 없습니다</div>
        )}
        
        {Object.entries(groupedCommands).map(([category, cmds]) => (
          <div key={category}>
            <div className="px-2 py-1.5 mt-2 first:mt-0 text-xs font-bold text-slate-400 border-t first:border-t-0 border-slate-100 pt-3 first:pt-1">
              {category}
            </div>
            {cmds.map((cmd) => {
              const index = flatCommands.indexOf(cmd);
              const isSelected = index === selectedIndex;
              const Icon = cmd.icon;
              
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    const { $anchor } = editor.state.selection;
                    const range = { from: $anchor.start(), to: $anchor.pos };
                    cmd.action(editor, range);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-colors text-left",
                    isSelected ? "bg-slate-100 text-indigo-600" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {cmd.isColor ? (
                    <div className={cn("w-4 h-4 rounded-full shrink-0", cmd.colorCls)} />
                  ) : (
                    <Icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-indigo-500" : "text-slate-400")} />
                  )}
                  {cmd.title}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </FloatingMenu>
  );
}
