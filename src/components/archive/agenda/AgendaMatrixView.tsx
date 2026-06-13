import React from 'react';
import { AgendaTask, useAgendaStore } from '@/store/useAgendaStore';
import { cn } from '@/lib/utils';
import {
  Clock, Star, Flame, ArrowRightCircle, Coffee, CheckCircle2, Circle,
  CheckSquare
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useCategories } from '@/hooks/useCalendarQueries';
import { AgendaTaskContextMenu } from '../AgendaTaskContextMenu';

// ─── 분류 유틸 ───────────────────────────────────────────────

const isTaskUrgent = (task: AgendaTask): boolean => {
  if (!task.deadline) return false;
  const target = new Date(task.deadline);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(target, today) <= 3;
};

/**
 * 폭포식 분류 (Waterfall Classification)
 * 모든 태스크가 반드시 하나의 사분면에만 배치됩니다.
 */
const getMatrixQuadrant = (task: AgendaTask): string => {
  if (task.status === 'done') return 'done';
  const urgent = isTaskUrgent(task);
  const important = task.is_important;
  if (urgent && important) return 'focus';
  if (urgent || important) return 'next';
  return 'later';
};

const getDeadlineInfo = (isoDate: string) => {
  const date = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = differenceInDays(target, today);

  if (diffDays < 0) return { label: '지연됨', colorClass: 'bg-purple-100 text-purple-700' };
  if (diffDays === 0) return { label: '오늘 마감', colorClass: 'bg-red-100 text-red-700' };
  if (diffDays <= 3) return { label: `D-${diffDays}`, colorClass: 'bg-orange-100 text-orange-700' };
  if (diffDays <= 6) return { label: `D-${diffDays}`, colorClass: 'bg-emerald-100 text-emerald-700' };
  return { label: `D-${diffDays}`, colorClass: 'bg-blue-100 text-blue-700' };
};

// ─── 매트릭스 카드 (Quick Actions 내장) ──────────────────────

const MatrixCard = ({
  task,
  openDetail,
  onAddToCalendar,
  isDone = false
}: {
  task: AgendaTask;
  openDetail: (t: AgendaTask) => void;
  onAddToCalendar: (t: AgendaTask) => void;
  isDone?: boolean;
}) => {
  const { updateTask, setTaskStatus, deleteTask } = useAgendaStore();
  const { data: categories = [] } = useCategories();
  const category = categories.find((c: any) => c.id === task.category_id);
  const deadlineInfo = task.status !== 'done' && task.deadline ? getDeadlineInfo(task.deadline) : null;

  return (
    <div
      onClick={() => openDetail(task)}
      className={cn(
        'relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group',
        isDone
          ? 'bg-white/50 border-slate-100 opacity-60 hover:opacity-80'
          : 'bg-white/80 backdrop-blur-sm border-white/80 shadow-sm hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      {/* 완료 토글 (좌측) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setTaskStatus(task.id, task.status === 'done' ? 'inbox' : 'done');
        }}
        className="shrink-0 mt-0.5 transition-colors"
      >
        {task.status === 'done' ? (
          <CheckCircle2 className="w-5 h-5 text-indigo-400" />
        ) : (
          <Circle className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
        )}
      </button>

      {/* 콘텐츠 */}
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          'font-bold text-sm leading-tight line-clamp-2',
          isDone ? 'text-slate-400 line-through' : 'text-slate-700'
        )}>
          {task.title}
        </h4>

        {/* 메타데이터 배지 */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {category && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: (category as any).hex_color }} />
              <span className="text-[10px] font-bold text-slate-600">{category.name}</span>
            </div>
          )}
          {deadlineInfo && (
            <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md', deadlineInfo.colorClass)}>
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-bold">{deadlineInfo.label}</span>
            </div>
          )}
          {task.status === 'done' && task.completed_at && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-500">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-[10px] font-bold">
                {format(new Date(task.completed_at), 'M/d 완료', { locale: ko })}
              </span>
            </div>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
              <CheckSquare className="w-3 h-3" />
              <span className="text-[10px] font-bold">
                {task.subtasks.filter((s: any) => s.is_completed).length}/{task.subtasks.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 우측 액션 버튼들 (중요도 토글 + 컨텍스트 메뉴) */}
      <div className="flex items-center shrink-0 mt-0.5 gap-1">
        {!isDone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateTask(task.id, { is_important: !task.is_important });
            }}
            className={cn(
              'p-1 rounded-full transition-colors',
              task.is_important
                ? 'text-amber-400 hover:bg-amber-50'
                : 'text-slate-300 hover:text-amber-400 hover:bg-slate-50'
            )}
          >
            <Star className={cn('w-4 h-4', task.is_important ? 'fill-current' : '')} />
          </button>
        )}
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
  );
};

// ─── 사분면 컨테이너 ────────────────────────────────────────

interface QuadrantConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  emptyMessage: string;
}

const MatrixQuadrant = ({
  config,
  tasks,
  openDetail,
  onAddToCalendar
}: {
  config: QuadrantConfig;
  tasks: AgendaTask[];
  openDetail: (t: AgendaTask) => void;
  onAddToCalendar: (t: AgendaTask) => void;
}) => {
  const Icon = config.icon;
  const isDone = config.id === 'done';

  return (
    <div className={cn(
      'flex flex-col h-full rounded-3xl p-4 border transition-all',
      config.bgClass,
      config.borderClass
    )}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('p-2 rounded-xl bg-white shadow-sm', config.colorClass)}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className={cn('font-extrabold text-sm leading-none', config.colorClass)}>
              {config.title}
            </h3>
            <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
              {config.subtitle}
            </span>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-400 bg-white/60 px-2.5 py-1 rounded-full shadow-sm">
          {tasks.length}
        </span>
      </div>

      {/* 카드 목록 */}
      <div className="flex-1 min-h-[120px] overflow-y-auto hide-scrollbar space-y-2">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 opacity-40">
            <Icon className={cn('w-8 h-8 mb-2', config.colorClass)} />
            <p className="text-xs font-bold text-slate-500 text-center leading-relaxed">
              {config.emptyMessage}
            </p>
          </div>
        ) : (
          tasks.map(task => (
            <MatrixCard
              key={task.id}
              task={task}
              openDetail={openDetail}
              onAddToCalendar={onAddToCalendar}
              isDone={isDone}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ─── 메인 매트릭스 뷰 ──────────────────────────────────────

export const AgendaMatrixView = ({ openDetail, onAddToCalendar }: { openDetail: (t: AgendaTask) => void, onAddToCalendar: (t: AgendaTask) => void }) => {
  const { tasks } = useAgendaStore();

  // trash와 archive 상태는 매트릭스에서 완전 제외
  const visibleTasks = tasks.filter(t => t.status !== 'trash' && t.status !== 'archive');

  const quadrantConfigs: QuadrantConfig[] = [
    {
      id: 'focus',
      title: 'Focus',
      subtitle: '긴급 & 중요',
      icon: Flame,
      colorClass: 'text-rose-600',
      bgClass: 'bg-rose-50/60',
      borderClass: 'border-rose-200',
      emptyMessage: '지금 당장 처리할\n긴급한 일이 없습니다'
    },
    {
      id: 'next',
      title: 'Next',
      subtitle: '긴급 또는 중요',
      icon: ArrowRightCircle,
      colorClass: 'text-indigo-600',
      bgClass: 'bg-indigo-50/60',
      borderClass: 'border-indigo-200',
      emptyMessage: '다음에 처리할\n항목이 없습니다'
    },
    {
      id: 'later',
      title: '여유',
      subtitle: '여유 있는 항목',
      icon: Coffee,
      colorClass: 'text-teal-600',
      bgClass: 'bg-teal-50/60',
      borderClass: 'border-teal-200',
      emptyMessage: '여유 있는 항목이\n없습니다'
    },
    {
      id: 'done',
      title: '완료',
      subtitle: '완료된 항목',
      icon: CheckCircle2,
      colorClass: 'text-slate-500',
      bgClass: 'bg-slate-50/60',
      borderClass: 'border-slate-200',
      emptyMessage: '아직 완료된\n항목이 없습니다'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[65vh] pb-8 w-full">
      {quadrantConfigs.map(config => (
        <MatrixQuadrant
          key={config.id}
          config={config}
          tasks={visibleTasks.filter(t => getMatrixQuadrant(t) === config.id)}
          openDetail={openDetail}
          onAddToCalendar={onAddToCalendar}
        />
      ))}
    </div>
  );
};
