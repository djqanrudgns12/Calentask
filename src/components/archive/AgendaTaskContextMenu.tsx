import React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { MoreVertical, Edit2, Trash2, CheckCircle2, Archive as ArchiveIcon } from 'lucide-react';
import { TaskStatus } from '@/store/useAgendaStore';

interface AgendaTaskContextMenuProps {
  status: TaskStatus;
  onEdit: () => void;
  onChangeStatus: (status: TaskStatus) => void;
}

export function AgendaTaskContextMenu({ status, onEdit, onChangeStatus }: AgendaTaskContextMenuProps) {
  return (
    <Popover>
      <PopoverTrigger 
        className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreVertical className="w-5 h-5" />
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={() => onEdit()}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          상세 수정하기
        </button>
        
        {status !== 'done' && (
          <button 
            onClick={() => onChangeStatus('done')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            완료 처리
          </button>
        )}
        
        {status !== 'archive' && (
          <button 
            onClick={() => onChangeStatus('archive')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          >
            <ArchiveIcon className="w-4 h-4" />
            보관함으로 이동
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
      </PopoverContent>
    </Popover>
  );
}
