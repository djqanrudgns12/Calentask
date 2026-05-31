'use client'

import { useState, useEffect } from 'react';
import { parseNLPDate } from '@/lib/nlp';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Sparkles, Circle, CheckCircle2, GripVertical, Inbox, Calendar, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { DndContext, useSensor, useSensors, PointerSensor, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { useArchiveStore } from '@/store/useArchiveStore';

interface Task {
  id: string;
  title: string;
  status: 'inbox' | 'today';
  completed: boolean;
  date: Date | null;
  hasTime?: boolean;
}

// Droppable Container Component
function DroppableContainer({ id, title, icon: Icon, children, className, isDark }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(
      "flex flex-col h-full rounded-3xl shadow-sm border p-6 transition-colors duration-300", 
      isDark ? "bg-slate-900 border-slate-800 shadow-xl" : "bg-white border-slate-200",
      isOver ? (isDark ? "border-indigo-500 bg-slate-800" : "border-indigo-400 bg-indigo-50/30") : "",
      className
    )}>
      <div className="flex items-center gap-2 mb-6">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center border",
          isDark ? "bg-slate-800/80 text-indigo-400 border-slate-700/50" : "bg-slate-50 text-slate-600 border-slate-100"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className={cn("text-xl font-extrabold", isDark ? "text-white" : "text-slate-800")}>{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 hide-scrollbar">
        {children}
      </div>
    </div>
  );
}

// Draggable Task Component
function DraggableTask({ task, onToggle }: { task: Task, onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : 1,
  } : undefined;

  // task.date가 string으로 내려올 수 있으므로 Date 객체로 변환 보장
  const taskDate = task.date ? new Date(task.date) : null;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "group flex items-center gap-3 p-4 bg-white rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md",
        isDragging ? "shadow-2xl border-indigo-200 scale-105 opacity-90" : "border-slate-200",
        task.completed && "opacity-50 bg-slate-50"
      )}
    >
      <button 
        onClick={() => onToggle(task.id)}
        className="flex-shrink-0 text-slate-300 hover:text-indigo-500 transition-colors"
      >
        {task.completed ? <CheckCircle2 className="w-6 h-6 text-indigo-500" /> : <Circle className="w-6 h-6" />}
      </button>
      
      <div className="flex-1 min-w-0" {...listeners} {...attributes}>
        <p className={cn("text-[15px] font-bold truncate transition-all", task.completed ? "line-through text-slate-400" : "text-slate-700")}>
          {task.title}
        </p>
        {taskDate && !task.completed && (
          <p className="text-[11px] font-extrabold text-indigo-500 mt-1 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(taskDate, 'MMM d, a h:mm', { locale: ko })}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" {...listeners} {...attributes}>
        <GripVertical className="w-5 h-5" />
      </div>
    </div>
  );
}

export function ArchiveAgendaView() {
  const { optimisticAgendaTasks, setOptimisticAgendaTasks } = useArchiveStore();
  
  // Zustand 스토어의 데이터를 초기값으로 사용하되, 더미 데이터를 원할 경우 빈 배열로 둡니다.
  // @ts-ignore
  const [tasks, setTasks] = useState<Task[]>(optimisticAgendaTasks || []);
  const [inputValue, setInputValue] = useState('');
  const [parsedData, setParsedData] = useState<{ title: string; date: Date | null; hasTime: boolean }>({ title: '', date: null, hasTime: false });

  // Store가 변경될 때 로컬 상태 동기화
  useEffect(() => {
    // @ts-ignore
    setTasks(optimisticAgendaTasks);
  }, [optimisticAgendaTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setParsedData(parseNLPDate(val));
  };

  const syncTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    // @ts-ignore
    setOptimisticAgendaTasks(newTasks);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData.title.trim()) return;

    syncTasks([{
      id: Date.now().toString(),
      title: parsedData.title,
      status: parsedData.date ? 'today' : 'inbox',
      completed: false,
      date: parsedData.date,
      hasTime: parsedData.hasTime
    }, ...tasks]);
    
    setInputValue('');
    setParsedData({ title: '', date: null, hasTime: false });
  };

  const handleToggle = (id: string) => {
    const newTasks = [...tasks];
    const taskIndex = newTasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;
    
    const isCompleting = !newTasks[taskIndex].completed;
    newTasks[taskIndex] = { ...newTasks[taskIndex], completed: isCompleting };
    
    if (isCompleting) {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#10b981', '#f59e0b']
      });
    }
    syncTasks(newTasks);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const newTasks = [...tasks];
      const taskIndex = newTasks.findIndex(t => t.id === active.id);
      if (taskIndex !== -1) {
        newTasks[taskIndex] = { ...newTasks[taskIndex], status: over.id as 'inbox' | 'today' };
        syncTasks(newTasks);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      {/* Header & NLP Input */}
      <div className="px-8 pt-10 pb-6 shrink-0">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">오늘의 할 일</h1>
        <p className="text-slate-500 text-sm mb-8 font-medium">자연어로 일정을 입력하거나 카드를 드래그하여 하루를 타임블록 해보세요.</p>
        
        <form onSubmit={handleAddTask} className="relative group max-w-3xl">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Plus className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <input 
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="예: '내일 오후 3시 팀 미팅 준비'"
            className="w-full h-14 pl-12 pr-6 bg-white rounded-2xl shadow-sm border border-slate-200 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all text-slate-800 font-bold text-lg placeholder:text-slate-400 placeholder:font-medium"
          />
          {parsedData.date && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wide">
                {format(parsedData.date, 'MMM d, a h:mm', { locale: ko })}
              </span>
            </div>
          )}
        </form>
      </div>

      {/* Dnd Layout */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-hidden px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full max-w-6xl">
            {/* Inbox */}
            <DroppableContainer id="inbox" title="보관함" icon={Inbox}>
              {tasks.filter(t => t.status === 'inbox').map(task => (
                <DraggableTask key={task.id} task={task} onToggle={handleToggle} />
              ))}
              {tasks.filter(t => t.status === 'inbox').length === 0 && (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 mb-4 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Inbox className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="font-bold text-slate-500 text-lg">보관함이 비어있습니다</p>
                  <p className="text-sm text-slate-400 mt-2">새로운 할 일을 추가해보세요</p>
                </div>
              )}
            </DroppableContainer>

            {/* Today's Focus */}
            <DroppableContainer id="today" title="오늘의 포커스" icon={Calendar} isDark>
              {tasks.filter(t => t.status === 'today').map(task => (
                <DraggableTask key={task.id} task={task} onToggle={handleToggle} />
              ))}
              {tasks.filter(t => t.status === 'today').length === 0 && (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Sparkles className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="font-bold text-slate-300 text-lg">가장 중요한 일에 집중하세요</p>
                  <p className="text-sm text-slate-500 mt-2">여기에 할 일을 드래그하세요</p>
                </div>
              )}
            </DroppableContainer>
          </div>
        </div>
      </DndContext>
    </div>
  );
}
