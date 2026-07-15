import { getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import type { Reservation, SpaceId } from '../types'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey)
const bookingApiUrl = (import.meta.env.VITE_BOOKING_API_URL as string | undefined) || '/api'
const app = isFirebaseConfigured
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null

export const auth = app ? getAuth(app) : null

export async function signInWithHansungAccount(): Promise<void> {
  if (!auth) return
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ hd: 'hansung.ac.kr' })
  const result = await signInWithPopup(auth, provider)
  if (!result.user.email?.endsWith('@hansung.ac.kr')) {
    await auth.signOut()
    throw new Error('한성대학교 계정만 로그인할 수 있습니다.')
  }
}

export async function signOutCurrentUser(): Promise<void> {
  if (auth) await signOut(auth)
}

interface CreateBookingInput {
  spaceId: SpaceId
  date: string
  slots: string[]
  purpose: string
}

/** 인증된 서버 API가 bookingSlots와 예약 문서를 원자적으로 생성합니다. */
export async function createBookingTransaction(input: CreateBookingInput): Promise<string> {
  if (!auth?.currentUser || !bookingApiUrl) throw new Error('Firebase 예약 API가 아직 연결되지 않았습니다.')
  if (input.slots.length < 1 || input.slots.length > 6) throw new Error('예약 시간은 30분 이상 3시간 이하여야 합니다.')
  const token = await auth.currentUser.getIdToken()
  const response = await fetch(`${bookingApiUrl.replace(/\/$/, '')}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      spaceId: input.spaceId,
      startAt: `${input.date}T${input.slots[0]}:00+09:00`,
      endAt: `${input.date}T${addHalfHour(input.slots.at(-1)!)}:00+09:00`,
      purpose: input.purpose,
    }),
  })
  const body = await response.json() as { id?: string; error?: string }
  if (!response.ok || !body.id) throw new Error(`${response.status}: ${body.error ?? '예약 요청에 실패했습니다.'}`)
  return body.id
}

export async function cancelBooking(bookingId: string, adminSession?: string): Promise<void> {
  if (!auth?.currentUser || !bookingApiUrl) throw new Error('Firebase 예약 API가 아직 연결되지 않았습니다.')
  const token = await auth.currentUser.getIdToken()
  const response = await fetch(`${bookingApiUrl.replace(/\/$/, '')}/bookings/${bookingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, ...(adminSession ? { 'X-Admin-Session': adminSession } : {}) },
  })
  if (!response.ok) {
    const body = await response.json() as { error?: string }
    throw new Error(body.error ?? '예약 취소에 실패했습니다.')
  }
}

export async function setSpaceBookingDisabled(spaceId: SpaceId, bookingDisabled: boolean, adminSession: string): Promise<void> {
  if (!auth?.currentUser || !bookingApiUrl) throw new Error('Firebase 예약 API가 아직 연결되지 않았습니다.')
  const token = await auth.currentUser.getIdToken()
  const response = await fetch(`${bookingApiUrl.replace(/\/$/, '')}/spaces/${spaceId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Session': adminSession },
    body: JSON.stringify({ bookingDisabled }),
  })
  if (!response.ok) {
    const body = await response.json() as { error?: string }
    throw new Error(body.error ?? '공간 상태 변경에 실패했습니다.')
  }
}

export async function createTimeBlock(spaceId: SpaceId, date: string, start: string, end: string, adminSession: string): Promise<void> {
  if (!auth?.currentUser || !bookingApiUrl) throw new Error('Firebase 예약 API가 아직 연결되지 않았습니다.')
  const token = await auth.currentUser.getIdToken()
  const response = await fetch(`${bookingApiUrl.replace(/\/$/, '')}/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Session': adminSession },
    body: JSON.stringify({ spaceId, startAt: `${date}T${start}:00+09:00`, endAt: `${date}T${end}:00+09:00` }),
  })
  if (!response.ok) {
    const body = await response.json() as { error?: string }
    throw new Error(body.error ?? '시간 차단에 실패했습니다.')
  }
}

export async function verifyAdminPassword(password: string): Promise<string> {
  if (!auth?.currentUser) throw new Error('로그인이 필요합니다.')
  const token = await auth.currentUser.getIdToken()
  const response = await fetch(`${bookingApiUrl.replace(/\/$/, '')}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  })
  const body = await response.json() as { adminSession?: string; error?: string }
  if (!response.ok || !body.adminSession) throw new Error(body.error ?? '관리자 인증에 실패했습니다.')
  return body.adminSession
}

export async function fetchReservations(adminSession?: string): Promise<Reservation[]> {
  if (!auth?.currentUser) return []
  const token = await auth.currentUser.getIdToken()
  const query = adminSession ? '?scope=all' : ''
  const response = await fetch(`${bookingApiUrl.replace(/\/$/, '')}/bookings${query}`, {
    headers: { Authorization: `Bearer ${token}`, ...(adminSession ? { 'X-Admin-Session': adminSession } : {}) },
  })
  const body = await response.json() as { reservations?: Reservation[]; error?: string }
  if (!response.ok) throw new Error(body.error ?? '예약 목록을 불러오지 못했습니다.')
  return body.reservations ?? []
}

export async function fetchAvailability(spaceId: SpaceId, date: string): Promise<{ slots: string[]; bookingDisabled: boolean }> {
  if (!auth?.currentUser) return { slots: [], bookingDisabled: false }
  const token = await auth.currentUser.getIdToken()
  const params = new URLSearchParams({ spaceId, date })
  const response = await fetch(`${bookingApiUrl.replace(/\/$/, '')}/availability?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await response.json() as { slots?: string[]; bookingDisabled?: boolean; error?: string }
  if (!response.ok) throw new Error(body.error ?? '예약 현황을 불러오지 못했습니다.')
  return { slots: body.slots ?? [], bookingDisabled: body.bookingDisabled === true }
}

function addHalfHour(time: string): string {
  const [hour, minute] = time.split(':').map(Number)
  const total = hour * 60 + minute + 30
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
