'use client'

import { CalendarPlus, ListPlus, FileEdit } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCalendarStore } from '@/store/useCalendarStore'

const actions = [
  {
    id: 'event',
    label: '새 일정',
    icon: CalendarPlus,
    gradient: 'from-blue-500 to-indigo-500',
    shadowColor: 'rgba(59,130,246,0.25)',
    bgHover: 'hover:from-blue-600 hover:to-indigo-600',
  },
  {
    id: 'task',
    label: '새 할 일',
    icon: ListPlus,
    gradient: 'from-emerald-500 to-teal-500',
    shadowColor: 'rgba(16,185,129,0.25)',
    bgHover: 'hover:from-emerald-600 hover:to-teal-600',
  },
  {
    id: 'note',
    label: '새 노트',
    icon: FileEdit,
    gradient: 'from-amber-500 to-orange-500',
    shadowColor: 'rgba(245,158,11,0.25)',
    bgHover: 'hover:from-amber-600 hover:to-orange-600',
  },
]

export function QuickActions() {
  const { openAddEvent, setViewMode } = useCalendarStore()

  const handleClick = (id: string) => {
    switch (id) {
      case 'event':
        openAddEvent(new Date())
        break
      case 'task':
        // 아카이브 아젠다 뷰로 이동 (할 일 추가는 SmartAgenda 인라인으로)
        setViewMode('archive_agenda')
        break
      case 'note':
        setViewMode('archive_notes')
        break
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <motion.button
            key={action.id}
            onClick={() => handleClick(action.id)}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r ${action.gradient} ${action.bgHover} text-white text-sm font-bold transition-all`}
            style={{ boxShadow: `0 6px 20px -4px ${action.shadowColor}` }}
          >
            <Icon className="w-4 h-4" />
            {action.label}
          </motion.button>
        )
      })}
    </div>
  )
}
