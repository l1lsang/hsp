import { useEffect, useState } from 'react'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { RoomMap } from './components/RoomMap'
import { BookingPanel } from './components/BookingPanel'
import { Icon } from './components/Icon'
import { ReservationsPage } from './pages/ReservationsPage'
import { AdminPage } from './pages/AdminPage'
import { LoginPage } from './pages/LoginPage'
import { cancelBooking, createBookingTransaction, createTimeBlock, isFirebaseConfigured, setSpaceBookingDisabled } from './lib/firebase'
import { MAX_SLOTS, TIME_SLOTS, addMinutes, isPastSlot, localDateKey } from './lib/time'
import type { Page, Reservation, Space, SpaceId } from './types'

const SPACES: Space[] = [
  { id: 'IB101', name: '상상룸 101', type: '프로젝트룸', capacity: 6, amenity: '디스플레이' },
  { id: 'IB102', name: '상상룸 102', type: '프로젝트룸', capacity: 6, amenity: '디스플레이' },
  { id: 'IB103', name: '상상룸 103', type: '미팅룸', capacity: 4, amenity: '화이트보드' },
  { id: 'IB104', name: '상상룸 104', type: '미팅룸', capacity: 4, amenity: '화이트보드' },
  { id: 'IB105', name: '상상룸 105', type: '미팅룸', capacity: 4, amenity: '화이트보드' },
  { id: 'IB106', name: '상상룸 106', type: '프로젝트룸', capacity: 6, amenity: '디스플레이' },
  { id: 'IB107', name: '상상룸 107', type: '프로젝트룸', capacity: 6, amenity: '디스플레이' },
  { id: 'IB108', name: '상상룸 108', type: '미팅룸', capacity: 4, amenity: '화이트보드' },
  { id: 'IB111', name: '세미나실', type: '세미나실', capacity: 12, amenity: '빔프로젝터' },
]

function dateAfter(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

const INITIAL_RESERVATIONS: Reservation[] = [
  { id: 'demo-1', spaceId: 'IB103', date: dateAfter(1), start: '14:00', end: '15:30', purpose: '캡스톤 프로젝트 회의', status: 'upcoming', userName: '김한성', userEmail: '2170000@hansung.ac.kr' },
  { id: 'demo-2', spaceId: 'IB111', date: dateAfter(3), start: '10:00', end: '12:00', purpose: '동아리 정기 세미나', status: 'upcoming', userName: '이상상', userEmail: '2170001@hansung.ac.kr' },
  { id: 'demo-3', spaceId: 'IB102', date: dateAfter(-4), start: '16:00', end: '17:00', purpose: '팀 프로젝트 회의', status: 'completed', userName: '김한성', userEmail: '2170000@hansung.ac.kr' },
]

function App() {
  const [page, setPage] = useState<Page>(isFirebaseConfigured ? 'login' : 'spaces')
  const [selectedSpace, setSelectedSpace] = useState<SpaceId>('IB101')
  const [selectedDate, setSelectedDate] = useState(localDateKey(new Date()))
  const [selectedSlots, setSelectedSlots] = useState<number[]>([])
  const [reservations, setReservations] = useState<Reservation[]>(isFirebaseConfigured ? [] : INITIAL_RESERVATIONS)
  const [closedSpaces, setClosedSpaces] = useState<Set<SpaceId>>(new Set(['IB108']))
  const [blockedRanges, setBlockedRanges] = useState<{ spaceId: SpaceId; date: string; start: string; end: string }[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [purpose, setPurpose] = useState('팀 프로젝트 회의')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const currentSpace = SPACES.find(space => space.id === selectedSpace)!
  const pastSlots = new Set(TIME_SLOTS.map((time, index) => isPastSlot(selectedDate, time) ? index : -1).filter(index => index >= 0))
  const bookedSlots = new Set<number>()
  reservations.filter(item => item.status === 'upcoming' && item.spaceId === selectedSpace && item.date === selectedDate).forEach(item => {
    TIME_SLOTS.forEach((time, index) => {
      if (time >= item.start && time < item.end) bookedSlots.add(index)
    })
  })
  blockedRanges.filter(item => item.spaceId === selectedSpace && item.date === selectedDate).forEach(item => {
    TIME_SLOTS.forEach((time, index) => {
      if (time >= item.start && time < item.end) bookedSlots.add(index)
    })
  })
  if (selectedSpace === 'IB101' && selectedDate === localDateKey(new Date())) {
    bookedSlots.add(20)
    bookedSlots.add(21)
  }

  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    return date
  })

  const showToast = (message: string) => setToast(message)

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
    if (!purpose.trim() || selectedSlots.length === 0) return
    setIsSubmitting(true)
    const start = TIME_SLOTS[selectedSlots[0]]
    const end = addMinutes(TIME_SLOTS[selectedSlots.at(-1)!], 30)
    try {
      let id = `local-${Date.now()}`
      if (isFirebaseConfigured) {
        id = await createBookingTransaction({ spaceId: selectedSpace, date: selectedDate, slots: selectedSlots.map(index => TIME_SLOTS[index]), purpose: purpose.trim() })
      }
      setReservations(current => [{ id, spaceId: selectedSpace, date: selectedDate, start, end, purpose: purpose.trim(), status: 'upcoming', userName: '김한성', userEmail: '2170000@hansung.ac.kr' }, ...current])
      setModalOpen(false)
      setSelectedSlots([])
      showToast(`${selectedSpace} 예약이 확정되었습니다.`)
    } catch (error) {
      showToast(error instanceof Error ? error.message.replace('409:', '') : '예약 처리 중 문제가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelReservation = async (id: string) => {
    try {
      if (isFirebaseConfigured) await cancelBooking(id)
      setReservations(current => current.map(item => item.id === id ? { ...item, status: 'cancelled' } : item))
      showToast('예약이 취소되었습니다.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '예약 취소 중 문제가 발생했습니다.')
    }
  }

  const toggleSpace = async (id: SpaceId) => {
    const willClose = !closedSpaces.has(id)
    try {
      if (isFirebaseConfigured) await setSpaceBookingDisabled(id, willClose)
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
      if (isFirebaseConfigured) await createTimeBlock(spaceId, date, start, end)
      setBlockedRanges(current => [...current, { spaceId, date, start, end }])
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
      <div className={`sidebar-wrap ${menuOpen ? 'open' : ''}`}><Sidebar page={page} onNavigate={setPage} onClose={() => setMenuOpen(false)} /></div>
      <div className="app-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="메뉴 열기"><span /><span /><span /></button>
          <div><span className="campus-label">HANSUNG UNIVERSITY</span><strong>{page === 'spaces' ? '상상베이스 공간 예약' : page === 'reservations' ? '내 예약' : '관리자'}</strong></div>
          <div className="topbar-actions"><span className={`mode-badge ${isFirebaseConfigured ? 'live' : ''}`}><i />{isFirebaseConfigured ? 'Firebase 연결됨' : '데모 모드'}</span><button className="profile-button"><span className="avatar">김</span><span>김한성<small>학생</small></span><Icon name="chevron" size={15} /></button></div>
        </header>

        {page === 'spaces' && <>
          <div className="date-strip-wrap">
            <div className="date-strip-label"><span className="calendar-icon"><Icon name="calendar" size={18} /></span><div><strong>날짜 선택</strong><span>예약할 날짜를 골라주세요</span></div></div>
            <div className="date-strip">
              {dates.map((date, index) => {
                const key = localDateKey(date)
                return <button key={key} className={selectedDate === key ? 'active' : ''} onClick={() => handleDateSelect(key)}><span>{index === 0 ? '오늘' : new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date)}</span><strong>{date.getDate()}</strong></button>
              })}
            </div>
          </div>
          <main className="booking-layout">
            <RoomMap spaces={SPACES} selected={selectedSpace} closedSpaces={closedSpaces} onSelect={handleSpaceSelect} />
            <BookingPanel space={currentSpace} date={selectedDate} selectedSlots={selectedSlots} disabledSlots={pastSlots} bookedSlots={bookedSlots} onSlotClick={handleSlotClick} onReserve={() => setModalOpen(true)} />
          </main>
        </>}
        {page === 'reservations' && <ReservationsPage reservations={reservations.filter(item => item.userEmail.startsWith('2170000'))} onCancel={cancelReservation} />}
        {page === 'admin' && <AdminPage spaces={SPACES} closedSpaces={closedSpaces} reservations={reservations} onToggleSpace={toggleSpace} onForceCancel={cancelReservation} onBlockTime={blockTime} />}
      </div>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}><section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><button className="modal-close" onClick={() => setModalOpen(false)} aria-label="닫기"><Icon name="close" /></button><span className="modal-icon"><Icon name="calendar" /></span><span className="eyebrow">BOOKING CONFIRMATION</span><h2 id="confirm-title">예약 내용을 확인해 주세요</h2><div className="modal-summary"><div><span>공간</span><strong>{selectedSpace} · {currentSpace.type}</strong></div><div><span>일시</span><strong>{selectedDate}<br />{TIME_SLOTS[selectedSlots[0]]} — {addMinutes(TIME_SLOTS[selectedSlots.at(-1)!], 30)}</strong></div></div><label className="purpose-field"><span>이용 목적</span><input value={purpose} onChange={event => setPurpose(event.target.value)} maxLength={40} placeholder="예: 팀 프로젝트 회의" autoFocus /></label><p className="modal-policy"><Icon name="info" size={16} /> 예약 시작 30분 전까지 취소할 수 있습니다.</p><button className="primary wide" disabled={!purpose.trim() || isSubmitting} onClick={confirmBooking}>{isSubmitting ? '예약 처리 중...' : '예약 확정하기'}</button></section></div>}
      {toast && <div className="toast" role="status"><Icon name="check" size={18} />{toast}</div>}
    </div>
  )
}

export default App
