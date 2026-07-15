import { getFirebaseAdmin } from './firebase-admin.js';
export class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
export async function authenticate(req) {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token)
        throw new HttpError(401, '로그인이 필요합니다.');
    const adminAuth = getFirebaseAdmin().auth;
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        if (!decoded.email?.endsWith('@hansung.ac.kr')) {
            throw new HttpError(403, '한성대학교 계정만 이용할 수 있습니다.');
        }
        return { uid: decoded.uid, email: decoded.email, name: decoded.name ?? decoded.email.split('@')[0], admin: decoded.admin === true };
    }
    catch (error) {
        if (error instanceof HttpError)
            throw error;
        throw new HttpError(401, '유효하지 않은 로그인 정보입니다.');
    }
}
export function sendError(res, error) {
    if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message });
        return;
    }
    console.error('[vercel-api] unhandled error', {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ error: '서버 처리 중 오류가 발생했습니다.' });
}
export function singleParam(value) {
    return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
