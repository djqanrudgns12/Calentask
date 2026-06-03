'use client'

import { useState, useCallback, useEffect, useMemo } from 'react';
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
  applyEdgeChanges
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
  
  return (
    <div 
      className={`relative shadow-md p-5 rounded-xl transition-shadow ${selected ? 'ring-2 ring-indigo-500 shadow-xl' : 'hover:shadow-lg'}`}
      style={{ width: item.data?.width || 240, height: item.data?.height || 200, backgroundColor: itemColor }}
    >
      <Handle type="target" position={Position.Top} className="w-16 h-2 !bg-indigo-500/50 rounded-full border-none -top-1 opacity-0 hover:opacity-100 transition-opacity cursor-crosshair" />
      <Handle type="target" position={Position.Left} className="w-2 h-16 !bg-indigo-500/50 rounded-full border-none -left-1 opacity-0 hover:opacity-100 transition-opacity cursor-crosshair" />
      
      {selected && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl flex items-center gap-1.5 p-1.5 z-30 pointer-events-auto cursor-default border border-slate-100">
          {COLORS.map(c => (
            <button key={c} onClick={(e) => { e.stopPropagation(); updateItem(item.id, { data: { ...item.data, color: c }}); }}
              className={cn("w-6 h-6 rounded-full border hover:scale-110 transition-transform", c === itemColor ? "border-slate-800 ring-2 ring-slate-800/20" : "border-slate-200")} 
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <input
        type="text"
        value={item.title}
        onChange={(e) => updateItem(item.id, { title: e.target.value })}
        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 font-bold text-slate-800 text-lg mb-2 nodrag"
        placeholder="제목..."
        style={{ textAlign }}
      />
      <textarea
        value={item.content || ''}
        onChange={(e) => updateItem(item.id, { content: e.target.value })}
        className="w-full h-[calc(100%-2.5rem)] bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 font-medium resize-none leading-relaxed nodrag"
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
  
  return (
    <div 
      className={`relative flex items-center justify-center shadow-md p-4 transition-all ${selected ? 'ring-2 ring-indigo-500 shadow-xl scale-105' : 'hover:shadow-lg hover:scale-105'} ${shapeType === 'circle' ? 'rounded-full aspect-square' : 'rounded-2xl'}`}
      style={{ width: item.data?.width || 180, height: item.data?.height || (shapeType === 'circle' ? 180 : 120), backgroundColor: itemColor, border: '2px solid #e2e8f0' }}
    >
      <Handle type="target" position={Position.Top} className="w-4 h-4 !bg-indigo-500 rounded-full border-2 border-white -top-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Left} className="w-4 h-4 !bg-indigo-500 rounded-full border-2 border-white -left-2 opacity-0 hover:opacity-100 transition-opacity" />
      
      {selected && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl flex items-center gap-1.5 p-1.5 z-30 pointer-events-auto cursor-default border border-slate-100">
          <button onClick={(e) => { e.stopPropagation(); updateItem(item.id, { data: { ...item.data, shape: 'square' }}); }} className={cn("p-1.5 rounded-lg transition-colors", shapeType === 'square' ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:bg-slate-50")}><RectangleHorizontal className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); updateItem(item.id, { data: { ...item.data, shape: 'circle' }}); }} className={cn("p-1.5 rounded-lg transition-colors", shapeType === 'circle' ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:bg-slate-50")}><Circle className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <textarea
        value={item.title || ''}
        onChange={(e) => updateItem(item.id, { title: e.target.value })}
        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 font-bold text-slate-700 text-center resize-none nodrag"
        placeholder="텍스트 입력"
        rows={2}
      />
      
      <Handle type="source" position={Position.Bottom} className="w-4 h-4 !bg-indigo-500 rounded-full border-2 border-white -bottom-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Right} className="w-4 h-4 !bg-indigo-500 rounded-full border-2 border-white -right-2 opacity-0 hover:opacity-100 transition-opacity" />
    </div>
  );
};

// --- Text Block Node ---
const TextNode = ({ data, selected }: any) => {
  const { item, updateItem, deleteItem } = data;
  
  return (
    <div className={`relative min-w-[200px] p-2 transition-all ${selected ? 'ring-1 ring-dashed ring-indigo-400 bg-indigo-50/50 rounded-lg' : ''}`}>
      <Handle type="target" position={Position.Left} className="opacity-0" />
      
      {selected && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl flex items-center gap-1.5 p-1.5 z-30 pointer-events-auto cursor-default border border-slate-100">
           <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <textarea
        value={item.content || ''}
        onChange={(e) => updateItem(item.id, { content: e.target.value })}
        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 font-extrabold text-slate-800 text-2xl resize-none nodrag text-center placeholder:text-slate-300"
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
  const { activeTabId, items: storeItems, updateItem, addItem, deleteItem, boardConfigs, setBoardConfig } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || EMPTY_ARRAY) : EMPTY_ARRAY;
  const config = activeTabId ? boardConfigs[activeTabId] : null;

  // ReactFlow States
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Sync Store Items -> ReactFlow Nodes
  useEffect(() => {
    if (!activeTabId) return;
    const loadedNodes: Node[] = items.map(item => ({
      id: item.id,
      type: item.data?.type || 'sticky',
      position: { x: item.data?.x || 0, y: item.data?.y || 0 },
      data: { 
        item, 
        updateItem: (id: string, updates: any) => updateItem(activeTabId, id, updates),
        deleteItem: (id: string) => deleteItem(activeTabId, id)
      }
    }));
    setNodes(loadedNodes);

    if (config?.edges) {
      setEdges(config.edges);
    } else {
      setEdges([]);
    }
  }, [items, config?.edges, activeTabId, updateItem, deleteItem]);

  const onNodesChangeWrapper = useCallback(
    (changes: any) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      // Position changes should be persisted
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.dragging === false && activeTabId) {
           const item = items.find(i => i.id === change.id);
           if (item) {
             updateItem(activeTabId, item.id, {
               data: { ...item.data, x: change.position.x, y: change.position.y }
             });
           }
        }
        if (change.type === 'remove' && activeTabId) {
           deleteItem(activeTabId, change.id);
        }
      });
    },
    [setNodes, items, activeTabId, updateItem, deleteItem]
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
    <div className="w-full h-full relative overflow-hidden bg-[#fafafa] rounded-3xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeWrapper}
        onEdgesChange={onEdgesChangeWrapper}
        onConnect={onConnect}
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-50"
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={32} size={2.5} color="#cbd5e1" />
        <Controls className="bg-white shadow-xl border-none rounded-xl overflow-hidden mb-6 ml-6 fill-slate-700" showInteractive={false} />
        <MiniMap 
          nodeColor={(node) => {
             const type = node.type;
             if (type === 'text') return 'transparent';
             const c = node.data?.item?.data?.color;
             return c === '#ffffff' ? '#e2e8f0' : (c || '#cbd5e1');
          }}
          className="bg-white/90 backdrop-blur shadow-2xl rounded-2xl border border-slate-100 overflow-hidden mb-6 mr-6" 
          maskColor="rgba(248, 250, 252, 0.7)"
          zoomable
          pannable
        />
      </ReactFlow>

      {/* Floating Action Toolbar */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl p-2.5 flex flex-col gap-2.5 border border-slate-100/60 z-50">
        <div className="text-[10px] font-extrabold text-slate-400 text-center uppercase tracking-widest mb-1 mt-1">Tools</div>
        <button className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm" title="선택 도구"><MousePointer2 className="w-5 h-5" /></button>
        <div className="w-full h-px bg-slate-100 my-0.5" />
        <button onClick={handleAddSticky} className="p-3.5 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors hover:shadow-sm" title="스티키 노트 추가"><Square className="w-5 h-5 fill-yellow-200" /></button>
        <button onClick={handleAddShape} className="p-3.5 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors hover:shadow-sm" title="다이어그램 도형 추가"><Circle className="w-5 h-5" /></button>
        <button onClick={handleAddText} className="p-3.5 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors hover:shadow-sm" title="텍스트 블록 추가"><Type className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
