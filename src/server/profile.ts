import { createServerFn } from '@tanstack/react-start'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { getAuthContext } from '@/server/auth/context'
import { getAppSession } from '@/server/auth/session'
import { createLogtoClient } from '@/server/auth/logto'


export type LogtoAccountProfile = {
  id: string
  username: string | null
  name: string | null
  avatar: string | null
  primaryEmail: string | null
  primaryPhone: string | null
  profile: {
    familyName?: string | null
    givenName?: string | null
    nickname?: string | null
    profile?: string | null
    website?: string | null
  } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAccessToken() {
  const { client } = await createLogtoClient()
  const token = await client.getAccessToken()
  if (!token) throw new Error('Session expired. Please sign out and sign back in.')
  return token
}

async function logtoError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body.data?.issues?.length) {
      const issue = body.data.issues[0] as { path: string[]; message: string }
      const field = issue.path[0] ?? 'field'
      if (issue.message === 'Invalid') {
        const hints: Record<string, string> = {
          username: 'Use 3–32 chars, start with a letter, letters/numbers/underscores only.',
          avatar: 'Must be a valid URL.',
          password: 'Must be at least 8 characters.',
        }
        return `Invalid ${field}. ${hints[field] ?? ''}`
      }
      return `Invalid ${field}: ${issue.message}`
    }
    return body.message || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

// ─── Server functions ─────────────────────────────────────────────────────────

/** Read the current user's Logto profile. */
export const getUserProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const token = await getAccessToken()
  const res = await fetch(`${process.env.LOGTO_ENDPOINT}/api/my-account`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Failed to load profile (${res.status})`)
  return res.json() as Promise<LogtoAccountProfile>
})

/** Update display name — no verification required. */
export const updateUserName = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const name = data.name.trim()
    if (!name) throw new Error('Name cannot be empty.')

    const token = await getAccessToken()
    const res = await fetch(`${process.env.LOGTO_ENDPOINT}/api/my-account`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error(await logtoError(res))

    await db.update(users).set({ name }).where(eq(users.id, ctx.userId))
    const session = await getAppSession()
    await session.update({ ...session.data, userName: name })
  })

/**
 * Verify current password → returns a short-lived verificationRecordId.
 * This ID must be passed to any endpoint that updates sensitive fields.
 */
export const verifyPassword = createServerFn({ method: 'POST' })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const token = await getAccessToken()
    const res = await fetch(`${process.env.LOGTO_ENDPOINT}/api/verifications/password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: data.password }),
    })
    if (!res.ok) {
      const msg = await logtoError(res)
      throw new Error(msg.startsWith('Request failed (401)') ? 'Incorrect password.' : msg)
    }
    const body = await res.json() as { verificationRecordId: string }
    return { verificationRecordId: body.verificationRecordId }
  })

/**
 * Update avatar, username, and/or password — all require a verification record.
 * Include only the fields you want to change.
 */
export const updateProtectedProfile = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      avatar?: string
      username?: string
      newPassword?: string
      verificationRecordId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const token = await getAccessToken()
    const verificationHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'logto-verification-id': data.verificationRecordId,
    }

    // Update avatar / username via PATCH /api/my-account
    const patch: Record<string, string | null> = {}
    if (data.avatar !== undefined) patch.avatar = data.avatar.trim() || null
    if (data.username !== undefined) patch.username = data.username.trim() || null

    if (Object.keys(patch).length > 0) {
      const res = await fetch(`${process.env.LOGTO_ENDPOINT}/api/my-account`, {
        method: 'PATCH',
        headers: verificationHeaders,
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(await logtoError(res))
    }

    // Update password via POST /api/my-account/password
    if (data.newPassword) {
      const res = await fetch(`${process.env.LOGTO_ENDPOINT}/api/my-account/password`, {
        method: 'POST',
        headers: verificationHeaders,
        body: JSON.stringify({ password: data.newPassword }),
      })
      if (!res.ok) throw new Error(await logtoError(res))
    }

    // Mirror avatar to local DB so member listings can display it
    if (data.avatar !== undefined) {
      const ctx = await getAuthContext()
      await db.update(users).set({ avatar: data.avatar.trim() || null }).where(eq(users.id, ctx.userId))
    }
  })

/**
 * Send a one-time verification code to a new email address.
 * Returns the verificationRecordId to use when verifying the code.
 */
export const sendEmailVerificationCode = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const token = await getAccessToken()
    const res = await fetch(`${process.env.LOGTO_ENDPOINT}/api/verifications/verification-code`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: { type: 'email', value: data.email } }),
    })
    if (!res.ok) throw new Error(await logtoError(res))
    const body = await res.json() as { verificationRecordId: string }
    return { verificationRecordId: body.verificationRecordId }
  })

/**
 * Submit the OTP sent to the new email address.
 * This marks the newEmailVerificationRecordId as verified.
 */
export const verifyEmailCode = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; code: string; verificationRecordId: string }) => data)
  .handler(async ({ data }) => {
    const token = await getAccessToken()
    const res = await fetch(
      `${process.env.LOGTO_ENDPOINT}/api/verifications/verification-code/verify`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: { type: 'email', value: data.email },
          code: data.code,
          verificationId: data.verificationRecordId,
        }),
      },
    )
    if (!res.ok) {
      const msg = await logtoError(res)
      throw new Error(msg.includes('401') ? 'Incorrect code.' : msg)
    }
  })

/**
 * Set the user's primary email after both the current identity and the new
 * email address have been verified.
 */
export const updatePrimaryEmail = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      newEmail: string
      newEmailVerificationRecordId: string
      currentIdentityVerificationId: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    const token = await getAccessToken()

    const res = await fetch(`${process.env.LOGTO_ENDPOINT}/api/my-account/primary-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'logto-verification-id': data.currentIdentityVerificationId,
      },
      body: JSON.stringify({ email: data.newEmail, newIdentifierVerificationRecordId: data.newEmailVerificationRecordId }),
    })
    if (!res.ok) throw new Error(await logtoError(res))

    // Mirror to local DB + session
    await db.update(users).set({ email: data.newEmail }).where(eq(users.id, ctx.userId))
    const session = await getAppSession()
    await session.update({ ...session.data, userEmail: data.newEmail })
  })
