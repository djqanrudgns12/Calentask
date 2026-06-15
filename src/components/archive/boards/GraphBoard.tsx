'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useArchiveStore } from '@/store/useArchiveStore';
import { Network, X, Search, FileText, CalendarDays, Moon, Sun, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const CatalogGroup = ({ boardName, satellites, isDarkMode, selectedNode, handleCardClick, setActiveTabId, onClose }: any) => {
  const [isOpen, setIsOpen] = useState(satellites.length <= 5);
  const hasSelectedChild = selectedNode && satellites.some((sat: any) => sat.id === selectedNode.id);
  
  useEffect(() => {
    if (hasSelectedChild) setIsOpen(true);
  }, [hasSelectedChild]);

  return (
    <div className={`mb-3 rounded-2xl overflow-hidden border ${isDarkMode ? 'border-transparent/10' : 'border-border'} transition-all`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 md:p-4 text-left transition-colors ${
          isDarkMode ? 'bg-slate-800 hover:bg-slate-700/80' : 'bg-muted hover:bg-muted'
        }`}
      >
        <span className={`font-bold text-sm md:text-base ${isDarkMode ? 'text-slate-200' : 'text-foreground'}`}>
          {boardName} <span className="ml-1 text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{satellites.length}</span>
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-2 pb-2 ${isDarkMode ? 'bg-slate-800/30' : 'bg-card'}`}
          >
            <div className="space-y-2 mt-2">
              {satellites.map((sat: any) => {
                const isCardSelected = selectedNode && (selectedNode.id === sat.id);
                return (
                  <button
                    key={sat.id}
                    id={`card-${sat.id}`}
                    onClick={() => handleCardClick(sat.id)}
                    className={`w-full text-left p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-300 ${
                      isCardSelected 
                        ? isDarkMode 
                          ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_20px_rgba(129,140,248,0.2)]'
                          : 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                        : isDarkMode
                          ? 'bg-card/5 border-transparent/5 hover:bg-card/10 hover:border-transparent/20'
                          : 'bg-card border-border hover:border-indigo-300 hover:bg-muted shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1 md:mb-2">
                      <h4 className={`font-bold text-sm md:text-base leading-tight pr-2 truncate ${isDarkMode ? 'text-slate-100' : 'text-foreground'}`}>
                        {sat.name}
                      </h4>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] md:text-[10px] font-bold flex items-center gap-1 ${isDarkMode ? 'bg-card/10 text-muted-foreground/50' : 'bg-muted text-muted-foreground'}`}>
                        <FileText className="w-3 h-3" />
                        Item
                      </span>
                    </div>
                    {sat.snippet && (
                      <p className={`text-[11px] md:text-xs line-clamp-1 md:line-clamp-2 leading-relaxed mb-2 md:mb-3 ${isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                        {sat.snippet}
                      </p>
                    )}
                    <div className={`flex items-center justify-between mt-auto pt-2 border-t ${isDarkMode ? 'border-transparent/5' : 'border-border'}`}>
                      <div className={`flex items-center gap-1 md:gap-1.5 text-[9px] md:text-[10px] font-medium ${isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                        <CalendarDays className="w-3 h-3" />
                        {new Date(sat.createdAt).toLocaleDateString()}
                      </div>
                      {isCardSelected && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTabId(sat.boardId);
                            if (onClose) onClose();
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] md:text-[10px] font-bold px-2 py-1 md:px-2.5 md:py-1 rounded-md transition-colors"
                        >
                          노트로 이동
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function GraphBoard({ onClose }: { onClose?: () => void }) {
  const { items, tabs, setActiveTabId } = useArchiveStore();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false); // Default: Light mode
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false); // For mobile bottom sheet
  
  const graphRef = useRef<any>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

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
  }, [isMobileDrawerOpen]); // Re-measure if drawer state changes

  // Data Engine & Cross-linking
  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    const allItems = Object.values(items).flat();

    tabs.forEach((tab) => {
      const tabItems = allItems.filter(item => item.boardId === tab.id);
      nodes.push({
        id: `hub-${tab.id}`,
        name: tab.name || '제목 없음',
        group: 'hub',
        val: Math.max(8, tabItems.length * 3),
        tabId: tab.id,
        itemCount: tabItems.length
      });
    });

    const stopWords = new Set(['이', '가', '은', '는', '에', '를', '의', '도', '및', '또는', '수', '할', '것']);
    const getKeywords = (text: string) => {
      if (!text) return [];
      return text.split(/[\s,.'"]+/).filter(w => w.length > 1 && !stopWords.has(w));
    };

    const satelliteMap = new Map();

    allItems.forEach(item => {
      const satelliteId = `sat-${item.id}`;
      const rawText = item.content ? String(item.content).replace(/<[^>]+>/g, '') : '';
      const keywords = getKeywords((item.title || '') + ' ' + rawText);
      
      const satellite = {
        id: satelliteId,
        name: item.title || '무제',
        group: 'satellite',
        val: 3,
        boardId: item.boardId,
        snippet: rawText.substring(0, 80) + (rawText.length > 80 ? '...' : ''),
        createdAt: item.createdAt,
        keywords,
        rawItem: item
      };
      
      nodes.push(satellite);
      satelliteMap.set(satelliteId, satellite);

      links.push({
        source: satelliteId,
        target: `hub-${item.boardId}`,
        value: 1,
        type: 'gravity'
      });
    });

    const satellites = Array.from(satelliteMap.values());
    for (let i = 0; i < satellites.length; i++) {
      for (let j = i + 1; j < satellites.length; j++) {
        const satA = satellites[i];
        const satB = satellites[j];
        
        if (satA.boardId === satB.boardId) continue;

        const commonKeywords = satA.keywords.filter((k: string) => satB.keywords.includes(k));
        if (commonKeywords.length > 0) {
          links.push({
            source: satA.id,
            target: satB.id,
            value: 0.1,
            type: 'crosslink',
            commonWords: commonKeywords
          });
        }
      }
    }

    return { nodes, links, allItems, satellites };
  }, [items, tabs]);

  useEffect(() => {
    if (graphRef.current) {
      const fg = graphRef.current;
      fg.d3Force('charge').strength(-50);
      fg.d3Force('link').distance((link: any) => link.type === 'gravity' ? 20 : 80);
      
      // 모바일 초기 줌 반응성 강화
      setTimeout(() => {
        if (graphRef.current) {
          const isMobile = window.innerWidth < 768;
          graphRef.current.zoomToFit(400, isMobile ? 30 : 60);
        }
      }, 800);
    }
  }, [graphData]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    
    // Zoom to Node
    if (graphRef.current) {
      // Adjust center if drawer is open on mobile
      const yOffset = window.innerWidth < 768 && isMobileDrawerOpen ? -150 : 0;
      graphRef.current.centerAt(node.x, node.y + yOffset, 800);
      graphRef.current.zoom(2.5, 800);
    }

    // Scroll Panel
    if (panelRef.current) {
      const el = document.getElementById(`card-${node.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isMobileDrawerOpen]);

  const handleCardClick = useCallback((nodeId: string) => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) handleNodeClick(node);
    // On mobile, optionally close or minimize drawer slightly if desired, but let's keep it open to show highlight
  }, [graphData.nodes, handleNodeClick]);

  // Dynamic Theme Colors
  const themeColors = {
    hubGlow: isDarkMode ? 'rgba(250, 204, 21, 0.8)' : 'rgba(79, 70, 229, 0.6)',
    hubCore: isDarkMode ? 'rgba(250, 204, 21, 1)' : 'rgba(79, 70, 229, 1)',
    hubText: isDarkMode ? 'rgba(250, 204, 21, 1)' : 'rgba(67, 56, 202, 1)',
    satGlow: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(51, 65, 85, 0.4)',
    satCore: isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(51, 65, 85, 1)',
    satText: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(71, 85, 105, 1)',
    linkGravity: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(71, 85, 105, 0.15)',
    linkCross: isDarkMode ? 'rgba(129, 140, 248, 0.08)' : 'rgba(99, 102, 241, 0.05)',
    particleGravity: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(79, 70, 229, 0.6)',
    particleCross: isDarkMode ? 'rgba(129, 140, 248, 0.5)' : 'rgba(99, 102, 241, 0.4)'
  };

  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHub = node.group === 'hub';
    
    let isSelected = false;
    if (selectedNode) {
      if (selectedNode.id === node.id) isSelected = true;
      else if (selectedNode.group === 'hub' && node.boardId === selectedNode.tabId) isSelected = true;
      else if (selectedNode.group === 'satellite' && node.tabId === selectedNode.boardId) isSelected = true;
    } else {
      isSelected = true;
    }
    
    const dim = selectedNode && !isSelected;
    const r = Math.sqrt(Math.max(0, node.val)) * (isHub ? 1.5 : 1);
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    
    if (isHub) {
      ctx.fillStyle = dim ? themeColors.hubGlow.replace('0.6', '0.1').replace('0.8', '0.1') : themeColors.hubCore;
      ctx.shadowColor = dim ? 'transparent' : themeColors.hubGlow;
      ctx.shadowBlur = dim ? 0 : 20 * globalScale;
    } else {
      ctx.fillStyle = dim ? themeColors.satGlow.replace('0.4', '0.05').replace('0.8', '0.1') : themeColors.satCore;
      ctx.shadowColor = dim ? 'transparent' : themeColors.satGlow;
      ctx.shadowBlur = dim ? 0 : 10 * globalScale;
    }
    
    ctx.fill();
    ctx.shadowBlur = 0; 

    // Draw typography
    if (!dim && globalScale > 1.2) {
      const baseSize = isHub ? 14 : 11;
      const isMobile = window.innerWidth < 768;
      // 줌인 시 글씨가 자연스럽게 커지도록 스케일 조정 (완전 반비례가 아닌 점진적 축소)
      const fontSize = (baseSize * (isMobile ? 1.3 : 1)) / Math.pow(globalScale, 0.5);
      
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      const textWidth = ctx.measureText(node.name).width;
      const bgPaddingX = 6 / globalScale;
      const bgPaddingY = 3 / globalScale;
      const yPos = node.y + r + (10 / globalScale) + fontSize / 2;

      // Draw background pill
      ctx.fillStyle = isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.roundRect(
        node.x - textWidth / 2 - bgPaddingX, 
        yPos - fontSize / 2 - bgPaddingY, 
        textWidth + bgPaddingX * 2, 
        fontSize + bgPaddingY * 2, 
        4 / globalScale
      );
      ctx.fill();

      // Draw text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isHub ? themeColors.hubText : themeColors.satText;
      ctx.fillText(node.name, node.x, yPos);
    }
  }, [selectedNode, themeColors]);

  // Shared Catalog Content to avoid duplication between Desktop and Mobile views
  const CatalogContent = (
    <>
      <div className={`p-4 md:p-6 border-b shrink-0 ${isDarkMode ? 'border-transparent/10' : 'border-border'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg md:text-xl font-bold tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-foreground'}`}>
            <Search className={`w-4 h-4 md:w-5 md:h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            아카이브 카탈로그
          </h3>
          <div className="hidden md:block">
            {onClose && (
              <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-muted-foreground hover:text-white hover:bg-card/10' : 'text-muted-foreground hover:text-foreground hover:bg-slate-200'}`}>
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 md:gap-3">
          <div className={`flex-1 rounded-xl p-3 border ${isDarkMode ? 'bg-card/5 border-transparent/5' : 'bg-card border-border shadow-sm'}`}>
            <p className={`text-[10px] md:text-xs font-bold mb-1 ${isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground'}`}>총 항목 수</p>
            <p className={`text-xl md:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-foreground'}`}>{graphData.satellites.length}<span className={`text-[10px] md:text-sm font-medium ml-1 ${isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Items</span></p>
          </div>
          <div className={`flex-1 rounded-xl p-3 border ${isDarkMode ? 'bg-card/5 border-transparent/5' : 'bg-card border-border shadow-sm'}`}>
            <p className={`text-[10px] md:text-xs font-bold mb-1 ${isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground'}`}>연결선</p>
            <p className={`text-xl md:text-2xl font-black ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{graphData.links.length}<span className={`text-[10px] md:text-sm font-medium ml-1 ${isDarkMode ? 'text-indigo-500/50' : 'text-indigo-400'}`}>Edges</span></p>
          </div>
        </div>
      </div>

      <div ref={panelRef} className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 custom-scrollbar">
        {graphData.satellites.length === 0 ? (
          <p className={`text-sm text-center mt-10 ${isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground'}`}>기록된 항목이 없습니다.</p>
        ) : (
          (() => {
            const grouped: Record<string, any[]> = {};
            graphData.satellites.forEach((sat: any) => {
              if (!grouped[sat.boardId]) grouped[sat.boardId] = [];
              grouped[sat.boardId].push(sat);
            });
            
            return Object.entries(grouped).map(([boardId, groupSats]) => {
              const tab = tabs.find(t => t.id === boardId);
              const boardName = tab?.name || '기타';
              return (
                <CatalogGroup 
                  key={boardId} 
                  boardName={boardName} 
                  satellites={groupSats} 
                  isDarkMode={isDarkMode} 
                  selectedNode={selectedNode} 
                  handleCardClick={handleCardClick}
                  setActiveTabId={setActiveTabId}
                  onClose={onClose}
                />
              );
            });
          })()
        )}
      </div>
    </>
  );

  return (
    <div className={`w-full h-full rounded-3xl overflow-hidden relative shadow-2xl flex border transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-700/50' : 'bg-muted border-slate-300/50'}`}>
      
      {/* Background ambient gradient */}
      <div className={`absolute inset-0 pointer-events-none transition-colors duration-500 ${isDarkMode ? 'bg-gradient-to-br from-slate-900 via-[#0a0f1c] to-indigo-950/20' : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50'}`} />

      {/* Main Graph Area */}
      <div id="graph-container" className="flex-1 h-full relative" onClick={() => setSelectedNode(null)}>
        {/* Header Overlay */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <h2 className={`text-2xl md:text-3xl font-black flex items-center gap-2 tracking-tight bg-clip-text text-transparent ${isDarkMode ? 'bg-gradient-to-r from-white to-slate-400' : 'bg-gradient-to-r from-slate-800 to-indigo-800'}`}>
              <Network className={`w-6 h-6 md:w-7 md:h-7 ${isDarkMode ? 'text-white' : 'text-foreground'}`} />
              시냅스
            </h2>
            
            {/* Theme Toggle Button */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsDarkMode(!isDarkMode); }}
              className={`p-2 rounded-full backdrop-blur-md transition-all shadow-sm ${isDarkMode ? 'bg-card/10 hover:bg-card/20 text-yellow-400' : 'bg-card/80 hover:bg-card text-indigo-600 border border-border'}`}
              title={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
            >
              {isDarkMode ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            {/* Mobile Close Button (Top Left) */}
            <div className="md:hidden">
               {onClose && (
                <button 
                  onClick={onClose}
                  className={`p-2 rounded-full backdrop-blur-md transition-all shadow-sm ${isDarkMode ? 'bg-card/10 text-white' : 'bg-card/80 text-foreground border border-border'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className={`hidden md:block text-sm font-medium max-w-sm leading-relaxed ${isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
            모든 지식이 유기적으로 연결된 우주망입니다.
          </p>
        </div>

        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeCanvasObject={drawNode}
            linkColor={(link: any) => {
              if (selectedNode) {
                const isSelected = selectedNode.id === link.source.id || selectedNode.id === link.target.id;
                if (!isSelected) return 'transparent';
              }
              return link.type === 'gravity' ? themeColors.linkGravity : themeColors.linkCross;
            }}
            linkWidth={(link: any) => link.type === 'gravity' ? 1.5 : 0.5}
            linkDirectionalParticles={(link: any) => {
              if (selectedNode && !(selectedNode.id === link.source.id || selectedNode.id === link.target.id)) return 0;
              return link.type === 'gravity' ? 2 : 1;
            }}
            linkDirectionalParticleWidth={(link: any) => link.type === 'gravity' ? 2 : 1}
            linkDirectionalParticleColor={(link: any) => link.type === 'gravity' ? themeColors.particleGravity : themeColors.particleCross}
            linkDirectionalParticleSpeed={(link: any) => link.type === 'gravity' ? 0.005 : 0.002}
            backgroundColor="transparent"
            nodeLabel="name"
            onNodeClick={handleNodeClick}
            onNodeHover={(node: any) => {
              const canvas = document.querySelector('#graph-container canvas') as HTMLCanvasElement;
              if (canvas) canvas.style.cursor = node ? 'pointer' : 'default';
            }}
            d3VelocityDecay={0.2}
          />
        ) : (
          <div className={`flex items-center justify-center h-full font-medium z-10 relative ${isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
            연결할 지식 데이터가 없습니다. 아카이브에서 노트를 작성해보세요.
          </div>
        )}
      </div>

      {/* Desktop Panel */}
      <motion.div 
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`hidden md:flex w-80 md:w-96 h-full flex-col z-20 shrink-0 border-l ${isDarkMode ? 'bg-slate-800/60 backdrop-blur-3xl border-transparent/10' : 'bg-card/80 backdrop-blur-3xl border-border'}`}
      >
        {CatalogContent}
      </motion.div>

      {/* Mobile Bottom Sheet Drawer */}
      <AnimatePresence>
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, info) => {
            if (info.offset.y > 50) setIsMobileDrawerOpen(false);
            else if (info.offset.y < -50) setIsMobileDrawerOpen(true);
          }}
          initial={{ y: 'calc(100% - 60px)' }}
          animate={{ y: isMobileDrawerOpen ? 0 : 'calc(100% - 60px)' }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          className={`md:hidden absolute bottom-0 left-0 right-0 h-[70vh] flex flex-col z-30 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t ${isDarkMode ? 'bg-slate-800/95 border-transparent/10' : 'bg-card/95 border-border'}`}
        >
          {/* Drawer Handle */}
          <div 
            className="w-full flex flex-col items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          >
            <div className={`w-12 h-1.5 rounded-full mb-2 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
            <div className={`text-[10px] font-bold flex items-center gap-1 ${isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              {isMobileDrawerOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              {isMobileDrawerOpen ? '스와이프하여 닫기' : '스와이프하여 카탈로그 열기'}
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col pointer-events-auto">
            {CatalogContent}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
