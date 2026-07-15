import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createBooking, listBookings } from '../../server/booking-service'
import { requireAdminSession } from '../../server/admin-session'
import { authenticate, HttpError, sendError } from '../../server/http'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST')
    sendError(res, new HttpError(405, '허용되지 않은 요청 방식입니다.'))
    return
  }
  try {
    const user = await authenticate(req)
    if (req.method === 'GET') {
      const includeAll = req.query.scope === 'all'
      if (includeAll) requireAdminSession(req, user)
      res.status(200).json({ reservations: await listBookings(user, includeAll) })
      return
    }
    const id = await createBooking(user, req.body as Record<string, unknown>)
    res.status(201).json({ id })
  } catch (error) {
    sendError(res, error)
  }
}
