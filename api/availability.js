import { getAvailability } from '../server-runtime/booking-service.js';
import { authenticate, HttpError, sendError, singleParam } from '../server-runtime/http.js';
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        sendError(res, new HttpError(405, '허용되지 않은 요청 방식입니다.'));
        return;
    }
    try {
        await authenticate(req);
        const result = await getAvailability(singleParam(req.query.spaceId), singleParam(req.query.date));
        res.status(200).json(result);
    }
    catch (error) {
        sendError(res, error);
    }
}
