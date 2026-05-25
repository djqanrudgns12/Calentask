"use client"

import { Bell, Home, LayoutGrid, Star, User, BookOpen, Zap, Glasses, Grid3X3, TrendingUp, Dumbbell, Brain } from "lucide-react"

const weeklyData = [
  { day: "Mon", value: 60 },
  { day: "Tue", value: 45 },
  { day: "Wed", value: 75 },
  { day: "Thu", value: 55 },
  { day: "Fri", value: 90 },
  { day: "Sat", value: 40 },
  { day: "Sun", value: 85 },
]

const activityBreakdown = [
  { label: "STUDY", percentage: 40, icon: BookOpen, color: "blue" },
  { label: "WORKOUT", percentage: 30, icon: Zap, color: "yellow" },
  { label: "READING", percentage: 20, icon: Glasses, color: "purple" },
  { label: "OTHERS", percentage: 10, icon: Grid3X3, color: "slate" },
]

const quickAddItems = [
  { label: "Deep Work", icon: Brain },
  { label: "HIIT Session", icon: Dumbbell },
  { label: "Book Reading", icon: BookOpen },
  { label: "Meditation", icon: Star },
]

function ActivityCard({ label, percentage, icon: Icon, color }: { label: string; percentage: number; icon: React.ElementType; color: string }) {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-500/20", text: "text-blue-400" },
    yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400" },
    slate: { bg: "bg-slate-500/20", text: "text-slate-400" },
  }

  const classes = colorClasses[color] || colorClasses.slate

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1a2236]/60 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <div className={`rounded-lg ${classes.bg} p-1.5`}>
          <Icon className={`h-4 w-4 ${classes.text}`} />
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold text-white">{percentage}%</div>
    </div>
  )
}

export default function InsightsDashboard() {
  return (
    <div className="min-h-screen bg-[#0b1326] font-sans text-white">
      <div className="mx-auto max-w-md px-5 pb-24 pt-6">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600" />
              <div className="absolute inset-[2px] flex items-center justify-center rounded-full bg-[#0b1326]">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 opacity-90" />
              </div>
            </div>
            <span className="text-lg font-medium text-white">Good morning</span>
          </div>
          <button className="relative rounded-full p-2 transition-colors hover:bg-white/10">
            <Bell className="h-5 w-5 text-slate-400" />
          </button>
        </header>

        {/* Insights Title */}
        <section className="mb-5">
          <h1 className="text-2xl font-semibold text-white">Insights</h1>
          <p className="mt-1 text-sm text-slate-400">Your activity breakdown.</p>
        </section>

        {/* This Week's Activity Card - Glassmorphism */}
        <section className="mb-6">
          <div className="rounded-2xl border border-white/10 bg-[#1a2236]/60 p-5 backdrop-blur-xl">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              This week&apos;s activity
            </p>
            
            <div className="mb-1 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-white">24.5</span>
              <span className="text-xl font-light text-slate-400">h</span>
              <div className="ml-3 flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">+12%</span>
              </div>
            </div>
            
            <p className="mb-6 text-xs text-slate-500">vs last week</p>

            {/* Bar Chart - Pure CSS */}
            <div className="flex items-end justify-between gap-2">
              {weeklyData.map((item, index) => (
                <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative h-20 w-full">
                    <div
                      className={`absolute bottom-0 w-full rounded-sm transition-all duration-500 ${
                        index === 4 ? "bg-blue-500" : "bg-slate-600/80"
                      }`}
                      style={{ height: `${item.value}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Activity Breakdown */}
        <section className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Activity Breakdown</h2>
          
          <div className="grid grid-cols-2 gap-3">
            {activityBreakdown.map((activity) => (
              <ActivityCard
                key={activity.label}
                label={activity.label}
                percentage={activity.percentage}
                icon={activity.icon}
                color={activity.color}
              />
            ))}
          </div>
        </section>

        {/* Quick Add */}
        <section>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
            Quick Add
          </h3>
          
          {/* Horizontal scrollable chips with hidden scrollbar */}
          <div className="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto whitespace-nowrap px-5 pb-2">
            {quickAddItems.map((item) => {
              const IconComponent = item.icon
              return (
                <button
                  key={item.label}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm transition-all hover:bg-white/10 active:scale-95"
                >
                  <IconComponent className="h-4 w-4 text-slate-300" />
                  <span className="text-sm font-medium text-white">{item.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {/* Bottom Navigation - Fixed */}
      <nav className="fixed inset-x-0 bottom-0 border-t border-white/5 bg-[#0b1326]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-around py-4">
          <button className="flex flex-col items-center gap-1 text-white transition-colors">
            <Home className="h-6 w-6" />
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-500 transition-colors hover:text-slate-300">
            <LayoutGrid className="h-6 w-6" />
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-500 transition-colors hover:text-slate-300">
            <Star className="h-6 w-6" />
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-500 transition-colors hover:text-slate-300">
            <User className="h-6 w-6" />
          </button>
        </div>
      </nav>
    </div>
  )
}
