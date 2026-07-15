import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { RoomMap } from './components/RoomMap'
import { BookingPanel } from './components/BookingPanel'
import { MonthCalendar } from './components/MonthCalendar'
import { Icon } from './components/Icon'
import { ReservationsPage } from './pages/ReservationsPage'
import { AdminPage } from './pages/AdminPage'
import { LoginPage } from './pages/LoginPage'
import {
  auth,
  cancelBooking,
  createBookingTransaction,
  createTimeBlock,
  fetchAvailability,
  fetchReservations,
  setSpaceBookingDisabled,
  signOutCurrentUser,
  verifyAdminPassword,
} from './lib/firebase'
import { MAX_SLOTS, TIME_SLOTS, addMinutes, isPastSlot, localDateKey } from './lib/time'
import type { Page, Reservation, Space, SpaceId } from './types'

const SPACES: Space[] = [
  { id: 'IB101', name: '상상룸 101', type: '프로젝트룸' },
  { id: 'IB102', name: '상상룸 102', type: '프로젝트룸' },
  { id: 'IB103', name: '상상룸 103', type: '미팅룸' },
  { id: 'IB104', name: '상상룸 104', type: '미팅룸' },
  { id: 'IB105', name: '상상룸 105', type: '미팅룸' },
  { id: 'IB106', name: '상상룸 106', type: '프로젝트룸' },
  { id: 'IB107', name: '상상룸 107', type: '프로젝트룸' },
  { id: 'IB108', name: '상상룸 108', type: '미팅룸' },
  { id: 'IB111', name: '세미나실', type: '세미나실' },
]

function App() {
  const [page, setPage] = useState<Page>('login')
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null)
  const [selectedSpace, setSelectedSpace] = useState<SpaceId>('IB101')
  const [selectedDate, setSelectedDate] = useState(localDateKey(new Date()))
  const [selectedSlots, setSelectedSlots] = useState<number[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [adminReservations, setAdminReservations] = useState<Reservation[]>([])
  const [closedSpaces, setClosedSpaces] = useState<Set<SpaceId>>(new Set())
  const [serverBookedSlots, setServerBookedSlots] = useState<Set<number>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [purpose, setPurpose] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [adminAuthOpen, setAdminAuthOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const [adminSession, setAdminSession] = useState(() => sessionStorage.getItem('adminSession') ?? '')

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)
      setPage(currentPage => currentUser && currentPage === 'login' ? 'spaces' : currentUser ? currentPage : 'login')
    })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!user) return
    let active = true
    void fetchReservations()
      .then(items => { if (active) setReservations(items) })
      .catch(error => { if (active) setToast(error instanceof Error ? error.message : '예약 목록을 불러오지 못했습니다.') })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    if (!user || !adminSession) return
    let active = true
    void fetchReservations(adminSession)
      .then(items => { if (active) setAdminReservations(items) })
      .catch(() => {
        if (!active) return
        sessionStorage.removeItem('adminSession')
        setAdminSession('')
      })
    return () => { active = false }
  }, [adminSession, user])

  useEffect(() => {
    if (!user) return
    let active = true
    void fetchAvailability(selectedSpace, selectedDate)
      .then(result => {
        if (!active) return
        setServerBookedSlots(new Set(result.slots.map(time => TIME_SLOTS.indexOf(time)).filter(index => index >= 0)))
        setClosedSpaces(current => {
          const next = new Set(current)
          if (result.bookingDisabled) next.add(selectedSpace)
          else next.delete(selectedSpace)
          return next
        })
      })
      .catch(error => { if (active) setToast(error instanceof Error ? error.message : '예약 현황을 불러오지 못했습니다.') })
    return () => { active = false }
  }, [selectedDate, selectedSpace, user])

  const currentSpace = SPACES.find(space => space.id === selectedSpace)!
  const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || '로그인 사용자'
  const displayEmail = user?.email ?? ''
  const pastSlots = new Set(TIME_SLOTS.map((time, index) => isPastSlot(selectedDate, time) ? index : -1).filter(index => index >= 0))
  const bookedSlots = new Set(serverBookedSlots)
  reservations.filter(item => item.status === 'upcoming' && item.spaceId === selectedSpace && item.date === selectedDate).forEach(item => {
    TIME_SLOTS.forEach((time, index) => {
      if (time >= item.start && time < item.end) bookedSlots.add(index)
    })
  })

  const showToast = (message: string) => setToast(message)

  const handleNavigate = (nextPage: Page) => {
    setMenuOpen(false)
    if (nextPage === 'admin' && !adminSession) {
      setAdminAuthOpen(true)
      return
    }
    setPage(nextPage)
  }

  const handleLogout = async () => {
    sessionStorage.removeItem('adminSession')
    setAdminSession('')
    setReservations([])
    setAdminReservations([])
    await signOutCurrentUser()
    setPage('login')
  }

  const handleSpaceSelect = (spaceId: SpaceId) => {
    setSelectedSpace(spaceId)
    setSelectedSlots([])
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedSlots([])
  }

  const handleSlotClick = (index: number) => {
    if (selectedSlots.length === 0) {
      setSelectedSlots([index])
      return
    }
    if (selectedSlots.includes(index)) {
      setSelectedSlots(selectedSlots.length === 1 ? [] : [index])
      return
    }
    const start = Math.min(selectedSlots[0], index)
    const end = Math.max(selectedSlots[0], index)
    const range = Array.from({ length: end - start + 1 }, (_, offset) => start + offset)
    if (range.length > MAX_SLOTS) {
      showToast('예약은 최대 3시간(6슬롯)까지 가능합니다.')
      return
    }
    if (range.some(slot => bookedSlots.has(slot) || pastSlots.has(slot))) {
      showToast('선택 범위 중간에 예약되었거나 지난 시간이 있습니다.')
      return
    }
    setSelectedSlots(range)
  }

  const confirmBooking = async () => {
    if (!user || !purpose.trim() || selectedSlots.length === 0) return
    setIsSubmitting(true)
    const slotsToBook = [...selectedSlots]
    const start = TIME_SLOTS[slotsToBook[0]]
    const end = addMinutes(TIME_SLOTS[slotsToBook.at(-1)!], 30)
    try {
      const id = await createBookingTransaction({ spaceId: selectedSpace, date: selectedDate, slots: slotsToBook.map(index => TIME_SLOTS[index]), purpose: purpose.trim() })
      setReservations(current => [{ id, spaceId: selectedSpace, date: selectedDate, start, end, purpose: purpose.trim(), status: 'upcoming', userName: displayName, userEmail: displayEmail }, ...current])
      setServerBookedSlots(booked => new Set([...booked, ...slotsToBook]))
      setSelectedSlots([])
      setModalOpen(false)
      setPurpose('')
      showToast(`${selectedSpace} 예약이 확정되었습니다.`)
    } catch (error) {
      showToast(error instanceof Error ? error.message.replace('409:', '') : '예약 처리 중 문제가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelReservation = async (id: string) => {
    try {
      await cancelBooking(id)
      setReservations(current => current.map(item => item.id === id ? { ...item, status: 'cancelled' } : item))
      showToast('예약이 취소되었습니다.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '예약 취소 중 문제가 발생했습니다.')
    }
  }

  const forceCancelReservation = async (id: string) => {
    try {
      await cancelBooking(id, adminSession)
      setAdminReservations(current => current.map(item => item.id === id ? { ...item, status: 'cancelled' } : item))
      showToast('예약을 강제 취소했습니다.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '예약 취소 중 문제가 발생했습니다.')
    }
  }

  const submitAdminPassword = async () => {
    if (!adminPassword) return
    setAdminSubmitting(true)
    try {
      const session = await verifyAdminPassword(adminPassword)
      sessionStorage.setItem('adminSession', session)
      setAdminSession(session)
      setAdminReservations(await fetchReservations(session))
      setAdminPassword('')
      setAdminAuthOpen(false)
      setPage('admin')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '관리자 인증에 실패했습니다.')
    } finally {
      setAdminSubmitting(false)
    }
  }

  const toggleSpace = async (id: SpaceId) => {
    const willClose = !closedSpaces.has(id)
    try {
      await setSpaceBookingDisabled(id, willClose, adminSession)
      setClosedSpaces(current => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      showToast(`${id} 예약 접수를 ${willClose ? '중지했습니다.' : '재개했습니다.'}`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '공간 상태 변경에 실패했습니다.')
    }
  }

  const blockTime = async (spaceId: SpaceId, date: string, start: string, end: string) => {
    const startIndex = TIME_SLOTS.indexOf(start)
    const endIndex = TIME_SLOTS.indexOf(end)
    const normalizedEndIndex = end === '22:00' ? TIME_SLOTS.length : endIndex
    if (!date || startIndex < 0 || normalizedEndIndex <= startIndex || normalizedEndIndex - startIndex > MAX_SLOTS) {
      showToast('30분 단위로 30분 이상 3시간 이하의 시간을 입력해 주세요.')
      return false
    }
    try {
      await createTimeBlock(spaceId, date, start, end, adminSession)
      if (spaceId === selectedSpace && date === selectedDate) {
        setServerBookedSlots(current => new Set([...current, ...Array.from({ length: normalizedEndIndex - startIndex }, (_, offset) => startIndex + offset)]))
      }
      showToast(`${spaceId} ${start}—${end} 시간이 차단되었습니다.`)
      return true
    } catch (error) {
      showToast(error instanceof Error ? error.message : '시간 차단에 실패했습니다.')
      return false
    }
  }

  if (page === 'login') return <LoginPage onLogin={() => setPage('spaces')} />

  return (
    <div className="app-shell">
      <div className={`mobile-backdrop ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      <div className={`sidebar-wrap ${menuOpen ? 'open' : ''}`}>
        <Sidebar page={page} onNavigate={handleNavigate} userName={displayName} userEmail={displayEmail} onLogout={() => void handleLogout()} onClose={() => setMenuOpen(false)} />
      </div>
      <div className="app-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="메뉴 열기"><span /><span /><span /></button>
          <div><span className="campus-label">HANSUNG UNIVERSITY</span><strong>{page === 'spaces' ? '상상베이스 공간 예약' : page === 'reservations' ? '내 예약' : '관리자'}</strong></div>
          <div className="topbar-actions"><button className="profile-button"><span className="avatar">{displayName.slice(0, 1)}</span><span>{displayName}<small>{displayEmail}</small></span><Icon name="chevron" size={15} /></button></div>
        </header>

        {page === 'spaces' && <>
          <MonthCalendar selectedDate={selectedDate} onSelect={handleDateSelect} />
          <main className="booking-layout">
            <RoomMap spaces={SPACES} selected={selectedSpace} closedSpaces={closedSpaces} onSelect={handleSpaceSelect} />
            <BookingPanel space={currentSpace} date={selectedDate} selectedSlots={selectedSlots} disabledSlots={pastSlots} bookedSlots={bookedSlots} onSlotClick={handleSlotClick} onReserve={() => setModalOpen(true)} />
          </main>
        </>}
        {page === 'reservations' && <ReservationsPage reservations={reservations} onCancel={cancelReservation} />}
        {page === 'admin' && <AdminPage spaces={SPACES} closedSpaces={closedSpaces} reservations={adminReservations} onToggleSpace={toggleSpace} onForceCancel={forceCancelReservation} onBlockTime={blockTime} />}
      </div>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setModalOpen(false)}><section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><button className="modal-close" onClick={() => setModalOpen(false)} aria-label="닫기"><Icon name="close" /></button><span className="modal-icon"><Icon name="calendar" /></span><span className="eyebrow">BOOKING CONFIRMATION</span><h2 id="confirm-title">예약 내용을 확인해 주세요</h2><div className="modal-summary"><div><span>공간</span><strong>{selectedSpace} · {currentSpace.type}</strong></div><div><span>일시</span><strong>{selectedDate}<br />{TIME_SLOTS[selectedSlots[0]]} — {addMinutes(TIME_SLOTS[selectedSlots.at(-1)!], 30)}</strong></div></div><label className="purpose-field"><span>이용 목적</span><input value={purpose} onChange={event => setPurpose(event.target.value)} maxLength={40} placeholder="이용 목적을 입력하세요" autoFocus /></label><p className="modal-policy"><Icon name="info" size={16} /> 예약 시작 30분 전까지 취소할 수 있습니다.</p><button className="primary wide" disabled={!purpose.trim() || isSubmitting} onClick={confirmBooking}>{isSubmitting ? '예약 처리 중...' : '예약 확정하기'}</button></section></div>}

      {adminAuthOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setAdminAuthOpen(false)}><section className="booking-modal admin-auth-modal" role="dialog" aria-modal="true" aria-labelledby="admin-auth-title"><button className="modal-close" onClick={() => setAdminAuthOpen(false)} aria-label="닫기"><Icon name="close" /></button><span className="modal-icon"><Icon name="shield" /></span><span className="eyebrow">ADMIN ACCESS</span><h2 id="admin-auth-title">관리자 암호를 입력하세요</h2><p className="admin-auth-copy">인증된 관리자만 예약과 공간 상태를 변경할 수 있습니다.</p><label className="purpose-field"><span>관리자 암호</span><input type="password" value={adminPassword} onChange={event => setAdminPassword(event.target.value)} onKeyDown={event => event.key === 'Enter' && void submitAdminPassword()} autoComplete="current-password" placeholder="관리자 암호" autoFocus /></label><button className="primary wide admin-auth-submit" disabled={!adminPassword || adminSubmitting} onClick={() => void submitAdminPassword()}>{adminSubmitting ? '확인 중...' : '관리자 인증'}</button></section></div>}
      {toast && <div className="toast" role="status"><Icon name="check" size={18} />{toast}</div>}
    </div>
  )
}

export default App
