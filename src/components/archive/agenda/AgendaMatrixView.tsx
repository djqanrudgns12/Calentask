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
import { AgendaTask, useAgendaStore } from '@/store/useAgendaStore';
import { cn } from '@/lib/utils';
import { Clock, Star, AlertTriangle, Calendar as CalendarIcon, Users, Trash2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { useCategories } from '@/hooks/useCalendarQueries';

const isTaskUrgent = (task: AgendaTask) => {
  if (!task.deadline) return false;
  const target = new Date(task.deadline);
  target.setHours(0,0,0,0);
  const today = new Date();
  today.setHours(0,0,0,0);
  return differenceInDays(target, today) <= 3;
};

const getMatrixQuadrant = (task: AgendaTask) => {
  const urgent = isTaskUrgent(task);
  const important = task.is_important;
  if (urgent && important) return 'do_first';
  if (!urgent && important) return 'schedule';
  if (urgent && !important) return 'delegate';
  return 'delete';
};

const MatrixCard = ({ task, id, openDetail }: { task: AgendaTask, id: string, openDetail: (t: AgendaTask) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const { updateTask } = useAgendaStore();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={() => openDetail(task)}
      className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-sm border border-white hover:shadow-md transition-all cursor-grab active:cursor-grabbing mb-2 group"
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className={cn("font-bold text-sm leading-tight", task.status === 'done' ? "text-slate-400 line-through" : "text-slate-700")}>
          {task.title}
        </h4>
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); updateTask(task.id, { is_important: !task.is_important }); }}
          className={cn("p-1 -mr-1 rounded-full transition-colors shrink-0", task.is_important ? "text-amber-400" : "text-slate-200 opacity-0 group-hover:opacity-100 hover:text-amber-400")}
        >
          <Star className={cn("w-3.5 h-3.5", task.is_important ? "fill-current" : "")} />
        </button>
      </div>
      {task.deadline && (
        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
          <Clock className="w-3 h-3" />
          {new Date(task.deadline).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

const MatrixQuadrant = ({ id, title, subtitle, icon: Icon, colorClass, bgClass, tasks, openDetail }: any) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={cn("flex flex-col h-full rounded-3xl p-4 border transition-all", bgClass, colorClass.replace('text-', 'border-').replace('600', '100'))}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg bg-white shadow-sm", colorClass)}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className={cn("font-extrabold text-sm leading-none", colorClass)}>{title}</h3>
            <span className="text-[10px] font-bold text-slate-500">{subtitle}</span>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-400 bg-white/60 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      
      <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 min-h-[150px] overflow-y-auto hide-scrollbar">
          {tasks.map((task: any) => (
            <MatrixCard key={task.id} id={task.id} task={task} openDetail={openDetail} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export const AgendaMatrixView = ({ openDetail }: { openDetail: (t: AgendaTask) => void }) => {
  const { tasks, updateTask } = useAgendaStore();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // We exclude 'trash' tasks from matrix for clarity, maybe done too, but let's just show active ones
  const activeTasks = tasks.filter(t => t.status !== 'trash');

  const quadrants = [
    { id: 'do_first', title: 'Do First', subtitle: '긴급 & 중요', icon: AlertTriangle, colorClass: 'text-red-600', bgClass: 'bg-red-50/50' },
    { id: 'schedule', title: 'Schedule', subtitle: '안 긴급 & 중요', icon: CalendarIcon, colorClass: 'text-blue-600', bgClass: 'bg-blue-50/50' },
    { id: 'delegate', title: 'Delegate', subtitle: '긴급 & 안 중요', icon: Users, colorClass: 'text-amber-600', bgClass: 'bg-amber-50/50' },
    { id: 'delete', title: 'Backlog / Delete', subtitle: '안 긴급 & 안 중요', icon: Trash2, colorClass: 'text-slate-600', bgClass: 'bg-slate-50/50' }
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

    // Determine the target quadrant ID
    const targetQ = quadrants.find(q => q.id === overId) ? overId : getMatrixQuadrant(tasks.find(t => t.id === overId)!);

    if (!targetQ) return;
    
    // Check if it's dropping onto itself or same quadrant
    const task = tasks.find(t => t.id === activeId);
    if (!task) return;
    const currentQ = getMatrixQuadrant(task);
    if (currentQ === targetQ) return;

    // Update logic
    let updates: Partial<AgendaTask> = {};
    if (targetQ === 'do_first') { updates.is_important = true; updates.deadline = new Date().toISOString(); }
    if (targetQ === 'schedule') { updates.is_important = true; if (isTaskUrgent(task)) updates.deadline = null; }
    if (targetQ === 'delegate') { updates.is_important = false; updates.deadline = new Date().toISOString(); }
    if (targetQ === 'delete')   { updates.is_important = false; if (isTaskUrgent(task)) updates.deadline = null; }

    updateTask(activeId as string, updates);
  };

  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[65vh] pb-8 w-full">
        {quadrants.map(q => (
          <MatrixQuadrant 
            key={q.id} 
            {...q} 
            tasks={activeTasks.filter(t => getMatrixQuadrant(t) === q.id)} 
            openDetail={openDetail}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 scale-105 shadow-xl w-[280px]">
             <MatrixCard id={activeTask.id} task={activeTask} openDetail={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
