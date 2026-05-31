import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSecurityPinStatus, setupSecurityPin, verifySecurityPin, verifySecurityAnswer } from '@/app/actions/security'

export function useSecurityPinStatus() {
  return useQuery({
    queryKey: ['securityPinStatus'],
    queryFn: getSecurityPinStatus
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
