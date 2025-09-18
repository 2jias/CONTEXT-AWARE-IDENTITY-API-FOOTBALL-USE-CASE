import { useState } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';

export default function Security2FA() {
  const [qr, setQr] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState([]);

  const start = async () => {
    const { data } = await api.post('/auth/2fa/setup');
    setQr(data.qrDataUrl);
    setOtpauth(data.otpauth);
  };

  const verify = async () => {
    const { data } = await api.post('/auth/2fa/verify', { code });
    setRecovery(data.recoveryCodes || []);
  };

  return (
    <Layout>
      <h2 className="page-title">Security Settings</h2>
      <div className="center">
        <div className="card card-pad" style={{maxWidth:640, width:'100%'}}>
          <h3 className="section-title">Two-Factor Authentication (TOTP)</h3>

          {!qr && (
            <div className="mt-16">
              <p>Use Google Authenticator, Authy, or 1Password. Click start to get a QR code.</p>
              <button className="btn btn-primary" onClick={start}>Start 2FA Setup</button>
            </div>
          )}

          {qr && (
            <div className="mt-16">
              <img src={qr} alt="QR code" style={{width:180,height:180}} />
              <p className="muted" style={{wordBreak:'break-all'}}>Or paste into your app: {otpauth}</p>

              <div className="mt-16">
                <label className="label">Enter 6-digit code to confirm</label>
                <input className="input" value={code} onChange={e=>setCode(e.target.value)} placeholder="123456" />
              </div>
              <div className="mt-16">
                <button className="btn btn-primary" onClick={verify}>Verify & Enable</button>
              </div>
            </div>
          )}

          {recovery.length > 0 && (
            <div className="mt-24">
              <h4 className="section-title">Recovery Codes (store safely)</h4>
              <ul>
                {recovery.map(c => <li key={c} style={{fontFamily:'monospace'}}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
