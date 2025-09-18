import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { ROLES } from '../constants/roles';

export default function PlayerVisibilityEditor() {
  const [profile, setProfile] = useState({});
  const [visibility, setVisibility] = useState({});
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get('/player/me').then((res) => {
      setProfile(res.data);
      const vis = {};
      res.data.visibilities?.forEach(({ field, visibleTo }) => {
        if (!vis[field]) vis[field] = [];
        vis[field].push(visibleTo);
      });
      setVisibility(vis);
    });
  }, []);

  const onChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const toggleVis = (field, role) => {
    const list = visibility[field] || [];
    const next = list.includes(role) ? list.filter(r => r !== role) : [...list, role];
    setVisibility({ ...visibility, [field]: next });
  };

  const save = async () => {
    setStatus('Saving…');
    try {
      await api.put('/player/me', { ...profile, visibility });
      setStatus('Profile updated successfully!');
      setTimeout(()=>setStatus(''), 1200);
    } catch {
      setStatus('Error saving profile.');
    }
  };

  const FIELD_LABELS = ['fullName','preferredName','jerseyName','dob','position'];

  return (
    <>
      {FIELD_LABELS.map((field) => (
        <div key={field} className="mb-16">
          <label className="label" style={{textTransform:'capitalize'}}>{field}</label>
          <input
            className="input"
            type="text"
            name={field}
            value={profile[field] || ''}
            onChange={onChange}
            placeholder={`Enter ${field}`}
          />
          <div className="row" style={{flexWrap:'wrap', marginTop:8}}>
            {ROLES.filter(r => r !== 'Player').map((role) => (
              <label key={role} className="row" style={{marginRight:12}}>
                <input
                  type="checkbox"
                  checked={visibility[field]?.includes(role) || false}
                  onChange={() => toggleVis(field, role)}
                />
                <span style={{fontSize:13}}>{role}</span>
              </label>
            ))}
          </div>
          {(!visibility[field]?.length) && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop:6 }}>⚠️ This field is currently private</div>
          )}
        </div>
      ))}

      <div className="row" style={{justifyContent:'flex-end'}}>
        <button onClick={save} className="btn btn-primary">Save</button>
      </div>

      {status && (
        <p className="mt-16" style={{ color: status.includes('Error') ? '#e11d48' : '#16a34a' }}>{status}</p>
      )}
    </>
  );
}
