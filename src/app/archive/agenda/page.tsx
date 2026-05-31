'use client'

import { useState, useRef } from 'react';
import { parseNLPDate } from '@/lib/nlp';
import { format } from 'date-fns';
import { Sparkles, Circle, CheckCircle2, GripVertical, Inbox, Calendar, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { DndContext, useSensor, useSensors, PointerSensor, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';

interface Task {
  id: string;
  title: string;
  status: 'inbox' | 'today';
  completed: boolean;
  date: Date | null;
}

// Droppable Container Component
function DroppableContainer({ id, title, icon: Icon, children, className }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("flex flex-col h-full bg-white rounded-3xl shadow-sm border p-6 transition-colors duration-300", isOver ? "border-blue-400 bg-blue-50/30" : "border-slate-100", className)}>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
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

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "group flex items-center gap-3 p-4 bg-white rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md",
        isDragging ? "shadow-2xl border-blue-200 scale-105 opacity-90" : "border-slate-100",
        task.completed && "opacity-50"
      )}
    >
      <button 
        onClick={() => onToggle(task.id)}
        className="flex-shrink-0 text-slate-300 hover:text-blue-500 transition-colors"
      >
        {task.completed ? <CheckCircle2 className="w-6 h-6 text-blue-500" /> : <Circle className="w-6 h-6" />}
      </button>
      
      <div className="flex-1 min-w-0" {...listeners} {...attributes}>
        <p className={cn("text-[15px] font-medium truncate transition-all", task.completed ? "line-through text-slate-400" : "text-slate-700")}>
          {task.title}
        </p>
        {task.date && !task.completed && (
          <p className="text-[11px] font-bold text-blue-500 mt-1 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(task.date, 'MMM d, h:mm a')}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" {...listeners} {...attributes}>
        <GripVertical className="w-5 h-5" />
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Buy groceries', status: 'inbox', completed: false, date: null },
    { id: '2', title: 'Draft final PRD', status: 'inbox', completed: false, date: null },
    { id: '3', title: 'Team sync meeting', status: 'today', completed: false, date: new Date() },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [parsedData, setParsedData] = useState<{ title: string; date: Date | null }>({ title: '', date: null });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setParsedData(parseNLPDate(val));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData.title.trim()) return;

    setTasks(prev => [{
      id: Date.now().toString(),
      title: parsedData.title,
      status: parsedData.date ? 'today' : 'inbox',
      completed: false,
      date: parsedData.date
    }, ...prev]);
    
    setInputValue('');
    setParsedData({ title: '', date: null });
  };

  const handleToggle = (id: string) => {
    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === id);
      if (taskIndex === -1) return prev;
      
      const newTasks = [...prev];
      const isCompleting = !newTasks[taskIndex].completed;
      newTasks[taskIndex] = { ...newTasks[taskIndex], completed: isCompleting };
      
      if (isCompleting) {
        // Haptic Feedback & Confetti
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#3b82f6', '#10b981', '#f59e0b']
        });
      }
      return newTasks;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      setTasks(prev => {
        const newTasks = [...prev];
        const taskIndex = newTasks.findIndex(t => t.id === active.id);
        if (taskIndex !== -1) {
          newTasks[taskIndex] = { ...newTasks[taskIndex], status: over.id as 'inbox' | 'today' };
        }
        return newTasks;
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      {/* Header & NLP Input */}
      <div className="px-8 pt-10 pb-6 shrink-0">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Agenda</h1>
        <p className="text-slate-500 text-sm mb-8 font-medium">Drag tasks to the calendar to time-block your day.</p>
        
        <form onSubmit={handleAddTask} className="relative group max-w-3xl">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Plus className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input 
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="e.g., '내일 오후 2시 팀 미팅 준비'"
            className="w-full h-14 pl-12 pr-6 bg-white rounded-2xl shadow-sm border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 font-medium text-lg placeholder:text-slate-400"
          />
          {parsedData.date && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                {format(parsedData.date, 'MMM d, h:mm a')}
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
            <DroppableContainer id="inbox" title="Inbox" icon={Inbox}>
              {tasks.filter(t => t.status === 'inbox').map(task => (
                <DraggableTask key={task.id} task={task} onToggle={handleToggle} />
              ))}
              {tasks.filter(t => t.status === 'inbox').length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Inbox className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">Inbox is empty</p>
                </div>
              )}
            </DroppableContainer>

            {/* Today's Focus */}
            <DroppableContainer id="today" title="Today's Focus" icon={Calendar} className="bg-slate-900 border-slate-800 text-white shadow-xl">
              {tasks.filter(t => t.status === 'today').map(task => (
                <DraggableTask key={task.id} task={task} onToggle={handleToggle} />
              ))}
              {tasks.filter(t => t.status === 'today').length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <Calendar className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">Drag tasks here to focus</p>
                </div>
              )}
            </DroppableContainer>
          </div>
        </div>
      </DndContext>
    </div>
  );
}
