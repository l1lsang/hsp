import { createAdminSession } from '../../server-runtime/admin-session.js';
import { authenticate, HttpError, sendError } from '../../server-runtime/http.js';
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        sendError(res, new HttpError(405, '허용되지 않은 요청 방식입니다.'));
        return;
    }
    try {
        const user = await authenticate(req);
        const adminSession = createAdminSession(user, req.body?.password);
        res.status(200).json({ adminSession });
    }
    catch (error) {
        sendError(res, error);
    }
}
