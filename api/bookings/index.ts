import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createBooking } from '../../server/booking-service'
import { authenticate, HttpError, sendError } from '../../server/http'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    sendError(res, new HttpError(405, '허용되지 않은 요청 방식입니다.'))
    return
  }
  try {
    const user = await authenticate(req)
    const id = await createBooking(user, req.body as Record<string, unknown>)
    res.status(201).json({ id })
  } catch (error) {
    sendError(res, error)
  }
}

