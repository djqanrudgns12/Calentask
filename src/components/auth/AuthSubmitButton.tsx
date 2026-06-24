'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AuthSubmitButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus()

  return (
    <Button 
      type="submit" 
      disabled={pending}
      className="w-full rounded-full bg-blue-600 py-6 text-[15px] font-semibold text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      {pending ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  )
}
