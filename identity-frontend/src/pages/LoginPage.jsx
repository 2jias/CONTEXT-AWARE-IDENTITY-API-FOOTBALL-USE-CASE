import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

export default function LoginPage() {
  const nav = useNavigate();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [err, setErr] = useState('');
  const [code, setCode] = useState('');
  const [need2fa, setNeed2fa] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
        const body = need2fa ? { username, password, code } : { username, password };
        const { data } = await api.post('/auth/login', body);
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('role', data.role);
        nav(`/${data.role.toLowerCase()}`);
    } catch (ex) {
        const msg = ex?.response?.data?.error || '';
        if (msg === '2FA_REQUIRED') {
        setNeed2fa(true);
        setErr('Enter your 2FA code (or a recovery code).');
        return;
        }
        setErr('Invalid credentials.');
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="brand"><div className="brand-logo">Ball</div></div>
        </div>
      </header>

      <div className="container center">
        <div className="card card-pad" style={{maxWidth: 420, width: '100%'}}>
          <h2 className="page-title">Login</h2>
          <div className="center" style={{marginTop:-10, marginBottom:18}}>
            <span className="muted">New here? <Link to="/register">Register</Link></span>
          </div>

          <form onSubmit={submit}>
            <label className="label">NAME</label>
            <input className="input" value={username} onChange={e=>setU(e.target.value)} />

            <div className="mt-16">
              <label className="label">PASSWORD</label>
              <input className="input" type="password" value={password} onChange={e=>setP(e.target.value)} />
            </div>

            {err && <p style={{color:'#e11d48',marginTop:12}}>{err}</p>}

            <div className="mt-24">
                {need2fa && (
                    <div className="mt-16">
                        <label className="label">2FA CODE</label>
                        <input className="input" value={code} onChange={e=>setCode(e.target.value)} placeholder="123 456" />
                    </div>
                    )}
              <button className="btn btn-primary" style={{width:'100%'}}>SIGN IN</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
