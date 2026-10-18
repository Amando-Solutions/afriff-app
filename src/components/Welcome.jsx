import { useEffect, useRef, useState } from 'react';
import { Check, Download, Eye, Plus, Star } from 'lucide-react';
import { VENUES } from '../data/programme.js';

// First-open welcome cards. Shown once; remembered on this phone.
// Test it again: add ?welcome=1 before the # in the address.

const KEY = 'afriff-welcome-seen';

export function shouldShowWelcome() {
  try {
    if (new URLSearchParams(window.location.search).get('welcome') === '1') return true;
    return localStorage.getItem(KEY) !== '1';
  } catch {
    return false; // storage blocked (private mode): don't nag every visit
  }
}

function remember() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* storage blocked: nothing to do */
  }
}

const dotColor = (i) => VENUES[i % VENUES.length].color;

// ---------- Small illustrations (mini mock-ups of the app) ----------

function NowShowing() {
  const rows = [['4:00', 72], ['6:30', 56], ['7:00', 84], ['9:00', 64]];
  return (
    <div className="wc-card">
      <div className="wc-eyebrow"><span className="wc-live" /> NOW SHOWING</div>
      {rows.map(([t, w], i) => (
        <div key={t} className="wc-row">
          <span className="wc-time">{t}</span>
          <span className="wc-bars"><i style={{ width: `${w}%` }} /><i className="short" style={{ width: `${w - 25}%` }} /></span>
          <span className="dot" style={{ background: dotColor(i), width: 10, height: 10 }} />
        </div>
      ))}
    </div>
  );
}

function PlanDays() {
  return (
    <div className="wc-card">
      <div className="wc-eyebrow gold">SUN 1 NOV</div>
      {[true, true, false].map((added, i) => (
        <div key={i} className="wc-row">
          <span className="wc-time">{['1:30', '4:00', '7:00'][i]}</span>
          <span className="wc-bars"><i style={{ width: `${[70, 58, 80][i]}%` }} /><i className="short" style={{ width: '40%' }} /></span>
          <span className={`wc-round${added ? ' on' : ''}`}>{added ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}</span>
        </div>
      ))}
    </div>
  );
}

function QueueCheck() {
  return (
    <div className="wc-card">
      <div className="wc-eyebrow">IN LINE</div>
      <div className="wc-big">42</div>
      <div className="wc-seats">
        {Array.from({ length: 24 }, (_, i) => <i key={i} className={i % 5 === 3 || i > 19 ? 'free' : ''} />)}
      </div>
      <div className="wc-label">Good chance · 63 seats left</div>
    </div>
  );
}

function SeenIt() {
  return (
    <div className="wc-card">
      <div className="wc-posters">
        {['#E0479E', '#2FB5C9', '#E8C04A'].map((c, i) => (
          <span key={c} className="wc-poster" style={{ background: `linear-gradient(160deg, ${c}, #160b2a)` }}>
            <span className={`wc-seen${i < 2 ? ' on' : ''}`}>{i < 2 ? <Check size={12} strokeWidth={3} /> : <Eye size={12} />}</span>
          </span>
        ))}
      </div>
      <div className="wc-stars">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={18} fill={n <= 4 ? 'currentColor' : 'none'} />)}</div>
      <div className="wc-pill"><Download size={14} /> Export to Letterboxd</div>
    </div>
  );
}

function ShareDay() {
  return (
    <div className="wc-card wc-chat">
      <div className="wc-bubble">
        <strong>My AFRIFF day, Sun 1 Nov:</strong>
        <span>• 1:30 PM: It's the Blackness</span>
        <span>• 7:00 PM: Lady (Opening Night)</span>
        <span className="wc-tick">✓✓</span>
      </div>
    </div>
  );
}

const CARDS = [
  { art: NowShowing, title: 'The whole festival, in your pocket', text: 'Every film, screening and venue of AFRIFF 15, with what\'s on right now.' },
  { art: PlanDays, title: 'Plan your days', text: 'Tap + on any screening to build your own festival schedule.' },
  { art: QueueCheck, title: 'Check the queue before you go', text: 'See how many people are waiting and how many seats are left at each screening.' },
  { art: SeenIt, title: 'Log what you\'ve seen', text: 'Tap Seen it after a film, rate it, and export your list to Letterboxd.' },
  { art: ShareDay, title: 'Share your day on WhatsApp', text: 'Send your plan for the day to friends in one tap.' },
];

export default function Welcome({ onDone }) {
  const track = useRef(null);
  const [index, setIndex] = useState(0);
  const last = index === CARDS.length - 1;

  const finish = () => {
    remember();
    onDone();
  };

  // keep the dots in step with swiping
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (last) return finish();
    const el = track.current;
    el.scrollTo({ left: (index + 1) * el.clientWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="wc" role="dialog" aria-modal="true" aria-label="Welcome to AFRIFF">
      <div className="wc-top">
        <span className="brand"><img src="/logo.svg" alt="" width="32" height="32" /> <span>AFRIFF</span></span>
        {!last && <button type="button" className="wc-skip" onClick={finish}>Skip</button>}
      </div>

      <div className="wc-track" ref={track} onScroll={onScroll}>
        {CARDS.map(({ art: Art, title, text }, i) => (
          <section key={title} className="wc-slide" aria-hidden={i !== index}>
            <div className="wc-art"><Art /></div>
            <h2 className="wc-title">{title}</h2>
            <p className="wc-text">{text}</p>
          </section>
        ))}
      </div>

      <div className="wc-bottom">
        <div className="wc-dots" aria-label={`Card ${index + 1} of ${CARDS.length}`}>
          {CARDS.map((c, i) => <span key={c.title} className={i === index ? 'on' : ''} />)}
        </div>
        <button type="button" className="btn btn-gold wc-next" onClick={next}>{last ? 'Get started' : 'Next'}</button>
      </div>
    </div>
  );
}
