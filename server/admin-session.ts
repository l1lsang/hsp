import { createHmac, timingSafeEqual } from 'node:crypto'
import type { VercelRequest } from '@vercel/node'
import { HttpError, type AuthenticatedUser } from './http'

interface AdminSessionPayload {
  uid: string
  exp: number
}

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET
  if (!value || value.length < 32) throw new Error('ADMIN_SESSION_SECRET은 32자 이상으로 설정해야 합니다.')
  return value
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

export function createAdminSession(user: AuthenticatedUser, password: unknown): string {
  const expected = process.env.ADMIN_ACCESS_PASSWORD
  if (!expected || typeof password !== 'string') throw new HttpError(401, '관리자 암호가 올바르지 않습니다.')
  const actualBuffer = Buffer.from(password)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new HttpError(401, '관리자 암호가 올바르지 않습니다.')
  }
  const encoded = Buffer.from(JSON.stringify({ uid: user.uid, exp: Date.now() + 60 * 60 * 1000 } satisfies AdminSessionPayload)).toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

export function requireAdminSession(req: VercelRequest, user: AuthenticatedUser): void {
  const token = req.headers['x-admin-session']
  const value = Array.isArray(token) ? token[0] : token
  if (!value) throw new HttpError(403, '관리자 인증이 필요합니다.')
  const [encoded, signature] = value.split('.')
  if (!encoded || !signature) throw new HttpError(403, '관리자 인증이 유효하지 않습니다.')
  const expected = sign(encoded)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new HttpError(403, '관리자 인증이 유효하지 않습니다.')
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as AdminSessionPayload
    if (payload.uid !== user.uid || payload.exp < Date.now()) throw new Error('expired')
  } catch {
    throw new HttpError(403, '관리자 인증이 만료되었습니다. 다시 인증해 주세요.')
  }
}

