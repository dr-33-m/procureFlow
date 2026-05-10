import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getProfileOptions } from '@/lib/query-manager/profile/options'
import { profileKeys } from '@/lib/query-manager/profile/keys'
import {
  updateUserName,
  verifyPassword,
  updateProtectedProfile,
  sendEmailVerificationCode,
  verifyEmailCode,
  updatePrimaryEmail,
} from '@/server/profile'

export { profileKeys }

export function useProfile() {
  return useQuery(getProfileOptions())
}

export function useUpdateUserName() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => updateUserName({ data: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.logto() })
      router.invalidate()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update name.')
    },
  })
}

export function useVerifyPassword() {
  return useMutation({
    mutationFn: (password: string) => verifyPassword({ data: { password } }),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Verification failed.')
    },
  })
}

export function useUpdateProtectedProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: Parameters<typeof updateProtectedProfile>[0]['data']) =>
      updateProtectedProfile({ data: args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.logto() })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile.')
    },
  })
}

export function useSendEmailVerificationCode() {
  return useMutation({
    mutationFn: (email: string) => sendEmailVerificationCode({ data: { email } }),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to send verification code.')
    },
  })
}

export function useVerifyEmailCode() {
  return useMutation({
    mutationFn: (args: { email: string; code: string; verificationRecordId: string }) =>
      verifyEmailCode({ data: args }),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Invalid code.')
    },
  })
}

export function useUpdatePrimaryEmail() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: Parameters<typeof updatePrimaryEmail>[0]['data']) =>
      updatePrimaryEmail({ data: args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.logto() })
      router.invalidate()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update email.')
    },
  })
}
