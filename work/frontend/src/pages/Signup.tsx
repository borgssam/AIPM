import { FC, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { Button } from '../components/Button';

export const Signup: FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('DEVELOPER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password || !name || !role) {
      setError('Please fill in all fields.');
      return;
    }

    // Pydantic DTO 제약조건 준수를 위한 클라이언트 검사
    if (username.length < 4) {
      setError('Username must be at least 4 characters long.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post('/auth/signup', {
        username,
        password,
        name,
        role,
      });
      // 가입 성공 시 로그인 페이지로 즉시 리다이렉트
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          setError(detail);
        } else if (Array.isArray(detail)) {
          // Pydantic validation error 리스트 정돈 포맷팅
          const errorMsgs = detail.map((d: any) => `${d.loc.slice(1).join('.')}: ${d.msg}`).join(', ');
          setError(errorMsgs);
        } else {
          setError('Signup validation failed.');
        }
      } else {
        setError('Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-xl max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
          Create Account
        </h2>
        <p className="text-slate-400 mb-6 text-sm">
          Join the AI Project Manager platform as a team member.
        </p>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg mb-6 text-left">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
            <input 
              type="text" 
              placeholder="e.g., dev_kim"
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
              placeholder="Password (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
            <input 
              type="text" 
              placeholder="e.g., Gildong Hong"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">System Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
            >
              <option value="DEVELOPER">Developer (개발자)</option>
              <option value="PM">PM (프로젝트 매니저)</option>
              <option value="DESIGNER">Designer (디자이너)</option>
              <option value="QA">QA (품질 검수원)</option>
            </select>
          </div>

          <Button 
            type="submit" 
            className="w-full font-medium py-2 rounded-lg mt-2 flex justify-center items-center"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-indigo-400 font-semibold transition">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
};
