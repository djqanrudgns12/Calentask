/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useEffect } from 'react'
import { useUserProfile, useUpdateProfile } from '@/hooks/useCalendarQueries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Loader2 } from 'lucide-react'

const ALL_AVATARS = [
  'avatar_male_1_1779290951731.png', 'avatar_male_2_1779290967498.png', 'avatar_male_3_1779290981042.png',
  'avatar_male_4_1779290995269.png', 'avatar_male_5_1779291014314.png', 'avatar_male_6_1779291041148.png',
  'avatar_male_7_1779291057912.png', 'avatar_male_8_1779291072168.png', 'avatar_male_9_1779291086972.png',
  'avatar_male_10_1779291105075.png',
  'avatar_female_1_1779291118673.png', 'avatar_female_2_1779291133895.png', 'avatar_female_3_1779291145962.png',
  'avatar_female_4_1779291161389.png', 'avatar_female_5_1779291177610.png', 'avatar_female_6_1779291200395.png',
  'avatar_female_7_1779291214849.png', 'avatar_female_8_1779291227630.png', 'avatar_female_9_1779291242436.png',
  'avatar_female_10_1779291258960.png'
]

export function ProfileTab() {
  const { data: profile } = useUserProfile()
  const { mutate: updateProfile, isPending } = useUpdateProfile()
  
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setUsername(profile.username || '')
      setSelectedAvatar(profile.avatar_url || '')
    }
  }, [profile])

  const handleSave = () => {
    updateProfile({
      full_name: fullName,
      username: username,
      avatar_url: selectedAvatar
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 아바타 선택 섹션 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-bold text-slate-800 whitespace-nowrap">아바타 캐릭터</h3>
          <span className="text-sm text-slate-500 font-medium whitespace-nowrap">프리미엄 3D 아바타를 선택하세요</span>
        </div>
        
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
          {ALL_AVATARS.map((avatar) => {
            const isSelected = selectedAvatar === avatar
            return (
              <button
                key={avatar}
                type="button"
                onClick={() => setSelectedAvatar(avatar)}
                className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-200 group ${
                  isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105 shadow-md z-10' : 'hover:scale-105 hover:shadow-sm ring-1 ring-slate-200'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/avatars/${avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                {isSelected && (
                  <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* 기본 정보 섹션 */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">기본 정보</h3>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-slate-600 font-medium">이름</Label>
            <Input 
              id="fullName" 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="bg-white border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username" className="text-slate-600 font-medium">아이디</Label>
            <Input 
              id="username" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              className="bg-white border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>
        </div>
      </section>

      {/* 저장 버튼 */}
      <div className="pt-4 flex justify-end border-t border-slate-100">
        <Button 
          onClick={handleSave}
          disabled={isPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-5 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-105"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              저장 중...
            </>
          ) : '변경사항 저장'}
        </Button>
      </div>
    </div>
  )
}
