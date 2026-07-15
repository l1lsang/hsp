import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cancelBooking } from '../../server/booking-service'
import { authenticate, HttpError, sendError, singleParam } from '../../server/http'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    sendError(res, new HttpError(405, '허용되지 않은 요청 방식입니다.'))
    return
  }
  try {
    const user = await authenticate(req)
    await cancelBooking(user, singleParam(req.query.bookingId))
    res.status(204).end()
  } catch (error) {
    sendError(res, error)
  }
}

