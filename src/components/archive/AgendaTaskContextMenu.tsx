import React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { MoreVertical, Edit2, Trash2, CheckCircle2, Archive as ArchiveIcon, Calendar } from 'lucide-react';
import { TaskStatus } from '@/store/useAgendaStore';

interface AgendaTaskContextMenuProps {
  status: TaskStatus;
  onEdit: () => void;
  onChangeStatus: (status: TaskStatus) => void;
  onPermanentDelete?: () => void;
  onAddToCalendar?: () => void;
}

export function AgendaTaskContextMenu({ status, onEdit, onChangeStatus, onPermanentDelete, onAddToCalendar }: AgendaTaskContextMenuProps) {
  return (
    <Popover>
      <PopoverTrigger 
        className="p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreVertical className="w-5 h-5" />
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={() => onEdit()}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          상세 수정하기
        </button>
        
        {status === 'trash' && (
          <button 
            onClick={() => onChangeStatus('inbox')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          >
            <ArchiveIcon className="w-4 h-4" />
            Inbox로 복구
          </button>
        )}

        {onAddToCalendar && status !== 'trash' && (
          <button 
            onClick={() => onAddToCalendar()}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Calendar className="w-4 h-4" />
            캘린더에 등록
          </button>
        )}

        {status !== 'done' && status !== 'trash' && (
          <button 
            onClick={() => onChangeStatus('done')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            완료 처리
          </button>
        )}
        

        {status !== 'trash' && (
          <button 
            onClick={() => onChangeStatus('trash')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            휴지통으로 이동
          </button>
        )}

        {status === 'trash' && onPermanentDelete && (
          <button 
            onClick={() => {
              if(confirm('정말 이 항목을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                onPermanentDelete();
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            영구 삭제
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
