'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useArchiveStore } from '@/store/useArchiveStore';
import { useSecurityPinStatus, useSetupSecurityPin, useVerifyPin, useVerifySecurityAnswer } from '@/hooks/useSecurityQueries';
import { useAutoLock } from '@/hooks/useAutoLock';
import { Lock, Delete, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const PRESET_QUESTIONS = [
  "졸업한 초등학교 이름은?",
  "어릴 적 살던 동네 이름은?",
  "가장 감명깊게 본 영화는?",
  "기억에 남는 추억의 장소는?",
  "CUSTOM"
];

// Simple hash function for client side before sending to server
async function hashText(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function PinPadOverlay({ children }: { children: React.ReactNode }) {
  const { isPinLocked, setPinLocked } = useArchiveStore();
  const { data: status, isLoading: isStatusLoading } = useSecurityPinStatus();
  
  const setupMutation = useSetupSecurityPin();
  const verifyPinMutation = useVerifyPin();
  const verifyAnswerMutation = useVerifySecurityAnswer();

  // 30분 방치 자동 잠금: PIN이 설정된 사용자만 활성화
  const isAutoLockEnabled = !isStatusLoading && !!status?.isSetup;
  useAutoLock(isAutoLockEnabled);

  type Mode = 'loading' | 'setup_pin' | 'setup_confirm' | 'setup_security' | 'locked' | 'reset';
  const [mode, setMode] = useState<Mode>('loading');
  
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  
  const [questionType, setQuestionType] = useState<string>('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 초기 접속 잠금 + 모드 초기화
  useEffect(() => {
    if (isStatusLoading) return;
    
    // ✅ 초기 접속 잠금: PIN이 설정되어 있으면 무조건 잠금
    if (status?.isSetup && !isPinLocked) {
      setPinLocked(true);
    }

    // 모드 결정
    if (isPinLocked) {
      if (status?.isSetup) {
        setMode('locked');
      } else {
        setMode('setup_pin');
      }
    }
  }, [isStatusLoading, status, isPinLocked, setPinLocked]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => setLockoutTime(l => l - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutTime]);

  const triggerError = () => {
    setError(true);
    setTimeout(() => {
      setPin('');
      setError(false);
    }, 500);
  }

  const handleVerifyPin = async (inputPin: string) => {
    if (lockoutTime > 0) return;
    setIsProcessing(true);
    
    const hashedPin = await hashText(inputPin);
    const result = await verifyPinMutation.mutateAsync(hashedPin);
    
    if (result.success) {
      setPinLocked(false);
      setPin('');
      setAttempts(0);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        setLockoutTime(30); // 30 seconds lockout
        setAttempts(0);
      }
      triggerError();
    }
    setIsProcessing(false);
  };

  const handleKeyPress = (num: string) => {
    // Add haptic feedback for mobile devices
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(30);
    }
    
    if (pin.length < 4 && lockoutTime === 0 && !isProcessing) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        if (mode === 'locked') {
          handleVerifyPin(newPin);
        } else if (mode === 'setup_pin') {
          setTimeout(() => {
            setFirstPin(newPin);
            setPin('');
            setMode('setup_confirm');
          }, 300);
        } else if (mode === 'setup_confirm') {
          setTimeout(() => {
            if (newPin === firstPin) {
              setPin('');
              setMode('setup_security');
            } else {
              triggerError();
              setTimeout(() => {
                setFirstPin('');
                setMode('setup_pin');
              }, 800);
            }
          }, 300);
        }
      }
    }
  };

  const handleDelete = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(20);
    }
    if (!isProcessing) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  // Add global keyboard support for desktop responsiveness
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we're in a PIN input mode and not focused on an input field (like during setup_security)
      if (['locked', 'setup_pin', 'setup_confirm'].includes(mode) && document.activeElement?.tagName !== 'INPUT') {
        if (/^[0-9]$/.test(e.key)) {
          handleKeyPress(e.key);
        } else if (e.key === 'Backspace') {
          handleDelete();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, mode, lockoutTime, isProcessing, firstPin]);

  const handleSetupSecurity = async () => {
    if (!answer.trim()) return;
    const finalQuestion = questionType === 'CUSTOM' ? customQuestion : questionType;
    if (!finalQuestion.trim()) return;

    setIsProcessing(true);
    
    try {
      const hashedPin = await hashText(firstPin);
      const hashedAnswer = await hashText(answer.trim());
      
      const result = await setupMutation.mutateAsync({
        pin: hashedPin,
        question: finalQuestion,
        answer: hashedAnswer
      });
      
      if (result.success) {
        setPinLocked(false);
        setMode('locked');
        toast.success('보안 질문 및 비밀번호가 성공적으로 설정되었습니다.');
      } else {
        toast.error(result.error || '보안 설정에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err: any) {
      console.error('handleSetupSecurity error:', err);
      toast.error('보안 설정 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetVerify = async () => {
    if (!answer.trim()) return;
    setIsProcessing(true);
    
    try {
      const hashedAnswer = await hashText(answer.trim());
      const result = await verifyAnswerMutation.mutateAsync(hashedAnswer);
      
      if (result.success) {
        setFirstPin('');
        setPin('');
        setAnswer('');
        setQuestionType('');
        setMode('setup_pin');
        toast.success('인증 성공! 새 비밀번호를 설정해주세요.');
      } else {
        toast.error('답변이 일치하지 않습니다.');
      }
    } catch (err: any) {
      console.error('handleResetVerify error:', err);
      toast.error('인증 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  }

  let title = "아카이브 잠김";
  let subtitle = "비밀번호를 입력하세요";
  if (mode === 'loading') {
    title = "보안 확인 중";
    subtitle = "잠시만 기다려주세요...";
  } else if (mode === 'setup_pin') {
    title = "비밀번호 설정";
    subtitle = "새로운 4자리 PIN을 입력하세요";
  } else if (mode === 'setup_confirm') {
    title = "비밀번호 확인";
    subtitle = "PIN을 한 번 더 입력하세요";
  } else if (mode === 'setup_security') {
    title = "보안 질문 설정";
    subtitle = "비밀번호 분실을 대비해 보안 질문을 설정합니다.";
  } else if (mode === 'reset') {
    title = "비밀번호 재설정";
    subtitle = "등록된 보안 질문의 답변을 입력하세요";
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Underlying Content */}
      <div className={cn("w-full h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]", isPinLocked ? "blur-xl pointer-events-none select-none scale-[0.98] opacity-50" : "blur-0 scale-100 opacity-100")}>
        {children}
      </div>

      {/* Pin Pad Overlay */}
      <AnimatePresence>
        {isPinLocked && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-white/40"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white/80 p-8 rounded-3xl shadow-2xl backdrop-blur-3xl border border-white flex flex-col items-center w-[360px]"
            >
              <div className="w-14 h-14 bg-gradient-to-tr from-slate-800 to-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-slate-900/20">
                {mode === 'loading' ? <Loader2 className="w-7 h-7 animate-spin" /> : mode.startsWith('setup') ? <ShieldAlert className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
              <p className="text-sm text-slate-500 mb-8 font-medium text-center px-4">
                {lockoutTime > 0 
                  ? <span className="text-rose-500 font-bold">{lockoutTime}초 후 다시 시도하세요</span>
                  : subtitle}
              </p>

              {(mode === 'locked' || mode === 'setup_pin' || mode === 'setup_confirm') && (
                <>
                  {/* PIN Dots */}
                  <motion.div 
                    animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="flex items-center space-x-4 mb-8"
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <div 
                        key={i}
                        className={cn(
                          "w-3.5 h-3.5 rounded-full transition-all duration-300",
                          pin.length > i ? "bg-slate-900 scale-125 shadow-sm" : "bg-slate-200"
                        )}
                      />
                    ))}
                  </motion.div>

                  {/* Numpad */}
                  <div className="grid grid-cols-3 gap-3 w-full">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleKeyPress(num.toString())}
                        disabled={isProcessing}
                        className="h-[60px] md:h-[68px] rounded-2xl bg-white/60 hover:bg-white active:bg-slate-100 active:scale-95 text-slate-800 text-2xl font-medium transition-all shadow-sm hover:shadow-md border border-slate-100 disabled:opacity-50 touch-manipulation"
                      >
                        {num}
                      </button>
                    ))}
                    <div /> {/* Empty slot */}
                    <button
                      onClick={() => handleKeyPress('0')}
                      disabled={isProcessing}
                      className="h-[60px] md:h-[68px] rounded-2xl bg-white/60 hover:bg-white active:bg-slate-100 active:scale-95 text-slate-800 text-2xl font-medium transition-all shadow-sm hover:shadow-md border border-slate-100 disabled:opacity-50 touch-manipulation"
                    >
                      0
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isProcessing}
                      className="h-[60px] md:h-[68px] rounded-2xl flex items-center justify-center bg-white/60 hover:bg-white active:bg-slate-100 active:scale-95 text-slate-500 hover:text-rose-500 transition-all shadow-sm hover:shadow-md border border-slate-100 disabled:opacity-50 touch-manipulation"
                    >
                      <Delete className="w-6 h-6" />
                    </button>
                  </div>
                  
                  {mode === 'locked' && (
                    <button 
                      onClick={() => {
                        setAnswer('');
                        setMode('reset');
                      }}
                      className="mt-6 text-sm text-slate-400 hover:text-indigo-600 font-medium transition-colors"
                    >
                      비밀번호를 잊으셨나요? (재설정)
                    </button>
                  )}
                </>
              )}

              {mode === 'setup_security' && (
                <div className="w-full space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600">질문 선택</Label>
                    <select
                      value={questionType}
                      onChange={(e) => setQuestionType(e.target.value)}
                      className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="" disabled>보안 질문을 선택하세요</option>
                      {PRESET_QUESTIONS.map(q => (
                        <option key={q} value={q}>
                          {q === 'CUSTOM' ? '직접 입력...' : q}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {questionType === 'CUSTOM' && (
                    <div className="space-y-2">
                      <Label className="text-slate-600">질문 직접 입력</Label>
                      <Input 
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder="자신만의 질문을 입력하세요"
                        className="bg-white rounded-xl border-slate-200"
                      />
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <Label className="text-slate-600">답변 입력</Label>
                    <Input 
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="답변을 입력하세요"
                      className="bg-white rounded-xl border-slate-200"
                    />
                  </div>

                  <Button 
                    onClick={handleSetupSecurity} 
                    disabled={isProcessing || !questionType || (questionType === 'CUSTOM' && !customQuestion.trim()) || !answer.trim()}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-6 mt-4 font-bold shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.02]"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    설정 완료
                  </Button>
                </div>
              )}

              {mode === 'reset' && (
                <div className="w-full space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                    <p className="text-sm font-semibold text-slate-700 text-center">
                      Q. {status?.question || "보안 질문이 설정되지 않았습니다."}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-slate-600">답변 입력</Label>
                    <Input 
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="설정했던 답변을 입력하세요"
                      className="bg-white rounded-xl border-slate-200 text-center font-bold tracking-wider py-5"
                      onKeyDown={(e) => e.key === 'Enter' && handleResetVerify()}
                    />
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="ghost"
                      onClick={() => setMode('locked')}
                      className="flex-1 text-slate-500 hover:bg-slate-100 rounded-xl"
                    >
                      취소
                    </Button>
                    <Button 
                      onClick={handleResetVerify} 
                      disabled={isProcessing || !answer.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                      확인
                    </Button>
                  </div>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
