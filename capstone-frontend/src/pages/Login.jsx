import { useState } from 'react';
import { login } from '../services/AuthService';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const navigate = useNavigate();

 const onSubmit = async (ev) => {
   ev.preventDefault();
    setErr('');
    try {
      await login(email, password);
      navigate('/admin');
    } catch {
      setErr('Invalid email or password');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="bg-black text-white px-4 py-2 rounded">Sign in</button>
      </form>
    </div>
  );
}
