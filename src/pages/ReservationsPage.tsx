import type { Reservation } from '../types'
import { Icon } from '../components/Icon'

interface ReservationsPageProps {
  reservations: Reservation[]
  onCancel: (id: string) => void | Promise<void>
}

export function ReservationsPage({ reservations, onCancel }: ReservationsPageProps) {
  const upcoming = reservations.filter((item) => item.status === 'upcoming')
  const history = reservations.filter((item) => item.status !== 'upcoming')

  return (
    <main className="subpage">
      <header className="page-title"><span className="eyebrow">MY RESERVATIONS</span><h1>내 예약</h1><p>다가오는 예약을 확인하거나 취소할 수 있습니다.</p></header>
      <div className="tab-row"><button className="active">예정된 예약 <b>{upcoming.length}</b></button><button>지난 예약 <b>{history.length}</b></button></div>
      <section className="reservation-list" aria-label="예정된 예약">
        {upcoming.length === 0 ? (
          <div className="empty-state"><Icon name="calendar" size={32} /><h2>예정된 예약이 없습니다</h2><p>공간 예약 메뉴에서 상상베이스를 예약해 보세요.</p></div>
        ) : upcoming.map((item) => (
          <article className="reservation-card" key={item.id}>
            <div className="reservation-date"><strong>{new Date(`${item.date}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('ko-KR', { month: 'short' }).format(new Date(`${item.date}T12:00:00`))}</span></div>
            <div className="reservation-info"><div><span className="status-pill">예약 확정</span><h2>{item.spaceId}</h2></div><p><Icon name="clock" size={17} /> {item.date} · {item.start} — {item.end}</p><p><Icon name="users" size={17} /> {item.purpose}</p></div>
            <button className="outline danger" onClick={() => onCancel(item.id)}>예약 취소</button>
          </article>
        ))}
      </section>
      {history.length > 0 && <section className="history-section"><h2>지난 예약</h2>{history.map(item => <div className="history-row" key={item.id}><span>{item.date}</span><strong>{item.spaceId}</strong><span>{item.start} — {item.end}</span><span className="muted">이용 완료</span></div>)}</section>}
    </main>
  )
}
