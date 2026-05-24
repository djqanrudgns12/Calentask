import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DynamicAnniversaryForm } from './DynamicAnniversaryForm';
import { Plus, CalendarHeart, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Anniversary } from '@/utils/anniversaryCalculator';

export function AnniversarySettingsView({ onClose }: { onClose: () => void }) {
  const [isAdding, setIsAdding] = useState(false);
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

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute inset-0 z-50 bg-[#f7f9fb]/90 backdrop-blur-3xl overflow-y-auto"
      >
        <div className="max-w-5xl mx-auto p-10 h-full flex flex-col">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center">
                <CalendarHeart className="w-10 h-10 mr-4 text-blue-600" />
                기념일 설정
              </h1>
              <p className="text-slate-500 mt-2 text-lg">나만의 특별한 날들을 아름답게 기록하세요.</p>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
            >
              ✕
            </button>
          </div>

          <AnimatePresence mode="wait">
            {isAdding ? (
              <motion.div 
                key="form"
                className="flex-1 flex items-center justify-center"
              >
                <DynamicAnniversaryForm 
                  onSubmit={(data) => addMutation.mutate(data)} 
                  onCancel={() => setIsAdding(false)} 
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
                    className="h-48 border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-3xl flex flex-col items-center justify-center text-blue-600 transition-colors"
                  >
                    <Plus className="w-10 h-10 mb-3" />
                    <span className="font-semibold">새로운 기념일 추가</span>
                  </motion.button>

                  {/* Anniversary Cards */}
                  {anniversaries?.map((ann) => (
                    <motion.div 
                      key={ann.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ y: -5, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08)' }}
                      className="h-48 bg-white/80 backdrop-blur-md border border-white rounded-3xl p-6 shadow-sm relative group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full tracking-wider">
                            {ann.preset_type}
                          </span>
                          <button 
                            onClick={() => deleteMutation.mutate(ann.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mt-4 leading-tight">{ann.title}</h3>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">
                          {ann.is_lunar ? '음력 ' : ''}{ann.base_date}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
