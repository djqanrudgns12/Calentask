'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge, 
  useNodesState, 
  useEdgesState, 
  BackgroundVariant,
  Handle,
  Position,
  Connection,
  addEdge,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  Viewport
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MousePointer2, Type, Square, Circle, Trash2, Bold, AlignLeft, AlignCenter, AlignRight, RectangleHorizontal } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';
import { cn } from '@/lib/utils';

const COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e5e7eb', '#ffffff'];

// --- Sticky Node ---
const StickyNode = ({ data, selected }: any) => {
  const { item, updateItem, deleteItem } = data;
  const itemColor = item.data?.color || COLORS[0];
  const textAlign = item.data?.textAlign || 'left';
  
  const [localTitle, setLocalTitle] = useState(item.title || '');
  const [localContent, setLocalContent] = useState(item.content || '');

  useEffect(() => {
    setLocalTitle(item.title || '');
  }, [item.title]);

  useEffect(() => {
    setLocalContent(item.content || '');
  }, [item.content]);
  
  return (
    <div 
      className={`relative shadow-md p-5 rounded-xl transition-shadow ${selected ? 'ring-2 ring-indigo-500 shadow-xl' : 'hover:shadow-lg'}`}
      style={{ width: item.data?.width || 240, height: item.data?.height || 200, backgroundColor: itemColor }}
    >
      <Handle type="target" position={Position.Top} className="w-16 h-2 !bg-indigo-500/50 rounded-full border-none -top-1 opacity-0 hover:opacity-100 transition-opacity cursor-crosshair" />
      <Handle type="target" position={Position.Left} className="w-2 h-16 !bg-indigo-500/50 rounded-full border-none -left-1 opacity-0 hover:opacity-100 transition-opacity cursor-crosshair" />
      
      {selected && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-xl flex items-center gap-1.5 p-1.5 z-30 pointer-events-auto cursor-default border border-border">
          {COLORS.map(c => (
            <button key={c} onClick={(e) => { e.stopPropagation(); updateItem(item.id, { data: { ...item.data, color: c }}); }}
              className={cn("w-6 h-6 rounded-full border hover:scale-110 transition-transform", c === itemColor ? "border-slate-800 ring-2 ring-slate-800/20" : "border-border")} 
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-muted-foreground transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <input
        type="text"
        value={localTitle}
        onChange={(e) => setLocalTitle(e.target.value)}
        onBlur={() => updateItem(item.id, { title: localTitle })}
        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 font-bold text-foreground text-lg mb-2 nodrag"
        placeholder="제목..."
        style={{ textAlign }}
      />
      <textarea
        value={localContent}
        onChange={(e) => setLocalContent(e.target.value)}
        onBlur={() => updateItem(item.id, { content: localContent })}
        className="w-full h-[calc(100%-2.5rem)] bg-transparent border-none focus:outline-none focus:ring-0 text-foreground font-medium resize-none leading-relaxed nodrag"
        placeholder="내용을 자유롭게 입력하세요..."
        style={{ textAlign }}
      />
      
      <Handle type="source" position={Position.Bottom} className="w-16 h-2 !bg-indigo-500/50 rounded-full border-none -bottom-1 opacity-0 hover:opacity-100 transition-opacity cursor-crosshair" />
      <Handle type="source" position={Position.Right} className="w-2 h-16 !bg-indigo-500/50 rounded-full border-none -right-1 opacity-0 hover:opacity-100 transition-opacity cursor-crosshair" />
    </div>
  );
};

// --- Shape Node ---
const ShapeNode = ({ data, selected }: any) => {
  const { item, updateItem, deleteItem } = data;
  const itemColor = item.data?.color || '#ffffff';
  const shapeType = item.data?.shape || 'square'; // 'square' | 'circle'
  
  const [localTitle, setLocalTitle] = useState(item.title || '');

  useEffect(() => {
    setLocalTitle(item.title || '');
  }, [item.title]);
  
  return (
    <div 
      className={`relative flex items-center justify-center shadow-md p-4 transition-all ${selected ? 'ring-2 ring-indigo-500 shadow-xl scale-105' : 'hover:shadow-lg hover:scale-105'} ${shapeType === 'circle' ? 'rounded-full aspect-square' : 'rounded-2xl'}`}
      style={{ width: item.data?.width || 180, height: item.data?.height || (shapeType === 'circle' ? 180 : 120), backgroundColor: itemColor, border: '2px solid #e2e8f0' }}
    >
      <Handle type="target" position={Position.Top} className="w-4 h-4 !bg-indigo-500 rounded-full border-2 border-transparent -top-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Left} className="w-4 h-4 !bg-indigo-500 rounded-full border-2 border-transparent -left-2 opacity-0 hover:opacity-100 transition-opacity" />
      
      {selected && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-xl flex items-center gap-1.5 p-1.5 z-30 pointer-events-auto cursor-default border border-border">
          <button onClick={(e) => { e.stopPropagation(); updateItem(item.id, { data: { ...item.data, shape: 'square' }}); }} className={cn("p-1.5 rounded-lg transition-colors", shapeType === 'square' ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted")}><RectangleHorizontal className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); updateItem(item.id, { data: { ...item.data, shape: 'circle' }}); }} className={cn("p-1.5 rounded-lg transition-colors", shapeType === 'circle' ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted")}><Circle className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-muted-foreground transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <textarea
        value={localTitle}
        onChange={(e) => setLocalTitle(e.target.value)}
        onBlur={() => updateItem(item.id, { title: localTitle })}
        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 font-bold text-foreground text-center resize-none nodrag"
        placeholder="텍스트 입력"
        rows={2}
      />
      
      <Handle type="source" position={Position.Bottom} className="w-4 h-4 !bg-indigo-500 rounded-full border-2 border-transparent -bottom-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Right} className="w-4 h-4 !bg-indigo-500 rounded-full border-2 border-transparent -right-2 opacity-0 hover:opacity-100 transition-opacity" />
    </div>
  );
};

// --- Text Block Node ---
const TextNode = ({ data, selected }: any) => {
  const { item, updateItem, deleteItem } = data;
  
  const [localContent, setLocalContent] = useState(item.content || '');

  useEffect(() => {
    setLocalContent(item.content || '');
  }, [item.content]);
  
  return (
    <div className={`relative min-w-[200px] p-2 transition-all ${selected ? 'ring-1 ring-dashed ring-indigo-400 bg-indigo-50/50 rounded-lg' : ''}`}>
      <Handle type="target" position={Position.Left} className="opacity-0" />
      
      {selected && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-xl flex items-center gap-1.5 p-1.5 z-30 pointer-events-auto cursor-default border border-border">
           <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-muted-foreground transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <textarea
        value={localContent}
        onChange={(e) => setLocalContent(e.target.value)}
        onBlur={() => updateItem(item.id, { content: localContent })}
        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 font-extrabold text-foreground text-2xl resize-none nodrag text-center placeholder:text-muted-foreground/50"
        placeholder="큰 제목 텍스트"
        rows={1}
      />
      
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
};

const nodeTypes = {
  sticky: StickyNode,
  shape: ShapeNode,
  text: TextNode
};

const EMPTY_ARRAY: any[] = [];

export function CanvasBoard() {
  const { activeTabId, items: storeItems, updateItem, addItem, deleteItem, boardConfigs, setBoardConfig, flushPendingUpdates } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || EMPTY_ARRAY) : EMPTY_ARRAY;
  const config = activeTabId ? boardConfigs[activeTabId] : null;

  // ReactFlow States
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // 드래그 상태 추적: 드래그 중에는 items→nodes 재동기화를 차단
  const isDraggingRef = useRef(false);
  // 직전 items 참조: 서버에서 온 변경인지 로컬 변경인지 구분하기 위해 사용
  const prevItemsRef = useRef<typeof items>(items);
  // 현재 activeTabId 추적 (언마운트 시 flush 용)
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  // Sync Store Items -> ReactFlow Nodes (스마트 동기화)
  useEffect(() => {
    if (!activeTabId) return;
    // 드래그 중이면 노드 재동기화를 완전히 건너뜀
    if (isDraggingRef.current) {
      prevItemsRef.current = items;
      return;
    }

    setNodes((prevNodes) => {
      // 기존 노드의 위치 맵 (ReactFlow가 관리하는 실제 시각적 위치)
      const prevPositionMap = new Map(prevNodes.map(n => [n.id, n.position]));

      const newNodes: Node[] = items.map(item => {
        const storePos = { x: item.data?.x || 0, y: item.data?.y || 0 };
        const prevNode = prevNodes.find(n => n.id === item.id);
        const prevPos = prevPositionMap.get(item.id);

        // 이전 items에서 해당 아이템의 store 좌표
        const prevItem = prevItemsRef.current.find(i => i.id === item.id);
        const prevStorePos = prevItem ? { x: prevItem.data?.x || 0, y: prevItem.data?.y || 0 } : null;

        let position: { x: number; y: number };

        if (!prevPos) {
          // 새로 추가된 노드: store 좌표 사용
          position = storePos;
        } else if (prevStorePos && (prevStorePos.x !== storePos.x || prevStorePos.y !== storePos.y)) {
          // store 좌표가 변경됨 (= 드래그 후 updateItem이 적용된 것 또는 서버에서 갱신된 것)
          // 로컬 드래그에 의한 변경이면 ReactFlow의 현재 위치를 유지
          // (드래그 후 updateItem → items 변경 → 이 useEffect 순환을 방지)
          if (Math.abs(prevPos.x - storePos.x) < 1 && Math.abs(prevPos.y - storePos.y) < 1) {
            // ReactFlow 위치와 store 위치가 거의 동일 → 이미 동기화됨
            position = prevPos;
          } else {
            // store 좌표가 의미 있게 변경됨 → store 값 반영
            position = storePos;
          }
        } else {
          // store 좌표 변경 없음 → ReactFlow의 현재 위치 유지 (드래그 중간 상태 보호)
          position = prevPos;
        }

        return {
          id: item.id,
          type: item.data?.type || 'sticky',
          position,
          selected: prevNode?.selected,
          dragging: prevNode?.dragging,
          width: prevNode?.width,
          height: prevNode?.height,
          data: {
            item,
            updateItem: (id: string, updates: any) => updateItem(activeTabId, id, updates),
            deleteItem: (id: string) => deleteItem(activeTabId, id)
          }
        };
      });

      return newNodes;
    });

    prevItemsRef.current = items;

    if (config?.edges) {
      setEdges(config.edges);
    } else {
      setEdges([]);
    }
  }, [items, config?.edges, activeTabId, updateItem, deleteItem]);

  // 컴포넌트 언마운트 시 (탭 전환) 미저장 데이터를 즉시 서버에 저장
  useEffect(() => {
    return () => {
      flushPendingUpdates();
    };
  }, [flushPendingUpdates]);

  const onNodesChangeWrapper = useCallback(
    (changes: any) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      changes.forEach((change: any) => {
        if (change.type === 'remove' && activeTabId) {
           deleteItem(activeTabId, change.id);
        }
      });
    },
    [setNodes, activeTabId, deleteItem]
  );

  // 드래그 시작 시 플래그 설정
  const onNodeDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  // 드래그 중 실시간 좌표를 store에 반영 (디바운스가 적용된 updateItem 사용)
  const onNodeDrag = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (activeTabId) {
        const item = items.find(i => i.id === node.id);
        if (item) {
          updateItem(activeTabId, item.id, {
            data: { ...item.data, x: node.position.x, y: node.position.y }
          });
        }
      }
    },
    [activeTabId, items, updateItem]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      isDraggingRef.current = false;
      if (activeTabId) {
        const item = items.find(i => i.id === node.id);
        if (item) {
          updateItem(activeTabId, item.id, {
            data: { ...item.data, x: node.position.x, y: node.position.y }
          });
        }
      }
    },
    [activeTabId, items, updateItem]
  );

  const onEdgesChangeWrapper = useCallback(
    (changes: any) => {
      setEdges((eds) => {
         const newEdges = applyEdgeChanges(changes, eds);
         // If edges were deleted or changed, save to store
         if (activeTabId && changes.some((c:any) => c.type === 'remove')) {
            setBoardConfig(activeTabId, { edges: newEdges });
         }
         return newEdges;
      });
    },
    [setEdges, activeTabId, setBoardConfig]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge({ 
          ...params, 
          type: 'smoothstep',
          animated: true, 
          style: { stroke: '#6366f1', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
        }, eds);
        
        if (activeTabId) {
          setBoardConfig(activeTabId, { edges: newEdges });
        }
        return newEdges;
      });
    },
    [setEdges, activeTabId, setBoardConfig]
  );

  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    const label = window.prompt('화살표 레이블 텍스트를 입력하세요:', edge.label as string || '');
    if (label !== null) {
       setEdges((eds) => {
          const newEdges = eds.map(e => e.id === edge.id ? { ...e, label, labelStyle: { fill: '#4f46e5', fontWeight: 700, fontSize: 12 }, labelBgStyle: { fill: '#e0e7ff', fillOpacity: 0.8, rx: 4 } } : e);
          if (activeTabId) setBoardConfig(activeTabId, { edges: newEdges });
           return newEdges;
        });
     }
  }, [activeTabId, setBoardConfig, setEdges]);

  const onMoveEnd = useCallback(
    (event: any, viewport: Viewport) => {
      if (activeTabId) {
        setBoardConfig(activeTabId, { viewport });
      }
    },
    [activeTabId, setBoardConfig]
  );

  // Toolbar Actions
  const getCenterOffset = (index: number) => {
    // slight offset so they don't pile exactly on top of each other
    const centerNodeX = window.innerWidth / 2 - 120 + (index * 20);
    const centerNodeY = window.innerHeight / 2 - 100 + (index * 20);
    return { x: centerNodeX, y: centerNodeY };
  };

  const handleAddSticky = () => {
    if (!activeTabId) return;
    const pos = getCenterOffset(items.length % 5);
    addItem(activeTabId, {
      title: '새 스티키 노트',
      content: '',
      data: { type: 'sticky', x: pos.x, y: pos.y, color: COLORS[0], width: 240, height: 200 }
    });
  };

  const handleAddShape = () => {
    if (!activeTabId) return;
    const pos = getCenterOffset(items.length % 5);
    addItem(activeTabId, {
      title: '프로세스',
      content: '',
      data: { type: 'shape', shape: 'square', x: pos.x, y: pos.y, color: '#ffffff' }
    });
  };

  const handleAddText = () => {
    if (!activeTabId) return;
    const pos = getCenterOffset(items.length % 5);
    addItem(activeTabId, {
      title: '',
      content: '큰 제목',
      data: { type: 'text', x: pos.x, y: pos.y }
    });
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-background rounded-3xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeWrapper}
        onEdgesChange={onEdgesChangeWrapper}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        defaultViewport={config?.viewport || { x: 0, y: 0, zoom: 1 }}
        fitView={!config?.viewport}
        className="bg-muted"
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={32} size={2.5} color="#cbd5e1" />
        <Controls className="bg-card shadow-xl border-none rounded-xl overflow-hidden mb-28 md:mb-6 ml-4 md:ml-6 fill-slate-700" showInteractive={false} />
        <MiniMap 
          nodeColor={(node) => {
             const type = node.type;
             if (type === 'text') return 'transparent';
             const c = node.data?.item?.data?.color;
             return c === '#ffffff' ? '#e2e8f0' : (c || '#cbd5e1');
          }}
          className="bg-card/90 backdrop-blur shadow-2xl rounded-2xl border border-border overflow-hidden mb-28 md:mb-6 mr-4 md:mr-6" 
          maskColor="rgba(248, 250, 252, 0.7)"
          zoomable
          pannable
        />
      </ReactFlow>

      {/* Floating Action Toolbar */}
      <div className="absolute md:left-8 bottom-24 left-1/2 -translate-x-1/2 md:translate-x-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-card/95 backdrop-blur-xl shadow-2xl rounded-2xl md:p-2.5 p-2 flex flex-row md:flex-col gap-2 md:gap-2.5 border border-border/60 z-50">
        <div className="hidden md:block text-[10px] font-extrabold text-muted-foreground text-center uppercase tracking-widest mb-1 mt-1">Tools</div>
        <button className="p-2.5 md:p-3.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm" title="선택 도구"><MousePointer2 className="w-5 h-5" /></button>
        <div className="w-px md:w-full h-8 md:h-px bg-muted my-auto md:my-0.5 mx-1 md:mx-0" />
        <button onClick={handleAddSticky} className="p-2.5 md:p-3.5 hover:bg-muted text-foreground rounded-xl transition-colors hover:shadow-sm" title="스티키 노트 추가"><Square className="w-5 h-5 fill-yellow-200" /></button>
        <button onClick={handleAddShape} className="p-2.5 md:p-3.5 hover:bg-muted text-foreground rounded-xl transition-colors hover:shadow-sm" title="다이어그램 도형 추가"><Circle className="w-5 h-5" /></button>
        <button onClick={handleAddText} className="p-2.5 md:p-3.5 hover:bg-muted text-foreground rounded-xl transition-colors hover:shadow-sm" title="텍스트 블록 추가"><Type className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
