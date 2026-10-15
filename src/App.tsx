import { useState } from 'react';
import PeerLab from './PeerLab';
import RoomLab from './RoomLab';
import ReadinessLab from './ReadinessLab';
import { initialPage } from './entry';
import type { Page } from './entry';
import { approveNext, makeSession, releaseScreen, requestControl, takeScreen } from './session';
import type { Session } from './session';

type Layout = 'single' | 'split';

function Glyph({ name }: { name: string }) {
  const symbols: Record<string, string> = {
    monitor: '▣', phone: '▯', laptop: '▰', signal: '◉', spark: '✦', arrow: '↗',
  };
  return <span aria-hidden="true">{symbols[name] ?? '◈'}</span>;
}

export default function App() {
  const [view, setView] = useState<Page>(() => initialPage(window.location.search));
  const [layout, setLayout] = useState<Layout>('single');
  const [session, setSession] = useState<Session>(() => makeSession());
  const current = session.participants.find((person) => person.id === session.presenting);
  const next = session.participants.find((person) => person.id === session.requests[0]);

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="/PhiPortal/" aria-label="PhiPortal home"><span className="brand-icon">Φ</span><span>Phi<span className="brand-accent">Portal</span><small>DISPLAY NETWORK</small></span></a>
        <nav aria-label="Primary">
          <button className={view === 'room' ? 'nav-active' : ''} onClick={() => setView('room')}>Control room</button>
          <button className={view === 'lab' ? 'nav-active' : ''} onClick={() => setView('lab')}>WebRTC lab</button>
          <button className={view === 'rooms' ? 'nav-active' : ''} onClick={() => setView('rooms')}>LAN rooms</button>
          <button className={view === 'check' ? 'nav-active' : ''} onClick={() => setView('check')}>Device check</button>
        </nav>
        <a className="repo-link" href="https://github.com/MichaelWave369/PhiPortal" target="_blank" rel="noreferrer">GitHub <Glyph name="arrow" /></a>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span className="glow-dot" /> OPEN SOURCE · LOCAL FIRST · V0.3 TEST CANDIDATE</p>
            <h1>One screen.<br /><span>Everybody connects.</span></h1>
            <p className="lede">A new idea for shared displays: walk up, join a session, and pass the screen around. No cable ceremony required.</p>
            <div className="hero-actions">
              <button className="primary" onClick={() => setView('rooms')}>Try LAN room pairing <Glyph name="arrow" /></button>
              <button className="secondary" onClick={() => setView('room')}>Explore control room</button>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="hero-device"><Glyph name="signal" /><strong>Φ</strong><small>PORTAL ONLINE</small></div>
          </div>
        </section>
        <div className="info-strip">
          <span><b>CONTROL ROOM</b> simulated interaction</span>
          <span><b>WEBRTC LAB</b> real browser-to-browser stream</span>
          <span><b>LAN ROOMS</b> local relay required</span>
        </div>
        {view === 'lab' ? <PeerLab /> : view === 'rooms' ? <RoomLab /> : view === 'check' ? <ReadinessLab /> : (
          <section className="room-grid">
            <div className="panel screen-panel">
              <div className="panel-heading"><div><p className="eyebrow">VIRTUAL DISPLAY 01</p><h2>Living Room</h2></div><span className="pill amber">Interactive simulation</span></div>
              <div className="display-bezel">
                <div className="display-content">
                  <div className="display-top"><span>PHIPORTAL / DEMO</span><span>● ONLINE</span></div>
                  {layout === 'single' ? (
                    <div className="display-center"><div className="display-icon"><Glyph name={current?.device === 'Phone' ? 'phone' : 'monitor'} /></div><h3>{current?.label ?? 'No presenter'}</h3><p>{current ? 'Simulated presenter' : 'Display idle'}</p></div>
                  ) : (
                    <div className="split-display"><div><Glyph name="monitor" /><b>Mikey</b></div><div><Glyph name="phone" /><b>{current?.label ?? 'Idle'}</b></div></div>
                  )}
                  <div className="display-bottom"><span>ROOM: DEMO-369</span><span>NOT LIVE VIDEO</span></div>
                </div>
              </div>
              <div className="screen-controls"><span>Display layout</span><div className="segmented compact"><button className={layout === 'single' ? 'selected' : ''} onClick={() => setLayout('single')}>Single</button><button className={layout === 'split' ? 'selected' : ''} onClick={() => setLayout('split')}>Split preview</button></div></div>
              <p className="muted small">This room is a UI-only design exercise. Handoffs, queue, and split layout do not control actual remote devices. The WebRTC lab is the real streaming experiment.</p>
            </div>
            <div className="sidebar-stack">
              <div className="panel">
                <div className="panel-heading"><div><p className="eyebrow">SESSION PARTICIPANTS</p><h2>Connected devices</h2></div><span className="pill">{session.participants.length} demo</span></div>
                <div className="participant-list">
                  {session.participants.map((guest) => (
                    <div className="participant" key={guest.id}>
                      <div className="participant-avatar"><Glyph name={guest.device === 'Phone' ? 'phone' : guest.device === 'Laptop' ? 'laptop' : 'monitor'} /></div>
                      <div className="participant-meta"><b>{guest.label}</b><small>{guest.device}</small></div>
                      {session.presenting === guest.id ? <span className="presenting-pill">ON SCREEN</span> :
                        <button className="small-btn" onClick={() => setSession((previous) => requestControl(previous, guest.id))} disabled={session.requests.includes(guest.id)}>{session.requests.includes(guest.id) ? 'Queued' : 'Request'}</button>}
                      <button className="icon-button" aria-label={'Host switches to ' + guest.label} title="Simulate host handoff" onClick={() => setSession((previous) => takeScreen(previous, guest.id))}>↗</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <div className="panel-heading"><div><p className="eyebrow">HOST APPROVAL</p><h2>Presentation queue</h2></div><span className="pill">{session.requests.length} waiting</span></div>
                <p className="muted">{next ? next.label + ' is requesting the screen.' : 'No pending requests. Guests can ask to present.'}</p>
                <div className="control-buttons"><button className="primary" onClick={() => setSession(approveNext)} disabled={!next}>Approve next</button><button className="secondary" onClick={() => setSession(releaseScreen)} disabled={!current}>Release screen</button></div>
              </div>
            </div>
            <div className="panel ledger-panel">
              <div className="panel-heading"><div><p className="eyebrow">LOCAL ACTION FEED</p><h2>Session activity</h2></div><span className="pill">Demo only</span></div>
              <div className="feed">{session.history.map((entry, index) => <div className="feed-row" key={index}><span className="feed-mark" /><span>{entry.message}</span><time>{entry.at}</time></div>)}</div>
            </div>
            <div className="panel roadmap-panel">
              <div className="panel-heading"><div><p className="eyebrow">OUR NEXT MILESTONES</p><h2>From mockup to node</h2></div><Glyph name="spark" /></div>
              <div className="milestones"><div><b>01</b><span>Manual WebRTC peer stream</span><span className="tag">Experimental</span></div><div><b>02</b><span>Consent-based room pairing via relay</span><span className="tag">Experimental</span></div><div><b>03</b><span>Raspberry Pi HDMI receiver</span><span className="tag">Planned</span></div><div><b>04</b><span>Native casting / command adapters</span><span className="tag">Research</span></div></div>
            </div>
          </section>
        )}
        <footer>Φ PHIPORTAL <span>Built for shared moments, not walled gardens.</span><span>Experimental software · No device compatibility guaranteed</span></footer>
      </main>
    </div>
  );
}
