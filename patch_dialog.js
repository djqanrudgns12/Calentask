const fs = require('fs');
let code = fs.readFileSync('src/components/calendar/AddEventDialog.tsx', 'utf8');

// 1. Import Repeat icon and new query hooks if needed. (RefreshCcw)
code = code.replace(/import { X, Plus, Pencil, Zap, Link as LinkIcon, Image as ImageIcon, FileText, Paperclip, ToggleRight, Play, Square, Clock, Tag, Palette, AlignLeft, Upload } from 'lucide-react'/, 
  "import { X, Plus, Pencil, Zap, Link as LinkIcon, Image as ImageIcon, FileText, Paperclip, ToggleRight, Play, Square, Clock, Tag, Palette, AlignLeft, Upload, RefreshCcw } from 'lucide-react'");

// Also need updateRecurringActivity from calendar.ts, but we're calling server action. 
// Add it to hooks or use server action directly?
// Since it's a client component, we should import the action if we don't have a hook. 
// Let's import the server actions.
code = code.replace(/import { useCategories, useCreateActivity, useUpdateActivity, useCreateCategory, useDeleteCategory } from '@\/hooks\/useCalendarQueries'/, 
  `import { useCategories, useCreateActivity, useUpdateActivity, useCreateCategory, useDeleteCategory } from '@/hooks/useCalendarQueries'\nimport { updateRecurringActivity } from '@/app/actions/calendar'`);

// 2. Add State variables
const stateInject = `  const [isAlsoAgenda, setIsAlsoAgenda] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [recurrence, setRecurrence] = useState<string>('NONE')
  const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false)
  const [editMode, setEditMode] = useState<'THIS_EVENT' | 'THIS_AND_FOLLOWING' | 'ALL_EVENTS'>('THIS_EVENT')
  const [originalStartTime, setOriginalStartTime] = useState<string | null>(null)
`;
code = code.replace(/  const \[isAlsoAgenda, setIsAlsoAgenda\] = useState\(false\)\n  const fileInputRef = useRef<HTMLInputElement>\(null\)\n  const \[isUploading, setIsUploading\] = useState\(false\)/, stateInject);

// 3. Update useEffect logic for editingEvent
const effectEditTarget = `      setAttachments((editingEvent as any).attachments || [])
      setIsAddingCategory(false); setNewCategoryName('')`;
const effectEditReplace = `      setAttachments((editingEvent as any).attachments || [])
      setIsAddingCategory(false); setNewCategoryName('')
      
      const rrule = (editingEvent as any).recurrence_rule;
      if (rrule) {
        if (rrule.includes('DAILY')) setRecurrence('DAILY')
        else if (rrule.includes('WEEKLY')) setRecurrence('WEEKLY')
        else if (rrule.includes('MONTHLY')) setRecurrence('MONTHLY')
        else if (rrule.includes('YEARLY')) setRecurrence('YEARLY')
        else setRecurrence('NONE')
      } else {
        setRecurrence('NONE')
      }
      setEditMode('THIS_EVENT')
      setOriginalStartTime(format(s, "yyyy-MM-dd'T'HH:mm:ssXXX"))`;

code = code.replace(effectEditTarget, effectEditReplace);

const effectNewTarget = `      setAttachments([]); setIsAddingCategory(false); setNewCategoryName(''); setIsTemplateOpen(false)
      setIsAlsoAgenda(false)`;
const effectNewReplace = `      setAttachments([]); setIsAddingCategory(false); setNewCategoryName(''); setIsTemplateOpen(false)
      setIsAlsoAgenda(false); setRecurrence('NONE'); setEditMode('THIS_EVENT'); setOriginalStartTime(null)`;
code = code.replace(effectNewTarget, effectNewReplace);

// 4. Update handleSubmit
const submitTarget = `    if (editingEvent) {
      updateActivity({ id: editingEvent.id, payload, categoryIds: selectedCategories }, { onSuccess: onSuccessAction })
    } else {
      createActivity({ payload, categoryIds: selectedCategories }, { onSuccess: onSuccessAction })
    }`;

const submitReplace = `    const getRRuleString = (type: string) => {
      switch(type) {
        case 'DAILY': return 'FREQ=DAILY'
        case 'WEEKLY': return 'FREQ=WEEKLY'
        case 'MONTHLY': return 'FREQ=MONTHLY'
        case 'YEARLY': return 'FREQ=YEARLY'
        default: return null
      }
    }
    const finalPayload = { ...payload, recurrence_rule: getRRuleString(recurrence) }

    if (editingEvent) {
      if ((editingEvent as any).recurrence_rule || (editingEvent as any).parent_activity_id) {
        // Use custom action for recurring events
        updateRecurringActivity(editingEvent.id, finalPayload as any, selectedCategories, editMode, originalStartTime!).then(() => onSuccessAction()).catch(e => toast.error(e.message))
      } else {
        updateActivity({ id: editingEvent.id, payload: finalPayload, categoryIds: selectedCategories }, { onSuccess: onSuccessAction })
      }
    } else {
      createActivity({ payload: finalPayload, categoryIds: selectedCategories }, { onSuccess: onSuccessAction })
    }`;
code = code.replace(submitTarget, submitReplace);

// 5. Add UI Dropdown for Recurrence in "날짜/시간 카드"
const recurrenceUI = `
            {/* 반복 옵션 */}
            <div className="flex items-center justify-between pt-3 pb-1" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              <span className={LABEL}><RefreshCcw className="w-4 h-4 mr-1.5 text-muted-foreground" />반복</span>
              <Popover open={isRecurrenceOpen} onOpenChange={setIsRecurrenceOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold bg-muted/60 hover:bg-muted text-foreground rounded-xl transition-colors">
                    {recurrence === 'NONE' ? '반복 안 함' : recurrence === 'DAILY' ? '매일' : recurrence === 'WEEKLY' ? '매주' : recurrence === 'MONTHLY' ? '매월' : '매년'}
                    <span className="text-[10px] opacity-60">▼</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-40 p-1.5 shadow-xl border-border rounded-2xl bg-card z-[110]">
                  {['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map(r => (
                    <button key={r} type="button" onClick={() => { setRecurrence(r); setIsRecurrenceOpen(false) }}
                      className={\`w-full text-left px-3 py-2 text-[13px] font-semibold rounded-xl transition-colors \${recurrence === r ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'hover:bg-muted text-foreground'}\`}>
                      {r === 'NONE' ? '반복 안 함' : r === 'DAILY' ? '매일' : r === 'WEEKLY' ? '매주' : r === 'MONTHLY' ? '매월' : '매년'}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
`;
code = code.replace(/            \{\/\* 소요시간 \*\/\}/, recurrenceUI + '\n            {/* 소요시간 */}');

// 6. Add editMode selector if editing a recurring event
const editModeUI = `
          {editingEvent && ((editingEvent as any).recurrence_rule || (editingEvent as any).parent_activity_id) && (
            <div className={\`\${CARD} px-5 py-4 bg-orange-50/50 border-orange-100/50\`}>
              <span className={\`\${LABEL} block mb-3 text-orange-800\`}><RefreshCcw className="w-4 h-4 mr-1.5 text-orange-600" />반복 일정 수정 옵션</span>
              <div className="flex flex-col gap-2">
                {[
                  { value: 'THIS_EVENT', label: '이 회차만', desc: '선택한 일정만 예외로 수정합니다.' },
                  { value: 'THIS_AND_FOLLOWING', label: '이후 모든 일정', desc: '이 일정을 포함해 앞으로의 일정을 수정합니다.' },
                  { value: 'ALL_EVENTS', label: '모든 일정', desc: '과거와 미래의 모든 일정을 한 번에 수정합니다.' }
                ].map(opt => (
                  <label key={opt.value} className={\`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors \${editMode === opt.value ? 'bg-white border-orange-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-orange-100/50'}\`}>
                    <input type="radio" name="editMode" value={opt.value} checked={editMode === opt.value} onChange={() => setEditMode(opt.value as any)} className="mt-0.5 accent-orange-500" />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-orange-900">{opt.label}</span>
                      <span className="text-[11px] text-orange-700/80 mt-0.5">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
`;
code = code.replace(/          \{\/\* ▸ 제목 카드 \*\/\}/, editModeUI + '\n          {/* ▸ 제목 카드 */}');

fs.writeFileSync('src/components/calendar/AddEventDialog.tsx', code);
console.log("Successfully patched AddEventDialog.tsx");
