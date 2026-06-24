'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, School, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { searchSchools, SchoolInfo } from './neisUtils'

interface Props {
  onSelectSchool: (school: SchoolInfo) => void
}

export function SchoolSearchCard({ onSelectSchool }: Props) {
  const [keyword, setKeyword] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SchoolInfo[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!keyword.trim()) return

    setIsSearching(true)
    try {
      const data = await searchSchools(keyword)
      setResults(data)
      setHasSearched(true)
    } catch (error) {
      console.error(error)
      alert('학교 검색 중 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 md:mt-16 relative">
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-red-400/10 rounded-full blur-3xl" />
      
      <div className="relative bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-orange-100/50 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/50 dark:to-red-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-white/60 dark:border-white/10">
            <School className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
            내 학교 찾기
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            급식 식단을 확인하고 싶은 학교 이름을 검색해주세요.
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative flex items-center gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예: 서울초등학교, 부산중학교"
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-orange-400 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-400/10 outline-none transition-all font-medium"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isSearching || !keyword.trim()}
            className="h-[56px] px-8 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25 transition-all text-base font-bold shrink-0"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : '검색'}
          </Button>
        </form>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence>
            {results.map((school, i) => (
              <motion.div
                key={school.schoolCode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
                onClick={() => onSelectSchool(school)}
              >
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {school.schoolName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    {school.address}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                  <ArrowRight className="w-5 h-5 text-orange-400 group-hover:text-white transition-colors" />
                </div>
              </motion.div>
            ))}
            
            {hasSearched && results.length === 0 && !isSearching && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-10 text-slate-500 dark:text-slate-400"
              >
                검색 결과가 없습니다. 이름을 다시 확인해주세요.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
