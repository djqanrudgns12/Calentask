/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

// 유틸리티: 아이디 마스킹 (예: calen -> ca**n)
function maskUsername(username: string) {
  if (!username) return ''
  if (username.length <= 3) {
    return username.charAt(0) + '*'.repeat(username.length - 1)
  }
  const prefix = username.substring(0, 2)
  const suffix = username.substring(username.length - 1)
  return prefix + '*'.repeat(username.length - 3) + suffix
}

export async function findUsername(prevState: any, formData: FormData) {
  const fullName = formData.get('fullName') as string
  const recoveryEmail = formData.get('recoveryEmail') as string

  if (!fullName || !recoveryEmail) {
    return { error: '이름과 복구 이메일을 모두 입력해주세요.', success: false }
  }

  try {
    const supabaseAdmin = createAdminClient()

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('full_name', fullName)
      .eq('recovery_email', recoveryEmail)

    if (error || !users || users.length === 0) {
      return { error: '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.', success: false }
    }

    // 마스킹 처리된 아이디 반환 (여러 개일 수 있으나 첫 번째 계정 반환)
    const maskedId = maskUsername(users[0].username)
    return { success: true, username: maskedId }
  } catch {
    return { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', success: false }
  }
}

const passwordSchema = z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다.')

export async function resetUserPassword(prevState: any, formData: FormData) {
  const username = formData.get('username') as string
  const fullName = formData.get('fullName') as string
  const recoveryEmail = formData.get('recoveryEmail') as string
  const newPassword = formData.get('newPassword') as string
  const newPasswordConfirm = formData.get('newPasswordConfirm') as string

  if (!username || !fullName || !recoveryEmail || !newPassword || !newPasswordConfirm) {
    return { error: '모든 항목을 입력해주세요.', success: false }
  }

  if (newPassword !== newPasswordConfirm) {
    return { error: '비밀번호가 서로 일치하지 않습니다.', success: false }
  }

  const parsedPassword = passwordSchema.safeParse(newPassword)
  if (!parsedPassword.success) {
    return { error: '비밀번호는 최소 8자 이상이어야 합니다.', success: false }
  }

  try {
    const supabaseAdmin = createAdminClient()

    // 1. 유저 정보 일치 확인
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .eq('full_name', fullName)
      .eq('recovery_email', recoveryEmail)

    if (fetchError || !users || users.length === 0) {
      return { error: '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.', success: false }
    }

    const userId = users[0].id

    // 2. 관리자 권한으로 비밀번호 강제 업데이트
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (updateError) {
      return { error: '비밀번호 변경에 실패했습니다. (' + updateError.message + ')', success: false }
    }

    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.' }
  } catch {
    return { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', success: false }
  }
}
