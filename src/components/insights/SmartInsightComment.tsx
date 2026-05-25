"use client";

import React, { useMemo } from 'react';
import { Activity } from '@/app/actions/calendar';
import { motion } from 'framer-motion';
import { Flame, Sparkles, TrendingUp, Target } from 'lucide-react';
import { startOfDay, subDays } from 'date-fns';

interface SmartInsightCommentProps {
  activities: Activity[];
  prevActivities?: Activity[];
}

export default function SmartInsightComment({ activities, prevActivities }: SmartInsightCommentProps) {
  const insight = useMemo(() => {
    if (!activities || activities.length === 0) {
      return {
        icon: <Target className="text-gray-400" size={20} />,
        title: "첫 기록을 시작해 볼까요?",
        description: "현재 선택된 기간에 활동 내역이 없습니다. 새로운 목표를 세워보세요!",
        gradient: "from-gray-50 to-gray-100",
        textColor: "text-gray-700",
        streak: 0
      };
    }

    // 1. Calculate Streak
    const today = startOfDay(new Date());
    const uniqueDays = Array.from(new Set(
      activities.map(act => startOfDay(new Date(act.start_time)).getTime())
    )).sort((a, b) => b - a);

    let currentStreak = 0;
    let checkDate = today.getTime();

    if (uniqueDays[0] !== checkDate) {
      checkDate = subDays(today, 1).getTime();
    }

    for (const day of uniqueDays) {
      if (day === checkDate) {
        currentStreak++;
        checkDate = subDays(new Date(checkDate), 1).getTime();
      } else if (day < checkDate) {
        break;
      }
    }

    // 2. Analyze Categories
    const categoryMinutes: Record<string, { name: string, mins: number }> = {};
    let totalMins = 0;
    let taskCount = 0;
    let eventCount = 0;

    activities.forEach(act => {
      const start = new Date(act.start_time).getTime();
      const end = new Date(act.end_time).getTime();
      const mins = (end - start) / 60000;
      totalMins += mins;

      if (act.type === 'TASK') taskCount++;
      if (act.type === 'EVENT') eventCount++;

      if (act.categories && act.categories.length > 0) {
        const cat = act.categories[0];
        if (!categoryMinutes[cat.id]) {
          categoryMinutes[cat.id] = { name: cat.name, mins: 0 };
        }
        categoryMinutes[cat.id].mins += mins;
      }
    });

    const topCategory = Object.values(categoryMinutes).sort((a, b) => b.mins - a.mins)[0];
    const totalHours = Math.round(totalMins / 60);

    // 3. Generate Insights
    const options = [];

    // Option E: Deep Analytical (Growth)
    if (prevActivities && prevActivities.length > 0) {
      let prevTotalMins = 0;
      prevActivities.forEach(act => {
        prevTotalMins += (new Date(act.end_time).getTime() - new Date(act.start_time).getTime()) / 60000;
      });
      
      const diffMins = totalMins - prevTotalMins;
      const growthRate = prevTotalMins > 0 ? Math.round((diffMins / prevTotalMins) * 100) : 0;

      if (growthRate >= 15 && topCategory) {
        options.push({
          icon: <TrendingUp className="text-indigo-500" size={20} />,
          title: `이전 기간 대비 ${growthRate}% 몰입 상승! 📈`,
          description: `지난 기간보다 몰입도가 ${growthRate}% 증가했습니다. 특히 '${topCategory.name}'에 전체 시간의 ${Math.round(topCategory.mins / totalMins * 100)}%를 집중하며 압도적인 딥워크를 보여주었습니다.`,
          gradient: "from-indigo-50 to-blue-50",
          textColor: "text-indigo-900"
        });
      }
    }

    // Option A: Streak
    if (currentStreak >= 3) {
      options.push({
        icon: <Flame className="text-orange-500" size={20} />,
        title: `${currentStreak}일 연속 달성 중! 🔥`,
        description: `엄청난 끈기입니다. 매일 꾸준히 기록하며 자신만의 페이스를 유지하고 계시네요.`,
        gradient: "from-orange-50 to-red-50",
        textColor: "text-orange-900"
      });
    }

    // Option B: Top Category Heavy
    if (topCategory && topCategory.mins / totalMins > 0.5) {
      options.push({
        icon: <Sparkles className="text-blue-500" size={20} />,
        title: `'${topCategory.name}'에 엄청난 집중! 🚀`,
        description: `전체 시간의 절반 이상을 ${topCategory.name}에 쏟으셨습니다. 딥워크의 정석이네요!`,
        gradient: "from-blue-50 to-indigo-50",
        textColor: "text-blue-900"
      });
    }

    // Option C: Task vs Event
    if (taskCount > eventCount * 2 && taskCount > 5) {
      options.push({
        icon: <TrendingUp className="text-emerald-500" size={20} />,
        title: `행동력 폭발! 완료한 할 일이 ${taskCount}개 🎯`,
        description: `단순한 일정(Event)보다 실행(Task)의 비중이 압도적입니다. 극도의 생산성을 보여주고 계십니다.`,
        gradient: "from-emerald-50 to-teal-50",
        textColor: "text-emerald-900"
      });
    }

    // Option D: General Volume
    if (totalHours > 20) {
      options.push({
        icon: <TrendingUp className="text-purple-500" size={20} />,
        title: `총 ${totalHours}시간의 기록 🕰️`,
        description: `이 기간 동안 정말 많은 시간을 밀도 있게 보내셨네요. 스스로에게 박수를 쳐주세요!`,
        gradient: "from-purple-50 to-fuchsia-50",
        textColor: "text-purple-900"
      });
    }

    // Fallback Option
    if (options.length === 0) {
      options.push({
        icon: <Sparkles className="text-blue-500" size={20} />,
        title: `기록이 쌓여가고 있습니다 ✨`,
        description: `총 ${totalHours}시간 동안 ${activities.length}건의 일정을 소화하셨습니다. 계속해서 좋은 습관을 만들어가요!`,
        gradient: "from-blue-50 to-indigo-50",
        textColor: "text-blue-900"
      });
    }

    // Select the best option (deterministically based on totalMins to avoid re-render flicker, or just pick first)
    const selected = options[activities.length % options.length];

    return { ...selected, streak: currentStreak };
  }, [activities]);

  return (
    <div className="flex gap-4 mb-6">
      {/* AI Insight Comment */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`flex-1 rounded-[24px] p-6 bg-gradient-to-br ${insight.gradient} border border-black/5 shadow-sm`}
      >
        <div className="flex items-center gap-2 mb-2">
          {insight.icon}
          <h3 className={`text-lg font-extrabold tracking-tight ${insight.textColor}`}>
            {insight.title}
          </h3>
        </div>
        <p className={`${insight.textColor} opacity-80 text-[15px] font-medium leading-snug`}>
          {insight.description}
        </p>
      </motion.div>

      {/* Streak Widget */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="shrink-0 w-32 rounded-[24px] bg-gray-900 p-5 flex flex-col items-center justify-center shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <Flame className={insight.streak > 0 ? "text-orange-500 mb-2" : "text-gray-600 mb-2"} size={28} />
        <div className="text-3xl font-black text-white tracking-tighter leading-none mb-1">
          {insight.streak}
        </div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          Days Streak
        </div>
      </motion.div>
    </div>
  );
}
