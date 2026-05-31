'use client'

import { useState } from 'react';
import { Plus, GripHorizontal } from 'lucide-react';
import { useArchiveStore, BoardItem } from '@/store/useArchiveStore';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLUMNS = ['todo', 'in-progress', 'done'] as const;
const COLUMN_LABELS: Record<string, string> = {
  'todo': '할 일 (To Do)',
  'in-progress': '진행 중 (In Progress)',
  'done': '완료 (Done)'
};

function SortableItem({ item }: { item: BoardItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative">
      <p className="font-semibold text-slate-800 mb-4 leading-snug">{item.title}</p>
      {item.content && <p className="text-xs text-slate-500 mb-4 line-clamp-2">{item.content}</p>}
      <div className="flex items-center justify-between mt-auto">
        {item.tags && item.tags.length > 0 && (
          <div className="flex gap-1">
             {item.tags.map(tag => (
               <span key={tag} className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[10px] font-bold">#{tag}</span>
             ))}
          </div>
        )}
        <GripHorizontal className="w-5 h-5 text-slate-200 group-hover:text-slate-400 transition-colors ml-auto" />
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const { activeTabId, items: storeItems, updateItem, addItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || []) : [];
  
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        delay: 200,
        tolerance: 5,
      }
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || !activeTabId) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeItem = items.find(i => i.id === activeId);
    if (!activeItem) return;

    // Check if over is a column
    if (COLUMNS.includes(overId as any)) {
      if (activeItem.status !== overId) {
        updateItem(activeTabId, activeId, { status: overId as any });
      }
      return;
    }

    // Check if over is another item
    const overItem = items.find(i => i.id === overId);
    if (overItem && activeItem.status !== overItem.status) {
       updateItem(activeTabId, activeId, { status: overItem.status });
    }
  };

  const handleAddItem = (status: 'todo' | 'in-progress' | 'done') => {
    if (!activeTabId) return;
    const title = window.prompt('새 작업의 이름을 입력하세요:');
    if (title) {
      addItem(activeTabId, { title, status });
    }
  };

  const activeItemData = items.find(i => i.id === activeId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="w-full h-full bg-[#f7f9fb] p-8 overflow-x-auto flex gap-6 hide-scrollbar rounded-3xl relative">
        {COLUMNS.map((status) => {
          const colItems = items.filter(i => i.status === status).sort((a, b) => a.position - b.position);
          
          return (
            <div key={status} className="w-80 flex-shrink-0 flex flex-col h-full bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-extrabold text-slate-800 text-lg">{COLUMN_LABELS[status]} <span className="text-slate-400 font-medium text-sm ml-2">{colItems.length}</span></h3>
                <button onClick={() => handleAddItem(status)} className="p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors">
                  <Plus className="w-5 h-5 text-slate-400 hover:text-slate-900" />
                </button>
              </div>
              
              <SortableContext id={status} items={colItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-20 hide-scrollbar">
                  {colItems.map(item => (
                    <SortableItem key={item.id} item={item} />
                  ))}
                </div>
              </SortableContext>
            </div>
          );
        })}

        <DragOverlay>
          {activeItemData ? (
             <div className="bg-white p-5 rounded-2xl shadow-xl border border-indigo-200 opacity-90 scale-105 rotate-2">
               <p className="font-semibold text-indigo-900 mb-4 leading-snug">{activeItemData.title}</p>
             </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
