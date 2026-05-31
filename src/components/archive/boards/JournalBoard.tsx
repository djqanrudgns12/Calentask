'use client'

export function JournalBoard() {
  return (
    <div className="w-full h-full bg-white p-8 md:p-12 overflow-y-auto rounded-3xl">
      <div className="max-w-3xl mx-auto space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-100 before:via-slate-200 before:to-transparent">
        
        {/* Entry 1 */}
        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-500 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
          </div>
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-3xl shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 text-xl">주간 회고</h3>
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">오늘, 오전 10:00</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium">이번 주 생산성이 매우 높았습니다. 밀린 QA 작업을 모두 마치고 아카이브 기능을 성공적으로 배포했습니다. 다음 단계: 유저 인터뷰.</p>
          </div>
        </div>

        {/* Entry 2 */}
        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
            <div className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
          </div>
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-3xl shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 text-xl">디자인 동기화 회의</h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">어제, 오후 3:30</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium">새로운 다크 모드 미학에 대해 디자인 팀과 방향성을 맞췄습니다. 코어 안정성에 집중하기 위해 3분기까지 구현을 연기하기로 결정했습니다.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
