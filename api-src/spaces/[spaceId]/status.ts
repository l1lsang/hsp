import type { VercelRequest, VercelResponse } from '@vercel/node'
import { setSpaceStatus } from '../../../server-runtime/booking-service.js'
import { requireAdminSession } from '../../../server-runtime/admin-session.js'
import { authenticate, HttpError, sendError, singleParam } from '../../../server-runtime/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    sendError(res, new HttpError(405, '허용되지 않은 요청 방식입니다.'))
    return
  }
  try {
    const user = await authenticate(req)
    requireAdminSession(req, user)
    user.admin = true
    await setSpaceStatus(user, singleParam(req.query.spaceId), req.body?.bookingDisabled)
    res.status(204).end()
  } catch (error) {
    sendError(res, error)
  }
}
