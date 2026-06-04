'use client'

import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  FileText, MoreHorizontal, Clock, AlignLeft, Bold, Italic, Type, Plus, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, Trash2, Palette, Highlighter, AlignCenter, AlignRight, Table as TableIcon, 
  SquareCheckBig, Minus, Lightbulb, ChevronRight, Bookmark as BookmarkIcon, ImageIcon, Film as YoutubeIcon, 
  Code, Wand2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Grip, PanelTop, PanelLeft, Trash, Grid3X3, 
  GripVertical, Underline as UnderlineIcon, Strikethrough, Link as LinkIcon, Smile, Download, Sigma,
  Undo, Redo, ZoomIn, ZoomOut, Maximize, ChevronDown, Check, MousePointerSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { TableHeader } from '@tiptap/extension-table-header';
import { CustomTableCell } from './extensions/CustomTableCell';
import { CustomImage } from './extensions/ImageExtension';
import { CustomYoutube } from './extensions/YoutubeExtension';
import { Callout } from './extensions/CalloutExtension';
import { Toggle } from './extensions/ToggleExtension';
import { Bookmark } from './extensions/BookmarkExtension';
import { SlashGuideModal } from '../SlashGuideModal';
import { cn } from '@/lib/utils';
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
  const { activeTabId, tabs, items: storeItems, updateItem, addItem, updateTab, deleteTab } = useArchiveStore();
  const currentTab = tabs.find(t => t.id === activeTabId);
  const items = activeTabId ? (storeItems[activeTabId] || EMPTY_ARRAY) : EMPTY_ARRAY;
  const initRef = useRef<string | null>(null);
  
  const docItem = items[0];

  const latestDocItem = useRef(docItem);
  const latestActiveTabId = useRef(activeTabId);

  useEffect(() => {
    latestDocItem.current = docItem;
  }, [docItem]);

  useEffect(() => {
    latestActiveTabId.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    const storeItemsDict = useArchiveStore.getState().items;
    const existingItems = storeItemsDict[activeTabId || ''];
    
    if (activeTabId && existingItems !== undefined && existingItems.length === 0 && initRef.current !== activeTabId) {
      initRef.current = activeTabId;
      addItem(activeTabId, { title: currentTab?.name || '새 문서', content: '' });
    }
  }, [activeTabId, items.length, addItem, currentTab?.name]);

  const [localTitle, setLocalTitle] = useState(docItem?.title || '');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home'|'insert'|'view'>('home');
  const [zoom, setZoom] = useState(100);

  // Dropdown states
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlightColor, setShowHighlightColor] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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

  // Handle Ctrl+Wheel for Zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setZoom(z => Math.min(200, z + 10));
        } else {
          setZoom(z => Math.max(50, z - 10));
        }
      }
    };
    const editorContainer = document.getElementById('editor-scroll-container');
    if (editorContainer) {
      editorContainer.addEventListener('wheel', handleWheel, { passive: false });
      return () => editorContainer.removeEventListener('wheel', handleWheel);
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
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
    content: docItem?.data?.contentJSON || docItem?.content || '',
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
    if (editor && docItem && initializedDocId.current !== docItem.id) {
      initializedDocId.current = docItem.id;
      editor.commands.setContent(docItem.data?.contentJSON || docItem.content || '');
    }
  }, [editor, docItem?.id]);

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
    <div className="w-full h-full bg-slate-50 relative flex flex-col">
      {/* Ribbon Toolbar */}
      <div className="border-b border-slate-200 bg-white shrink-0 sticky top-0 z-20 shadow-sm flex flex-col">
        {/* Tab Headers */}
        <div className="flex px-4 pt-2 gap-1 border-b border-slate-100 bg-slate-50">
          <button onClick={() => setActiveRibbonTab('home')} className={cn("px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border border-b-0", activeRibbonTab === 'home' ? "bg-white text-indigo-600 border-slate-200 translate-y-px" : "text-slate-500 border-transparent hover:bg-slate-100")}>홈</button>
          <button onClick={() => setActiveRibbonTab('insert')} className={cn("px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border border-b-0", activeRibbonTab === 'insert' ? "bg-white text-indigo-600 border-slate-200 translate-y-px" : "text-slate-500 border-transparent hover:bg-slate-100")}>삽입</button>
          <button onClick={() => setActiveRibbonTab('view')} className={cn("px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border border-b-0", activeRibbonTab === 'view' ? "bg-white text-indigo-600 border-slate-200 translate-y-px" : "text-slate-500 border-transparent hover:bg-slate-100")}>보기 및 도구</button>
          
          <div className="ml-auto flex items-center gap-4 text-xs font-bold text-slate-400 pb-2">
            <span className="flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> {textCount}</span>
            <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {wordCount}</span>
            <button 
              onClick={() => { if (confirm('이 문서를 완전히 삭제하시겠습니까?')) deleteTab(activeTabId!); }}
              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded transition-colors" title="문서 삭제"
            ><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="px-4 py-2 min-h-[60px] flex items-center flex-wrap gap-x-4 gap-y-2 bg-white">
          
          {activeRibbonTab === 'home' && (
            <>
              {/* History */}
              <div className="flex items-center gap-1 pr-4 border-r border-slate-200">
                <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30" title="실행 취소 (Ctrl+Z)"><Undo className="w-4 h-4 text-slate-700" /></button>
                <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30" title="다시 실행 (Ctrl+Y)"><Redo className="w-4 h-4 text-slate-700" /></button>
              </div>

              {/* Font */}
              <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
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
                          <button key={f.name} onClick={() => { editor.chain().focus().setFontFamily(f.value).run(); setShowFontFamily(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex justify-between items-center">
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
                          <button key={s} onClick={() => { editor.chain().focus().setFontSize(s).run(); setShowFontSize(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex justify-between items-center">
                            <span>{s.replace('px', '')}</span>
                            {editor.isActive('textStyle', { fontSize: s }) && <Check className="w-3 h-3 text-indigo-500" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Formatting */}
              <div className="flex items-center gap-0.5 pr-4 border-r border-slate-200">
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('bold') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")} title="굵게"><Bold className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('italic') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")} title="기울임"><Italic className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('underline') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")} title="밑줄"><UnderlineIcon className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("p-1.5 rounded transition-colors", editor.isActive('strike') ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100")} title="취소선"><Strikethrough className="w-4 h-4" /></button>
                
                {/* Text Color */}
                <div className="relative ml-1">
                  <button onClick={() => setShowTextColor(!showTextColor)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600 flex items-center gap-0.5" title="글자 색상"><Palette className="w-4 h-4" /><ChevronDown className="w-2 h-2" /></button>
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
                  <button onClick={() => setShowHighlightColor(!showHighlightColor)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600 flex items-center gap-0.5" title="배경 색상"><Highlighter className="w-4 h-4" /><ChevronDown className="w-2 h-2" /></button>
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
              <div className="flex items-center gap-0.5">
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
              <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
                <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                  <TableIcon className="w-4 h-4 text-indigo-500" /> 표
                </button>
                <button onClick={() => editor.chain().focus().setCustomImage().run()} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                  <ImageIcon className="w-4 h-4 text-indigo-500" /> 이미지
                </button>
                <button onClick={() => editor.chain().focus().setCustomYoutube().run()} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                  <YoutubeIcon className="w-4 h-4 text-rose-500" /> 비디오
                </button>
              </div>

              {/* Special Elements */}
              <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
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
                <button onClick={() => editor.chain().focus().setCustomMath().run()} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-semibold text-slate-700">
                  <Sigma className="w-4 h-4 text-teal-600" /> 수식
                </button>
              </div>

              {/* Layout Blocks */}
              <div className="flex items-center gap-2">
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
                        <button onClick={() => { editor.chain().focus().setCallout().run(); setShowInsertMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500"/> 콜아웃</button>
                        <button onClick={() => { editor.chain().focus().setToggle().run(); setShowInsertMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><ChevronRight className="w-4 h-4 text-slate-500"/> 토글 목록</button>
                        <button onClick={() => { editor.chain().focus().setBookmark().run(); setShowInsertMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><BookmarkIcon className="w-4 h-4 text-emerald-500"/> 북마크</button>
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
              {/* Export */}
              <div className="flex items-center pr-4 border-r border-slate-200">
                <button onClick={exportWord} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-sm transition-colors">
                  <Download className="w-4 h-4" /> Word (.docx) 내보내기
                </button>
              </div>

              {/* Zoom */}
              <div className="flex items-center gap-3 px-4 border-r border-slate-200">
                <div className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                  <Search className="w-4 h-4" /> 화면 배율
                </div>
                <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                  <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-600"><ZoomOut className="w-4 h-4" /></button>
                  <span className="text-xs font-bold w-12 text-center text-slate-700">{zoom}%</span>
                  <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-600"><ZoomIn className="w-4 h-4" /></button>
                </div>
                <button onClick={() => setZoom(100)} className="text-xs font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded">100%</button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Wand2 className="w-4 h-4" />
                <button onClick={() => setIsGuideModalOpen(true)} className="hover:text-indigo-600 hover:underline">슬래시 명령어 가이드</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div 
        id="editor-scroll-container"
        className="flex-1 overflow-y-auto pb-32 cursor-text transition-all duration-200 origin-top" 
        onClick={(e) => {
          if (e.target === e.currentTarget) editor.commands.focus();
        }}
      >
        <div 
          className="mx-auto bg-white min-h-[800px] shadow-sm border-x border-slate-100"
          style={{ 
            width: '800px', 
            transform: `scale(${zoom / 100})`, 
            transformOrigin: 'top center',
            marginTop: '2rem',
            marginBottom: '4rem',
            padding: '4rem' 
          }}
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
            {editor && <SlashMenuWrapper editor={editor} />}
            
            {editor && (
              <BubbleMenu 
                editor={editor} 
                shouldShow={({ editor, from, to }) => {
                  const hasSelection = from !== to;
                  return hasSelection && !editor.isActive('table');
                }}
                className="z-50"
              >
                <motion.div drag dragMomentum={false} className="flex items-center bg-white border border-slate-200 text-slate-700 shadow-xl rounded-xl overflow-hidden p-1.5 gap-1.5 cursor-grab active:cursor-grabbing">
                  <div className="flex items-center text-slate-300 mr-0.5" title="드래그하여 이동"><GripVertical className="w-4 h-4" /></div>
                  <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded-md transition-colors", editor.isActive('bold') ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50")} title="굵게"><Bold className="w-4 h-4" /></button>
                  <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded-md transition-colors", editor.isActive('italic') ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50")} title="기울임"><Italic className="w-4 h-4" /></button>
                  <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 rounded-md transition-colors", editor.isActive('underline') ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50")} title="밑줄"><UnderlineIcon className="w-4 h-4" /></button>
                  <button onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("p-1.5 rounded-md transition-colors", editor.isActive('strike') ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50")} title="취소선"><Strikethrough className="w-4 h-4" /></button>
                  <div className="w-px h-5 bg-slate-200 mx-0.5" />
                  <button onClick={() => editor.chain().focus().setColor('#f43f5e').run()} className="p-1.5 rounded-md transition-colors text-rose-500 hover:bg-slate-50" title="빨간색"><Palette className="w-4 h-4" /></button>
                  <button onClick={() => editor.chain().focus().setColor('#3b82f6').run()} className="p-1.5 rounded-md transition-colors text-blue-500 hover:bg-slate-50" title="파란색"><Palette className="w-4 h-4" /></button>
                  <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} className="p-1.5 rounded-md transition-colors text-yellow-500 hover:bg-slate-50" title="노란색 형광펜"><Highlighter className="w-4 h-4" /></button>
                  <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()} className="p-1.5 rounded-md transition-colors text-green-500 hover:bg-slate-50" title="초록색 형광펜"><Highlighter className="w-4 h-4" /></button>
                </motion.div>
              </BubbleMenu>
            )}

            {editor && (
              <BubbleMenu 
                editor={editor}
                shouldShow={({ editor }) => editor.isActive('table')}
                // @ts-ignore
                tippyOptions={{ placement: 'top', duration: 100 }}
                className="z-50"
              >
                <motion.div drag dragMomentum={false} className="flex flex-col bg-white border border-slate-200 text-slate-700 shadow-xl rounded-xl overflow-hidden p-2 gap-2 max-w-[460px] cursor-grab active:cursor-grabbing">
                  {/* Row 1: Formatting & Standard Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center text-slate-300 mr-0.5" title="드래그하여 이동"><GripVertical className="w-4 h-4" /></div>
                    <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                      <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded-md transition-colors", editor.isActive('bold') ? "bg-slate-200" : "hover:bg-slate-200/50")}><Bold className="w-3.5 h-3.5" /></button>
                      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded-md transition-colors", editor.isActive('italic') ? "bg-slate-200" : "hover:bg-slate-200/50")}><Italic className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                      <button onClick={() => editor.chain().focus().toggleHeaderRow().run()} className="p-1.5 rounded-md hover:bg-slate-200/50" title="제목 행 전환"><PanelTop className="w-3.5 h-3.5" /></button>
                      <button onClick={() => editor.chain().focus().toggleHeaderColumn().run()} className="p-1.5 rounded-md hover:bg-slate-200/50" title="제목 열 전환"><PanelLeft className="w-3.5 h-3.5" /></button>
                      <button onClick={() => editor.chain().focus().mergeCells().run()} className="p-1.5 rounded-md hover:bg-slate-200/50" title="셀 병합"><Grip className="w-3.5 h-3.5" /></button>
                      <button onClick={() => editor.chain().focus().splitCell().run()} className="p-1.5 rounded-md hover:bg-slate-200/50" title="셀 분할"><Grid3X3 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                      <button onClick={() => editor.chain().focus().addRowBefore().run()} className="p-1.5 rounded-md text-indigo-500 hover:bg-slate-200/50" title="위에 행 추가"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => editor.chain().focus().addRowAfter().run()} className="p-1.5 rounded-md text-indigo-500 hover:bg-slate-200/50" title="아래에 행 추가"><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="p-1.5 rounded-md text-indigo-500 hover:bg-slate-200/50" title="왼쪽에 열 추가"><ArrowLeft className="w-3.5 h-3.5" /></button>
                      <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="p-1.5 rounded-md text-indigo-500 hover:bg-slate-200/50" title="오른쪽에 열 추가"><ArrowRight className="w-3.5 h-3.5" /></button>
                      <button onClick={() => editor.chain().focus().deleteRow().run()} className="p-1.5 rounded-md text-rose-500 hover:bg-slate-200/50" title="현재 행 삭제"><Minus className="w-3.5 h-3.5" /></button>
                      <button onClick={() => editor.chain().focus().deleteColumn().run()} className="p-1.5 rounded-md text-rose-500 hover:bg-slate-200/50" title="현재 열 삭제"><Minus className="w-3.5 h-3.5" /></button>
                    </div>
                    <button onClick={() => editor.chain().focus().deleteTable().run()} className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 ml-1 border border-rose-100" title="표 전체 삭제"><Trash className="w-3.5 h-3.5" /></button>
                  </div>
                  
                  {/* Row 2: Advanced Styling (Borders & Colors) */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400 pl-1">배경</span>
                    <div className="flex items-center gap-1">
                      {['#fee2e2', '#dbeafe', '#dcfce7', '#fef08a', 'transparent'].map(color => (
                        <button key={color} onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', color === 'transparent' ? null : color).run()} className="w-5 h-5 rounded border border-slate-200 hover:scale-110 transition-transform" style={{ backgroundColor: color === 'transparent' ? '#fff' : color }} title={color === 'transparent' ? '배경 없음' : '배경색'} />
                      ))}
                    </div>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <span className="text-xs font-bold text-slate-400">테두리</span>
                    <div className="flex items-center gap-1">
                      <select onChange={(e) => editor.chain().focus().setCellAttribute('borderWidth', e.target.value).run()} className="text-xs border border-slate-200 rounded p-1 outline-none bg-slate-50" title="테두리 두께">
                        <option value="">기본 두께</option>
                        {BORDER_WIDTHS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <select onChange={(e) => editor.chain().focus().setCellAttribute('borderStyle', e.target.value).run()} className="text-xs border border-slate-200 rounded p-1 outline-none bg-slate-50" title="테두리 스타일">
                        <option value="">기본 스타일</option>
                        {BORDER_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input type="color" onChange={(e) => editor.chain().focus().setCellAttribute('borderColor', e.target.value).run()} className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent" title="테두리 색상" />
                    </div>
                  </div>
                </motion.div>
              </BubbleMenu>
            )}

            <EditorContent editor={editor} className="min-h-[500px]" />
          </div>
        </div>
      </div>
      
      <SlashGuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
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
    { id: 'math', icon: Sigma, title: '수식(Math)', category: '데이터 및 미디어', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setCustomMath().run() },
    
    { id: 'red', icon: Palette, isColor: true, colorCls: 'bg-red-500', title: '빨간색 글자', category: '색상 및 효과', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setColor('#ef4444').run() },
    { id: 'blue', icon: Palette, isColor: true, colorCls: 'bg-blue-500', title: '파란색 글자', category: '색상 및 효과', action: (e: any, r: any) => e.chain().focus().deleteRange(r).setColor('#3b82f6').run() },
    { id: 'hl', icon: Highlighter, isColor: false, title: '노란색 형광펜', category: '색상 및 효과', action: (e: any, r: any) => e.chain().focus().deleteRange(r).toggleHighlight({ color: '#fef08a' }).run() },
  ];

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

  const filteredCommands = SLASH_COMMANDS.filter(cmd => cmd.id.includes(query) || cmd.title.includes(query));

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
        if (!view.hasFocus || view.composing) return false;
        const { $anchor } = state.selection;
        const node = $anchor.parent;
        return node.type.name === 'paragraph' && node.textContent.startsWith('/') && !node.textContent.includes(' ');
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
