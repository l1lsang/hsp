import { Icon } from './Icon'
import type { Page } from '../types'
import sangsangMascot from '../assets/상상부기.png'

interface SidebarProps {
  page: Page
  onNavigate: (page: Page) => void
  userName: string
  userEmail: string
  onLogout: () => void
  onClose?: () => void
}

const menuItems: { id: Page; label: string; icon: 'grid' | 'calendar' | 'shield' }[] = [
  { id: 'spaces', label: '공간 예약', icon: 'grid' },
  { id: 'reservations', label: '내 예약', icon: 'calendar' },
  { id: 'admin', label: '관리자', icon: 'shield' },
]

export function Sidebar({ page, onNavigate, userName, userEmail, onLogout, onClose }: SidebarProps) {
  const navigate = (nextPage: Page) => {
    onNavigate(nextPage)
    onClose?.()
  }

  return (
    <aside className="sidebar">
      <div className="brand" aria-label="한성대학교 상상베이스">
        <img className="brand-mascot" src={sangsangMascot} alt="상상부기 마스코트" />
        <div><strong>한성대학교</strong><span>상상베이스 예약</span></div>
      </div>
      <nav className="main-nav" aria-label="주 메뉴">
        <p className="nav-label">MENU</p>
        {menuItems.map((item) => (
          <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => navigate(item.id)}>
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="user-card">
          <span className="avatar">{userName.slice(0, 1)}</span>
          <div><strong>{userName}</strong><span>{userEmail}</span></div>
        </div>
        <button className="logout-button" onClick={onLogout}>
          <Icon name="logout" size={18} /> 로그아웃
        </button>
      </div>
    </aside>
  )
}
