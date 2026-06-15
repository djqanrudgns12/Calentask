import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Image as ImageIcon, Upload, Trash2, GripHorizontal, Move } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// Supabase 파일 업로드 헬퍼
const uploadImageToSupabase = async (file: File): Promise<{ url: string, path: string } | null> => {
  if (!file.type.startsWith('image/')) return null;
  const supabase = createClient();
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `doc_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `doc_images/${fileName}`;

  const { error } = await supabase.storage.from('archive_media').upload(filePath, file);
  if (error) {
    console.error('Error uploading image:', error);
    return null;
  }
  const { data } = supabase.storage.from('archive_media').getPublicUrl(filePath);
  return { url: data.publicUrl, path: filePath };
};

const ImageComponent = (props: any) => {
  const { src, path, width, height, align } = props.node.attrs;
  const [inputUrl, setInputUrl] = useState(src || '');
  const [isEditing, setIsEditing] = useState(!src);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 리사이즈 관련 상태
  const imageRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [currentHeight, setCurrentHeight] = useState(height);

  useEffect(() => {
    setCurrentWidth(width);
    setCurrentHeight(height);
  }, [width, height]);

  const handleSaveUrl = () => {
    if (inputUrl) {
      props.updateAttributes({ src: inputUrl });
      setIsEditing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const result = await uploadImageToSupabase(file);
    setIsUploading(false);
    
    if (result) {
      props.updateAttributes({ src: result.url, path: result.path });
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('이미지를 삭제하시겠습니까?')) {
      if (path) {
        // 백그라운드 스토리지 정리
        const supabase = createClient();
        supabase.storage.from('archive_media').remove([path]).catch(console.error);
      }
      props.deleteNode();
    }
  };

  // 8방향 리사이즈 핸들러
  const handlePointerDown = (e: React.PointerEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    // imageRef의 현재 실제 크기를 기준으로 삼음
    const startWidth = imageRef.current?.offsetWidth || currentWidth || 500;
    const startHeight = imageRef.current?.offsetHeight || currentHeight || 300;
    const aspectRatio = startWidth / startHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      let deltaX = moveEvent.clientX - startX;
      let deltaY = moveEvent.clientY - startY;

      // 방향에 따라 delta 부호 반전 (왼쪽이나 위쪽으로 드래그할 때 너비/높이가 증가하도록)
      if (direction.includes('w')) deltaX = -deltaX;
      if (direction.includes('n')) deltaY = -deltaY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      const isCenterAlign = align === 'center';
      
      // 가로 조절
      if (direction.includes('e') || direction.includes('w')) {
        // 중앙 정렬 시 양쪽으로 늘어나기 때문에 시각적 피드백을 맞추기 위해 x2 적용 (가로 전용 핸들일 때만)
        const scaleFactorX = (isCenterAlign && direction.length === 1) ? 2 : 1;
        newWidth = Math.max(50, startWidth + deltaX * scaleFactorX);
      }

      // 세로 조절
      if (direction.includes('n') || direction.includes('s')) {
        newHeight = Math.max(50, startHeight + deltaY);
      }

      // Shift 키 누른 경우 비율 유지 로직
      if (moveEvent.shiftKey) {
        if (direction.length === 2) {
          // 대각선일 경우 델타값이 큰 쪽을 기준으로 조절
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        } else if (direction.includes('e') || direction.includes('w')) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
      }

      if (direction.includes('e') || direction.includes('w') || direction.length === 2) setCurrentWidth(newWidth);
      if (direction.includes('n') || direction.includes('s') || direction.length === 2) setCurrentHeight(newHeight);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      // 최종 크기 저장
      if (imageRef.current) {
        props.updateAttributes({ 
          width: imageRef.current.offsetWidth,
          height: imageRef.current.offsetHeight 
        });
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <NodeViewWrapper 
      className={cn("my-6 flex flex-col group relative", props.selected && "ProseMirror-selectednode")} 
      data-type="custom-image"
      style={{ alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}
    >
      {isEditing ? (
        <div className="flex flex-col md:flex-row gap-2 p-3 bg-muted border border-border rounded-lg max-w-xl w-full">
          <div className="flex items-center gap-2 flex-1">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
            <input 
              autoFocus
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveUrl() }}
              placeholder="이미지 URL 붙여넣기..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button onPointerDown={(e) => { e.preventDefault(); handleSaveUrl(); }} className="text-xs font-bold text-indigo-600 px-3 py-1.5 bg-indigo-50 rounded hover:bg-indigo-100 whitespace-nowrap">저장</button>
          </div>
          
          <div className="hidden md:block w-px h-6 bg-slate-200 self-center" />
          
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <button 
              onPointerDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} 
              disabled={isUploading}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 text-xs font-bold text-foreground px-3 py-1.5 bg-card border border-border rounded hover:bg-muted disabled:opacity-50 whitespace-nowrap"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isUploading ? '업로드 중...' : '파일 업로드'}
            </button>
            <button onPointerDown={(e) => { e.preventDefault(); props.deleteNode(); }} className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-muted">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="relative inline-block max-w-full"
          style={{ width: currentWidth || 'auto', height: currentHeight || 'auto' }}
        >
          {/* 드래그 핸들 (위쪽 중앙) */}
          <div 
            className="absolute -top-4 left-1/2 -translate-x-1/2 p-1.5 bg-card border border-border rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-20 pointer-events-auto"
            contentEditable={false}
            data-drag-handle
          >
            <GripHorizontal className="w-4 h-4 text-muted-foreground" />
          </div>

          <div 
            className={cn(
              "relative rounded-xl overflow-hidden border-2 transition-colors w-full h-full", 
              props.selected ? "border-indigo-400 ring-4 ring-indigo-400/20" : "border-transparent hover:border-border"
            )}
            contentEditable={false}
          >
            <img 
              ref={imageRef}
              src={src} 
              alt="Uploaded Document" 
              className="object-fill pointer-events-none select-none"
              style={{ display: 'block', width: '100%', height: '100%' }}
            />
            
            {/* 호버 시 오버레이 메뉴 */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <button 
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }} 
                className="p-1.5 bg-card shadow-sm border border-border rounded-md text-xs font-semibold text-foreground hover:bg-muted pointer-events-auto"
                title="이미지 수정"
              >
                수정
              </button>
              <button 
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }} 
                className="p-1.5 bg-card shadow-sm border border-rose-100 rounded-md text-xs font-semibold text-rose-600 hover:bg-rose-50 pointer-events-auto"
                title="이미지 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            {/* 8방향 리사이즈 핸들 */}
            {(props.selected || isResizing) && (
              <>
                {/* 모서리 핸들 (대각선) */}
                <div onPointerDown={(e) => handlePointerDown(e, 'nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-indigo-500 border border-transparent rounded-full cursor-nwse-resize z-30 opacity-80 hover:opacity-100 shadow-sm pointer-events-auto" />
                <div onPointerDown={(e) => handlePointerDown(e, 'ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-indigo-500 border border-transparent rounded-full cursor-nesw-resize z-30 opacity-80 hover:opacity-100 shadow-sm pointer-events-auto" />
                <div onPointerDown={(e) => handlePointerDown(e, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-indigo-500 border border-transparent rounded-full cursor-nesw-resize z-30 opacity-80 hover:opacity-100 shadow-sm pointer-events-auto" />
                <div onPointerDown={(e) => handlePointerDown(e, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-500 border border-transparent rounded-full cursor-nwse-resize z-30 opacity-80 hover:opacity-100 shadow-sm pointer-events-auto" />
                
                {/* 상하좌우 핸들 */}
                <div onPointerDown={(e) => handlePointerDown(e, 'n')} className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-indigo-500 border border-transparent rounded-sm cursor-ns-resize z-30 opacity-80 hover:opacity-100 shadow-sm pointer-events-auto" />
                <div onPointerDown={(e) => handlePointerDown(e, 's')} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-indigo-500 border border-transparent rounded-sm cursor-ns-resize z-30 opacity-80 hover:opacity-100 shadow-sm pointer-events-auto" />
                <div onPointerDown={(e) => handlePointerDown(e, 'w')} className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-4 bg-indigo-500 border border-transparent rounded-sm cursor-ew-resize z-30 opacity-80 hover:opacity-100 shadow-sm pointer-events-auto" />
                <div onPointerDown={(e) => handlePointerDown(e, 'e')} className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-4 bg-indigo-500 border border-transparent rounded-sm cursor-ew-resize z-30 opacity-80 hover:opacity-100 shadow-sm pointer-events-auto" />
              </>
            )}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const CustomImage = Node.create({
  name: 'customImage',
  group: 'block',
  atom: true,
  draggable: true, // 드래그 앤 드롭 이동 지원

  addAttributes() {
    return {
      src: { default: '' },
      path: { default: '' },
      width: { default: null },
      height: { default: null },
      align: { default: 'center' }, // left, center, right
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="custom-image"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'custom-image', class: 'custom-image' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },
  
  addCommands() {
    return {
      setCustomImage: (options?: { src: string, path?: string }) => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: options || { src: '' },
        });
      },
    } as any;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('imagePasteDropHandler'),
        props: {
          handlePaste: (view, event, slice) => {
            const items = Array.from(event.clipboardData?.items || []);
            const imageItems = items.filter(item => item.type.indexOf('image') === 0);
            
            if (imageItems.length === 0) return false;
            
            event.preventDefault();
            
            // 모든 이미지를 비동기로 업로드 후 삽입
            imageItems.forEach(async (item) => {
              const file = item.getAsFile();
              if (file) {
                const result = await uploadImageToSupabase(file);
                if (result) {
                  const { schema } = view.state;
                  const node = schema.nodes.customImage.create({ src: result.url, path: result.path });
                  const transaction = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(transaction);
                }
              }
            });
            return true;
          },
          handleDrop: (view, event, slice, moved) => {
            if (moved) return false; // 내부 노드 이동은 기본 동작(draggable)에 맡김
            
            const files = Array.from(event.dataTransfer?.files || []);
            const imageFiles = files.filter(file => file.type.indexOf('image') === 0);
            
            if (imageFiles.length === 0) return false;
            
            event.preventDefault();
            
            // 드롭 위치 계산
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (!coordinates) return false;
            
            imageFiles.forEach(async (file) => {
              const result = await uploadImageToSupabase(file);
              if (result) {
                const { schema } = view.state;
                const node = schema.nodes.customImage.create({ src: result.url, path: result.path });
                const transaction = view.state.tr.insert(coordinates.pos, node);
                view.dispatch(transaction);
              }
            });
            return true;
          }
        }
      })
    ];
  }
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setCustomImage: (options?: { src: string, path?: string }) => ReturnType;
    };
  }
}
