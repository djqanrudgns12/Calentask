'use client'

import { Category, Activity } from '@/app/actions/calendar'
import { FolderOpen, CalendarDays, Inbox, CheckCircle2, Clock, Calendar as CalendarIcon } from 'lucide-react'
import dayjs from 'dayjs'

interface CategoryDetailPanelProps {
  category: Category | null
  usageCount: number
  activities?: Activity[]
}

export function CategoryDetailPanel({ category, usageCount, activities = [] }: CategoryDetailPanelProps) {
  if (!category) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-card/50 rounded-2xl border border-border border-dashed">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/50 mb-4">
          <FolderOpen className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-700 mb-2">카테고리 상세 뷰</h3>
        <p className="text-sm text-slate-500">좌측에서 카테고리를 선택하여<br/>할당된 세부 일정과 통계를 확인하세요.</p>
      </div>
    )
  }

  // 일정 정렬 (최신순 또는 시작일순)
  const sortedActivities = [...activities].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  return (
    <div className="h-full flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden relative">
      {/* Header (Color Tint) */}
      <div 
        className="p-6 border-b border-border relative overflow-hidden shrink-0"
        style={{
          background: `linear-gradient(135deg, ${category.hex_color}15 0%, transparent 100%)`,
        }}
      >
        {/* 장식용 후광 */}
        <div 
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ backgroundColor: category.hex_color }}
        />
        
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-5 h-5 rounded-full shadow-md"
                style={{ backgroundColor: category.hex_color }}
              />
              <h2 className="text-2xl font-black text-foreground">{category.name}</h2>
            </div>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              총 {usageCount}개의 일정이 연결됨
            </p>
          </div>
        </div>
      </div>

      {/* Content Area - 일정 타임라인 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
        <h4 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          연결된 일정 및 할 일 목록
        </h4>

        {sortedActivities.length > 0 ? (
          <div className="space-y-3">
            {sortedActivities.map(activity => (
              <div 
                key={activity.id} 
                className="bg-card p-4 rounded-2xl shadow-sm border border-border hover:border-indigo-200 transition-colors flex flex-col gap-2 relative overflow-hidden group"
              >
                {/* 좌측 Color Bar */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: activity.hex_color || category.hex_color }}
                />
                
                <div className="flex items-start justify-between gap-4 pl-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activity.type === 'TASK' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {activity.type === 'TASK' ? '할 일' : '일정'}
                      </span>
                      <h5 className="font-bold text-slate-800 truncate">{activity.title}</h5>
                    </div>
                    {activity.memo && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-2 leading-relaxed">
                        {activity.memo}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {dayjs(activity.start_time).format('YYYY.MM.DD HH:mm')}
                      </span>
                    </div>
                  </div>
                  
                  {/* (추가 가능) 상태 등 아이콘 */}
                  <div className="shrink-0 text-slate-300 group-hover:text-slate-400 transition-colors mt-1">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-base font-bold text-slate-600 mb-1">연결된 일정이 없습니다</p>
            <p className="text-sm text-slate-400">캘린더나 홈 대시보드에서 카테고리를 지정해보세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}
