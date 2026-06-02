'use client'

import { useState } from 'react';
import { Clock, Plus, Cloud, Sun, CloudRain, Smile, Meh, Frown, Coffee, Zap, Moon, BookHeart, PenTool } from 'lucide-react';
import { useArchiveStore } from '@/store/useArchiveStore';

const MOODS = [
  { id: 'great', icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'good', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { id: 'neutral', icon: Meh, color: 'text-slate-500', bg: 'bg-slate-50' },
  { id: 'tired', icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'bad', icon: Frown, color: 'text-red-500', bg: 'bg-red-50' }
];

const WEATHER = [
  { id: 'sunny', icon: Sun, label: '맑음' },
  { id: 'cloudy', icon: Cloud, label: '흐림' },
  { id: 'rainy', icon: CloudRain, label: '비' },
  { id: 'night', icon: Moon, label: '밤' }
];

export function JournalBoard() {
  const { activeTabId, items: storeItems, addItem, deleteItem } = useArchiveStore();
  const items = activeTabId ? (storeItems[activeTabId] || []) : [];
  
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
    <div className="w-full h-full bg-[#fafafa] flex flex-col relative">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col relative h-full">
        {/* Header */}
        <div className="px-8 py-10 bg-gradient-to-b from-white to-[#fafafa] sticky top-0 z-10 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                <BookHeart className="w-8 h-8 text-indigo-500" />
                저널 다이어리
              </h2>
              <p className="text-slate-500 mt-2 font-medium">당신의 생각과 일상을 시간순으로 기록합니다.</p>
            </div>
            
            {!isComposing && (
              <button 
                onClick={() => setIsComposing(true)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-full shadow-sm hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
              >
                <PenTool className="w-4 h-4" /> 기록 시작
              </button>
            )}
          </div>
        </div>

        {/* Composer */}
        {isComposing && (
          <div className="px-8 mb-10 shrink-0">
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-indigo-100 ring-4 ring-indigo-50 flex flex-col gap-4">
              <textarea
                autoFocus
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="지금 무슨 생각을 하고 계신가요?"
                className="w-full h-40 bg-transparent border-none focus:outline-none focus:ring-0 text-lg text-slate-700 resize-none font-medium placeholder:text-slate-300"
              />
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-6">
                  {/* Mood Selector */}
                  <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-full border border-slate-100">
                    {MOODS.map(m => {
                      const Icon = m.icon;
                      const isSelected = selectedMood === m.id;
                      return (
                        <button 
                          key={m.id}
                          onClick={() => setSelectedMood(m.id)}
                          className={`p-2 rounded-full transition-all ${isSelected ? m.bg : 'hover:bg-slate-200'}`}
                        >
                          <Icon className={`w-5 h-5 ${isSelected ? m.color : 'text-slate-400'}`} />
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="w-px h-6 bg-slate-200" />
                  
                  {/* Weather Selector */}
                  <div className="flex items-center gap-1">
                    {WEATHER.map(w => {
                      const Icon = w.icon;
                      const isSelected = selectedWeather === w.id;
                      return (
                        <button 
                          key={w.id}
                          onClick={() => setSelectedWeather(w.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${isSelected ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'text-slate-400 hover:bg-slate-100 border border-transparent'}`}
                        >
                          <Icon className="w-4 h-4" /> {w.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsComposing(false)}
                    className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    취소
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={!content.trim()}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    기록 저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-8 pb-32 hide-scrollbar">
          {sortedItems.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
              <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-3xl flex items-center justify-center mb-6">
                <Clock className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">첫 번째 기록을 남겨보세요</h3>
              <p className="text-slate-500">당신의 모든 순간은 훌륭한 아이디어가 될 수 있습니다.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-indigo-100 ml-6 pl-10 flex flex-col gap-10">
              {sortedItems.map((item, index) => {
                const moodObj = MOODS.find(m => m.id === item.data?.mood) || MOODS[2];
                const weatherObj = WEATHER.find(w => w.id === item.data?.weather) || WEATHER[0];
                const MoodIcon = moodObj.icon;
                const WeatherIcon = weatherObj.icon;

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[51px] top-4 w-5 h-5 rounded-full border-4 border-white ${moodObj.bg} flex items-center justify-center shadow-sm`}>
                       <div className={`w-2 h-2 rounded-full ${moodObj.color.replace('text-', 'bg-')}`} />
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group-hover:shadow-lg transition-all flex gap-6 relative">
                      {/* Date & Metadata */}
                      <div className="w-32 shrink-0 flex flex-col items-start gap-3 border-r border-slate-100 pr-6">
                        <div>
                          <div className="font-extrabold text-slate-800 text-sm">{item.title.split(' ')[0]} {item.title.split(' ')[1]}</div>
                          <div className="font-bold text-indigo-500 text-lg">{item.title.split(' ')[2]}</div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                          <Clock className="w-3 h-3" /> {item.data?.timestamp}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`p-1.5 rounded-full ${moodObj.bg}`}>
                            <MoodIcon className={`w-4 h-4 ${moodObj.color}`} />
                          </div>
                          <div className="p-1.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                            <WeatherIcon className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{item.content}</p>
                      </div>

                      {/* Delete Button */}
                      <button 
                        onClick={() => deleteItem(activeTabId!, item.id)}
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
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
