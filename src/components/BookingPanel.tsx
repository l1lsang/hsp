import type { Space } from '../types'
import { MAX_SLOTS, TIME_SLOTS, addMinutes, formatLongDate } from '../lib/time'
import { Icon } from './Icon'

interface BookingPanelProps {
  space: Space
  date: string
  selectedSlots: number[]
  disabledSlots: Set<number>
  bookedSlots: Set<number>
  onSlotClick: (index: number) => void
  onReserve: () => void
}

export function BookingPanel({ space, date, selectedSlots, disabledSlots, bookedSlots, onSlotClick, onReserve }: BookingPanelProps) {
  const start = selectedSlots.length ? TIME_SLOTS[selectedSlots[0]] : null
  const end = selectedSlots.length ? addMinutes(TIME_SLOTS[selectedSlots.at(-1)!], 30) : null

  return (
    <aside className="booking-panel" aria-labelledby="booking-title">
      <div className="room-summary">
        <div className="room-number">{space.id.replace('IB', '')}</div>
        <div><span>선택한 공간</span><h2 id="booking-title">{space.id}</h2><p>{space.type}</p></div>
      </div>
      <div className="panel-divider" />
      <div className="time-heading">
        <div><h3>예약 시간</h3><p>{formatLongDate(date)}</p></div>
        <span>30분 단위</span>
      </div>
      <div className="slot-legend"><span><i className="slot-sample" />예약 가능</span><span><i className="slot-sample booked" />예약됨</span></div>
      <div className="time-grid" role="group" aria-label="예약 시간 선택">
        {TIME_SLOTS.map((time, index) => {
          const isBooked = bookedSlots.has(index)
          const isDisabled = disabledSlots.has(index)
          const isSelected = selectedSlots.includes(index)
          return (
            <button
              key={time}
              className={`${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : ''}`}
              disabled={isDisabled || isBooked}
              onClick={() => onSlotClick(index)}
              aria-pressed={isSelected}
            >
              {isSelected && <Icon name="check" size={13} />}{time}
            </button>
          )
        })}
      </div>
      <p className="selection-rule"><Icon name="clock" size={15} /> 연속된 시간만 최대 {MAX_SLOTS * 30 / 60}시간까지 선택할 수 있어요.</p>

      <div className={`booking-cta ${start ? 'ready' : ''}`}>
        <div>
          <span>선택한 시간</span>
          <strong>{start ? `${start} — ${end}` : '시간을 선택해 주세요'}</strong>
          {start && <small>총 {selectedSlots.length * 30}분</small>}
        </div>
        <button onClick={onReserve} disabled={!start}>예약하기 <Icon name="arrow" size={17} /></button>
      </div>
    </aside>
  )
}
