import { useEffect, useState } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';

export default function DeveloperDashboard() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState('');
  const [info, setInfo] = useState(null);

  useEffect(() => { api.get('/player').then(res => setPlayers(res.data)); }, []);
  const load = async (id) => {
    const { data } = await api.get(`/player/${id}?context=fantasy`);
    setInfo(data);
  };

  return (
    <Layout>
      <h2 className="page-title">Welcome Developer!</h2>
      <section className="grid grid-2">
        <div className="card card-pad">
          <div className="row" style={{justifyContent:'space-between', marginBottom:12}}>
            <h3 className="section-title" style={{margin:0}}>Players</h3>
            <select className="select" value={selected}
              onChange={(e)=>{ setSelected(e.target.value); if(e.target.value) load(e.target.value); }}>
              <option value="">Players List</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.preferredName || `Player ${p.id}`}</option>)}
            </select>
          </div>

          <div className="card" style={{minHeight:260, padding:14}}>
            {!info && <div className="center" style={{height:220, color:'#64748b'}}>Select a player to view allowed details</div>}
            {info && (
              <div>
                {Object.entries(info).map(([k,v])=>(
                  <p key={k} style={{margin:'8px 0'}}><b>{k}:</b> {v ?? <em>Not visible</em>}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="card card-pad">
          <h3 className="section-title">Other News</h3>
          <p className="mb-16">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <p className="mb-16">Donec quis sapien pellentesque accumsan eu rutrum nunc.</p>
        </aside>
      </section>
    </Layout>
  );
}
