import { useState } from 'react'
import type { Reservation, Space, SpaceId } from '../types'
import { Icon } from '../components/Icon'

interface AdminPageProps {
  spaces: Space[]
  closedSpaces: Set<SpaceId>
  reservations: Reservation[]
  onToggleSpace: (id: SpaceId) => void | Promise<void>
  onForceCancel: (id: string) => void | Promise<void>
  onBlockTime: (spaceId: SpaceId, date: string, start: string, end: string) => Promise<boolean>
}

export function AdminPage({ spaces, closedSpaces, reservations, onToggleSpace, onForceCancel, onBlockTime }: AdminPageProps) {
  const active = reservations.filter(item => item.status === 'upcoming')
  const [blockSpace, setBlockSpace] = useState<SpaceId>('IB101')
  const [blockDate, setBlockDate] = useState(new Date().toISOString().slice(0, 10))
  const [blockStart, setBlockStart] = useState('13:00')
  const [blockEnd, setBlockEnd] = useState('14:00')
  return (
    <main className="subpage admin-page">
      <header className="page-title"><span className="eyebrow">ADMIN CONSOLE</span><h1>예약 관리</h1><p>공간 운영 상태와 전체 예약을 관리합니다.</p></header>
      <section className="stat-grid">
        <article><span className="stat-icon green"><Icon name="calendar" /></span><div><small>오늘 예약</small><strong>{active.length}</strong></div></article>
        <article><span className="stat-icon blue"><Icon name="clock" /></span><div><small>예약 시간</small><strong>{active.length * 1.5}h</strong></div></article>
        <article><span className="stat-icon orange"><Icon name="ban" /></span><div><small>이용 중지 공간</small><strong>{closedSpaces.size}</strong></div></article>
      </section>
      <section className="admin-section">
        <div className="admin-heading"><div><h2>공간 운영 상태</h2><p>공간별 예약 접수를 즉시 중지하거나 재개합니다.</p></div><span>{spaces.length}개 공간</span></div>
        <div className="space-toggle-grid">
          {spaces.map(space => <button key={space.id} onClick={() => onToggleSpace(space.id)} className={closedSpaces.has(space.id) ? 'closed' : ''}><span><strong>{space.id}</strong><small>{space.type}</small></span><i><b /></i></button>)}
        </div>
      </section>
      <section className="admin-section block-section">
        <div className="admin-heading"><div><h2>특정 시간 차단</h2><p>점검이나 행사 준비 시간에는 예약을 받지 않습니다.</p></div></div>
        <div className="block-form">
          <label><span>공간</span><select value={blockSpace} onChange={event => setBlockSpace(event.target.value as SpaceId)}>{spaces.map(space => <option key={space.id}>{space.id}</option>)}</select></label>
          <label><span>날짜</span><input type="date" value={blockDate} onChange={event => setBlockDate(event.target.value)} /></label>
          <label><span>시작</span><input type="time" step="1800" value={blockStart} onChange={event => setBlockStart(event.target.value)} /></label>
          <label><span>종료</span><input type="time" step="1800" value={blockEnd} onChange={event => setBlockEnd(event.target.value)} /></label>
          <button className="primary" onClick={() => void onBlockTime(blockSpace, blockDate, blockStart, blockEnd)}>시간 차단</button>
        </div>
      </section>
      <section className="admin-section">
        <div className="admin-heading"><div><h2>전체 예약</h2><p>현재 예정된 예약 목록입니다.</p></div></div>
        <div className="admin-table-wrap"><table><thead><tr><th>공간</th><th>예약자</th><th>일시</th><th>목적</th><th>상태</th><th /></tr></thead><tbody>{active.map(item => <tr key={item.id}><td><strong>{item.spaceId}</strong></td><td>{item.userName}<small>{item.userEmail}</small></td><td>{item.date}<small>{item.start} — {item.end}</small></td><td>{item.purpose}</td><td><span className="status-pill">확정</span></td><td><button className="table-action" onClick={() => onForceCancel(item.id)}>강제 취소</button></td></tr>)}</tbody></table></div>
      </section>
    </main>
  )
}
