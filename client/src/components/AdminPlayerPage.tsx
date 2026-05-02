import React from 'react';

export const AdminPlayerPage: React.FC = () => {
  return (
    <div className="admin-dashboard" dir="rtl">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">▶</div>
          <div>
            <h1>Player</h1>
            <p>Quran Broadcast</p>
          </div>
        </div>
        <nav className="admin-nav">
          <a className="admin-nav-link active" href="/admin/player"><span>▶️</span><span>المشغل</span></a>
          <a className="admin-nav-link" href="/admin"><span>⚙️</span><span>لوحة التحكم</span></a>
          <a className="admin-nav-link" href="/" target="_blank" rel="noreferrer"><span>📺</span><span>OBS النظيف</span></a>
        </nav>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h2 className="mb-1">Player داخل لوحة التحكم</h2>
            <p className="text-muted mb-0">هذه صفحة معاينة وتحكم، وليست رابط OBS النهائي.</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <a className="btn btn-primary rounded-pill px-4" href="/player" target="_blank" rel="noreferrer">فتح Player مستقل</a>
            <a className="btn btn-dark rounded-pill px-4" href="/" target="_blank" rel="noreferrer">فتح OBS</a>
          </div>
        </header>
        <section className="admin-content">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="admin-player-frame">
                <iframe title="Quran Broadcast Player" src="/player" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
