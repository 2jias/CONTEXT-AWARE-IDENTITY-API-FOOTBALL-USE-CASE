import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

// --- tiny helpers ---
const ROLES = ['Player', 'Coach', 'Journalist', 'Developer'];
const fmt = (s) => (s ? new Date(s).toLocaleString() : '—');
const short = (id) => (id ? `${String(id).slice(0, 8)}…` : '—');

async function logoutEverywhere() {
  try {
    const rt = localStorage.getItem('refreshToken');
    if (rt) await api.post('/auth/logout', { refreshToken: rt });
  } catch {}
  localStorage.clear();
  window.location.href = '/';
}

// --- simple inline styles (works without Tailwind) ---
const styles = {
  shell: { minHeight: '100vh', background: '#f1f5f9', color: '#0f172a' },
  card: { maxWidth: 1150, margin: '24px auto', background: '#fff', borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 10 },
  tabs: { display: 'flex', gap: 8, padding: 8, borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  tabBtn: (active) => ({
    padding: '8px 12px', borderRadius: 8, fontSize: 14,
    background: active ? '#0f172a' : '#fff', color: active ? '#fff' : '#0f172a', border: active ? '1px solid #0f172a' : '1px solid #e2e8f0',
    cursor: 'pointer'
  }),
  section: { padding: 16 },
  btn: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer' },
  btnDanger: { padding: '8px 12px', borderRadius: 8, background: '#e11d48', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer' },
  input: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px' },
  select: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px' },
  tableWrap: { overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' },
  table: { minWidth: '100%', fontSize: 14, borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: 12, background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: 12, borderTop: '1px solid #e2e8f0', verticalAlign: 'top' },
  muted: { color: '#64748b' },
  chip: (ok) => ({ padding: '2px 8px', borderRadius: 999, fontSize: 12, background: ok ? '#dcfce7' : '#ffe4e6', color: ok ? '#166534' : '#9f1239' }),
};

// --- Top Bar ---
function TopBar() {
  const role = localStorage.getItem('role') || '—';
  return (
    <div style={styles.topbar}>
      <div style={{ fontWeight: 600 }}>Admin Dashboard</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
        <span className="muted">Role: <b>{role}</b></span>
        <button style={{ ...styles.btn, background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                onClick={logoutEverywhere}>Logout</button>
      </div>
    </div>
  );
}

// --- Tabs ---
function Tabs({ tab, setTab }) {
  const TABS = ['Users', 'Sessions', 'Audit'];
  return (
    <div style={styles.tabs}>
      {TABS.map((t) => (
        <button key={t} onClick={() => setTab(t)} style={styles.tabBtn(tab === t)}>{t}</button>
      ))}
    </div>
  );
}

// --- Users ---
function UsersTab() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr(''); setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateRole = async (id, role) => {
    const prev = [...users];
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, role } : x)));
    try {
      await api.put(`/admin/users/${id}/role`, { role });
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
      setUsers(prev);
    }
  };

  return (
    <div style={styles.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Users</h2>
        <button style={styles.btn} onClick={load}>Refresh</button>
      </div>
      {err && <p style={{ color: '#b91c1c' }}>{err}</p>}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Username</th>
              <th style={styles.th}>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={styles.td}>{u.id}</td>
                <td style={styles.td}>{u.username}</td>
                <td style={styles.td}>
                  <select style={styles.select} value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td style={styles.td} colSpan={3}><span style={styles.muted}>{loading ? 'Loading…' : 'No users'}</span></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Sessions ---
function SessionsTab() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [userId, setUserId] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setErr(''); setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (userId) qs.set('userId', userId);
      if (activeOnly) qs.set('active', 'true');
      const { data } = await api.get(`/admin/refresh-tokens?${qs.toString()}`);
      setRows(data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const revokeOne = async (tokenId) => {
    try {
      await api.post(`/admin/refresh-tokens/${tokenId}/revoke`);
      setRows((xs) => xs.map((x) => x.tokenId === tokenId ? { ...x, revokedAt: new Date().toISOString() } : x));
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  };

  const revokeAll = async () => {
    if (!userId) return setErr('Enter a userId first');
    try {
      await api.post('/admin/refresh-tokens/revoke-all', { userId: Number(userId) });
      setRows((xs) => xs.filter((x) => x.userId !== Number(userId)));
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  };

  return (
    <div style={styles.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Sessions</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="userId" value={userId} onChange={(e) => setUserId(e.target.value)} style={{ ...styles.input, width: 100 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} /> Active only
          </label>
          <button style={styles.btn} onClick={load}>Apply</button>
          <button style={styles.btnDanger} onClick={revokeAll}>Revoke all for user</button>
        </div>
      </div>
      {err && <p style={{ color: '#b91c1c' }}>{err}</p>}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Token</th>
              <th style={styles.th}>User</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Expires</th>
              <th style={styles.th}>Revoked</th>
              <th style={styles.th}>UA / IP</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tokenId}>
                <td style={{ ...styles.td, fontFamily: 'monospace' }}>{short(r.tokenId)}</td>
                <td style={styles.td}>{r.userId}</td>
                <td style={styles.td}>{fmt(r.createdAt)}</td>
                <td style={styles.td}>{fmt(r.expiresAt)}</td>
                <td style={styles.td}>{fmt(r.revokedAt)}</td>
                <td style={{ ...styles.td, maxWidth: 320 }} title={`${r.userAgent || ''} ${r.ip || ''}`}>{r.userAgent || ''} {r.ip || ''}</td>
                <td style={styles.td}>
                  {!r.revokedAt ? (
                    <button style={styles.btnDanger} onClick={() => revokeOne(r.tokenId)}>Revoke</button>
                  ) : <span style={styles.muted}>—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td style={styles.td} colSpan={7}><span style={styles.muted}>{loading ? 'Loading…' : 'No sessions found'}</span></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Audit ---
function AuditTab() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({ userId: '', action: '', status: '', limit: 50 });
  const [loading, setLoading] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.userId) p.set('userId', filters.userId);
    if (filters.action) p.set('action', filters.action);
    if (filters.status) p.set('status', filters.status);
    if (filters.limit) p.set('limit', String(filters.limit));
    return p.toString();
  }, [filters]);

  const load = async () => {
    setErr(''); setLoading(true);
    try {
      const { data } = await api.get(`/admin/audit?${qs}`);
      setRows(data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // initial load

  return (
    <div style={styles.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Audit</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="userId" value={filters.userId} onChange={(e)=>setFilters(v=>({ ...v, userId: e.target.value }))} style={{ ...styles.input, width: 100 }} />
          <input placeholder="action (e.g. login)" value={filters.action} onChange={(e)=>setFilters(v=>({ ...v, action: e.target.value }))} style={{ ...styles.input, width: 180 }} />
          <select value={filters.status} onChange={(e)=>setFilters(v=>({ ...v, status: e.target.value }))} style={styles.select}>
            <option value="">any status</option>
            <option value="success">success</option>
            <option value="fail">fail</option>
          </select>
          <select value={filters.limit} onChange={(e)=>setFilters(v=>({ ...v, limit: Number(e.target.value) }))} style={styles.select}>
            {[20,50,100,200].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button style={styles.btn} onClick={load}>Apply</button>
        </div>
      </div>
      {err && <p style={{ color: '#b91c1c' }}>{err}</p>}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>User</th>
              <th style={styles.th}>Action</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Resource</th>
              <th style={styles.th}>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={styles.td}>{fmt(r.timestamp)}</td>
                <td style={styles.td}>{r.userId ?? '—'}</td>
                <td style={styles.td}>{r.action}</td>
                <td style={styles.td}><span style={styles.chip(r.status === 'success')}>{r.status}</span></td>
                <td style={styles.td}>{r.resource || ''}</td>
                <td style={{ ...styles.td, maxWidth: 480 }} title={r.metadata ? JSON.stringify(r.metadata) : ''}>
                  {r.metadata ? JSON.stringify(r.metadata) : ''}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td style={styles.td} colSpan={6}><span style={styles.muted}>{loading ? 'Loading…' : 'No audit rows'}</span></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Page shell ---
export default function AdminDashboard() {
  const [tab, setTab] = useState('Users');
  return (
    <div style={styles.shell}>
      <TopBar />
      <div style={styles.card}>
        <Tabs tab={tab} setTab={setTab} />
        {tab === 'Users' && <UsersTab />}
        {tab === 'Sessions' && <SessionsTab />}
        {tab === 'Audit' && <AuditTab />}
      </div>
    </div>
  );
}
