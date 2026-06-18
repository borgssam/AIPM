import { FC, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { Button } from '../components/Button';

export const Login: FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      // FastAPI OAuth2PasswordRequestForm 형식에 대응하기 위해 x-www-form-urlencoded 형태로 데이터 전송
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await axiosInstance.post('/auth/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      
      // 로그인 성공 시 대시보드 화면으로 이동
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-xl max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
          Sign In
        </h2>
        <p className="text-slate-400 mb-6 text-sm">
          Please sign in to access the AI Project Manager platform.
        </p>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg mb-6 text-left">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full font-medium py-2 rounded-lg mt-2 flex justify-center items-center"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-sm text-slate-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand-400 hover:text-indigo-400 font-semibold transition">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};
