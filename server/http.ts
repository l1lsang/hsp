import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getFirebaseAdmin } from './firebase-admin'

export interface AuthenticatedUser {
  uid: string
  email: string
  name: string
  admin: boolean
}

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

export async function authenticate(req: VercelRequest): Promise<AuthenticatedUser> {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
  if (!token) throw new HttpError(401, '로그인이 필요합니다.')

  try {
    const decoded = await getFirebaseAdmin().auth.verifyIdToken(token)
    if (!decoded.email?.endsWith('@hansung.ac.kr')) {
      throw new HttpError(403, '한성대학교 계정만 이용할 수 있습니다.')
    }
    return { uid: decoded.uid, email: decoded.email, name: decoded.name ?? decoded.email.split('@')[0], admin: decoded.admin === true }
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(401, '유효하지 않은 로그인 정보입니다.')
  }
}

export function sendError(res: VercelResponse, error: unknown): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  console.error(error)
  res.status(500).json({ error: '서버 처리 중 오류가 발생했습니다.' })
}

export function singleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}
