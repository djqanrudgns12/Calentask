import React from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragOverEvent, 
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AgendaTask, TaskStatus, useAgendaStore } from '@/store/useAgendaStore';
import { cn } from '@/lib/utils';
import { Clock, Star, CheckCircle2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { useCategories } from '@/hooks/useCalendarQueries';
import { AgendaTaskContextMenu } from '../AgendaTaskContextMenu';

const KanbanCard = ({ task, id, openDetail, onAddToCalendar }: { task: AgendaTask, id: string, openDetail: (t: AgendaTask) => void, onAddToCalendar: (t: AgendaTask) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const { updateTask, setTaskStatus, deleteTask } = useAgendaStore();
  const { data: categories = [] } = useCategories();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const category = categories.find((c: any) => c.id === task.category_id);

  const getDeadlineInfo = (isoDate: string) => {
    const date = new Date(isoDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffDays = differenceInDays(target, today);

    if (diffDays < 0) return { label: '지연됨', color: 'bg-purple-100 text-purple-700' };
    if (diffDays === 0) return { label: '오늘 마감', color: 'bg-red-100 text-red-700' };
    if (diffDays <= 3) return { label: `D-${diffDays}`, color: 'bg-orange-100 text-orange-700' };
    return { label: `D-${diffDays}`, color: 'bg-blue-100 text-blue-700' };
  };

  const deadlineInfo = task.status !== 'done' && task.deadline ? getDeadlineInfo(task.deadline) : null;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={() => openDetail(task)}
      className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing mb-3"
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <h4 className={cn("font-bold text-sm leading-tight line-clamp-2", task.status === 'done' ? "text-slate-400 line-through" : "text-slate-800")}>
          {task.title}
        </h4>
        <div className="flex items-center shrink-0">
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { is_important: !task.is_important }); }}
            className={cn("p-1 rounded-full transition-colors", task.is_important ? "text-amber-400 hover:bg-amber-50" : "text-slate-200 hover:text-amber-400 hover:bg-slate-50")}
          >
            <Star className={cn("w-4 h-4", task.is_important ? "fill-current" : "")} />
          </button>
          <div onPointerDown={(e) => e.stopPropagation()}>
            <AgendaTaskContextMenu 
              status={task.status} 
              onEdit={() => openDetail(task)} 
              onChangeStatus={(s) => setTaskStatus(task.id, s)} 
              onPermanentDelete={() => deleteTask(task.id)}
              onAddToCalendar={() => onAddToCalendar(task)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {category && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.hex_color }} />
            <span className="text-[10px] font-bold text-slate-600">{category.name}</span>
          </div>
        )}
        {deadlineInfo && (
          <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md", deadlineInfo.color)}>
            <Clock className="w-3 h-3" />
            <span className="text-[10px] font-bold">{deadlineInfo.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanColumn = ({ id, title, tasks, openDetail, onAddToCalendar }: { id: string, title: string, tasks: AgendaTask[], openDetail: (t: AgendaTask) => void, onAddToCalendar: (t: AgendaTask) => void }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className="flex flex-col w-full min-w-[280px] bg-slate-50/50 rounded-3xl p-4 border border-slate-200/50"
    >
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="font-extrabold text-slate-700 text-sm">{title}</h3>
        <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full shadow-sm">{tasks.length}</span>
      </div>
      
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 min-h-[200px]">
          {tasks.map(task => (
            <KanbanCard key={task.id} id={task.id} task={task} openDetail={openDetail} onAddToCalendar={onAddToCalendar} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export const AgendaKanbanView = ({ openDetail, onAddToCalendar }: { openDetail: (t: AgendaTask) => void, onAddToCalendar: (t: AgendaTask) => void }) => {
  const { tasks, setTaskStatus } = useAgendaStore();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const columns = [
    { id: 'inbox', title: 'To Do' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'done', title: 'Done' }
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Check if dropping onto a column
    if (columns.map(c => c.id).includes(overId as string)) {
      setTaskStatus(activeId as string, overId as TaskStatus);
      return;
    }

    // Check if dropping onto a card
    const overTask = tasks.find(t => t.id === overId);
    if (overTask && overTask.status !== tasks.find(t => t.id === activeId)?.status) {
      setTaskStatus(activeId as string, overTask.status);
    }
  };

  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex overflow-x-auto gap-6 pb-8 hide-scrollbar w-full min-h-[60vh]">
        {columns.map(col => (
          <KanbanColumn 
            key={col.id} 
            id={col.id} 
            title={col.title} 
            tasks={tasks.filter(t => t.status === col.id)} 
            openDetail={openDetail}
            onAddToCalendar={onAddToCalendar}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 scale-105 shadow-xl">
             <KanbanCard id={activeTask.id} task={activeTask} openDetail={() => {}} onAddToCalendar={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
