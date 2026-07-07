function Footer() {
  return (
    <footer className="app-footer mt-auto" style={{ background: 'linear-gradient(180deg, #0d2417 0%, #12311f 100%)', color: '#f8fafc', padding: '54px 20px 44px', textAlign: 'center', borderTop: '1px solid rgba(201,148,26,0.14)' }}>
      <div className="d-flex align-items-center justify-content-center gap-4 mb-4">
        <img src="/usm-logo.png" alt="University of Southern Mindanao" style={{ height: 72 }} />
        <img src="/system-logo.jpeg" alt="USM BoardHub" style={{ height: 52 }} />
      </div>
      <h4 className="fw-bold mb-3" style={{ letterSpacing: '0.3px', textShadow: '0 4px 18px rgba(0,0,0,0.22)' }}>USM BoardHub</h4>
      <p className="mb-4" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.92rem', lineHeight: '1.7' }}>
        A Centralized Board Proposal Management System<br />
        for the University of Southern Mindanao.
      </p>
      <div className="d-flex align-items-center justify-content-center gap-3 flex-wrap mt-2">
        <span className="badge rounded-pill" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.78)', padding: '7px 16px', fontWeight: 600, fontSize: '0.75rem', backdropFilter: 'blur(8px)' }}>Centralized</span>
        <span className="badge rounded-pill" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.78)', padding: '7px 16px', fontWeight: 600, fontSize: '0.75rem', backdropFilter: 'blur(8px)' }}>Trackable</span>
        <span className="badge rounded-pill" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.78)', padding: '7px 16px', fontWeight: 600, fontSize: '0.75rem', backdropFilter: 'blur(8px)' }}>Board-Ready</span>
      </div>
    </footer>
  );
}

export default Footer;
