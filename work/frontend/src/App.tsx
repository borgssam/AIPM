import { useState, useEffect, FC } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Button } from './components/Button';
import axiosInstance from './api/axiosInstance';

interface UserInfo {
  username: string;
  name: string;
  role: string;
}

const AppContent: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserInfo | null>(null);

  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('theme') || 'dolphin';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 라우트 경로 이동이 발생할 때마다 로컬 스토리지 세션과 사용자 데이터 동기화
  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    setToken(currentToken);

    if (currentToken) {
      // 토큰은 세팅되었으나 유저 정보가 아직 로컬 상태에 없는 경우 API 동기화 시도
      if (!user) {
        axiosInstance.get('/auth/me')
          .then(res => {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          })
          .catch(err => {
            console.error('Failed to sync user session profile:', err);
            // 오류 발생 시 세션 데이터 정리
            setUser(null);
          });
      }
    } else {
      setUser(null);
    }
  }, [location.pathname, user]); // 경로명 변경 또는 유저 갱신 필요 시 동작

  // 로그아웃 세션 클리어 처리
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 font-sans flex flex-col">
      {/* 프리미엄 헤더 바 */}
      <header className="border-b border-slate-800 bg-[#0f172a] px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            AI Project Manager
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          {/* 테마 변경 버튼 */}
          <div className="flex items-center gap-2 bg-[#121b2e] border border-slate-800 px-3 py-1 rounded-lg text-[11px] md:text-xs">
            <span className="text-slate-450 font-bold mr-1">🎨 테마:</span>
            <button 
              onClick={() => setTheme('dolphin')}
              className={`px-2 py-0.5 rounded font-medium transition ${theme === 'dolphin' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              돌고래 🐬
            </button>
            <button 
              onClick={() => setTheme('sunflower')}
              className={`px-2 py-0.5 rounded font-medium transition ${theme === 'sunflower' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              해바라기 🌻
            </button>
            <button 
              onClick={() => setTheme('marigold')}
              className={`px-2 py-0.5 rounded font-medium transition ${theme === 'marigold' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              금잔디 🌱
            </button>
          </div>

          {/* 접속한 로그인 사용자 정보 상시 노출 영역 */}
          {user && (
            <div className="hidden md:flex items-center gap-2 bg-[#1e293b] border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-slate-300 font-medium">{user.name}</span>
              <span className="text-slate-500 font-bold">|</span>
              <span className="text-brand-400 font-semibold">{user.role}</span>
            </div>
          )}
          
          <nav className="flex gap-4">
            <Link to="/">
              <Button variant="secondary" className="text-xs md:text-sm">
                Dashboard
              </Button>
            </Link>
            
            {token ? (
              // 로그인 시 로그아웃 버튼 활성화
              <Button 
                variant="secondary" 
                onClick={handleLogout} 
                className="text-xs md:text-sm border border-red-500/30 text-red-400 hover:bg-red-950/20"
              >
                Log Out
              </Button>
            ) : (
              // 미로그인 시 로그인 링크 제공
              <Link to="/login">
                <Button variant="primary" className="text-xs md:text-sm">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* 메인 뷰 컨테이너 */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-12 px-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {/* 와일드카드 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      {/* 하단 푸터 */}
      <footer className="border-t border-slate-900 bg-[#070a13] py-4 text-center text-xs text-slate-500">
        &copy; 2026 AI Project Manager. All rights reserved.
      </footer>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
