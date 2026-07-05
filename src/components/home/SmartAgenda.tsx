'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { format, isPast, isToday as isTodayFn, parseISO, isValid } from 'date-fns'
import { CheckCircle2, Circle, ListTodo, ChevronDown, Plus, AlertTriangle, Clock, Calendar, ArrowRight, Pencil, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgendaStore } from '@/store/useAgendaStore'
import type { AgendaTask } from '@/store/useAgendaStore'
import { useCalendarStore } from '@/store/useCalendarStore'
import { useCategories } from '@/hooks/useCalendarQueries'
import { EditAgendaTaskDialog } from '../archive/EditAgendaTaskDialog'

const INITIAL_DISPLAY_COUNT = 5

export const SmartAgenda = React.memo(function SmartAgenda() {
  const { tasks, addTask, setTaskStatus, updateTask, deleteTask, addSubtask, updateSubtask, deleteSubtask } = useAgendaStore()
  const setViewMode = useCalendarStore(s => s.setViewMode)
  const { data: categories = [] } = useCategories()
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState<Partial<AgendaTask> | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // 활성 할 일 (완료/삭제 제외) → 기한별 정렬
  const activeTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'trash' && t.status !== 'done')
      .sort((a, b) => {
        // 기한 지남 → 오늘 → 가까운 미래 → 기한 없음
        const getScore = (t: typeof a) => {
          if (!t.deadline) return 4 // 기한 없음
          const d = new Date(t.deadline)
          const now = new Date()
          now.setHours(0, 0, 0, 0)
          const target = new Date(d)
          target.setHours(0, 0, 0, 0)
          if (target < now) return 1 // 기한 지남
          if (target.getTime() === now.getTime()) return 2 // 오늘
          return 3 // 미래
        }
        const scoreA = getScore(a)
        const scoreB = getScore(b)
        if (scoreA !== scoreB) return scoreA - scoreB

        // 같은 그룹 내에서는 기한 순
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        }
        return 0
      })
  }, [tasks])

  const displayedTasks = isExpanded ? activeTasks : activeTasks.slice(0, INITIAL_DISPLAY_COUNT)
  const remainingCount = activeTasks.length - INITIAL_DISPLAY_COUNT

  const handleComplete = useCallback(async (id: string) => {
    await setTaskStatus(id, 'done')
  }, [setTaskStatus])

  const handleAddTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return
    setIsAdding(true)
    try {
      await addTask({ title: newTaskTitle.trim() })
      setNewTaskTitle('')
    } finally {
      setIsAdding(false)
    }
  }, [newTaskTitle, addTask])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleAddTask()
    }
  }

  const getDeadlineBadge = (deadline: string | null) => {
    if (!deadline) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-muted-foreground bg-muted">
          <Calendar className="w-2.5 h-2.5" />
          기한 없음
        </span>
      )
    }
    const d = parseISO(deadline)
    if (!isValid(d)) return null

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(d)
    target.setHours(0, 0, 0, 0)

    if (target < now) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-red-600 bg-red-50 border border-red-100">
          <AlertTriangle className="w-2.5 h-2.5" />
          기한 경과
        </span>
      )
    }
    if (target.getTime() === now.getTime()) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100">
          <Clock className="w-2.5 h-2.5" />
          오늘 마감
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-muted-foreground bg-muted">
        <Clock className="w-2.5 h-2.5" />
        {format(d, 'M/d')}
      </span>
    )
  }

  return (
    <div className="relative bg-card/85 backdrop-blur-xl rounded-3xl border border-border shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] overflow-hidden h-full flex flex-col">
      {/* 헤더 */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shadow-inner border border-transparent/50">
            <ListTodo className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-foreground tracking-tight">할 일</h2>
            <p className="text-xs text-muted-foreground font-medium">
              {activeTasks.length > 0 ? `${activeTasks.length}개 남음` : '모두 완료!'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setViewMode('archive_agenda')}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            전체 보기
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => inputRef.current?.focus()}
            className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold transition-colors"
          >
            + 할 일 추가
          </button>
        </div>
      </div>

      {/* 할 일 리스트 */}
      <div className="px-5 flex-1 overflow-y-auto hide-scrollbar">
        {activeTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl flex items-center justify-center mb-3 shadow-inner border border-emerald-100/50">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">할 일을 모두 완료했어요!</p>
            <p className="text-xs text-muted-foreground/60 mt-1">대단해요! 🎉</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {displayedTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                className="flex items-start gap-3 py-2.5 px-1 group"
              >
                <button
                  onClick={() => handleComplete(task.id)}
                  className="mt-0.5 shrink-0 transition-all hover:scale-110"
                  title="완료 처리"
                >
                  <Circle className="w-[18px] h-[18px] text-muted-foreground/60 group-hover:text-emerald-400 transition-colors" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight line-clamp-2 group-hover:text-foreground transition-colors">
                    {task.title}
                  </p>
                  <div className="mt-1.5">
                    {getDeadlineBadge(task.deadline)}
                  </div>
                </div>
                
                <div className="hidden group-hover:flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200 mt-0.5 pr-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="수정"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if(confirm('이 항목을 삭제하시겠습니까?')) deleteTask(task.id); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* 더보기 / 접기 버튼 */}
        {remainingCount > 0 && (
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{isExpanded ? '접기' : `더보기 (+${remainingCount})`}</span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </motion.button>
        )}
      </div>

      {/* 빠른 추가 입력 */}
      <div className="px-5 pb-5 pt-2 shrink-0 border-t border-border">
        <div className="flex items-center gap-2 bg-muted/80 rounded-xl px-3 py-2.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-emerald-200 transition-all">
          <Plus className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          <input
            type="text"
            ref={inputRef}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="할 일을 빠르게 추가..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60 text-foreground font-medium"
            disabled={isAdding}
          />
          {newTaskTitle.trim() && (
            <button
              onClick={handleAddTask}
              disabled={isAdding}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition-colors disabled:opacity-50"
            >
              추가
            </button>
          )}
        </div>
      </div>
      
      <EditAgendaTaskDialog 
        task={tasks.find(t => t.id === selectedTaskId) || null}
        isOpen={!!selectedTaskId}
        onClose={() => {
          setSelectedTaskId(null);
          setEditForm(null);
        }}
        categories={categories}
        onSave={updateTask}
        onAddSubtask={addSubtask}
        onUpdateSubtask={updateSubtask}
        onDeleteSubtask={deleteSubtask}
      />
    </div>
  )
})
