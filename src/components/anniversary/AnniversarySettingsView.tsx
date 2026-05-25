import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DynamicAnniversaryForm } from './DynamicAnniversaryForm';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Anniversary } from '@/utils/anniversaryCalculator';

export function AnniversarySettingsView() {
  const [isAdding, setIsAdding] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Anniversary | null>(null);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: anniversaries, isLoading } = useQuery({
    queryKey: ['anniversaries_list'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data } = await supabase.from('anniversaries').select('*').eq('user_id', userData.user?.id);
      return data as Anniversary[];
    }
  });

  const addMutation = useMutation({
    mutationFn: async (newAnn: Partial<Anniversary>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('anniversaries').insert([{ ...newAnn, user_id: userData.user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anniversaries_list'] });
      queryClient.invalidateQueries({ queryKey: ['anniversaries'] }); // overlay query
      setIsAdding(false);
    },
    onError: (err) => {
      console.error('Mutation error:', err);
      alert('저장 중 오류가 발생했습니다: ' + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('anniversaries').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anniversaries_list'] });
      queryClient.invalidateQueries({ queryKey: ['anniversaries'] });
    }
  });

  const editMutation = useMutation({
    mutationFn: async (updatedAnn: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('anniversaries').update({
        preset_type: updatedAnn.preset_type,
        title: updatedAnn.title,
        base_date: updatedAnn.base_date,
        is_lunar: updatedAnn.is_lunar,
        calculation_rule: updatedAnn.calculation_rule
      }).eq('id', updatedAnn.id).eq('user_id', userData.user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anniversaries_list'] });
      queryClient.invalidateQueries({ queryKey: ['anniversaries'] });
      setEditingAnn(null);
    },
    onError: (err) => {
      alert('수정 중 오류가 발생했습니다: ' + err.message);
    }
  });

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="h-full overflow-y-auto"
      >
        <div className="max-w-5xl mx-auto py-6 h-full flex flex-col">
          <AnimatePresence mode="wait">
            {isAdding || editingAnn ? (
              <motion.div 
                key="form"
                className="flex-1 flex items-center justify-center"
              >
                <DynamicAnniversaryForm 
                  initialData={editingAnn}
                  onSubmit={(data) => {
                    if (editingAnn) editMutation.mutate(data);
                    else addMutation.mutate(data);
                  }} 
                  onCancel={() => { setIsAdding(false); setEditingAnn(null); }} 
                />
              </motion.div>
            ) : (
              <motion.div 
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Add New Button Card */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsAdding(true)}
                    className="h-[220px] border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-400 rounded-3xl flex flex-col items-center justify-center text-slate-600 transition-colors shadow-sm"
                  >
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-slate-400">
                      <Plus className="w-8 h-8" />
                    </div>
                    <span className="font-bold text-lg">새로운 기념일</span>
                  </motion.button>

                  {/* Anniversary Cards */}
                  {anniversaries?.map((ann) => {
                    // Styles & Logic
                    let gradientClass = 'from-slate-900 to-slate-800 shadow-slate-900/20 text-slate-50 ring-slate-500/30';
                    let presetLabel = '✨ 기념일';
                    
                    if (ann.preset_type === 'COUPLE') {
                      gradientClass = 'from-slate-900 to-rose-950/90 shadow-rose-900/20 text-rose-50 ring-rose-500/30';
                      presetLabel = '💕 연인/커플';
                    } else if (ann.preset_type === 'BIRTHDAY' || ann.preset_type === 'LUNAR_BIRTHDAY') {
                      gradientClass = 'from-slate-900 to-amber-950/90 shadow-amber-900/20 text-amber-50 ring-amber-500/30';
                      presetLabel = '🎂 생일';
                    } else if (ann.preset_type === 'EXAM') {
                      gradientClass = 'from-slate-900 to-red-950/90 shadow-red-900/20 text-red-50 ring-red-500/30';
                      presetLabel = '📝 시험/디데이';
                    } else if (ann.preset_type === 'PAYDAY') {
                      gradientClass = 'from-slate-900 to-emerald-950/90 shadow-emerald-900/20 text-emerald-50 ring-emerald-500/30';
                      presetLabel = '💰 월급/정기일';
                    } else if (ann.preset_type === 'CUSTOM') {
                      gradientClass = 'from-slate-900 to-indigo-950/90 shadow-indigo-900/20 text-indigo-50 ring-indigo-500/30';
                      presetLabel = '✨ 직접 설정';
                    }

                    // Simple Hero text logic
                    const baseDate = new Date(ann.base_date);
                    baseDate.setHours(0,0,0,0);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const diffDays = Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    let heroText = '';
                    if (ann.preset_type === 'COUPLE' || ann.preset_type === 'CUSTOM') {
                      heroText = diffDays < 0 ? `D${diffDays}` : `D+${diffDays + 1}`;
                    } else if (ann.preset_type === 'EXAM') {
                      heroText = diffDays > 0 ? `D+${diffDays}` : (diffDays === 0 ? 'D-Day' : `D${diffDays}`);
                    } else if (ann.preset_type === 'PAYDAY') {
                      heroText = '매월 정기일';
                    } else {
                      heroText = '매년 반복';
                    }

                    return (
                      <motion.div 
                        key={ann.id}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className={`h-[220px] bg-gradient-to-br ${gradientClass} rounded-[2rem] p-6 shadow-xl relative group flex flex-col justify-between overflow-hidden ring-1 ring-inset`}
                      >
                        {/* Background Overlay Glow */}
                        <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="relative z-10 flex justify-between items-start">
                          <div className="px-3 py-1 bg-black/20 backdrop-blur-md text-white/90 text-xs font-bold rounded-full tracking-wider border border-white/10 shadow-inner">
                            {presetLabel}
                          </div>
                          
                          {/* Hover Action Buttons */}
                          <div className="opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex items-center space-x-2 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
                            <button 
                              onClick={() => setEditingAnn(ann)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                              title="수정"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteMutation.mutate(ann.id)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="relative z-10 mt-auto space-y-3">
                          <h3 className="text-4xl font-black text-white tracking-tighter drop-shadow-md">
                            {heroText}
                          </h3>
                          <div className="space-y-1">
                            <p className="text-lg font-bold text-white/90 leading-tight line-clamp-1">{ann.title}</p>
                            <p className="text-sm font-medium text-white/50 flex items-center">
                              <span className="w-2 h-2 rounded-full bg-white/30 mr-2" />
                              {ann.is_lunar ? '음력 ' : ''}{ann.base_date}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
