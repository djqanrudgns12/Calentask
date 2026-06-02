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
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, MousePointer2, Type, Square, ArrowRight, Bold, AlignLeft } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';

const COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e5e7eb', '#ffffff'];

// Custom Node for Sticky Note
const StickyNode = ({ data, selected }: any) => {
  const { item, updateItem } = data;
  const itemColor = item.data?.color || COLORS[0];
  
  return (
    <div 
      className={`relative shadow-md p-5 rounded-xl transition-shadow ${selected ? 'ring-2 ring-indigo-500 shadow-xl' : 'hover:shadow-lg'}`}
      style={{
        width: item.data?.width || 240,
        height: item.data?.height || 200,
        backgroundColor: itemColor
      }}
    >
      <Handle type="target" position={Position.Top} className="w-16 h-2 !bg-indigo-500/50 rounded-full border-none -top-1 opacity-0 hover:opacity-100 transition-opacity cursor-crosshair" />
      
      {selected && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg flex items-center gap-1 p-1 z-30 pointer-events-auto cursor-default">
          {COLORS.map(c => (
            <button 
              key={c} 
              onClick={(e) => { 
                e.stopPropagation(); 
                updateItem(item.id, { data: { ...item.data, color: c }}); 
              }}
              className="w-6 h-6 rounded-full border border-slate-200 hover:scale-110 transition-transform" 
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"><Bold className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"><AlignLeft className="w-4 h-4" /></button>
        </div>
      )}
      
      <input
        type="text"
        value={item.title}
        onChange={(e) => updateItem(item.id, { title: e.target.value })}
        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 font-bold text-slate-800 text-lg mb-2 nodrag"
        placeholder="제목..."
      />
      <textarea
        value={item.content || ''}
        onChange={(e) => updateItem(item.id, { content: e.target.value })}
        className="w-full h-[calc(100%-2rem)] bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 font-medium resize-none leading-relaxed nodrag"
        placeholder="내용을 자유롭게 입력하세요..."
      />
      
      <Handle type="source" position={Position.Bottom} className="w-16 h-2 !bg-indigo-500/50 rounded-full border-none -bottom-1 opacity-0 hover:opacity-100 transition-opacity cursor-crosshair" />
    </div>
  );
};

const nodeTypes = {
  sticky: StickyNode,
};

export function CanvasBoard() {
  const { activeTabId, items: storeItems, updateItem, addItem, boardConfigs, setBoardConfig } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || []) : [];
  const config = activeTabId ? boardConfigs[activeTabId] : null;

  // ReactFlow States
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load state from Zustand store
  useEffect(() => {
    if (!activeTabId) return;

    // Convert items to nodes
    const loadedNodes: Node[] = items.map(item => ({
      id: item.id,
      type: 'sticky',
      position: { x: item.data?.x || 0, y: item.data?.y || 0 },
      data: { 
        item, 
        updateItem: (id: string, updates: any) => updateItem(activeTabId, id, updates) 
      }
    }));
    setNodes(loadedNodes);

    // Load edges from boardConfig if exists
    if (config?.edges) {
      setEdges(config.edges);
    } else {
      setEdges([]);
    }
  }, [items, config?.edges, activeTabId, setNodes, setEdges, updateItem]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge({ ...params, animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds);
        if (activeTabId) {
          setBoardConfig(activeTabId, { edges: newEdges });
        }
        return newEdges;
      });
    },
    [setEdges, activeTabId, setBoardConfig]
  );

  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!activeTabId) return;
      const item = items.find(i => i.id === node.id);
      if (item) {
        updateItem(activeTabId, item.id, {
          data: { ...item.data, x: node.position.x, y: node.position.y }
        });
      }
    },
    [items, activeTabId, updateItem]
  );

  const handleAddSticky = () => {
    if (!activeTabId) return;
    const centerNodeX = window.innerWidth / 2 - 100;
    const centerNodeY = window.innerHeight / 2 - 100;
    
    addItem(activeTabId, {
      title: '새 스티키 노트',
      content: '',
      data: {
        x: centerNodeX, // Need viewport center translation ideally, but simple center is fine for now
        y: centerNodeY,
        color: COLORS[0],
        width: 240,
        height: 200
      }
    });
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#fafafa] rounded-3xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#cbd5e1" />
        <Controls className="bg-white shadow-xl border-none rounded-xl overflow-hidden" />
        <MiniMap 
          nodeColor={(node) => {
             const c = node.data?.item?.data?.color;
             return c === '#ffffff' ? '#e2e8f0' : (c || '#cbd5e1');
          }}
          className="bg-white/80 backdrop-blur shadow-xl rounded-xl border border-slate-100 overflow-hidden" 
          maskColor="rgba(241, 245, 249, 0.7)"
        />
      </ReactFlow>

      {/* Floating Action Toolbar */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl p-2 flex flex-col gap-2 border border-slate-100/50">
        <div className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mb-1 mt-1">Tools</div>
        <button className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm"><MousePointer2 className="w-5 h-5" /></button>
        <button onClick={handleAddSticky} className="p-3 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors hover:shadow-sm"><Square className="w-5 h-5" /></button>
        <button className="p-3 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors hover:shadow-sm"><Type className="w-5 h-5" /></button>
        <button className="p-3 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors hover:shadow-sm"><ArrowRight className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
