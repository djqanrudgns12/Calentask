import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { AnniversaryPresetType, Anniversary } from '@/utils/anniversaryCalculator';
import { CalendarDays, Sparkles, Settings2, ChevronDown, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';

const PRESET_LABELS: Record<AnniversaryPresetType, string> = {
  COUPLE: '💕 연인/커플',
  BIRTHDAY: '🎂 생일',
  LUNAR_BIRTHDAY: '🎂 생일',
  EXAM: '📝 시험/디데이',
  PAYDAY: '💰 월급/정기일',
  CUSTOM: '✨ 직접 설정'
};

const CUSTOM_TYPES = {
  D_DAY_CALC: [
    { id: 'D_DAY', name: '디데이', desc: '수능시험 등 (D+는 0일부터 시작)', color: 'text-rose-500' },
    { id: 'DAYS_COUNT', name: '날짜수', desc: '커플기념일 등 (1일부터 시작)', color: 'text-rose-500' },
    { id: 'MONTHS_COUNT', name: '개월수', desc: '아기개월수 등', color: 'text-rose-500' },
    { id: 'WEEKS_COUNT', name: '주수', desc: '7일을 1주로 계산', color: 'text-rose-500' },
    { id: 'YEAR_MONTH_DAY', name: '연월일', desc: '1년12개월30일로 표기', color: 'text-rose-500' },
  ],
  RECURRENCE: [
    { id: 'DAY', name: '일 반복', desc: '1일 반복, 5일 반복 등', color: 'text-rose-500' },
    { id: 'WEEK', name: '주 반복', desc: '1주 반복, 3주 반복 등', color: 'text-rose-500' },
    { id: 'MONTH', name: '월 반복', desc: '월급날 등', color: 'text-rose-500' },
    { id: 'YEAR', name: '년 반복', desc: '생일, 결혼기념일 등', color: 'text-rose-500' },
    { id: 'LUNAR_YEAR', name: '음력반복', desc: '제삿날 등 (매년 음력 반복)', color: 'text-rose-500' },
  ]
};

export const DynamicAnniversaryForm = React.memo(function DynamicAnniversaryForm({ 
  onSubmit, 
  onCancel, 
  initialData 
}: { 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => void, 
  onCancel: () => void,
  initialData?: Anniversary | null
}) {
  const [preset, setPreset] = useState<AnniversaryPresetType>('COUPLE');
  const [title, setTitle] = useState('');
  const [baseDate, setBaseDate] = useState('');
  const [isLunar, setIsLunar] = useState(false);
  
  // Custom Settings State
  const [customStep, setCustomStep] = useState<1 | 2>(1);
  const [customRuleType, setCustomRuleType] = useState<string>('D_DAY');
  const [interval, setInterval] = useState<number>(1);
  const [openAccordion, setOpenAccordion] = useState<'D_DAY_CALC' | 'RECURRENCE' | null>(null);

  // Advanced Settings State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showInSidebar, setShowInSidebar] = useState(true);
  const [showInCalendar, setShowInCalendar] = useState(true);
  const [show100Days, setShow100Days] = useState(true);
  const [showYears, setShowYears] = useState(true);
  const [showDDayOnly, setShowDDayOnly] = useState(false);
  const [avoidWeekends, setAvoidWeekends] = useState(true);
  const [showEveryMonth, setShowEveryMonth] = useState(true);
  const [showEveryWeek, setShowEveryWeek] = useState(true);

  useEffect(() => {
    if (initialData) {
      setPreset(initialData.preset_type);
      setTitle(initialData.title);
      setBaseDate(initialData.base_date);
      setIsLunar(initialData.is_lunar);
      
      const rule = initialData.calculation_rule;
      if (initialData.preset_type === 'CUSTOM') {
         setCustomStep(2);
         if (rule.type === 'RECURRENCE') {
           setCustomRuleType(rule.unit || 'DAY');
           setInterval(rule.interval || 1);
         } else {
           setCustomRuleType(rule.type);
         }
      }

      const opts = rule.options || {};
      if (opts.show_in_sidebar !== undefined) setShowInSidebar(opts.show_in_sidebar);
      if (opts.show_in_calendar !== undefined) setShowInCalendar(opts.show_in_calendar);
      if (opts.show_100_days !== undefined) setShow100Days(opts.show_100_days);
      if (opts.show_years !== undefined) setShowYears(opts.show_years);
      if (opts.show_d_day_only !== undefined) setShowDDayOnly(opts.show_d_day_only);
      if (opts.avoid_weekends !== undefined) setAvoidWeekends(opts.avoid_weekends);
      if (opts.show_every_month !== undefined) setShowEveryMonth(opts.show_every_month);
      if (opts.show_every_week !== undefined) setShowEveryWeek(opts.show_every_week);
    }
  }, [initialData]);

  const isRecurrence = (typeId: string) => ['DAY', 'WEEK', 'MONTH', 'YEAR', 'LUNAR_YEAR'].includes(typeId);

  const getCustomTitle = (typeId: string) => {
    const all = [...CUSTOM_TYPES.D_DAY_CALC, ...CUSTOM_TYPES.RECURRENCE];
    return all.find(x => x.id === typeId)?.name || '기념일 설정';
  };

  const getIntervalSuffix = (typeId: string) => {
    switch (typeId) {
      case 'DAY': return '일';
      case 'WEEK': return '주';
      case 'MONTH': return '개월';
      case 'YEAR': return '년';
      default: return '';
    }
  };

  const getPlaceholder = () => {
    if (preset === 'CUSTOM' && customStep === 2) return `${getCustomTitle(customRuleType)} 제목을 입력하세요`;
    switch(preset) {
      case 'COUPLE': return '누구와의 디데이인가요?';
      case 'BIRTHDAY':
      case 'LUNAR_BIRTHDAY': return '누구의 생일인가요?';
      case 'EXAM': return '어떤 시험/디데이인가요?';
      case 'PAYDAY': return '어떤 정기일인가요?';
      case 'CUSTOM': return '어떤 기념일인가요?';
      default: return '기념일 이름';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !baseDate) return;
    if (preset === 'CUSTOM' && customStep === 1) return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let calculation_rule: any = { type: 'DAYS_COUNT', options: { show_in_sidebar: showInSidebar, show_in_calendar: showInCalendar, show_100_days: show100Days, show_years: showYears } };
    
    if (preset === 'EXAM') calculation_rule = { type: 'D_DAY', options: { show_in_sidebar: showInSidebar, show_in_calendar: showInCalendar, show_d_day_only: showDDayOnly } };
    if (preset === 'PAYDAY') calculation_rule = { type: 'RECURRENCE', unit: 'MONTH', interval: 1, options: { show_in_sidebar: showInSidebar, show_in_calendar: showInCalendar, avoid_weekends: avoidWeekends } };
    if (preset === 'BIRTHDAY' || preset === 'LUNAR_BIRTHDAY') calculation_rule = { type: 'RECURRENCE', unit: 'YEAR', interval: 1, options: { show_in_sidebar: showInSidebar, show_in_calendar: showInCalendar } };
    
    if (preset === 'CUSTOM') {
      if (['D_DAY', 'DAYS_COUNT', 'MONTHS_COUNT', 'WEEKS_COUNT', 'YEAR_MONTH_DAY'].includes(customRuleType)) {
        calculation_rule = { 
          type: customRuleType, 
          options: { 
            show_in_sidebar: showInSidebar,
            show_in_calendar: showInCalendar, 
            show_every_month: showEveryMonth, 
            show_every_week: showEveryWeek,
            show_100_days: customRuleType === 'DAYS_COUNT' ? show100Days : undefined,
            show_years: customRuleType === 'DAYS_COUNT' ? showYears : undefined,
          } 
        };
      } else {
        calculation_rule = {
          type: 'RECURRENCE',
          unit: customRuleType,
          interval: customRuleType === 'LUNAR_YEAR' ? 1 : interval, // 음력반복은 주기 1 고정
          options: {
            show_in_sidebar: showInSidebar,
            show_in_calendar: showInCalendar,
            avoid_weekends: avoidWeekends
          }
        };
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      preset_type: preset,
      title,
      base_date: baseDate,
      is_lunar: preset === 'LUNAR_BIRTHDAY' || (preset === 'CUSTOM' && customRuleType === 'LUNAR_YEAR') || isLunar,
      calculation_rule
    };

    if (initialData?.id) payload.id = initialData.id;

    onSubmit(payload);
  };

  const formattedDate = baseDate 
    ? format(new Date(baseDate), 'yyyy년 M월 d일') 
    : '날짜를 선택해 주세요';

  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDateClick = () => {
    if (dateInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch {
        dateInputRef.current.focus();
      }
    }
  };

  const renderAdvancedSettingsContent = () => {
    if (preset === 'CUSTOM' && customRuleType === 'YEAR_MONTH_DAY') {
      return (
        <div className="p-4 text-center">
          <span className="text-sm font-medium text-muted-foreground">
            연월일 표기 방식은 오버레이 캘린더 표시 기능이 없습니다. 위젯에서만 확인하실 수 있습니다.
          </span>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        {/* 마스터 토글 1: 사이드바 위젯 표시 (항상 보임) */}
        <label className="flex items-center justify-between cursor-pointer group pb-2">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">사이드바 위젯에 표시하기</span>
            <span className="text-xs text-muted-foreground mt-0.5">D-Day 위젯에 이 항목을 띄웁니다</span>
          </div>
          <div className="relative flex items-center justify-center shrink-0">
            <input type="checkbox" className="sr-only peer" checked={showInSidebar} onChange={(e) => setShowInSidebar(e.target.checked)} />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-transparent after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
          </div>
        </label>
        
        <div className="w-full h-px bg-muted" />

        {/* 마스터 토글 2: 캘린더 표시 */}
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="text-sm font-bold text-foreground">나의 캘린더에 표시하기</span>
          <div className="relative flex items-center justify-center">
            <input type="checkbox" className="sr-only peer" checked={showInCalendar} onChange={(e) => setShowInCalendar(e.target.checked)} />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-transparent after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </div>
        </label>

        {showInCalendar && (
          <div className="pt-3 border-t border-border/60 space-y-4">
            {(preset === 'COUPLE' || (preset === 'CUSTOM' && customRuleType === 'DAYS_COUNT')) && (
              <>
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium text-foreground">100일 단위 기념일 달력에 표시</span>
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" className="sr-only peer" checked={show100Days} onChange={(e) => setShow100Days(e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium text-foreground">주년 단위(1주년 등) 달력에 표시</span>
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" className="sr-only peer" checked={showYears} onChange={(e) => setShowYears(e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                  </div>
                </label>
              </>
            )}
            {(preset === 'EXAM' || (preset === 'CUSTOM' && customRuleType === 'D_DAY')) && (
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">디데이 당일만 표시 (D-Day)</span>
                  <span className="text-xs text-muted-foreground mt-0.5">D-10, D-30 등 중간 알람 숨기기</span>
                </div>
                <div className="relative flex items-center justify-center shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={showDDayOnly} onChange={(e) => setShowDDayOnly(e.target.checked)} />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                </div>
              </label>
            )}
            {(preset === 'PAYDAY' || (preset === 'CUSTOM' && customRuleType === 'MONTH')) && (
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-foreground">주말일 경우 직전 평일로 앞당기기</span>
                <div className="relative flex items-center justify-center shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={avoidWeekends} onChange={(e) => setAvoidWeekends(e.target.checked)} />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </div>
              </label>
            )}
            {preset === 'CUSTOM' && customRuleType === 'MONTHS_COUNT' && (
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-foreground">매월 달력에 표시하기</span>
                <div className="relative flex items-center justify-center shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={showEveryMonth} onChange={(e) => setShowEveryMonth(e.target.checked)} />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                </div>
              </label>
            )}
            {preset === 'CUSTOM' && customRuleType === 'WEEKS_COUNT' && (
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-foreground">매주 달력에 표시하기</span>
                <div className="relative flex items-center justify-center shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={showEveryWeek} onChange={(e) => setShowEveryWeek(e.target.checked)} />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                </div>
              </label>
            )}
          </div>
        )}
      </div>
    );
  };

  const isFormValid = () => {
    if (preset === 'CUSTOM' && customStep === 1) return false;
    return title.trim().length > 0 && baseDate;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="bg-card/95 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.1)] border border-transparent/60 w-full max-w-md relative overflow-hidden group h-full max-h-[85vh] flex flex-col"
    >
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-400/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        {!(preset === 'CUSTOM' && customStep === 2) && (
          <div className="flex items-center gap-3 mb-8 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shadow-inner border border-transparent">
              <Sparkles className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              {initialData ? '기념일 수정' : '새로운 기념일 추가'}
            </h2>
          </div>
        )}

        {preset === 'CUSTOM' && customStep === 2 && (
          <div className="flex items-center mb-6 shrink-0 border-b border-border pb-4">
            <button 
              type="button"
              onClick={() => setCustomStep(1)}
              className="mr-3 p-2 rounded-xl bg-muted hover:bg-muted text-muted-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-rose-500 tracking-tight">
              {getCustomTitle(customRuleType)}
            </h2>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 hide-scrollbar space-y-8 pb-4">
          
          {!(preset === 'CUSTOM' && customStep === 2) && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase ml-1">유형 선택</label>
              <div className="flex flex-wrap gap-2">
                {(['COUPLE', 'BIRTHDAY', 'EXAM', 'PAYDAY', 'CUSTOM'] as AnniversaryPresetType[]).map((p) => {
                  const isSelected = preset === p || (p === 'BIRTHDAY' && preset === 'LUNAR_BIRTHDAY');
                  return (
                    <motion.button
                      key={p}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { 
                        setPreset(p); 
                        if (p !== 'BIRTHDAY' && p !== 'LUNAR_BIRTHDAY') setIsLunar(false); 
                        if (p === 'CUSTOM') setCustomStep(1);
                      }}
                      className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] ring-2 ring-blue-600/20 ring-offset-2 ring-offset-white' 
                          : 'bg-muted/80 text-foreground hover:bg-slate-200/80 hover:text-foreground border border-transparent'
                      }`}
                    >
                      {PRESET_LABELS[p]}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )}

          {preset === 'CUSTOM' && customStep === 1 ? (
            <div className="space-y-4 pt-2">
              <div className="text-sm text-muted-foreground mb-4 px-1">
                찾으시는 계산 방법이 없으신가요?<br/>
                <strong className="text-foreground text-base">직접 선택해 보세요 👇</strong>
              </div>
              
              <div className="space-y-3">
                <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
                  <button type="button" onClick={() => setOpenAccordion(openAccordion === 'D_DAY_CALC' ? null : 'D_DAY_CALC')} className="w-full flex justify-between p-4 bg-muted hover:bg-muted/80 transition-colors items-center">
                    <span className="font-bold text-foreground">디데이/날짜수 계산</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openAccordion === 'D_DAY_CALC' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openAccordion === 'D_DAY_CALC' && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border bg-card">
                        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-l border-r border-border">
                          {CUSTOM_TYPES.D_DAY_CALC.map(t => (
                            <button 
                              key={t.id} 
                              type="button" 
                              onClick={() => { setCustomRuleType(t.id); setCustomStep(2); }}
                              className="p-4 text-left hover:bg-rose-50/30 transition-colors"
                            >
                              <div className={`font-bold ${t.color}`}>{t.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
                  <button type="button" onClick={() => setOpenAccordion(openAccordion === 'RECURRENCE' ? null : 'RECURRENCE')} className="w-full flex justify-between p-4 bg-muted hover:bg-muted/80 transition-colors items-center">
                    <span className="font-bold text-foreground">반복 계산</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openAccordion === 'RECURRENCE' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openAccordion === 'RECURRENCE' && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border bg-card">
                        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-l border-r border-border">
                          {CUSTOM_TYPES.RECURRENCE.map(t => (
                            <button 
                              key={t.id} 
                              type="button" 
                              onClick={() => { setCustomRuleType(t.id); setCustomStep(2); setInterval(1); }}
                              className="p-4 text-left hover:bg-rose-50/30 transition-colors"
                            >
                              <div className={`font-bold ${t.color}`}>{t.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="relative pt-2">
                <input 
                  type="text" 
                  id="anni-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-border py-2 text-xl font-bold text-foreground focus:outline-none focus:border-blue-600 transition-colors peer placeholder-transparent"
                  placeholder={getPlaceholder()}
                  required
                />
                <label 
                  htmlFor="anni-title"
                  className={`absolute left-0 transition-all duration-300 font-semibold pointer-events-none 
                    ${title ? 'text-xs -top-2 text-blue-600' : 'text-lg top-2 text-muted-foreground peer-focus:text-xs peer-focus:-top-2 peer-focus:text-blue-600'}`}
                >
                  {getPlaceholder()}
                </label>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground tracking-wider ml-1">시작일</label>
                <div className="relative group cursor-pointer" onClick={handleDateClick}>
                  <input 
                    type="date"
                    ref={dateInputRef}
                    value={baseDate}
                    onChange={(e) => setBaseDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    required
                  />
                  <div className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between ${
                    baseDate ? 'bg-blue-50/50 border-blue-200' : 'bg-muted/80 border-border group-hover:border-slate-300 group-hover:bg-muted/50'
                  }`}>
                    <span className={`text-lg transition-colors ${baseDate ? 'text-blue-900 font-extrabold' : 'text-muted-foreground font-semibold'}`}>
                      {formattedDate}
                    </span>
                    <div className={`p-2 rounded-xl transition-colors ${baseDate ? 'bg-blue-100 text-blue-600' : 'bg-card text-muted-foreground shadow-sm'}`}>
                      <CalendarDays className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {preset === 'CUSTOM' && customStep === 2 && isRecurrence(customRuleType) && customRuleType !== 'LUNAR_YEAR' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-muted-foreground tracking-wider ml-1">반복 주기</label>
                  <div className="flex items-center space-x-3 p-4 rounded-2xl border border-border bg-muted/50">
                    <input 
                      type="number"
                      min="1"
                      value={interval}
                      onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                      className="w-16 bg-card border border-border rounded-xl px-3 py-2 text-center font-bold text-foreground focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-foreground font-medium">{getIntervalSuffix(customRuleType)}마다 반복</span>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {(preset === 'BIRTHDAY' || preset === 'LUNAR_BIRTHDAY') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="flex items-center space-x-3 bg-indigo-50/60 p-4 rounded-2xl cursor-pointer border border-indigo-100/50 hover:bg-indigo-50 transition-colors">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={isLunar || preset === 'LUNAR_BIRTHDAY'}
                          onChange={(e) => {
                            setIsLunar(e.target.checked);
                            setPreset(e.target.checked ? 'LUNAR_BIRTHDAY' : 'BIRTHDAY');
                          }}
                          className="peer sr-only"
                        />
                        <div className="w-6 h-6 border-2 border-indigo-200 rounded-lg peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-colors flex items-center justify-center">
                          <svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-indigo-900">
                        음력 날짜입니다 (매년 양력 자동 변환)
                      </span>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Advanced Settings Accordion */}
              <div className="border border-border/60 rounded-2xl overflow-hidden bg-muted/50">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between p-4 bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center space-x-2 text-foreground font-semibold">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">고급 설정 (캘린더 표시)</span>
                  </div>
                  <motion.div animate={{ rotate: showAdvanced ? 180 : 0 }}>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border"
                    >
                      {renderAdvancedSettingsContent()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </form>
        
        {/* Actions fixed at bottom */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-border/60 shrink-0 bg-card">
          <Button 
            variant="ghost" 
            type="button" 
            onClick={onCancel} 
            className="text-muted-foreground hover:text-foreground font-semibold px-6 py-6 rounded-2xl"
          >
            취소
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={!isFormValid()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] font-bold text-base px-8 py-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initialData ? '수정 완료' : '저장하기'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
})
