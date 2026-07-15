import { useState } from 'react'
import { localDateKey } from '../lib/time'
import { Icon } from './Icon'

interface MonthCalendarProps {
  selectedDate: string
  onSelect: (date: string) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function MonthCalendar({ selectedDate, onSelect }: MonthCalendarProps) {
  const initialDate = new Date(`${selectedDate}T12:00:00`)
  const [viewMonth, setViewMonth] = useState(() => monthStart(initialDate))
  const today = new Date()
  const todayKey = localDateKey(today)
  const currentMonth = monthStart(today)
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const leadingEmptyDays = viewMonth.getDay()
  const canGoPrevious = viewMonth.getTime() > currentMonth.getTime()

  const changeMonth = (offset: number) => {
    setViewMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const cells = Array.from({ length: leadingEmptyDays + daysInMonth }, (_, index) => {
    const day = index - leadingEmptyDays + 1
    return day > 0 ? day : null
  })

  return (
    <section className="month-calendar" aria-label="예약 날짜 선택 달력">
      <div className="calendar-intro">
        <span className="calendar-icon"><Icon name="calendar" size={18} /></span>
        <div><strong>날짜 선택</strong><span>예약할 날짜를 골라주세요</span></div>
      </div>
      <div className="calendar-body">
        <div className="calendar-toolbar">
          <button type="button" onClick={() => changeMonth(-1)} disabled={!canGoPrevious} aria-label="이전 달">‹</button>
          <strong>{viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월</strong>
          <button type="button" onClick={() => changeMonth(1)} aria-label="다음 달">›</button>
        </div>
        <div className="calendar-grid" role="grid">
          {WEEKDAYS.map(weekday => <span className="weekday" role="columnheader" key={weekday}>{weekday}</span>)}
          {cells.map((day, index) => {
            if (day === null) return <span className="empty-day" key={`empty-${index}`} aria-hidden="true" />
            const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
            const key = localDateKey(date)
            const isPast = key < todayKey
            const isToday = key === todayKey
            const isSelected = key === selectedDate
            return (
              <button
                type="button"
                role="gridcell"
                key={key}
                className={`${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                disabled={isPast}
                onClick={() => onSelect(key)}
                aria-label={`${viewMonth.getMonth() + 1}월 ${day}일${isToday ? ', 오늘' : ''}`}
                aria-selected={isSelected}
              >
                {day}
                {isToday && <small>오늘</small>}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

