'use client'

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useArchiveStore } from '@/store/useArchiveStore';
import { Network, Link as LinkIcon, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { motion } from 'framer-motion';

// react-force-graph-2d must be dynamically imported with ssr: false 
// because it relies on window and canvas API which are not available on server
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export function GraphBoard() {
  const { items, tabs, activeTabId, setActiveTabId } = useArchiveStore();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Resize observer to keep the canvas responsive
  useEffect(() => {
    const container = document.getElementById('graph-container');
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute graph data (Nodes = items/tags, Links = shared tags)
  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    const tagMap: Record<string, string[]> = {}; // tag -> item IDs

    // 1. Gather all items
    Object.values(items).flat().forEach(item => {
      nodes.push({
        id: item.id,
        name: item.title || '무제',
        group: 'item',
        val: 3,
        color: '#4f46e5',
        boardId: item.boardId
      });

      if (item.tags) {
        item.tags.forEach(tag => {
          if (!tagMap[tag]) tagMap[tag] = [];
          tagMap[tag].push(item.id);
        });
      }
    });

    // 2. Add Tag nodes and link items to tags
    Object.entries(tagMap).forEach(([tag, itemIds]) => {
      const tagId = `tag-${tag}`;
      nodes.push({
        id: tagId,
        name: `#${tag}`,
        group: 'tag',
        val: Math.max(2, itemIds.length), // size by popularity
        color: '#f43f5e'
      });

      itemIds.forEach(itemId => {
        links.push({
          source: itemId,
          target: tagId,
          value: 1
        });
      });
    });

    return { nodes, links };
  }, [items]);

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
  };

  return (
    <div className="w-full h-full bg-[#0f172a] rounded-3xl overflow-hidden relative shadow-inner flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-6 left-6 z-10 text-white pointer-events-none">
        <h2 className="text-2xl font-black flex items-center gap-2 tracking-tight">
          <Network className="w-6 h-6 text-indigo-400" />
          지식 그래프
        </h2>
        <p className="text-slate-400 text-sm font-medium mt-1 max-w-sm leading-relaxed">
          내 노션과 노트들이 태그를 중심으로 어떻게 연결되어 있는지 우주처럼 탐험해보세요.
        </p>
      </div>

      {/* Stats Overlay */}
      <div className="absolute top-6 right-6 z-10 flex gap-2">
        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold text-sm border border-white/10 shadow-lg">
          노드 {graphData.nodes.length}개
        </div>
        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold text-sm border border-white/10 shadow-lg flex items-center gap-1.5">
          <LinkIcon className="w-3.5 h-3.5 text-rose-400" /> 연결 {graphData.links.length}개
        </div>
      </div>

      {/* Graph Area */}
      <div id="graph-container" className="flex-1 w-full relative">
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="name"
            nodeColor="color"
            nodeRelSize={6}
            linkColor={() => 'rgba(255,255,255,0.2)'}
            backgroundColor="#0f172a"
            onNodeClick={handleNodeClick}
            // particles for connections
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            d3VelocityDecay={0.3}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 font-medium">
            연결할 지식 데이터가 없습니다. 노트를 작성하고 태그를 달아보세요!
          </div>
        )}
      </div>

      {/* Details Panel */}
      {selectedNode && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-6 left-6 z-10 bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl w-80 shadow-2xl text-white"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-lg leading-tight truncate pr-4">
              {selectedNode.name}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${selectedNode.group === 'tag' ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
              {selectedNode.group === 'tag' ? '태그' : '노트'}
            </span>
          </div>
          
          <p className="text-slate-300 text-sm font-medium mb-4">
            {selectedNode.group === 'tag' 
              ? `이 태그에 연결된 노트 수: ${selectedNode.val}` 
              : `이 노트는 그래프의 한 축을 담당하고 있습니다.`}
          </p>

          <div className="flex gap-2">
            {selectedNode.group === 'item' && (
              <button 
                onClick={() => setActiveTabId(selectedNode.boardId)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 rounded-xl transition-colors shadow-lg"
              >
                노트로 이동
              </button>
            )}
            <button 
              onClick={() => setSelectedNode(null)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2 rounded-xl transition-colors"
            >
              닫기
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
