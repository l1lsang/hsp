"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const express_1 = __importDefault(require("express"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const ALLOWED_SPACES = new Set(['IB101', 'IB102', 'IB103', 'IB104', 'IB105', 'IB106', 'IB107', 'IB108', 'IB111']);
const SLOT_MS = 30 * 60 * 1000;
const MAX_DURATION_MS = 3 * 60 * 60 * 1000;
async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) {
        res.status(401).json({ error: '로그인이 필요합니다.' });
        return;
    }
    try {
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(token);
        if (!decoded.email?.endsWith('@hansung.ac.kr')) {
            res.status(403).json({ error: '한성대학교 계정만 이용할 수 있습니다.' });
            return;
        }
        req.user = { uid: decoded.uid, email: decoded.email, admin: decoded.admin === true };
        next();
    }
    catch {
        res.status(401).json({ error: '유효하지 않은 로그인 정보입니다.' });
    }
}
app.use(requireAuth);
app.patch('/spaces/:spaceId/status', async (req, res) => {
    if (!req.user.admin) {
        res.status(403).json({ error: '관리자 권한이 필요합니다.' });
        return;
    }
    const spaceId = Array.isArray(req.params.spaceId) ? req.params.spaceId[0] : req.params.spaceId;
    if (!ALLOWED_SPACES.has(spaceId) || typeof req.body.bookingDisabled !== 'boolean') {
        res.status(400).json({ error: '공간과 운영 상태를 확인해 주세요.' });
        return;
    }
    await db.collection('spaces').doc(spaceId).set({ bookingDisabled: req.body.bookingDisabled, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    res.status(204).send();
});
app.post('/blocks', async (req, res) => {
    if (!req.user.admin) {
        res.status(403).json({ error: '관리자 권한이 필요합니다.' });
        return;
    }
    const { spaceId, startAt, endAt, reason = '관리자 차단' } = req.body;
    const startMs = typeof startAt === 'string' ? Date.parse(startAt) : Number.NaN;
    const endMs = typeof endAt === 'string' ? Date.parse(endAt) : Number.NaN;
    const duration = endMs - startMs;
    if (typeof spaceId !== 'string' || !ALLOWED_SPACES.has(spaceId) || !Number.isFinite(duration) || startMs % SLOT_MS !== 0 || endMs % SLOT_MS !== 0 || duration < SLOT_MS || duration > MAX_DURATION_MS) {
        res.status(400).json({ error: '공간과 차단 시간을 30분 단위, 최대 3시간 범위로 입력해 주세요.' });
        return;
    }
    const slotTimes = Array.from({ length: duration / SLOT_MS }, (_, index) => startMs + index * SLOT_MS);
    const blockRef = db.collection('blocks').doc();
    const slotRefs = slotTimes.map(time => db.collection('bookingSlots').doc(`${spaceId}_${new Date(time).toISOString().slice(0, 16).replace(/[-:T]/g, '')}`));
    try {
        await db.runTransaction(async (transaction) => {
            const snapshots = await Promise.all(slotRefs.map(ref => transaction.get(ref)));
            if (snapshots.some(snapshot => snapshot.exists))
                throw new BookingError(409, '이미 예약되거나 차단된 시간이 포함되어 있습니다.');
            transaction.create(blockRef, { spaceId, startAt: firestore_1.Timestamp.fromMillis(startMs), endAt: firestore_1.Timestamp.fromMillis(endMs), reason: String(reason).slice(0, 80), createdBy: req.user.uid, slotIds: slotRefs.map(ref => ref.id), createdAt: firestore_1.FieldValue.serverTimestamp() });
            slotRefs.forEach((ref, index) => transaction.create(ref, { blockId: blockRef.id, spaceId, startsAt: firestore_1.Timestamp.fromMillis(slotTimes[index]), kind: 'blocked', createdAt: firestore_1.FieldValue.serverTimestamp() }));
        });
        res.status(201).json({ id: blockRef.id });
    }
    catch (error) {
        if (error instanceof BookingError) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error(error);
        res.status(500).json({ error: '시간 차단 중 오류가 발생했습니다.' });
    }
});
app.post('/bookings', async (req, res) => {
    const { spaceId, startAt, endAt, purpose = '' } = req.body;
    if (typeof spaceId !== 'string' || !ALLOWED_SPACES.has(spaceId)) {
        res.status(400).json({ error: '예약 가능한 공간은 IB101~IB108 또는 IB111입니다.' });
        return;
    }
    if (typeof startAt !== 'string' || typeof endAt !== 'string') {
        res.status(400).json({ error: '시작·종료 시간이 필요합니다.' });
        return;
    }
    const startMs = Date.parse(startAt);
    const endMs = Date.parse(endAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs % SLOT_MS !== 0 || endMs % SLOT_MS !== 0) {
        res.status(400).json({ error: '시작·종료 시간은 30분 단위여야 합니다.' });
        return;
    }
    const duration = endMs - startMs;
    if (duration < SLOT_MS || duration > MAX_DURATION_MS) {
        res.status(400).json({ error: '예약 시간은 30분 이상, 3시간 이하여야 합니다.' });
        return;
    }
    if (startMs < Date.now()) {
        res.status(400).json({ error: '이미 지난 시간은 예약할 수 없습니다.' });
        return;
    }
    const slotTimes = Array.from({ length: duration / SLOT_MS }, (_, index) => startMs + index * SLOT_MS);
    const bookingRef = db.collection('bookings').doc();
    const slotRefs = slotTimes.map(time => db.collection('bookingSlots').doc(`${spaceId}_${new Date(time).toISOString().slice(0, 16).replace(/[-:T]/g, '')}`));
    try {
        await db.runTransaction(async (transaction) => {
            // Firestore 트랜잭션은 모든 읽기를 쓰기보다 먼저 수행해야 합니다.
            const [spaceSnapshot, ...slotSnapshots] = await Promise.all([
                transaction.get(db.collection('spaces').doc(spaceId)),
                ...slotRefs.map(ref => transaction.get(ref)),
            ]);
            if (spaceSnapshot.exists && spaceSnapshot.data()?.bookingDisabled === true) {
                throw new BookingError(423, '현재 예약이 중지된 공간입니다.');
            }
            if (slotSnapshots.some(snapshot => snapshot.exists)) {
                throw new BookingError(409, '이미 예약된 시간이 포함되어 있습니다.');
            }
            transaction.create(bookingRef, {
                ownerUid: req.user.uid,
                ownerEmail: req.user.email,
                spaceId,
                startAt: firestore_1.Timestamp.fromMillis(startMs),
                endAt: firestore_1.Timestamp.fromMillis(endMs),
                purpose: String(purpose).slice(0, 80),
                status: 'upcoming',
                slotIds: slotRefs.map(ref => ref.id),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
            slotRefs.forEach((ref, index) => transaction.create(ref, {
                bookingId: bookingRef.id,
                ownerUid: req.user.uid,
                spaceId,
                startsAt: firestore_1.Timestamp.fromMillis(slotTimes[index]),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            }));
        });
        res.status(201).json({ id: bookingRef.id });
    }
    catch (error) {
        if (error instanceof BookingError) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error(error);
        res.status(500).json({ error: '예약 처리 중 오류가 발생했습니다.' });
    }
});
app.delete('/bookings/:bookingId', async (req, res) => {
    const bookingId = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
    const bookingRef = db.collection('bookings').doc(bookingId);
    try {
        await db.runTransaction(async (transaction) => {
            const booking = await transaction.get(bookingRef);
            if (!booking.exists)
                throw new BookingError(404, '예약을 찾을 수 없습니다.');
            const data = booking.data();
            if (data.ownerUid !== req.user.uid && !req.user.admin)
                throw new BookingError(403, '취소 권한이 없습니다.');
            const slotRefs = data.slotIds.map(id => db.collection('bookingSlots').doc(id));
            transaction.update(bookingRef, { status: 'cancelled', cancelledAt: firestore_1.FieldValue.serverTimestamp() });
            slotRefs.forEach(ref => transaction.delete(ref));
        });
        res.status(204).send();
    }
    catch (error) {
        if (error instanceof BookingError) {
            res.status(error.status).json({ error: error.message });
            return;
        }
        console.error(error);
        res.status(500).json({ error: '예약 취소 중 오류가 발생했습니다.' });
    }
});
class BookingError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.api = (0, https_1.onRequest)({ region: 'asia-northeast3', cors: true }, app);
