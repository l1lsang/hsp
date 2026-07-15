import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from './firebase-admin.js'
import { HttpError, type AuthenticatedUser } from './http.js'

export const ALLOWED_SPACES = new Set(['IB101', 'IB102', 'IB103', 'IB104', 'IB105', 'IB106', 'IB107', 'IB108', 'IB111'])
const SLOT_MS = 30 * 60 * 1000
const MAX_DURATION_MS = 3 * 60 * 60 * 1000

interface TimeRange {
  spaceId: unknown
  startAt: unknown
  endAt: unknown
}

function validateRange(input: TimeRange) {
  if (typeof input.spaceId !== 'string' || !ALLOWED_SPACES.has(input.spaceId)) {
    throw new HttpError(400, '예약 가능한 공간은 IB101~IB108 또는 IB111입니다.')
  }
  if (typeof input.startAt !== 'string' || typeof input.endAt !== 'string') {
    throw new HttpError(400, '시작·종료 시간이 필요합니다.')
  }

  const startMs = Date.parse(input.startAt)
  const endMs = Date.parse(input.endAt)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs % SLOT_MS !== 0 || endMs % SLOT_MS !== 0) {
    throw new HttpError(400, '시작·종료 시간은 30분 단위여야 합니다.')
  }
  const duration = endMs - startMs
  if (duration < SLOT_MS || duration > MAX_DURATION_MS) {
    throw new HttpError(400, '예약 시간은 30분 이상, 3시간 이하여야 합니다.')
  }
  return { spaceId: input.spaceId, startMs, endMs, duration }
}

function createSlotRefs(spaceId: string, startMs: number, duration: number) {
  const { db } = getFirebaseAdmin()
  const times = Array.from({ length: duration / SLOT_MS }, (_, index) => startMs + index * SLOT_MS)
  const refs = times.map(time => db.collection('bookingSlots').doc(`${spaceId}_${new Date(time).toISOString().slice(0, 16).replace(/[-:T]/g, '')}`))
  return { times, refs }
}

export async function createBooking(user: AuthenticatedUser, body: Record<string, unknown>): Promise<string> {
  const range = validateRange(body as unknown as TimeRange)
  if (range.startMs < Date.now()) throw new HttpError(400, '이미 지난 시간은 예약할 수 없습니다.')

  const { db } = getFirebaseAdmin()
  const bookingRef = db.collection('bookings').doc()
  const slots = createSlotRefs(range.spaceId, range.startMs, range.duration)

  await db.runTransaction(async transaction => {
    const [spaceSnapshot, ...slotSnapshots] = await Promise.all([
      transaction.get(db.collection('spaces').doc(range.spaceId)),
      ...slots.refs.map(ref => transaction.get(ref)),
    ])
    if (spaceSnapshot.exists && spaceSnapshot.data()?.bookingDisabled === true) {
      throw new HttpError(423, '현재 예약이 중지된 공간입니다.')
    }
    if (slotSnapshots.some(snapshot => snapshot.exists)) {
      throw new HttpError(409, '이미 예약된 시간이 포함되어 있습니다.')
    }

    transaction.create(bookingRef, {
      ownerUid: user.uid,
      ownerEmail: user.email,
      ownerName: user.name,
      spaceId: range.spaceId,
      startAt: Timestamp.fromMillis(range.startMs),
      endAt: Timestamp.fromMillis(range.endMs),
      purpose: String(body.purpose ?? '').slice(0, 80),
      status: 'upcoming',
      slotIds: slots.refs.map(ref => ref.id),
      createdAt: FieldValue.serverTimestamp(),
    })
    slots.refs.forEach((ref, index) => transaction.create(ref, {
      bookingId: bookingRef.id,
      ownerUid: user.uid,
      spaceId: range.spaceId,
      startsAt: Timestamp.fromMillis(slots.times[index]),
      createdAt: FieldValue.serverTimestamp(),
    }))
  })
  return bookingRef.id
}

export async function cancelBooking(user: AuthenticatedUser, bookingId: string): Promise<void> {
  const { db } = getFirebaseAdmin()
  const bookingRef = db.collection('bookings').doc(bookingId)
  await db.runTransaction(async transaction => {
    const booking = await transaction.get(bookingRef)
    if (!booking.exists) throw new HttpError(404, '예약을 찾을 수 없습니다.')
    const data = booking.data()!
    if (data.ownerUid !== user.uid && !user.admin) throw new HttpError(403, '취소 권한이 없습니다.')
    const slotRefs = (data.slotIds as string[]).map(id => db.collection('bookingSlots').doc(id))
    transaction.update(bookingRef, { status: 'cancelled', cancelledAt: FieldValue.serverTimestamp() })
    slotRefs.forEach(ref => transaction.delete(ref))
  })
}

export async function setSpaceStatus(user: AuthenticatedUser, spaceId: string, bookingDisabled: unknown): Promise<void> {
  if (!user.admin) throw new HttpError(403, '관리자 권한이 필요합니다.')
  if (!ALLOWED_SPACES.has(spaceId) || typeof bookingDisabled !== 'boolean') {
    throw new HttpError(400, '공간과 운영 상태를 확인해 주세요.')
  }
  await getFirebaseAdmin().db.collection('spaces').doc(spaceId).set({ bookingDisabled, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}

export async function createBlock(user: AuthenticatedUser, body: Record<string, unknown>): Promise<string> {
  if (!user.admin) throw new HttpError(403, '관리자 권한이 필요합니다.')
  const range = validateRange(body as unknown as TimeRange)
  const { db } = getFirebaseAdmin()
  const blockRef = db.collection('blocks').doc()
  const slots = createSlotRefs(range.spaceId, range.startMs, range.duration)

  await db.runTransaction(async transaction => {
    const snapshots = await Promise.all(slots.refs.map(ref => transaction.get(ref)))
    if (snapshots.some(snapshot => snapshot.exists)) {
      throw new HttpError(409, '이미 예약되거나 차단된 시간이 포함되어 있습니다.')
    }
    transaction.create(blockRef, {
      spaceId: range.spaceId,
      startAt: Timestamp.fromMillis(range.startMs),
      endAt: Timestamp.fromMillis(range.endMs),
      reason: String(body.reason ?? '관리자 차단').slice(0, 80),
      createdBy: user.uid,
      slotIds: slots.refs.map(ref => ref.id),
      createdAt: FieldValue.serverTimestamp(),
    })
    slots.refs.forEach((ref, index) => transaction.create(ref, {
      blockId: blockRef.id,
      spaceId: range.spaceId,
      startsAt: Timestamp.fromMillis(slots.times[index]),
      kind: 'blocked',
      createdAt: FieldValue.serverTimestamp(),
    }))
  })
  return blockRef.id
}

function koreaDateTime(value: Timestamp): { date: string; time: string } {
  const iso = new Date(value.toMillis() + 9 * 60 * 60 * 1000).toISOString()
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) }
}

export async function listBookings(user: AuthenticatedUser, includeAll: boolean) {
  const { db } = getFirebaseAdmin()
  const snapshot = includeAll
    ? await db.collection('bookings').limit(300).get()
    : await db.collection('bookings').where('ownerUid', '==', user.uid).limit(100).get()

  return snapshot.docs.map(document => {
    const data = document.data()
    const start = koreaDateTime(data.startAt as Timestamp)
    const end = koreaDateTime(data.endAt as Timestamp)
    return {
      id: document.id,
      spaceId: data.spaceId,
      date: start.date,
      start: start.time,
      end: end.time,
      purpose: data.purpose ?? '',
      status: data.status ?? 'upcoming',
      userName: data.ownerName ?? data.ownerEmail?.split('@')[0] ?? '사용자',
      userEmail: data.ownerEmail ?? '',
    }
  }).sort((a, b) => `${b.date}${b.start}`.localeCompare(`${a.date}${a.start}`))
}

export async function getAvailability(spaceId: string, date: string) {
  if (!ALLOWED_SPACES.has(spaceId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpError(400, '공간과 날짜를 확인해 주세요.')
  }
  const { db } = getFirebaseAdmin()
  const startMs = Date.parse(`${date}T00:00:00+09:00`)
  const endMs = startMs + 24 * 60 * 60 * 1000
  const [slots, space] = await Promise.all([
    db.collection('bookingSlots')
      .where('spaceId', '==', spaceId)
      .where('startsAt', '>=', Timestamp.fromMillis(startMs))
      .where('startsAt', '<', Timestamp.fromMillis(endMs))
      .get(),
    db.collection('spaces').doc(spaceId).get(),
  ])
  return {
    slots: slots.docs.map(document => koreaDateTime(document.data().startsAt as Timestamp).time),
    bookingDisabled: space.exists && space.data()?.bookingDisabled === true,
  }
}
