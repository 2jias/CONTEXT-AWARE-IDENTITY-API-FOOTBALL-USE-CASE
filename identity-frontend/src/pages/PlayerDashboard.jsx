import Layout from '../components/Layout';
import PlayerVisibilityEditor from '../components/PlayerVisibilityEditor';

export default function PlayerDashboard() {
  return (
    <Layout>
      <h2 className="page-title">Welcome Player!</h2>
      <div className="center">
        <div className="card card-pad" style={{width: 620}}>
          <h3 className="section-title">Player Profile</h3>
          <PlayerVisibilityEditor />
        </div>
      </div>
    </Layout>
  );
}
