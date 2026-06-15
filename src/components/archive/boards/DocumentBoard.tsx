// @ts-nocheck
'use client'

import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  FileText, MoreHorizontal, Clock, AlignLeft, Bold, Italic, Type, Plus, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, Trash2, Palette, Highlighter, AlignCenter, AlignRight, Table as TableIcon, 
  SquareCheckBig, Minus, Lightbulb, ChevronRight, Bookmark as BookmarkIcon, ImageIcon, Film as YoutubeIcon, 
  Code, Wand2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Grip, PanelTop, PanelLeft, Trash, Grid3X3, 
  GripVertical, Underline as UnderlineIcon, Strikethrough, Link as LinkIcon, Smile, Download, Sigma,
  Undo, Redo, ZoomIn, ZoomOut, Maximize, Minimize2, Search, ChevronDown, Check, PanelTopOpen, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useArchiveStore, EditorViewMode } from '@/store/useArchiveStore';
import { useHotkeys } from 'react-hotkeys-hook';
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
import { TableHeader } from '@tiptap/extension-table-header';
import { CustomTableCell } from './extensions/CustomTableCell';
import { CustomImage } from './extensions/ImageExtension';
import { CustomYoutube } from './extensions/YoutubeExtension';
import { Callout } from './extensions/CalloutExtension';
import { Toggle } from './extensions/ToggleExtension';
import { Bookmark } from './extensions/BookmarkExtension';
import { SlashGuideModal } from '../SlashGuideModal';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';

const CustomBulletList = BulletList.extend({
  addInputRules() {
    return [];
  },
});

const CustomOrderedList = OrderedList.extend({
  addInputRules() {
    return [];
  },
});

// New Extensions
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import FontFamily from '@tiptap/extension-font-family';
import Link from '@tiptap/extension-link';
import { FontSize } from './extensions/FontSizeExtension';
import { CustomMath } from './extensions/MathExtension';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { exportToWord } from '@/lib/exportUtils';

const EMPTY_ARRAY: any[] = [];
const FONT_FAMILIES = [
  { name: '기본 글꼴', value: 'Inter, sans-serif' },
  { name: '맑은 고딕', value: '"Malgun Gothic", sans-serif' },
  { name: '바탕체', value: 'Batang, serif' },
  { name: '굴림체', value: 'Gulim, sans-serif' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px'];
const COLORS = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#ffffff', '#94a3b8'];
const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'none'];
const BORDER_WIDTHS = ['1px', '2px', '3px', '4px'];

export function DocumentBoard() {
  const { activeTabId, tabs, items: storeItems, updateItem, addItem, updateTab, deleteTab, tabViewModes, setTabViewMode, focusModeTabId, setFocusMode } = useArchiveStore();
  const currentTab = tabs.find(t => t.id === activeTabId);
  const items = activeTabId ? (storeItems[activeTabId] || EMPTY_ARRAY) : EMPTY_ARRAY;

  // 뒷 뷰 모드 상태 (탭별 저장)
  const viewMode: EditorViewMode = (activeTabId ? tabViewModes[activeTabId] : undefined) || 'page';
  const isWideView = viewMode === 'wide';
  const isFocusMode = focusModeTabId === activeTabId;

  // 왜: SSR 환경에서 window 접근 시 에러 방지를 위해 useEffect로 클라이언트에서만 판단
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 집중 모드 호버 툴바
  const [showFocusToolbar, setShowFocusToolbar] = useState(false);
  const focusToolbarTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef<string | null>(null);
  
  const docItem = items[0];

  const latestDocItem = useRef(docItem);
  const latestActiveTabId = useRef(activeTabId);

  useEffect(() => {
    latestDocItem.current = docItem;
  }, [docItem]);

  useEffect(() => {
    if (currentTab?.board_type !== 'list') return;
    latestActiveTabId.current = activeTabId;
  }, [activeTabId, currentTab?.board_type]);

  // 빈 문서 자동 생성 (레이스 컨디션 방어)
  // 핵심: 서버에서 데이터를 아직 불러오지 않은 상태에서 빈 문서를 성급하게 만들면 안 됨.
  // isPrefetched가 true가 된 후에만 (=서버 데이터가 도착한 후에만) 빈 문서를 생성하도록 guard 추가.
  const isPrefetched = useArchiveStore((s) => s.isPrefetched);
  
  useEffect(() => {
    if (currentTab?.board_type !== 'list') return;
    if (!isPrefetched) return; // 서버 데이터 로딩 완료 전까지 대기
    
    const storeItemsDict = useArchiveStore.getState().items;
    const existingItems = storeItemsDict[activeTabId || ''];
    
    // existingItems가 undefined(=아직 한번도 fetch되지 않은 탭)인 경우에도 생성하지 않음
    // 오직 서버 fetch가 완료되었고, 결과가 빈 배열일 때만 새 문서 생성
    if (activeTabId && existingItems !== undefined && existingItems.length === 0 && initRef.current !== activeTabId) {
      initRef.current = activeTabId;
      addItem(activeTabId, { title: currentTab?.name || '새 문서', content: '' });
    }
  }, [activeTabId, items.length, addItem, currentTab?.name, currentTab?.board_type, isPrefetched]);

  const [localTitle, setLocalTitle] = useState(docItem?.title || '');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home'|'insert'|'view'>('home');
  const [zoom, setZoom] = useState(100);

  // 집중 모드 단축키 + ESC 탈출
  useHotkeys('mod+shift+f', (e) => {
    e.preventDefault();
    if (activeTabId) setFocusMode(isFocusMode ? null : activeTabId);
  }, { enableOnFormTags: true }, [activeTabId, isFocusMode]);

  useHotkeys('escape', () => {
    if (isFocusMode) setFocusMode(null);
  }, { enableOnFormTags: true }, [isFocusMode]);

  // 집중 모드 호버 툴바 로직
  const handleFocusToolbarEnter = useCallback(() => {
    if (focusToolbarTimeout.current) clearTimeout(focusToolbarTimeout.current);
    focusToolbarTimeout.current = setTimeout(() => setShowFocusToolbar(true), 200);
  }, []);

  const handleFocusToolbarLeave = useCallback(() => {
    if (focusToolbarTimeout.current) clearTimeout(focusToolbarTimeout.current);
    focusToolbarTimeout.current = setTimeout(() => {
      setShowFocusToolbar(false);
      setFocusDropdown(null);
      setFocusFontFamily(false);
      setFocusFontSize(false);
      setFocusEmojiPicker(false);
    }, 500);
  }, []);
  
  const [pageCount, setPageCount] = useState(1);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pageContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const el = entries[0].target as HTMLElement;
      // 1056 is the height of an A4 page
      setPageCount(Math.max(1, Math.ceil(el.offsetHeight / 1056)));
    });
    observer.observe(pageContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Dropdown states
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlightColor, setShowHighlightColor] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 집중 모드 드롭다운 상태
  const [focusDropdown, setFocusDropdown] = useState<'text' | 'paragraph' | 'insert' | null>(null);
  const [focusFontFamily, setFocusFontFamily] = useState(false);
  const [focusFontSize, setFocusFontSize] = useState(false);
  const [focusEmojiPicker, setFocusEmojiPicker] = useState(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeTabId || !docItem) return;
    const newTitle = e.target.value;
    setLocalTitle(newTitle); 
    updateItem(activeTabId, docItem.id, { title: newTitle });
    updateTab(activeTabId, { name: newTitle });
  };

  useEffect(() => {
    if (docItem) {
      setLocalTitle(docItem.title || '');
      if (currentTab?.name && currentTab.name !== docItem.title) {
        setLocalTitle(currentTab.name);
        updateItem(activeTabId!, docItem.id, { title: currentTab.name });
      }
    }
  }, [activeTabId, docItem?.id, currentTab?.name]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle Ctrl+Wheel for Zoom (Trackpad Pinch)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        // Trackpad pinch-to-zoom produces e.ctrlKey=true and fractional e.deltaY
        const zoomChange = -e.deltaY * 0.5;
        // round to nearest integer for clean display, or just keep it float. Let's round.
        setZoom(z => Math.min(200, Math.max(50, Math.round(z + zoomChange))));
      }
    };
    
    // Attach to document to ensure it works even if the container renders later,
    // and catches all pinch gestures on the board.
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  const getValidContent = () => {
    if (!docItem) return '';
    const json = docItem.data?.contentJSON;
    const text = docItem.content || '';
    
    // Check if JSON is technically empty but we have raw text
    if (json && json.content) {
      const isJsonEmpty = json.content.length === 0 || 
        (json.content.length === 1 && json.content[0].type === 'paragraph' && !json.content[0].content);
      
      if (isJsonEmpty && text.trim().length > 0) {
        // Fallback to text, preserving line breaks if it's raw text
        return text.includes('<') ? text : text.replace(/\n/g, '<br>');
      }
      return json;
    }
    
    return text.includes('<') ? text : text.replace(/\n/g, '<br>');
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
      }),
      CustomBulletList,
      CustomOrderedList,
      Placeholder.configure({ placeholder: "'/'를 입력하여 명령어를 사용하거나 글을 작성하기 시작하세요..." }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      CustomTableCell,
      Callout,
      Toggle,
      Bookmark,
      CustomImage,
      CustomYoutube,
      Underline,
      Strike,
      FontFamily,
      FontSize,
      CustomMath,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: getValidContent(),
    onUpdate: ({ editor }) => {
      const currentTabId = latestActiveTabId.current;
      const currentDocItem = latestDocItem.current;
      if (!currentTabId || !currentDocItem) return;
      
      const json = editor.getJSON();
      const text = editor.getText();
      
      updateItem(currentTabId, currentDocItem.id, { 
        content: text,
        data: { ...currentDocItem.data, contentJSON: json }
      });
    },
    editorProps: {
      attributes: { class: 'prose prose-slate prose-lg max-w-none focus:outline-none min-h-[500px]' },
      handleKeyDown: (view, event) => {
        const { state } = view;
        const { $anchor } = state.selection;
        const node = $anchor.parent;
        
        if (node.type.name === 'paragraph' && node.textContent.startsWith('/')) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter') {
            const customEvent = new CustomEvent('slash-menu-keydown', { detail: { key: event.key } });
            window.dispatchEvent(customEvent);
            return true;
          }
        }
        return false;
      }
    },
  });

  const initializedDocId = useRef<string | null>(null);

  useEffect(() => {
    if (!editor || !docItem) return;
    
    // Force sync if docItem changes (hydration or tab switch)
    if (initializedDocId.current !== docItem.id) {
      initializedDocId.current = docItem.id;
      // We use a small timeout to ensure Tiptap has fully initialized its schema
      setTimeout(() => {
        if (!editor.isDestroyed) {
          editor.commands.setContent(getValidContent());
        }
      }, 50);
    } else {
      // Handle background sync updates (where docItem ID is the same, but content changed from server)
      const storeJson = JSON.stringify(docItem.data?.contentJSON || {});
      const editorJson = JSON.stringify(editor.getJSON());
      
      const storeText = docItem.content || '';
      const editorText = editor.getText() || '';

      // If store JSON differs from editor JSON (or text differs for raw text), and it's not a local update
      if (storeJson !== editorJson && (storeJson !== '{}' || storeText !== editorText)) {
        setTimeout(() => {
          if (!editor.isDestroyed) {
            editor.commands.setContent(getValidContent());
          }
        }, 10);
      }
    }
  }, [editor, docItem?.id, docItem?.data?.contentJSON, docItem?.content]);

  if (!docItem || !editor) return null;

  const textCount = docItem.content?.length || 0;
  const wordCount = docItem.content?.trim() ? docItem.content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const exportWord = () => {
    const html = editor.getHTML();
    exportToWord(html, localTitle || '문서');
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    editor.chain().focus().insertContent(emojiData.emoji).run();
    setShowEmojiPicker(false);
  };

  return (
    <TooltipProvider delayDuration={500}>
    <div className="w-full h-full bg-slate-50 relative flex flex-col">
      {/* Ribbon Toolbar — 집중 모드에서는 숨김 (호버 슬라이드인 툴바로 대체) */}
      {!isFocusMode && (
      <div className="border-b border-slate-200 bg-white shrink-0 sticky top-0 z-20 shadow-sm flex flex-col">
        {/* Tab Headers */}
        {/* 왜: 모바일에서 탭 패딩을 줄이고, 우측 줌/통계를 숨겨 넘침 방지 */}
        <div className="flex px-2 md:px-4 pt-2 gap-1 border-b border-slate-100 bg-slate-50">
          <button onClick={() => setActiveRibbonTab('home')} className={cn("px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-t-lg transition-colors border border-b-0 shrink-0", activeRibbonTab === 'home' ? "bg-white text-indigo-600 border-slate-200 translate-y-px" : "text-slate-500 border-transparent hover:bg-slate-100")}>홈</button>
          <button onClick={() => setActiveRibbonTab('insert')} className={cn("px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-t-lg transition-colors border border-b-0 shrink-0", activeRibbonTab === 'insert' ? "bg-white text-indigo-600 border-slate-200 translate-y-px" : "text-slate-500 border-transparent hover:bg-slate-100")}>삽입</button>
          {/* 왜: 모바일에서 '보기 및 도구'는 너무 길어 '보기'로 축약 */}
          <button onClick={() => setActiveRibbonTab('view')} className={cn("px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-t-lg transition-colors border border-b-0 shrink-0", activeRibbonTab === 'view' ? "bg-white text-indigo-600 border-slate-200 translate-y-px" : "text-slate-500 border-transparent hover:bg-slate-100")}>
            <span className="hidden md:inline">보기 및 도구</span>
            <span className="md:hidden">보기</span>
          </button>
          
          <div className="ml-auto flex items-center gap-3 text-xs font-bold text-slate-400 pb-2">
            {/* 왜: 모바일에서 줌 컨트롤은 네이티브 핀치줌으로 대체, 넘침 방지를 위해 숨김 */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100/80 rounded-lg px-1.5 py-0.5 border border-slate-200/60">
              <Tooltip><TooltipTrigger asChild><button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-0.5 hover:bg-white hover:shadow-sm rounded text-slate-500 transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">축소</TooltipContent></Tooltip>
              <span className="text-[11px] font-bold w-9 text-center text-slate-600 tabular-nums">{zoom}%</span>
              <Tooltip><TooltipTrigger asChild><button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-0.5 hover:bg-white hover:shadow-sm rounded text-slate-500 transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">확대</TooltipContent></Tooltip>
            </div>
            <Tooltip><TooltipTrigger asChild><button onClick={() => setZoom(100)} className="hidden md:block text-[11px] font-semibold px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded border border-slate-200/60 transition-colors">100%</button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">100%로 초기화</TooltipContent></Tooltip>
            <div className="hidden md:block w-px h-4 bg-slate-200" />
            {/* 왜: 글자 수/단어 수 통계도 모바일에서는 불필요하게 공간을 차지 */}
            <span className="hidden md:flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> {textCount}</span>
            <span className="hidden md:flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {wordCount}</span>
            <Tooltip><TooltipTrigger asChild><button 
              onClick={() => { if (confirm('이 문서를 완전히 삭제하시겠습니까?')) deleteTab(activeTabId!); }}
              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">문서 삭제</TooltipContent></Tooltip>
          </div>
        </div>

        {/* Tab Contents */}
        {/* 왜: flex-wrap→flex-nowrap으로 변경하여 모바일에서 세로 줄바꿈 차단, 가로 스크롤로 전환 */}
        <div className="px-2 md:px-4 py-1.5 md:py-2 min-h-[44px] md:min-h-[60px] flex items-center flex-nowrap overflow-x-auto hide-scrollbar gap-x-3 md:gap-x-4 bg-white">
          
          {activeRibbonTab === 'home' && (
            <>
              {/* History */}
              <div className="flex items-center gap-1 pr-3 md:pr-4 border-r border-slate-200 shrink-0">
                <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><Undo className="w-4 h-4 text-slate-700" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">실행 취소 (Ctrl+Z)</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><Redo className="w-4 h-4 text-slate-700" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">다시 실행 (Ctrl+Y)</TooltipContent></Tooltip>
              </div>

              {/* Font */}
              <div className="flex items-center gap-2 pr-3 md:pr-4 border-r border-slate-200 shrink-0">
                {/* Font Family Dropdown */}
                <div className="relative">
                  <button onClick={() => setShowFontFamily(!showFontFamily)} className="flex items-center justify-between w-28 px-2 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded hover:bg-slate-100">
                    <span className="truncate">{FONT_FAMILIES.find(f => editor.isActive('textStyle', { fontFamily: f.value }))?.name || '글꼴'}</span>
                    <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
                  </button>
                  {showFontFamily && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowFontFamily(false)} />
                      <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-slate-200 rounded shadow-lg z-50 py-1">
                        {FONT_FAMILIES.map(f => (
                          <button key={f.name} onClick={() => { (editor as any).chain().focus().setFontFamily(f.value).run(); setShowFontFamily(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex justify-between items-center">
                            <span style={{ fontFamily: f.value }}>{f.name}</span>
                            {editor.isActive('textStyle', { fontFamily: f.value }) && <Check className="w-3 h-3 text-indigo-500" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Font Size Dropdown */}
                <div className="relative">
                  <button onClick={() => setShowFontSize(!showFontSize)} className="flex items-center justify-between w-16 px-2 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded hover:bg-slate-100">
                    <span>{editor.getAttributes('textStyle').fontSize || '크기'}</span>
                    <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
                  </button>
                  {showFontSize && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowFontSize(false)} />
                      <div className="absolute top-full left-0 mt-1 w-16 bg-white border border-slate-200 rounded shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                        {FONT_SIZES.map(s => (
                          <button key={s} onClick={() => { (editor as any).chain().focus().setFontSize(s).run(); setShowFontSize(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex justify-between items-center">
                            <span>{s.replace('px', '')}</span>
                            {(editor as any).isActive('textStyle', { fontSize: s }) && <Check className="w-3 h-3 text-indigo-500" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Formatting */}
              <div className="flex items-center gap-0.5 pr-3 md:pr-4 border-r border-slate-200 shrink-0">
                <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('bold') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><Bold className="w-4 h-4" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">굵게</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('italic') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><Italic className="w-4 h-4" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">기울임</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('underline') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><UnderlineIcon className="w-4 h-4" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">밑줄</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('strike') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><Strikethrough className="w-4 h-4" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">취소선</TooltipContent></Tooltip>
                
                {/* Text Color */}
                <div className="relative ml-1">
                  <Tooltip><TooltipTrigger asChild><button onClick={() => setShowTextColor(!showTextColor)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600 flex items-center gap-0.5"><Palette className="w-4 h-4" /><ChevronDown className="w-2 h-2" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">글자 색상</TooltipContent></Tooltip>
                  {showTextColor && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowTextColor(false)} />
                      <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 grid grid-cols-4 gap-1 w-32">
                        {COLORS.map(c => (
                          <button key={c} onClick={() => { editor.chain().focus().setColor(c).run(); setShowTextColor(false); }} className="w-6 h-6 rounded border border-slate-200" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Highlight Color */}
                <div className="relative">
                  <Tooltip><TooltipTrigger asChild><button onClick={() => setShowHighlightColor(!showHighlightColor)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600 flex items-center gap-0.5"><Highlighter className="w-4 h-4" /><ChevronDown className="w-2 h-2" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">배경 색상</TooltipContent></Tooltip>
                  {showHighlightColor && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowHighlightColor(false)} />
                      <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 grid grid-cols-4 gap-1 w-32">
                        <button onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightColor(false); }} className="col-span-4 text-xs py-1 border border-slate-200 rounded hover:bg-slate-50 mb-1 text-slate-600">색상 없음</button>
                        {COLORS.map(c => (
                          <button key={c} onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setShowHighlightColor(false); }} className="w-6 h-6 rounded border border-slate-200" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Paragraph */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("p-1.5 rounded transition-colors", editor.isActive({ textAlign: 'left' }) ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><AlignLeft className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("p-1.5 rounded transition-colors", editor.isActive({ textAlign: 'center' }) ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><AlignCenter className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={cn("p-1.5 rounded transition-colors", editor.isActive({ textAlign: 'right' }) ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><AlignRight className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('bulletList') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><List className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('orderedList') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><ListOrdered className="w-4 h-4" /></button>
              </div>
            </>
          )}

          {activeRibbonTab === 'insert' && (
            <>
              {/* Insert Media & Blocks */}
              <div className="flex items-center gap-2 pr-3 md:pr-4 border-r border-slate-200 shrink-0">
                <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                  <TableIcon className="w-4 h-4 text-indigo-500" /> 표
                </button>
                <button onClick={() => (editor as any).chain().focus().setCustomImage().run()} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                  <ImageIcon className="w-4 h-4 text-indigo-500" /> 이미지
                </button>
                <button onClick={() => (editor as any).chain().focus().setCustomYoutube().run()} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                  <YoutubeIcon className="w-4 h-4 text-rose-500" /> 비디오
                </button>
              </div>

              {/* Special Elements */}
              <div className="flex items-center gap-2 pr-3 md:pr-4 border-r border-slate-200 shrink-0">
                <button onClick={() => {
                  const url = window.prompt('URL을 입력하세요');
                  if (url) {
                    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                  }
                }} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                  <LinkIcon className="w-4 h-4 text-blue-500" /> 링크
                </button>
                <div className="relative">
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                    <Smile className="w-4 h-4 text-yellow-500" /> 이모지
                  </button>
                  {showEmojiPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                      <div className="absolute top-full left-0 mt-1 z-50">
                        <EmojiPicker onEmojiClick={onEmojiClick} />
                      </div>
                    </>
                  )}
                </div>
                <button onClick={() => (editor as any).chain().focus().setCustomMath().run()} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                  <Sigma className="w-4 h-4 text-teal-600" /> 수식
                </button>
              </div>

              {/* Layout Blocks */}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                  <Minus className="w-4 h-4 text-slate-400" /> 구분선
                </button>
                <div className="relative">
                  <button onClick={() => setShowInsertMenu(!showInsertMenu)} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                    <Plus className="w-4 h-4 text-slate-600" /> 더보기 <ChevronDown className="w-3 h-3" />
                  </button>
                  {showInsertMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowInsertMenu(false)} />
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1">
                        <button onClick={() => { (editor as any).chain().focus().setCallout().run(); setShowInsertMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500"/> 콜아웃</button>
                        <button onClick={() => { (editor as any).chain().focus().setToggle().run(); setShowInsertMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><ChevronRight className="w-4 h-4 text-slate-500"/> 토글 목록</button>
                        <button onClick={() => { (editor as any).chain().focus().setBookmark().run(); setShowInsertMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><BookmarkIcon className="w-4 h-4 text-emerald-500"/> 북마크</button>
                        <button onClick={() => { editor.chain().focus().toggleCodeBlock().run(); setShowInsertMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Code className="w-4 h-4 text-slate-500"/> 코드 블록</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {activeRibbonTab === 'view' && (
            <>
              {/* 뷰 모드 토글 */}
              <div className="flex items-center gap-1 pr-3 md:pr-4 border-r border-slate-200 shrink-0">
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  <button 
                    onClick={() => activeTabId && setTabViewMode(activeTabId, 'page')}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all", viewMode === 'page' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                  >
                    <FileText className="w-3.5 h-3.5" /> 페이지 뷰
                  </button>
                  <button 
                    onClick={() => activeTabId && setTabViewMode(activeTabId, 'wide')}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all", viewMode === 'wide' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                  >
                    <PanelTopOpen className="w-3.5 h-3.5" /> 넓은 뷰
                  </button>
                </div>
              </div>

              {/* 집중 모드 */}
              <div className="flex items-center pr-3 md:pr-4 border-r border-slate-200 shrink-0">
                <button 
                  onClick={() => activeTabId && setFocusMode(isFocusMode ? null : activeTabId)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors",
                    isFocusMode ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Maximize className="w-4 h-4" /> 집중 모드
                </button>
              </div>

              {/* Export */}
              <div className="flex items-center pr-3 md:pr-4 border-r border-slate-200 shrink-0">
                <button onClick={exportWord} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-sm transition-colors">
                  <Download className="w-4 h-4" /> Word (.docx) 내보내기
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                <Wand2 className="w-4 h-4" />
                <button onClick={() => setIsGuideModalOpen(true)} className="hover:text-indigo-600 hover:underline">슬래시 명령어 가이드</button>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* 집중 모드: 호버 감지 영역 + 슬라이드인 툴바 */}
      {isFocusMode && (
        <>
          {/* 호버 감지 영역 (화면 상단 30px) */}
          <div 
            className="fixed top-0 left-0 right-0 h-[30px] z-50"
            onMouseEnter={handleFocusToolbarEnter}
          />

          {/* 슬라이드인 Ribbon 툴바 */}
          <AnimatePresence>
            {showFocusToolbar && (
              <motion.div
                initial={{ y: '-100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-lg"
                onMouseEnter={() => { if (focusToolbarTimeout.current) clearTimeout(focusToolbarTimeout.current); }}
                onMouseLeave={handleFocusToolbarLeave}
              >
                {/* 고도화된 집중 모드 Ribbon — 직접 노출 + 드롭다운 그룹 */}
                <div className="px-4 py-2 flex items-center gap-x-3">
                  {/* ── 히스토리 ── */}
                  <div className="flex items-center gap-1 pr-3 border-r border-slate-200">
                    <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><Undo className="w-4 h-4 text-slate-700" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">실행 취소</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><Redo className="w-4 h-4 text-slate-700" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">다시 실행</TooltipContent></Tooltip>
                  </div>

                  {/* ── 글꼴 셀렉터 (직접 노출) ── */}
                  <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200">
                    <div className="relative">
                      <button onClick={() => { setFocusFontFamily(!focusFontFamily); setFocusFontSize(false); setFocusDropdown(null); }} className="flex items-center justify-between w-24 px-2 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded hover:bg-slate-100">
                        <span className="truncate">{FONT_FAMILIES.find(f => editor.isActive('textStyle', { fontFamily: f.value }))?.name || '글꼴'}</span>
                        <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
                      </button>
                      {focusFontFamily && (
                        <>
                          <div className="fixed inset-0 z-[60]" onClick={() => setFocusFontFamily(false)} />
                          <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-slate-200 rounded shadow-lg z-[70] py-1">
                            {FONT_FAMILIES.map(f => (
                              <button key={f.name} onClick={() => { (editor as any).chain().focus().setFontFamily(f.value).run(); setFocusFontFamily(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex justify-between items-center">
                                <span style={{ fontFamily: f.value }}>{f.name}</span>
                                {editor.isActive('textStyle', { fontFamily: f.value }) && <Check className="w-3 h-3 text-indigo-500" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 크기 셀렉터 (직접 노출) */}
                    <div className="relative">
                      <button onClick={() => { setFocusFontSize(!focusFontSize); setFocusFontFamily(false); setFocusDropdown(null); }} className="flex items-center justify-between w-16 px-2 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded hover:bg-slate-100">
                        <span>{editor.getAttributes('textStyle').fontSize || '크기'}</span>
                        <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
                      </button>
                      {focusFontSize && (
                        <>
                          <div className="fixed inset-0 z-[60]" onClick={() => setFocusFontSize(false)} />
                          <div className="absolute top-full left-0 mt-1 w-16 bg-white border border-slate-200 rounded shadow-lg z-[70] py-1 max-h-48 overflow-y-auto">
                            {FONT_SIZES.map(s => (
                              <button key={s} onClick={() => { (editor as any).chain().focus().setFontSize(s).run(); setFocusFontSize(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex justify-between items-center">
                                <span>{s.replace('px', '')}</span>
                                {(editor as any).isActive('textStyle', { fontSize: s }) && <Check className="w-3 h-3 text-indigo-500" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── B, I, U 토글 (직접 노출) ── */}
                  <div className="flex items-center gap-0.5 pr-3 border-r border-slate-200">
                    <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('bold') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><Bold className="w-4 h-4" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">굵게</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('italic') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><Italic className="w-4 h-4" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">기울임</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('underline') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")}><UnderlineIcon className="w-4 h-4" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">밑줄</TooltipContent></Tooltip>
                  </div>

                  {/* ── 드롭다운 1: 텍스트 서식 ── */}
                  <div className="relative pr-3 border-r border-slate-200">
                    <button
                      onClick={() => { setFocusDropdown(focusDropdown === 'text' ? null : 'text'); setFocusFontFamily(false); setFocusFontSize(false); }}
                      className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors", focusDropdown === 'text' ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-100")}
                    >
                      <Palette className="w-3.5 h-3.5" /> 서식 <ChevronDown className="w-3 h-3" />
                    </button>
                    {focusDropdown === 'text' && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setFocusDropdown(null)} />
                        <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-xl z-[70] p-3 space-y-3">
                          {/* 취소선 */}
                          <button onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors", editor.isActive('strike') ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50")}>
                            <Strikethrough className="w-4 h-4" /> 취소선
                          </button>
                          <div className="border-t border-slate-100" />
                          {/* 글자 색상 */}
                          <div>
                            <div className="text-xs font-semibold text-slate-500 mb-1.5 px-1">글자 색상</div>
                            <div className="grid grid-cols-6 gap-1.5 px-1">
                              {COLORS.map(c => (
                                <button key={c} onClick={() => { editor.chain().focus().setColor(c).run(); }} className="w-6 h-6 rounded-md border border-slate-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          </div>
                          <div className="border-t border-slate-100" />
                          {/* 형광펜 색상 */}
                          <div>
                            <div className="text-xs font-semibold text-slate-500 mb-1.5 px-1">형광펜</div>
                            <button onClick={() => { editor.chain().focus().unsetHighlight().run(); }} className="w-full text-left px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 rounded mb-1">색상 없음</button>
                            <div className="grid grid-cols-6 gap-1.5 px-1">
                              {COLORS.map(c => (
                                <button key={c} onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); }} className="w-6 h-6 rounded-md border border-slate-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── 드롭다운 2: 단락 ── */}
                  <div className="relative pr-3 border-r border-slate-200">
                    <button
                      onClick={() => { setFocusDropdown(focusDropdown === 'paragraph' ? null : 'paragraph'); setFocusFontFamily(false); setFocusFontSize(false); }}
                      className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors", focusDropdown === 'paragraph' ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-100")}
                    >
                      <AlignLeft className="w-3.5 h-3.5" /> 단락 <ChevronDown className="w-3 h-3" />
                    </button>
                    {focusDropdown === 'paragraph' && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setFocusDropdown(null)} />
                        <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-xl z-[70] p-3 space-y-3">
                          {/* 제목 */}
                          <div>
                            <div className="text-xs font-semibold text-slate-500 mb-1.5 px-1">제목</div>
                            <div className="flex items-center gap-1 px-1">
                              <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("px-2.5 py-1.5 rounded text-xs font-bold transition-colors", editor.isActive('heading', { level: 1 }) ? "bg-indigo-100 text-indigo-700" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}>H1</button>
                              <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("px-2.5 py-1.5 rounded text-xs font-bold transition-colors", editor.isActive('heading', { level: 2 }) ? "bg-indigo-100 text-indigo-700" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}>H2</button>
                              <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={cn("px-2.5 py-1.5 rounded text-xs font-bold transition-colors", editor.isActive('heading', { level: 3 }) ? "bg-indigo-100 text-indigo-700" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}>H3</button>
                              <button onClick={() => editor.chain().focus().setParagraph().run()} className={cn("px-2.5 py-1.5 rounded text-xs font-bold transition-colors", editor.isActive('paragraph') && !editor.isActive('heading') ? "bg-indigo-100 text-indigo-700" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}>본문</button>
                            </div>
                          </div>
                          <div className="border-t border-slate-100" />
                          {/* 정렬 */}
                          <div>
                            <div className="text-xs font-semibold text-slate-500 mb-1.5 px-1">정렬</div>
                            <div className="flex items-center gap-1 px-1">
                              <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("p-1.5 rounded transition-colors", editor.isActive({ textAlign: 'left' }) ? "bg-slate-200" : "hover:bg-slate-100")}><AlignLeft className="w-4 h-4" /></button>
                              <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("p-1.5 rounded transition-colors", editor.isActive({ textAlign: 'center' }) ? "bg-slate-200" : "hover:bg-slate-100")}><AlignCenter className="w-4 h-4" /></button>
                              <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={cn("p-1.5 rounded transition-colors", editor.isActive({ textAlign: 'right' }) ? "bg-slate-200" : "hover:bg-slate-100")}><AlignRight className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="border-t border-slate-100" />
                          {/* 목록 */}
                          <div>
                            <div className="text-xs font-semibold text-slate-500 mb-1.5 px-1">목록</div>
                            <div className="flex items-center gap-1 px-1">
                              <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('bulletList') ? "bg-slate-200" : "hover:bg-slate-100")}><List className="w-4 h-4" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">글머리 기호</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('orderedList') ? "bg-slate-200" : "hover:bg-slate-100")}><ListOrdered className="w-4 h-4" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">번호 매기기</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().toggleTaskList().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('taskList') ? "bg-slate-200" : "hover:bg-slate-100")}><SquareCheckBig className="w-4 h-4" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">체크리스트</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild><button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('blockquote') ? "bg-slate-200" : "hover:bg-slate-100")}><Quote className="w-4 h-4" /></button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">인용구</TooltipContent></Tooltip>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── 드롭다운 3: 삽입 ── */}
                  <div className="relative">
                    <button
                      onClick={() => { setFocusDropdown(focusDropdown === 'insert' ? null : 'insert'); setFocusFontFamily(false); setFocusFontSize(false); setFocusEmojiPicker(false); }}
                      className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors", focusDropdown === 'insert' ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-100")}
                    >
                      <Plus className="w-3.5 h-3.5" /> 삽입 <ChevronDown className="w-3 h-3" />
                    </button>
                    {focusDropdown === 'insert' && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => { setFocusDropdown(null); setFocusEmojiPicker(false); }} />
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-[70] py-1">
                          <button onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setFocusDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><TableIcon className="w-4 h-4 text-indigo-500" /> 표</button>
                          <button onClick={() => { (editor as any).chain().focus().setCustomImage().run(); setFocusDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-indigo-500" /> 이미지</button>
                          <button onClick={() => { (editor as any).chain().focus().setCustomYoutube().run(); setFocusDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><YoutubeIcon className="w-4 h-4 text-rose-500" /> 비디오</button>
                          <button onClick={() => { const url = window.prompt('URL을 입력하세요'); if (url) { editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run(); } setFocusDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><LinkIcon className="w-4 h-4 text-blue-500" /> 링크</button>
                          <div className="border-t border-slate-100 my-1" />
                          <div className="relative">
                            <button onClick={() => setFocusEmojiPicker(!focusEmojiPicker)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Smile className="w-4 h-4 text-yellow-500" /> 이모지</button>
                            {focusEmojiPicker && (
                              <div className="absolute top-0 left-full ml-1 z-[80]">
                                <EmojiPicker onEmojiClick={(emojiData: EmojiClickData) => { editor.chain().focus().insertContent(emojiData.emoji).run(); setFocusEmojiPicker(false); setFocusDropdown(null); }} />
                              </div>
                            )}
                          </div>
                          <button onClick={() => { (editor as any).chain().focus().setCustomMath().run(); setFocusDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Sigma className="w-4 h-4 text-teal-600" /> 수식</button>
                          <button onClick={() => { editor.chain().focus().setHorizontalRule().run(); setFocusDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Minus className="w-4 h-4 text-slate-400" /> 구분선</button>
                          <div className="border-t border-slate-100 my-1" />
                          <button onClick={() => { (editor as any).chain().focus().setCallout().run(); setFocusDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> 콜아웃</button>
                          <button onClick={() => { (editor as any).chain().focus().setToggle().run(); setFocusDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><ChevronRight className="w-4 h-4 text-slate-500" /> 토글 목록</button>
                          <button onClick={() => { (editor as any).chain().focus().setBookmark().run(); setFocusDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><BookmarkIcon className="w-4 h-4 text-emerald-500" /> 북마크</button>
                          <button onClick={() => { editor.chain().focus().toggleCodeBlock().run(); setFocusDropdown(null); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Code className="w-4 h-4 text-slate-500" /> 코드 블록</button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── 나가기 ── */}
                  <button 
                    onClick={() => setFocusMode(null)} 
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Minimize2 className="w-3.5 h-3.5" /> 나가기
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 플로팅 나가기 버튼 (우측 상단, 반투명) */}
          <Tooltip><TooltipTrigger asChild><button 
            onClick={() => setFocusMode(null)}
            className="fixed top-4 right-4 z-40 p-2 bg-black/10 hover:bg-black/20 backdrop-blur-sm rounded-full text-slate-500 hover:text-slate-800 transition-all opacity-40 hover:opacity-100"
          >
            <X className="w-5 h-5" />
          </button></TooltipTrigger><TooltipContent className="text-xs font-bold text-white bg-slate-800 border-none">집중 모드 나가기 (ESC)</TooltipContent></Tooltip>
        </>
      )}

      {/* Editor Area - Word/HWP Style Paginated View */}
      <div 
        id="editor-scroll-container"
        ref={scrollContainerRef}
        data-scroll-detect
        className={cn(
          "flex-1 overflow-y-auto cursor-text transition-all duration-300 origin-top",
          isWideView ? "bg-white" : "bg-[#e8e8e8]"
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) editor.commands.focus();
        }}
      >
        <div 
          className="doc-pages-container mx-auto"
          style={{ 
            transform: `scale(${zoom / 100})`, 
            transformOrigin: 'top center',
            paddingTop: isWideView ? '0.5rem' : '1rem',
            paddingBottom: isWideView ? '1rem' : '2rem',
          }}
        >
          {/* A4 Page / Wide View Container */}
          {/* 왜: max-w-full을 추가하여 모바일에서 816px 고정 너비가 화면을 초과하지 않도록 보장 */}
          <div 
            ref={pageContainerRef}
            className={cn(
              "doc-page mx-auto bg-white relative max-w-full",
              isWideView && "shadow-none"
            )}
            style={{ 
              width: isWideView ? '100%' : '816px',
              maxWidth: isWideView ? '960px' : undefined,
              minHeight: isWideView ? 'auto' : '1056px',
              boxShadow: isWideView ? 'none' : '0 2px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
              marginBottom: isWideView ? '0' : '24px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && editor) editor.commands.focus();
            }}
          >
            {/* Virtual Page Boundaries & Numbers — 넓은 뷰에서는 숨김 */}
            {!isWideView && (
              <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[inherit]">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute w-full flex flex-col items-center justify-end pb-8" 
                    style={{ 
                      top: `${i * 1056}px`, 
                      height: '1056px',
                      borderBottom: i < pageCount - 1 ? '1px dashed #cbd5e1' : 'none'
                    }}
                  >
                    <span className="text-sm text-slate-400 font-medium bg-white px-2">
                      - {i + 1} -
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Editor Content Area */}
            {/* 왜: 모바일에서 에디터 패딩을 24px 16px으로 축소하여 넓은 편집 공간 확보 */}
            <div className="relative z-10" style={{ padding: isMobile ? '24px 16px' : (isWideView ? '48px 40px' : '64px 56px') }}>
              <input 
              type="text"
              value={localTitle}
              onChange={handleTitleChange}
              placeholder="제목을 입력하세요"
              className="w-full text-2xl md:text-5xl font-extrabold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 mb-3 md:mb-5 placeholder:text-slate-300 transition-all tracking-tight"
            />
            

              <EditorContent editor={editor} className="min-h-[500px]" />
              {editor && <SlashMenuWrapper editor={editor} />}
            </div>
          </div>
        </div>
      </div>
      
      <SlashGuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
    </div>
    </TooltipProvider>
  );
}

function SlashMenuWrapper({ editor }: { editor: any }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const SLASH_COMMANDS = [
    { id: 'h1', icon: Heading1, title: '큰 제목', aliases: ['h1', '제목1', '큰제목'], category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleHeading({ level: 1 }).run() },
    { id: 'h2', icon: Heading2, title: '중간 제목', aliases: ['h2', '제목2', '중간제목'], category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleHeading({ level: 2 }).run() },
    { id: 'h3', icon: Heading3, title: '작은 제목', aliases: ['h3', '제목3', '작은제목'], category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleHeading({ level: 3 }).run() },
    { id: 'todo', icon: SquareCheckBig, title: '할 일 목록', aliases: ['todo', '할일', '투두', '체크리스트'], category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
    { id: 'bullet', icon: List, title: '글머리 기호 목록', aliases: ['bullet', '글머리', '목록', '리스트'], category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
    { id: 'num', icon: ListOrdered, title: '번호 매기기 목록', aliases: ['num', '번호', '숫자'], category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
    { id: 'quote', icon: Quote, title: '인용구', aliases: ['quote', '인용', '인용구'], category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
    { id: 'div', icon: Minus, title: '구분선', aliases: ['div', '구분선', '선'], category: '기본 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
    
    { id: 'callout', icon: Lightbulb, title: '콜아웃 (알림 박스)', aliases: ['callout', '콜아웃', '알림', '박스'], category: '커스텀 및 고급 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setCallout().run() },
    { id: 'toggle', icon: ChevronRight, title: '토글 목록', aliases: ['toggle', '토글', '접기'], category: '커스텀 및 고급 블록', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setToggle().run() },
    
    { id: 'bookmark', icon: BookmarkIcon, title: '웹 북마크', aliases: ['bookmark', '북마크', '링크'], category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setBookmark().run() },
    { id: 'image', icon: ImageIcon, title: '이미지', aliases: ['image', '이미지', '사진'], category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setCustomImage().run() },
    { id: 'youtube', icon: YoutubeIcon, title: '유튜브', aliases: ['youtube', '유튜브', '영상', '동영상'], category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setCustomYoutube().run() },
    { id: 'code', icon: Code, title: '코드 블록', aliases: ['code', '코드', '개발'], category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
    { id: 'table', icon: TableIcon, title: '표(Table)', aliases: ['table', '표', '테이블'], category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { id: 'math', icon: Sigma, title: '수식(Math)', aliases: ['math', '수식', '수학'], category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setCustomMath().run() },
    
    { id: 'red', icon: Palette, isColor: true, colorCls: 'bg-red-500', title: '빨간색 글자', aliases: ['red', '빨간색', '빨강'], category: '색상 및 효과', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setColor('#ef4444').run() },
    { id: 'blue', icon: Palette, isColor: true, colorCls: 'bg-blue-500', title: '파란색 글자', aliases: ['blue', '파란색', '파랑'], category: '색상 및 효과', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setColor('#3b82f6').run() },
    { id: 'hl', icon: Highlighter, isColor: false, title: '노란색 형광펜', aliases: ['hl', '형광펜', '노란색', '노랑'], category: '색상 및 효과', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleHighlight({ color: '#fef08a' }).run() },
  ];

  useEffect(() => {
    const updateQuery = () => {
      const { $anchor } = editor.state.selection;
      const node = $anchor.parent;
      if (node.type.name === 'paragraph' && node.textContent.startsWith('/')) {
        setQuery(node.textContent.slice(1).toLowerCase());
      } else {
        setQuery('');
      }
    };
    editor.on('selectionUpdate', updateQuery);
    editor.on('update', updateQuery);
    return () => {
      editor.off('selectionUpdate', updateQuery);
      editor.off('update', updateQuery);
    };
  }, [editor]);

  const filteredCommands = SLASH_COMMANDS.filter(cmd => {
    const q = query.replace(/\s+/g, '');
    if (!q) return true;
    return cmd.id.includes(q) || 
           cmd.title.replace(/\s+/g, '').toLowerCase().includes(q) || 
           (cmd.aliases && cmd.aliases.some(a => a.includes(q)));
  });

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, typeof SLASH_COMMANDS>);

  const flatCommands = Object.values(groupedCommands).flat();

  useEffect(() => { setSelectedIndex(0); }, [query]);

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
        if (!view.hasFocus) return false;
        const { $anchor } = state.selection;
        const node = $anchor.parent;
        if (node.type.name !== 'paragraph' || !node.textContent.startsWith('/')) return false;
        if (node.textContent.startsWith('/ ')) return false;
        if (node.textContent.length > 20) return false;
        return true;
      }}
      className="flex bg-white shadow-xl border border-slate-100 rounded-xl overflow-hidden p-1 gap-1"
    >
      <div className="max-h-64 overflow-y-auto hide-scrollbar flex flex-col p-1 w-64" ref={scrollRef}>
        {filteredCommands.length === 0 && <div className="px-3 py-4 text-sm text-center text-slate-500">결과가 없습니다</div>}
        {Object.entries(groupedCommands).map(([category, cmds]) => (
          <div key={category}>
            <div className="px-2 py-1.5 mt-2 first:mt-0 text-xs font-bold text-slate-400 border-t first:border-t-0 border-slate-100 pt-3 first:pt-1">{category}</div>
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
                  className={cn("w-full flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-lg transition-colors text-left", isSelected ? "bg-slate-100 text-indigo-600" : "text-slate-700 hover:bg-slate-50")}
                >
                  {cmd.isColor ? <div className={cn("w-4 h-4 rounded-full shrink-0", cmd.colorCls)} /> : <Icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-indigo-500" : "text-slate-400")} />}
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
