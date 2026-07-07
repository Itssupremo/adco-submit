import { useEffect, useRef, useState } from 'react';
import { login as loginApi, loginByEmail as loginByEmailApi } from '../services/api';

const font = "'Montserrat', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";

const FEATURE_PILLS = [
  { icon: 'bi-cloud-arrow-up-fill', label: 'Store' },
  { icon: 'bi-folder2-open', label: 'Organize' },
  { icon: 'bi-send-fill', label: 'Submit' },
  { icon: 'bi-shield-check', label: 'Track' },
];

const MASCOT_IMAGE = '/mascot.png';
const PANEL_BG_IMAGE = '/Usm background.png';

const PANEL_POINTS = [
  'Centralized proposal storage',
  'Board review and approval workflow',
  'Administrative Council submission tracking',
];

const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    if (document.getElementById('gsi-script')) return;
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const focusLogin = () => {
    usernameRef.current?.focus();
  };

  const handleGoogleSignIn = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!window.google || !clientId || clientId.startsWith('YOUR_')) {
      setError('Google Sign-In is not configured. Please contact the administrator.');
      return;
    }

    setGoogleLoading(true);
    setError('');

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile',
      callback: async (tokenResponse) => {
        try {
          if (tokenResponse.error) throw new Error('Google sign-in was cancelled.');
          const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          });
          const info = await resp.json();
          if (!info.email) throw new Error('Could not retrieve email from Google.');
          const res = await loginByEmailApi(info.email);
          onLogin(res.data.user, res.data.token);
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Google sign-in failed.');
        } finally {
          setGoogleLoading(false);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const submittedUsername = (formData.get('username') || username || '').toString().trim();
      const submittedPassword = (formData.get('password') || password || '').toString();
      const res = await loginApi({ username: submittedUsername, password: submittedPassword });
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell" style={{ fontFamily: font }}>
      <style>{`
        .login-shell {
          --brand-navy: #17327e;
          --brand-navy-soft: #3958b8;
          --accent-green: #2f8f63;
          --accent-green-deep: #236f4d;
          --accent-green-soft: #edf8f1;
          --border-soft: #dbe4f4;
          --text-muted: #66789d;
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1.22fr) minmax(390px, 0.78fr);
          background:
            radial-gradient(circle at left top, rgba(102, 117, 236, 0.14), transparent 26%),
            radial-gradient(circle at right top, rgba(59, 143, 99, 0.08), transparent 18%),
            linear-gradient(180deg, #fbfcff 0%, #f4f7fb 100%);
          color: var(--brand-navy);
          overflow: hidden;
        }
        .login-shell * { box-sizing: border-box; }
        .login-visual {
          position: relative;
          padding: 1.7rem 2.25rem 2rem;
          overflow: hidden;
        }
        .login-visual::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(180deg, rgba(251,252,255,0.72) 0%, rgba(244,247,251,0.76) 100%),
            url('${PANEL_BG_IMAGE}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 100%;
          pointer-events: none;
        }
        .login-brand-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 2rem;
          position: relative;
          z-index: 1;
        }
        .login-brand {
          display: flex;
          align-items: center;
          gap: 0.9rem;
        }
        .login-brand img {
          width: 44px;
          height: 44px;
          object-fit: contain;
        }
        .login-brand-name {
          font-size: 1.1rem;
          line-height: 0.95;
          letter-spacing: -0.04em;
          font-weight: 900;
        }
        .login-brand-name span { display: block; }
        .login-nav {
          display: flex;
          align-items: center;
          gap: 1.8rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .login-nav a {
          color: var(--brand-navy);
          text-decoration: none;
          font-size: 0.94rem;
          font-weight: 700;
          opacity: 0.92;
        }
        .login-nav button {
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--accent-green-deep) 0%, var(--accent-green) 100%);
          color: #fff;
          min-width: 96px;
          height: 48px;
          padding: 0 1.2rem;
          font-size: 0.94rem;
          font-weight: 800;
          box-shadow: 0 14px 28px rgba(47, 143, 99, 0.22);
          cursor: pointer;
        }
        .login-copy {
          position: relative;
          z-index: 2;
          max-width: 620px;
          padding-top: 2.6rem;
        }
        .login-copy h1 {
          margin: 0;
          font-size: clamp(3.2rem, 7vw, 5.8rem);
          line-height: 0.92;
          letter-spacing: -0.075em;
          font-weight: 900;
          color: var(--brand-navy);
        }
        .login-copy p {
          margin: 1.5rem 0 0;
          max-width: 30rem;
          font-size: 1.22rem;
          line-height: 1.45;
          color: var(--text-muted);
          font-weight: 500;
        }
        .login-pills {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 108px));
          gap: 0.9rem;
          margin-top: 1.85rem;
        }
        .login-copy-support {
          margin-top: 1.5rem;
          max-width: 31rem;
        }
        .login-copy-support p {
          margin: 0;
          color: var(--text-muted);
          font-size: 1rem;
          line-height: 1.6;
          font-weight: 500;
        }
        .login-pill {
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(214, 222, 241, 0.95);
          border-radius: 22px;
          box-shadow: 0 12px 26px rgba(108, 120, 185, 0.08);
          text-align: center;
          padding: 0.82rem 0.6rem 0.76rem;
        }
        .login-pill-icon {
          width: 42px;
          height: 42px;
          margin: 0 auto 0.55rem;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          color: var(--accent-green);
          background: linear-gradient(180deg, #f4faf6 0%, #ecf7f0 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.85), 0 8px 16px rgba(102, 148, 119, 0.12);
        }
        .login-pill span {
          display: block;
          font-size: 0.94rem;
          font-weight: 800;
          color: var(--brand-navy);
        }
        .login-stage {
          position: absolute;
          right: 0.5rem;
          bottom: 0;
          width: min(54vw, 720px);
          height: min(66vh, 760px);
          min-height: 480px;
          pointer-events: none;
        }
        .login-stage-star,
        .login-mascot-image {
          position: absolute;
        }
        @keyframes starPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes mascotFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes panelReveal {
          0% { opacity: 0; transform: translateY(18px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fieldGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(47, 143, 99, 0); }
          50% { box-shadow: 0 0 0 8px rgba(47, 143, 99, 0.05); }
        }
        @keyframes badgePulse {
          0%, 100% { box-shadow: 0 0 0 5px rgba(47, 143, 99, 0.12); }
          50% { box-shadow: 0 0 0 9px rgba(47, 143, 99, 0.06); }
        }
        .login-stage-star {
          color: rgba(155, 165, 236, 0.8);
          font-size: 1rem;
          animation: starPulse 4.2s ease-in-out infinite;
        }
        .login-stage-star.star-a { top: 14%; left: 58%; }
        .login-stage-star.star-b { top: 22%; left: 46%; animation-delay: -1.4s; }
        .login-stage-star.star-c { top: 18%; right: 18%; animation-delay: -2.6s; }
        .login-mascot-image {
          left: 10%;
          bottom: -1%;
          width: min(76%, 580px);
          max-height: 92%;
          object-fit: contain;
          filter: drop-shadow(0 28px 40px rgba(57, 79, 171, 0.16));
          animation: mascotFloat 6s ease-in-out infinite;
        }
        .login-panel {
          position: relative;
          background: linear-gradient(180deg, #17327e 0%, #050e29 100%);
          border-left: 1px solid rgba(220, 229, 239, 0.88);
          box-shadow: -18px 0 44px rgba(96, 107, 171, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.25rem 1.6rem;
          overflow: hidden;
        }
        .login-card {
          width: 100%;
          max-width: 410px;
          background: rgba(255,255,255,0.96);
          border: 1px solid rgba(214, 225, 240, 0.96);
          border-radius: 28px;
          box-shadow: 0 20px 42px rgba(105, 117, 181, 0.1);
          padding: 1.8rem 1.5rem 1.35rem;
          backdrop-filter: blur(8px);
          animation: panelReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          z-index: 1;
        }
        .login-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 0.55rem 0.8rem;
          border-radius: 999px;
          background: var(--accent-green-soft);
          border: 1px solid #cfead9;
          color: var(--accent-green-deep);
          font-size: 0.78rem;
          font-weight: 800;
        }
        .login-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-green);
          box-shadow: 0 0 0 5px rgba(47, 143, 99, 0.12);
          animation: badgePulse 2.4s ease-in-out infinite;
        }
        .login-card h2 {
          margin: 0;
          color: var(--brand-navy);
          font-size: 1.92rem;
          line-height: 1.02;
          letter-spacing: -0.05em;
          font-weight: 900;
        }
        .login-card p {
          margin: 0.72rem 0 0;
          color: var(--text-muted);
          font-size: 0.96rem;
          line-height: 1.55;
        }
        .login-points {
          margin: 1rem 0 1.2rem;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 0.68rem;
        }
        .login-points li {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          color: #496087;
          font-size: 0.88rem;
          font-weight: 600;
        }
        .login-points i { color: var(--accent-green); }
        .login-copy-support .login-points {
          margin: 0.95rem 0 0;
          gap: 0.62rem;
        }
        .login-copy-support .login-points li {
          color: #486083;
        }
        .login-error {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1rem;
          padding: 0.8rem 0.95rem;
          border-radius: 16px;
          border: 1px solid #ffcccc;
          background: #fff1f1;
          color: #d73939;
          font-size: 0.86rem;
          font-weight: 600;
        }
        .login-form {
          display: grid;
          gap: 0.95rem;
        }
        .login-field label {
          display: block;
          margin-bottom: 0.42rem;
          color: #5c6f90;
          font-size: 0.74rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .login-input-wrap { position: relative; }
        .login-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1rem;
          color: #9aa6c7;
          transition: color 0.18s ease;
        }
        .login-input-wrap:focus-within .login-input-icon {
          color: #6675ec;
        }
        .login-input,
        .login-toggle,
        .login-submit,
        .login-google {
          font-family: ${font};
        }
        .login-input {
          width: 100%;
          height: 54px;
          border-radius: 16px;
          border: 1.5px solid var(--border-soft);
          background: #f8fbf8;
          padding: 0 46px 0 42px;
          color: var(--brand-navy);
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .login-input:focus {
          border-color: var(--accent-green);
          background: #fff;
          box-shadow: 0 0 0 4px rgba(47, 143, 99, 0.12);
          animation: fieldGlow 1.6s ease-in-out 1;
        }
        .login-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: #91a38f;
          cursor: pointer;
          padding: 0;
        }
        .login-submit {
          width: 100%;
          height: 56px;
          border: none;
          border-radius: 18px;
          color: #fff;
          background: linear-gradient(135deg, var(--accent-green-deep) 0%, var(--accent-green) 100%);
          font-size: 1rem;
          font-weight: 800;
          box-shadow: 0 14px 24px rgba(47, 143, 99, 0.2);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .login-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 18px 28px rgba(47, 143, 99, 0.24);
          filter: saturate(1.05);
        }
        .login-submit:disabled,
        .login-google:disabled { cursor: not-allowed; opacity: 0.76; box-shadow: none; }
        .login-divider {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          margin: 1rem 0;
        }
        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e3e9ef;
        }
        .login-divider span {
          color: #91a0ad;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }
        .login-google {
          width: 100%;
          height: 52px;
          border-radius: 16px;
          border: 1.5px solid var(--border-soft);
          background: #fff;
          color: #365083;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.7rem;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .login-google:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: #c9d9d0;
          box-shadow: 0 12px 22px rgba(116, 138, 130, 0.08);
        }
        .login-footer {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eef3ef;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          color: #7b8c89;
          font-size: 0.78rem;
          text-align: center;
        }
        .login-footer strong { color: var(--accent-green-deep); }
        @media (prefers-reduced-motion: reduce) {
          .login-stage-star,
          .login-mascot-image,
          .login-card,
          .login-badge-dot,
          .login-input:focus {
            animation: none !important;
          }
          .login-submit,
          .login-google {
            transition: none !important;
          }
        }
        @media (max-width: 1100px) {
          .login-shell {
            grid-template-columns: 1fr;
          }
          .login-panel {
            border-left: none;
            border-top: 1px solid rgba(214, 221, 244, 0.88);
            box-shadow: none;
          }
          .login-visual {
            min-height: 820px;
          }
          .login-stage {
            left: 50%;
            right: auto;
            transform: translateX(-50%);
            width: min(90vw, 720px);
          }
        }
        @media (max-width: 760px) {
          .login-visual {
            padding: 1rem 1rem 1.5rem;
            min-height: 700px;
          }
          .login-brand-row {
            flex-direction: column;
            align-items: flex-start;
            margin-bottom: 1rem;
          }
          .login-nav {
            gap: 1rem;
            justify-content: flex-start;
          }
          .login-copy {
            padding-top: 0.5rem;
          }
          .login-copy p {
            font-size: 1.05rem;
          }
          .login-copy-support {
            max-width: 100%;
          }
          .login-pills {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            max-width: 320px;
          }
          .login-stage {
            width: 100%;
            min-height: 360px;
            height: 400px;
            bottom: -0.5rem;
          }
          .login-mascot-image {
            left: 4%;
            width: min(88%, 390px);
          }
          .login-panel {
            padding: 1rem;
          }
          .login-card {
            padding: 1.5rem 1rem 1.2rem;
          }
        }
      `}</style>

      <section className="login-visual">
        <div className="login-brand-row">
          <div className="login-brand">
            <img src="/system-logo.jpeg" alt="USM BoardHub" />
            <div className="login-brand-name">
              <span>USM</span>
              <span>BoardHUB</span>
            </div>
          </div>

          <div className="login-nav">
            <a href="#about">About</a>
            <a href="#workflow">How it Works</a>
            <a href="#login-card">FAQ</a>
            <button type="button" onClick={focusLogin}>Login</button>
          </div>
        </div>

        <div className="login-copy" id="about">
          <h1>
            USM<br />
            BoardHUB
          </h1>
          <p>
            The centralized storage and submission system for Board of Regents-related Documents.
          </p>

          <div className="login-pills" id="workflow">
            {FEATURE_PILLS.map((item) => (
              <div key={item.label} className="login-pill">
                <div className="login-pill-icon"><i className={`bi ${item.icon}`} /></div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="login-copy-support">
            <p>Access the board proposal workspace for review, submission, and tracking.</p>
            <ul className="login-points">
              {PANEL_POINTS.map((point) => (
                <li key={point}><i className="bi bi-check-circle-fill" />{point}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="login-stage" aria-hidden="true">
          <div className="login-stage-star star-a">✦</div>
          <div className="login-stage-star star-b">✦</div>
          <div className="login-stage-star star-c">✦</div>

          <img className="login-mascot-image" src={MASCOT_IMAGE} alt="USM BoardHub mascot" />
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card" id="login-card">
          <div className="login-badge">
            <span className="login-badge-dot" />
            System Active
          </div>

          <h2>Login to BoardHub</h2>
          <p>Sign in to continue managing proposals, reviews, and submission updates.</p>

          {error ? (
            <div className="login-error">
              <i className="bi bi-exclamation-circle-fill" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-username">Username</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <i className="bi bi-person" />
                </span>
                <input
                  ref={usernameRef}
                  id="login-username"
                  className="login-input"
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <i className="bi bi-lock" />
                </span>
                <input
                  id="login-password"
                  className="login-input"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-toggle"
                  onClick={() => setShowPass((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm" style={{ width: 16, height: 16, marginRight: 8 }} /> Signing in...</>
              ) : (
                <>Sign In <i className="bi bi-arrow-right-short" style={{ fontSize: '1.2rem', verticalAlign: 'middle' }} /></>
              )}
            </button>
          </form>

          <div className="login-divider"><span>OR</span></div>

          <button type="button" className="login-google" onClick={handleGoogleSignIn} disabled={googleLoading}>
            {googleLoading ? (
              <><span className="spinner-border spinner-border-sm" style={{ width: 16, height: 16 }} /> Signing in with Google...</>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="login-footer">
            <LockIcon />
            <span>Secured by <strong>USM BoardHub Auth</strong></span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Login;
