import { Icon } from '../components/Icon'
import { isFirebaseConfigured, signInWithHansungAccount } from '../lib/firebase'

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
      <div className="login-visual"><div className="login-wordmark"><div className="brand-mark">H</div><span>한성대학교</span></div><div className="visual-copy"><span>SANGSANG BASE</span><h1>상상을 현실로 만드는<br />우리의 공간</h1><p>학생들의 아이디어가 시작되는 곳,<br />상상베이스를 간편하게 예약하세요.</p></div><div className="visual-circles"><i /><i /><i /></div></div>
      <div className="login-form-wrap"><div className="login-form"><span className="eyebrow">WELCOME</span><h2>한성대학교 계정으로<br />시작하세요</h2><p>학교 계정 인증 후 예약 서비스를 이용할 수 있습니다.</p><button className="hansung-login" onClick={handleLogin}><span className="brand-mark small">H</span><span>한성대학교 계정 로그인<small>@hansung.ac.kr</small></span><Icon name="arrow" /></button><div className="login-notice"><Icon name="shield" size={18} /><span><strong>안전한 학교 계정 인증</strong>개인정보는 Firebase Authentication으로 보호됩니다.</span></div>{!isFirebaseConfigured && <p className="demo-notice">현재 데모 모드입니다. 클릭하면 김한성 학생으로 로그인합니다.</p>}</div></div>
    </main>
  )
}

