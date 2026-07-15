import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createBlock } from '../server/booking-service.js'
import { requireAdminSession } from '../server/admin-session.js'
import { authenticate, HttpError, sendError } from '../server/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    sendError(res, new HttpError(405, '허용되지 않은 요청 방식입니다.'))
    return
  }
  try {
    const user = await authenticate(req)
    requireAdminSession(req, user)
    user.admin = true
    const id = await createBlock(user, req.body as Record<string, unknown>)
    res.status(201).json({ id })
  } catch (error) {
    sendError(res, error)
  }
}
