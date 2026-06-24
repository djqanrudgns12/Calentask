import { Plus } from 'lucide-react'

interface Props {
  onClick: () => void
}

export function AddSchoolPlaceholderCard({ onClick }: Props) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center w-full h-full min-h-[300px] rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
    >
      <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-all">
        <Plus className="w-8 h-8 text-slate-500 group-hover:text-orange-500 transition-colors" />
      </div>
      <h3 className="text-xl font-extrabold text-slate-700 dark:text-slate-300 mb-2">
        내 학교 찾기
      </h3>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-500 text-center px-6">
        클릭하여 학교를 추가하세요<br/>(최대 4개 등록 가능)
      </p>
    </button>
  )
}
