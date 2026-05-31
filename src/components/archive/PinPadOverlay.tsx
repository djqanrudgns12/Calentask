'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useArchiveStore } from '@/store/useArchiveStore';
import { Lock, Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PinPadOverlay({ children }: { children: React.ReactNode }) {
  const { isPinLocked, setPinLocked } = useArchiveStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => setLockoutTime(l => l - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutTime]);

  // In a real app, this would verify against Supabase hashed PIN
  const verifyPin = async (inputPin: string) => {
    if (lockoutTime > 0) return;

    if (inputPin === '1234') {
      setPinLocked(false);
      setPin('');
      setAttempts(0);
    } else {
      setError(true);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        setLockoutTime(30); // 30 seconds lockout
        setAttempts(0);
      }
      
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 500);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4 && lockoutTime === 0) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

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
              className="bg-white/80 p-8 rounded-3xl shadow-2xl backdrop-blur-3xl border border-white flex flex-col items-center w-[320px]"
            >
              <div className="w-14 h-14 bg-gradient-to-tr from-slate-800 to-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-slate-900/20">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Archive Locked</h2>
              <p className="text-sm text-slate-500 mb-8 font-medium">
                {lockoutTime > 0 
                  ? <span className="text-rose-500 font-bold">{lockoutTime}초 후 다시 시도하세요</span>
                  : "비밀번호(1234)를 입력하세요"}
              </p>

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
                    className="h-[60px] rounded-2xl bg-white/60 hover:bg-white text-slate-800 text-2xl font-medium transition-all shadow-sm hover:shadow-md border border-slate-100"
                  >
                    {num}
                  </button>
                ))}
                <div /> {/* Empty slot */}
                <button
                  onClick={() => handleKeyPress('0')}
                  className="h-[60px] rounded-2xl bg-white/60 hover:bg-white text-slate-800 text-2xl font-medium transition-all shadow-sm hover:shadow-md border border-slate-100"
                >
                  0
                </button>
                <button
                  onClick={handleDelete}
                  className="h-[60px] rounded-2xl flex items-center justify-center bg-white/60 hover:bg-white text-slate-500 hover:text-rose-500 transition-all shadow-sm hover:shadow-md border border-slate-100"
                >
                  <Delete className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
