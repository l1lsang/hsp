import { Icon } from '../components/Icon'
import { isFirebaseConfigured, signInWithHansungAccount } from '../lib/firebase'
import sangsangMascot from '../assets/상상부기.png'

interface LoginPageProps { onLogin: () => void }

export function LoginPage({ onLogin }: LoginPageProps) {
  const handleLogin = async () => {
    try {
      if (isFirebaseConfigured) await signInWithHansungAccount()
      onLogin()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '로그인에 실패했습니다.')
    }
  }

  return (
    <main className="login-page">
      <div className="login-visual"><div className="login-wordmark"><img className="brand-mascot" src={sangsangMascot} alt="상상부기 마스코트" /><span>한성대학교</span></div><div className="visual-copy"><span>SANGSANG BASE</span><h1>상상을 현실로 만드는<br />우리의 공간</h1><p>학생들의 아이디어가 시작되는 곳,<br />상상부기와 함께 간편하게 예약하세요.</p></div><div className="login-mascot-card"><img src={sangsangMascot} alt="두 손을 들고 웃는 상상부기 마스코트" /><span>오늘은 어떤 공간을 예약할까요?</span></div><div className="visual-circles"><i /><i /><i /></div></div>
      <div className="login-form-wrap"><div className="login-form"><span className="eyebrow">WELCOME</span><h2>한성대학교 계정으로<br />시작하세요</h2><p>학교 계정 인증 후 예약 서비스를 이용할 수 있습니다.</p><button className="hansung-login" onClick={handleLogin} disabled={!isFirebaseConfigured}><span className="brand-mark small">H</span><span>한성대학교 계정 로그인<small>@hansung.ac.kr</small></span><Icon name="arrow" /></button><div className="login-notice"><Icon name="shield" size={18} /><span><strong>안전한 학교 계정 인증</strong>로그인한 학교 계정 정보만 사용합니다.</span></div>{!isFirebaseConfigured && <p className="demo-notice">Firebase 웹 앱 설정을 먼저 완료해 주세요.</p>}</div></div>
    </main>
  )
}
