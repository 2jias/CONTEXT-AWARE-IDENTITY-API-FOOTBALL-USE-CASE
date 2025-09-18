import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const nav = useNavigate();
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-logo">Ball</div>
          </div>
          <div className="avatar">👤</div>
        </div>
      </header>

      <div className="container">
        <section className="hero card card-pad">
          <h1>Context-Aware Identity Management for Football Players</h1>
          <p>
            Manage your player profile with full control over what others see.
            Coaches, journalists, and developers can securely access relevant
            information — tailored to their roles.
          </p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => nav('/register')}>JOIN NOW</button>
            <button className="btn" onClick={() => nav('/login')}>LOG IN</button>
          </div>
        </section>

        <section className="grid grid-2">
          <div className="card card-pad">
            <h2 className="section-title">Recent News</h2>
            <p className="mb-16">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris
              consectetur condimentum libero eu condimentum. Donec volutpat
              ultrices magna, at ultrices mauris congue sit amet.
            </p>
            <p className="mb-16">
              Pellentesque at mauris nunc. Donec quis sapien pellentesque
              accumsan eu rutrum nunc.
            </p>
          </div>
          <div className="card card-pad center" style={{minHeight: 260}}>
            {/* Illustration placeholder */}
            <div style={{width:180,height:220,background:'#e2e8f0',borderRadius:12}} />
          </div>
        </section>
      </div>
    </>
  );
}
