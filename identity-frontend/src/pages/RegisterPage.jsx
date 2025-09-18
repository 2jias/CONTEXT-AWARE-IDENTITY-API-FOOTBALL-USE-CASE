import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { ROLES } from '../constants/roles';

export default function RegisterPage() {
  const nav = useNavigate();
  const [username, setU] = useState('');
  const [email, setE] = useState(''); // optional: not sent to backend
  const [password, setP] = useState('');
  const [role, setR] = useState('Player');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    try {
      await api.post('/auth/register', { username, password, role }); // backend doesn't use email
      setOk('Registration successful! You can now log in.');
      setTimeout(()=>nav('/login'), 700);
    } catch {
      setErr('Registration failed. Username might already exist.');
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
        <div className="card card-pad" style={{maxWidth: 520, width: '100%'}}>
          <h2 className="page-title">Create New Account</h2>
          <div className="center" style={{marginTop:-10, marginBottom:18}}>
            <span className="muted">Already Registered? <Link to="/login">Login</Link></span>
          </div>

          <form onSubmit={submit}>
            <label className="label">NAME</label>
            <input className="input" value={username} onChange={e=>setU(e.target.value)} />

            <div className="mt-16">
              <label className="label">EMAIL</label>
              <input className="input" type="email" value={email} onChange={e=>setE(e.target.value)} />
            </div>

            <div className="mt-16">
              <label className="label">PASSWORD</label>
              <input className="input" type="password" value={password} onChange={e=>setP(e.target.value)} />
            </div>

            <div className="mt-16">
              <label className="label">ROLE</label>
              <select className="select" value={role} onChange={e=>setR(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {err && <p style={{color:'#e11d48',marginTop:12}}>{err}</p>}
            {ok && <p style={{color:'#16a34a',marginTop:12}}>{ok}</p>}

            <div className="mt-24">
              <button className="btn btn-primary" style={{width:'100%'}}>SIGN UP</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
