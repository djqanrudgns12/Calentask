import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSecurityPinStatus, setupSecurityPin, verifySecurityPin, verifySecurityAnswer } from '@/app/actions/security'

import { createClient } from '@/lib/supabase/client'

export function useSecurityPinStatus() {
  return useQuery({
    queryKey: ['securityPinStatus'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        throw new Error('Not authenticated')
      }

      const { data, error } = await supabase
        .from('user_security_pin')
        .select('enabled, security_question')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error('Failed to get status')
      }

      return {
        isSetup: !!data?.enabled,
        question: data?.security_question || null
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

export function useSetupSecurityPin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ pin, question, answer }: { pin: string, question: string, answer: string }) => {
      return setupSecurityPin(pin, question, answer)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['securityPinStatus'] })
    }
  })
}

export function useVerifyPin() {
  return useMutation({
    mutationFn: async (pin: string) => {
      return verifySecurityPin(pin)
    }
  })
}

export function useVerifySecurityAnswer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (answer: string) => {
      return verifySecurityAnswer(answer)
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['securityPinStatus'] })
      }
    }
  })
}

// --- 세션 관련 훅 ---
import { getUserSessions, deleteUserSession, signOutOtherDevices } from '@/app/actions/sessions'

export function useUserSessions() {
  return useQuery({
    queryKey: ['userSessions'],
    queryFn: () => getUserSessions(),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => deleteUserSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSessions'] })
    }
  })
}

export function useSignOutOtherDevices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => signOutOtherDevices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSessions'] })
    }
  })
}
