'use client'

import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction'; // for selectable, drag & drop
import { useArchiveStore } from '@/store/useArchiveStore';
import { Calendar as CalendarIcon, Clock, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const EMPTY_ARRAY: any[] = [];

export function CalendarBoard() {
  const { activeTabId, items: storeItems, updateItem, addItem, deleteItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || EMPTY_ARRAY) : EMPTY_ARRAY;

  // Transform store items into FullCalendar Event Objects
  const events = items.map(item => ({
    id: item.id,
    title: item.title || '새 일정',
    start: item.data?.start || item.createdAt,
    end: item.data?.end || undefined,
    allDay: item.data?.allDay !== false,
    extendedProps: {
      content: item.content,
      tags: item.tags,
      status: item.status
    },
    backgroundColor: item.status === 'done' ? '#10b981' : item.status === 'in-progress' ? '#f59e0b' : '#4f46e5',
    borderColor: 'transparent',
  }));

  const handleEventDrop = (info: any) => {
    if (!activeTabId) return;
    updateItem(activeTabId, info.event.id, {
      data: {
        ...items.find(i => i.id === info.event.id)?.data,
        start: info.event.startStr,
        end: info.event.endStr || undefined,
        allDay: info.event.allDay
      }
    });
  };

  const handleEventResize = (info: any) => {
    if (!activeTabId) return;
    updateItem(activeTabId, info.event.id, {
      data: {
        ...items.find(i => i.id === info.event.id)?.data,
        start: info.event.startStr,
        end: info.event.endStr || undefined,
        allDay: info.event.allDay
      }
    });
  };

  const handleDateSelect = (selectInfo: any) => {
    if (!activeTabId) return;
    const title = prompt('새 일정의 제목을 입력하세요:');
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // clear date selection

    if (title) {
      addItem(activeTabId, {
        title,
        status: 'todo',
        data: {
          start: selectInfo.startStr,
          end: selectInfo.endStr,
          allDay: selectInfo.allDay
        }
      });
    }
  };

  const handleEventClick = (clickInfo: any) => {
    if (confirm(`'${clickInfo.event.title}' 일정을 삭제하시겠습니까?`)) {
      if (activeTabId) {
        deleteItem(activeTabId, clickInfo.event.id);
      }
    }
  };

  return (
    <div className="w-full h-full bg-white rounded-3xl p-6 shadow-sm border border-slate-200 overflow-y-auto hide-scrollbar flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
            <CalendarIcon className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">일정 캘린더</h2>
            <p className="text-sm font-medium text-slate-500">시간을 마우스로 드래그하여 타임블로킹을 완성하세요.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[600px] fc-theme-custom">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView="timeGridWeek"
          editable={true} // enable drag & drop
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="100%"
          slotMinTime="06:00:00" // Start day at 6 AM
          slotMaxTime="24:00:00" // End at midnight
          allDayText="종일"
          buttonText={{
            today: '오늘',
            month: '월간',
            week: '주간',
            day: '일간',
            list: '목록'
          }}
          locale="ko"
        />
      </div>

      <style jsx global>{`
        /* Custom Styling for FullCalendar to match our Life OS aesthetic */
        .fc-theme-custom .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 800 !important;
          color: #1e293b !important;
        }
        .fc-theme-custom .fc-button-primary {
          background-color: #f1f5f9 !important;
          border-color: #e2e8f0 !important;
          color: #475569 !important;
          font-weight: 700 !important;
          border-radius: 0.5rem !important;
          text-transform: capitalize !important;
          transition: all 0.2s;
        }
        .fc-theme-custom .fc-button-primary:hover {
          background-color: #e2e8f0 !important;
          color: #0f172a !important;
        }
        .fc-theme-custom .fc-button-active {
          background-color: #4f46e5 !important;
          border-color: #4f46e5 !important;
          color: white !important;
        }
        .fc-theme-custom .fc-event {
          border-radius: 6px !important;
          padding: 2px 4px !important;
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          cursor: grab !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .fc-theme-custom .fc-event:active {
          cursor: grabbing !important;
        }
        .fc-theme-custom .fc-col-header-cell-cushion {
          color: #64748b;
          font-weight: 700;
          padding: 8px 0;
        }
        .fc-theme-custom .fc-scrollgrid {
          border-radius: 12px;
          overflow: hidden;
          border-color: #f1f5f9 !important;
        }
        .fc-theme-custom th, .fc-theme-custom td {
          border-color: #f1f5f9 !important;
        }
        .fc-theme-custom .fc-timegrid-slot {
          height: 3em !important; /* Makes time blocks taller */
        }
      `}</style>
    </div>
  );
}
