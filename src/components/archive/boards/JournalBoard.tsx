'use client'

import { useState } from 'react';
import { Clock, Plus, Cloud, Sun, CloudRain, Smile, Meh, Frown, Coffee, Zap, Moon, BookHeart, PenTool } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';

const MOODS = [
  { id: 'great', icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'good', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { id: 'neutral', icon: Meh, color: 'text-muted-foreground', bg: 'bg-muted' },
  { id: 'tired', icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'bad', icon: Frown, color: 'text-red-500', bg: 'bg-red-50' }
];

const WEATHER = [
  { id: 'sunny', icon: Sun, label: '맑음' },
  { id: 'cloudy', icon: Cloud, label: '흐림' },
  { id: 'rainy', icon: CloudRain, label: '비' },
  { id: 'night', icon: Moon, label: '밤' }
];

const EMPTY_ARRAY: any[] = [];

export function JournalBoard() {
  const { activeTabId, items: storeItems, addItem, deleteItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || EMPTY_ARRAY) : EMPTY_ARRAY;
  
  // Create Form State
  const [isComposing, setIsComposing] = useState(false);
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState('good');
  const [selectedWeather, setSelectedWeather] = useState('sunny');

  // Sort by newest first
  const sortedItems = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSave = () => {
    if (!activeTabId || !content.trim()) return;
    
    addItem(activeTabId, {
      title: new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }),
      content: content.trim(),
      data: {
        mood: selectedMood,
        weather: selectedWeather,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      }
    });
    
    setContent('');
    setIsComposing(false);
  };

  return (
    <div className="w-full h-full bg-background flex flex-col relative">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col relative h-full">
        {/* Header */}
        <div className="px-4 md:px-8 py-6 md:py-10 bg-gradient-to-b from-white to-[#fafafa] sticky top-0 z-10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-xl md:text-3xl font-extrabold text-foreground flex items-center gap-2 md:gap-3 truncate w-full">
                <BookHeart className="w-6 h-6 md:w-8 md:h-8 text-indigo-500 shrink-0" />
                저널 다이어리
              </h2>
              <p className="text-muted-foreground mt-1 md:mt-2 font-medium text-xs md:text-base truncate">당신의 생각과 일상을 시간순으로 기록합니다.</p>
            </div>
            
            {!isComposing && (
              <button 
                onClick={() => setIsComposing(true)}
                className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 text-white font-bold rounded-full shadow-sm hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 whitespace-nowrap text-sm md:text-base shrink-0"
              >
                <PenTool className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden md:inline">기록 시작</span><span className="md:hidden">기록</span>
              </button>
            )}
          </div>
        </div>

        {/* Composer */}
        {isComposing && (
          <div className="px-4 md:px-8 mb-6 md:mb-10 shrink-0">
            <div className="bg-card p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg border border-indigo-100 ring-4 ring-indigo-50 flex flex-col gap-3 md:gap-4">
              <textarea
                autoFocus
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="지금 무슨 생각을 하고 계신가요?"
                className="w-full h-32 md:h-40 bg-transparent border-none focus:outline-none focus:ring-0 text-base md:text-lg text-foreground resize-none font-medium placeholder:text-muted-foreground/50 p-0"
              />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between pt-3 md:pt-4 border-t border-border gap-4 md:gap-0">
                <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto overflow-x-auto hide-scrollbar pb-1 md:pb-0">
                  {/* Mood Selector */}
                  <div className="flex items-center gap-1 bg-muted p-1 md:p-1.5 rounded-full border border-border shrink-0">
                    {MOODS.map(m => {
                      const Icon = m.icon;
                      const isSelected = selectedMood === m.id;
                      return (
                        <button 
                          key={m.id}
                          onClick={() => setSelectedMood(m.id)}
                          className={`p-1.5 md:p-2 rounded-full transition-all ${isSelected ? m.bg : 'hover:bg-slate-200'}`}
                        >
                          <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isSelected ? m.color : 'text-muted-foreground'}`} />
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="hidden md:block w-px h-6 bg-slate-200 shrink-0" />
                  
                  {/* Weather Selector */}
                  <div className="flex items-center gap-1 shrink-0">
                    {WEATHER.map(w => {
                      const Icon = w.icon;
                      const isSelected = selectedWeather === w.id;
                      return (
                        <button 
                          key={w.id}
                          onClick={() => setSelectedWeather(w.id)}
                          className={`flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap ${isSelected ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'text-muted-foreground hover:bg-muted border border-transparent'}`}
                        >
                          <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" /> {w.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button 
                    onClick={() => setIsComposing(false)}
                    className="px-4 py-2 md:px-5 md:py-2.5 text-muted-foreground font-bold text-sm md:text-base hover:bg-muted rounded-xl transition-colors whitespace-nowrap"
                  >
                    취소
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={!content.trim()}
                    className="px-5 py-2 md:px-6 md:py-2.5 bg-indigo-600 text-white font-bold text-sm md:text-base rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm whitespace-nowrap"
                  >
                    기록 저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-28 hide-scrollbar">
          {sortedItems.length === 0 ? (
            <div className="text-center py-16 md:py-20 flex flex-col items-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-card shadow-sm border border-border rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6">
                <Clock className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 truncate px-4 w-full">첫 번째 기록을 남겨보세요</h3>
              <p className="text-muted-foreground text-sm md:text-base px-4">당신의 모든 순간은 훌륭한 아이디어가 될 수 있습니다.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-indigo-100 ml-4 md:ml-6 pl-6 md:pl-10 flex flex-col gap-6 md:gap-10">
              {sortedItems.map((item, index) => {
                const moodObj = MOODS.find(m => m.id === item.data?.mood) || MOODS[2];
                const weatherObj = WEATHER.find(w => w.id === item.data?.weather) || WEATHER[0];
                const MoodIcon = moodObj.icon;
                const WeatherIcon = weatherObj.icon;

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[35px] md:-left-[51px] top-4 w-5 h-5 rounded-full border-4 border-transparent ${moodObj.bg} flex items-center justify-center shadow-sm`}>
                       <div className={`w-2 h-2 rounded-full ${moodObj.color.replace('text-', 'bg-')}`} />
                    </div>

                    <div className="bg-card p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-border group-hover:shadow-lg transition-all flex flex-col md:flex-row gap-4 md:gap-6 relative">
                      {/* Date & Metadata */}
                      <div className="md:w-32 shrink-0 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start md:border-r border-b md:border-b-0 border-border md:pr-6 pb-3 md:pb-0">
                        <div className="flex md:flex-col items-center md:items-start gap-2 md:gap-0">
                          <div className="font-extrabold text-foreground text-xs md:text-sm">{item.title.split(' ')[0]} {item.title.split(' ')[1]}</div>
                          <div className="font-bold text-indigo-500 text-sm md:text-lg">{item.title.split(' ')[2]}</div>
                        </div>
                        <div className="flex items-center gap-3 md:gap-0 md:flex-col md:items-start">
                          <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-muted-foreground md:mt-3">
                            <Clock className="w-3 h-3" /> {item.data?.timestamp}
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2 md:mt-2">
                            <div className={`p-1.5 rounded-full ${moodObj.bg}`}>
                              <MoodIcon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${moodObj.color}`} />
                            </div>
                            <div className="p-1.5 rounded-full bg-muted text-muted-foreground border border-border">
                              <WeatherIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <p className="text-foreground font-medium text-sm md:text-base leading-relaxed whitespace-pre-wrap">{item.content}</p>
                      </div>

                      {/* Delete Button */}
                      <button 
                        onClick={() => deleteItem(activeTabId!, item.id)}
                        className="absolute top-2 right-2 md:top-4 md:right-4 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 p-1.5 md:p-2 rounded-lg md:opacity-0 group-hover:opacity-100 transition-all text-xs md:text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
