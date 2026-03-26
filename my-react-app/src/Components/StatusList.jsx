// StatusList.jsx  — vertical bubble list + WhatsApp-style fullscreen viewer
import React, { useEffect, useState, useRef, useCallback } from "react";
import API from "../api";

const BASE = "http://localhost:5000";
const STORY_MS = 5000; // 5 s per image

/* ── helpers ── */
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function Ava({ user, size = 42 }) {
  const src = user?.profilePic
    ? `${BASE}${user.profilePic}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "?")}&background=6366f1&color=fff&size=${size * 2}&bold=true&font-size=0.38`;
  return (
    <img src={src} alt={user?.name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }} />
  );
}
function groupByUser(list) {
  const m = new Map();
  list.forEach(s => {
    const uid = s.user?._id || s.user;
    if (!m.has(uid)) m.set(uid, { user: s.user, items: [] });
    m.get(uid).items.push(s);
  });
  return [...m.values()];
}

/* ═══════════════════════════════════════════════════════════════ */
export default function StatusList({ token, currentUserId }) {
  const [statuses,  setStatuses]  = useState([]); //All statuses
  const [groupIdx,  setGroupIdx]  = useState(null); //index of all statuses 1, 2 etx
  const [slideIdx,  setSlideIdx]  = useState(0); // which slide in opneed in a specific status
  const [pct,       setPct]       = useState(0); //progress 0, 50, 100
  const [paused,    setPaused]    = useState(false); //pause the story
  const [panel,     setPanel]     = useState(null); // which panel is opened, comments.likes
  const [comment,   setComment]   = useState(""); // Stores user text
  const [sending,   setSending]   = useState(false);

  /* refs – never trigger re-renders */
  const rafRef     = useRef(null);
  const startTs    = useRef(null);
  const doneMs     = useRef(0);
  const pausedRef  = useRef(false);
  const panelRef   = useRef(null);
  const holdRef    = useRef(false);
  const holdTimer  = useRef(null);
  const groupsRef  = useRef([]);
  const slideRef   = useRef(0);
  const groupRef   = useRef(null);
  const isVideoRef = useRef(false);

  /* ── load ── */
  const load = useCallback(async () => {
    try {
      const r = await API.get("/status", { headers: { Authorization: `Bearer ${token}` } });
      setStatuses(r.data);
    } catch (e) { console.error(e); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const groups = groupByUser(statuses);
  useEffect(() => { groupsRef.current = groups; });
  useEffect(() => { slideRef.current  = slideIdx; }, [slideIdx]);
  useEffect(() => { groupRef.current  = groupIdx; }, [groupIdx]);

  /* ── timer (rAF-based) ── */
  const stopTimer = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    if (isVideoRef.current) return;
    startTs.current = performance.now();
    const tick = (now) => {
      if (pausedRef.current || panelRef.current) return;
      const total = doneMs.current + (now - startTs.current);
      const p = Math.min(100, (total / STORY_MS) * 100);
      setPct(p);
      if (total >= STORY_MS) {
        doneMs.current = 0;
        const gi = groupRef.current, si = slideRef.current, gs = groupsRef.current;
        if (gi === null || !gs[gi]) return;
        if (si < gs[gi].items.length - 1)  { setSlideIdx(si + 1); }
        else if (gi < gs.length - 1)       { _open(gi + 1, 0); }
        else                               { _close(); }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopTimer]); // eslint-disable-line

  const doPause = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    setPaused(true);
    if (startTs.current) doneMs.current += performance.now() - startTs.current;
    stopTimer();
  }, [stopTimer]);

  const doResume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);
    startTs.current = performance.now();
    startTimer();
  }, [startTimer]);

  /* ── mark viewed ── */
  const markViewed = async (st) => {
    try {
      const r = await API.post(`/status/view/${st._id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const upd = r.data;
      setStatuses(p => p.map(s => s._id === upd._id ? upd : s));
    } catch (e) { console.error(e); }
  };

  /* ── open / close ── */
  const _open = (gi, si = 0) => {
    stopTimer();
    doneMs.current = 0;
    setGroupIdx(gi); setSlideIdx(si); setPct(0);
    setPaused(false); pausedRef.current = false;
    setPanel(null); panelRef.current = null;
    setComment("");
    const st = groupsRef.current[gi]?.items?.[si];
    if (st) markViewed(st);
  };
  const _close = () => {
    stopTimer();
    setGroupIdx(null); setSlideIdx(0); setPct(0);
    doneMs.current = 0;
    setPanel(null); panelRef.current = null;
    setComment("");
  };
  const openGroup  = useCallback(_open,  []); // eslint-disable-line
  const closeModal = useCallback(_close, []); // eslint-disable-line

  /* restart timer on slide change */
  useEffect(() => {
    if (groupIdx === null) return;
    doneMs.current = 0; setPct(0); setPaused(false); pausedRef.current = false;
    const st = groupsRef.current[groupIdx]?.items?.[slideIdx];
    isVideoRef.current = st?.fileType === "video";
    if (!isVideoRef.current && !panelRef.current) startTimer();
    if (st) markViewed(st);
  }, [groupIdx, slideIdx]); // eslint-disable-line

  /* panel opens → pause; closes → resume */
  useEffect(() => {
    panelRef.current = panel;
    if (panel) doPause(); else doResume();
  }, [panel]); // eslint-disable-line

  const goSlide = (si) => { stopTimer(); doneMs.current = 0; setSlideIdx(si); setPct(0); };

  /* ── hold to pause ── */
  const onPointerDown = (e) => {
    if (e.target.closest("button,input,textarea,.sv-bars")) return;
    holdRef.current = false;
    holdTimer.current = setTimeout(() => { holdRef.current = true; doPause(); }, 150);
  };
  const onPointerUp = () => {
    clearTimeout(holdTimer.current);
    if (holdRef.current) { holdRef.current = false; doResume(); }
  };

  /* ── tap navigation ── */
  const tapLeft = () => {
    if (holdRef.current) return;
    const gi = groupRef.current, si = slideRef.current, gs = groupsRef.current;
    if (si > 0) goSlide(si - 1);
    else if (gi > 0) openGroup(gi - 1, 0);
  };
  const tapRight = () => {
    if (holdRef.current) return;
    const gi = groupRef.current, si = slideRef.current, gs = groupsRef.current;
    const grp = gs[gi]; if (!grp) return;
    if (si < grp.items.length - 1) goSlide(si + 1);
    else if (gi < gs.length - 1)   openGroup(gi + 1, 0);
    else                           closeModal();
  };

  /* ── actions ── */
  const handleLike = async () => {
    const st = groupsRef.current[groupRef.current]?.items?.[slideRef.current];
    if (!st) return;
    try {
      const r = await API.post(`/status/like/${st._id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const likes = r.data.likes;
      setStatuses(p => p.map(s => s._id === st._id ? { ...s, likes } : s));
    } catch (e) { console.error(e); }
  };
  const handleComment = async () => {
    const st = groupsRef.current[groupRef.current]?.items?.[slideRef.current];
    if (!comment.trim() || !st) return;
    setSending(true);
    try {
      const r = await API.post(`/status/comment/${st._id}`, { text: comment }, { headers: { Authorization: `Bearer ${token}` } });
      const comments = r.data.comments;
      setStatuses(p => p.map(s => s._id === st._id ? { ...s, comments } : s));
      setComment("");
    } catch (e) { console.error(e); }
    setSending(false);
  };

  /* ── derived ── */
  const activeGroup   = groupIdx !== null ? groups[groupIdx] : null;
  const currentStatus = statuses.find(s => s._id === activeGroup?.items?.[slideIdx]?._id) || activeGroup?.items?.[slideIdx];
  const isOwn  = (currentStatus?.user?._id || currentStatus?.user) === currentUserId;
  const liked  = currentStatus?.likes?.some(l => (l?._id || l) === currentUserId);
  const allSeen = (grp) => grp.items.every(s => s.viewers?.some(v => (v?._id || v) === currentUserId));

  const panelItems =
    panel === "comments" ? (currentStatus?.comments || []) :
    panel === "likes"    ? (currentStatus?.likes    || []) :
                           (currentStatus?.viewers  || []);

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .sl { font-family: 'Outfit', sans-serif; }

        /* ─── Vertical list ─── */
        .sl-card {
          background: #fff;
          border: 1px solid #eaedf5;
          border-radius: 20px;
          box-shadow: 0 2px 16px rgba(99,102,241,.07);
          overflow: hidden;
        }
        .sl-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px 10px;
          border-bottom: 1px solid #f0f1f8;
        }
        .sl-title {
          font-size: 11px; font-weight: 800; letter-spacing: .12em;
          text-transform: uppercase; color: #9ca3af;
        }
        .sl-count {
          font-size: 11px; font-weight: 800; color: #6366f1;
          background: #eef0ff; padding: 2px 10px; border-radius: 20px;
        }

        /* Each user row */
        .sl-row {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 18px;
          cursor: pointer;
          border-bottom: 1px solid #f7f8fc;
          transition: background .15s;
          position: relative;
        }
        .sl-row:last-child { border-bottom: none; }
        .sl-row:hover { background: #f8f9ff; }
        .sl-row::after {
          content: '›';
          position: absolute; right: 18px;
          color: #d1d5db; font-size: 20px; font-weight: 300;
        }

        /* Ring */
        .sl-ring-w { position: relative; flex-shrink: 0; }
        .sl-ring {
          padding: 2.5px; border-radius: 50%;
          background: conic-gradient(#25d366, #128c7e, #075e54, #25d366);
          animation: spinR 4s linear infinite;
        }
        .sl-ring.seen { background: #dde0f0; animation: none; }
        @keyframes spinR { to { transform: rotate(360deg); } }
        .sl-ring-in {
          border-radius: 50%; overflow: hidden;
          border: 2.5px solid #fff;
          width: 54px; height: 54px;
        }
        .sl-ring-in img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .sl-ring-cnt {
          position: absolute; bottom: -2px; right: -2px;
          background: #6366f1; color: #fff;
          font-size: 9px; font-weight: 800;
          width: 19px; height: 19px; border-radius: 50%; border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
        }

        /* Row text */
        .sl-info { flex: 1; min-width: 0; }
        .sl-uname {
          font-size: 15px; font-weight: 700; color: #1a1a2e;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sl-umeta {
          font-size: 12px; color: #9ca3af; font-weight: 500; margin-top: 2px;
        }
        /* unseen dot */
        .sl-unseen-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: #6366f1; flex-shrink: 0; margin-right: 22px;
        }

        .sl-empty {
          padding: 32px 20px; text-align: center;
          color: #c4c9de; font-size: 13px; font-weight: 600;
        }

        /* ═══════════════════════════════════════
           FULLSCREEN STORY VIEWER
        ═══════════════════════════════════════ */
        .sv {
          position: fixed; inset: 0; z-index: 9999;
          background: #000;
          display: flex; align-items: center; justify-content: center;
          touch-action: none;
        }
        .sv-story {
          position: relative;
          width: 100%; max-width: 430px;
          height: 100dvh; max-height: 900px;
          background: #111; overflow: hidden;
          user-select: none; -webkit-user-select: none;
        }

        /* Media */
        .sv-media {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: #0a0a14;
        }
        .sv-media img,
        .sv-media video {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }

        /* Gradient overlays */
        .sv-gtop {
          position: absolute; top: 0; left: 0; right: 0; height: 200px;
          background: linear-gradient(180deg, rgba(0,0,0,.75) 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }
        .sv-gbot {
          position: absolute; bottom: 0; left: 0; right: 0; height: 260px;
          background: linear-gradient(0deg, rgba(0,0,0,.85) 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }

        /* ── Progress bars (WhatsApp style) ── */
        .sv-bars {
          position: absolute; top: 0; left: 0; right: 0;
          display: flex; gap: 3px;
          padding: 10px 10px 0; z-index: 10;
        }
        .sv-bar {
          flex: 1; height: 3px; border-radius: 3px;
          background: rgba(255,255,255,.30); overflow: hidden;
          cursor: pointer;
        }
        .sv-bar-fill {
          height: 100%; background: #fff; border-radius: 3px;
          transition: width 30ms linear;
        }

        /* ── Header ── */
        .sv-head {
          position: absolute; top: 0; left: 0; right: 0;
          display: flex; align-items: center; gap: 10px;
          padding: 36px 14px 0; z-index: 10; pointer-events: none;
        }
        .sv-head > * { pointer-events: auto; }
        .sv-hname  { font-size: 14px; font-weight: 800; color: #fff; }
        .sv-htime  { font-size: 11px; color: rgba(255,255,255,.65); font-weight: 500; }
        .sv-hbtns  { margin-left: auto; display: flex; gap: 6px; }
        .sv-ibtn {
          width: 34px; height: 34px; border-radius: 50%; border: none;
          background: rgba(255,255,255,.15); color: #fff; font-size: 16px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(6px); transition: background .15s;
        }
        .sv-ibtn:hover { background: rgba(255,255,255,.28); }
        .sv-ibtn.close:hover { background: rgba(239,68,68,.5); }

        /* ── Pause pill ── */
        .sv-hold-pill {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0,0,0,.62); color: #fff;
          border-radius: 50px; padding: 10px 22px;
          font-size: 14px; font-weight: 800; letter-spacing: .02em;
          display: flex; align-items: center; gap: 8px;
          z-index: 10; pointer-events: none;
          backdrop-filter: blur(8px);
          animation: fadeIn .15s ease both;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        /* ── Tap zones ── */
        .sv-tl, .sv-tr {
          position: absolute; top: 0; bottom: 0; width: 38%; z-index: 5; cursor: pointer;
        }
        .sv-tl { left: 0; }
        .sv-tr { right: 0; }

        /* ── Caption ── */
        .sv-cap {
          position: absolute; bottom: 130px; left: 0; right: 0;
          padding: 0 18px; z-index: 8; pointer-events: none;
        }
        .sv-cap-name {
          font-size: 13px; font-weight: 800; color: rgba(255,255,255,.75);
          margin-bottom: 4px;
        }
        .sv-cap-text {
          font-size: 15px; font-weight: 600; color: #fff; line-height: 1.6;
          text-shadow: 0 1px 8px rgba(0,0,0,.7);
        }

        /* ── Bottom bar ── */
        .sv-bottom {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 0 14px 26px; z-index: 10;
          display: flex; flex-direction: column; gap: 10px;
        }

        /* Owner insights pills */
        .sv-insights {
          display: flex; gap: 6px; flex-wrap: wrap;
        }
        .sv-ins-pill {
          display: flex; align-items: center; gap: 5px;
          padding: 7px 14px; border-radius: 50px;
          border: 1px solid rgba(255,255,255,.25);
          background: rgba(255,255,255,.10); color: #fff;
          font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700;
          cursor: pointer; backdrop-filter: blur(6px);
          transition: background .15s, transform .12s;
        }
        .sv-ins-pill:hover { background: rgba(255,255,255,.22); transform: translateY(-1px); }
        .sv-ins-pill.active { background: rgba(99,102,241,.45); border-color: #a78bfa; }

        /* Quick row: input + buttons */
        .sv-qrow { display: flex; align-items: center; gap: 8px; }
        .sv-qfield {
          flex: 1; display: flex; align-items: center;
          background: rgba(255,255,255,.12);
          border: 1.5px solid rgba(255,255,255,.25); border-radius: 50px;
          backdrop-filter: blur(10px); transition: all .15s;
        }
        .sv-qfield:focus-within {
          background: rgba(255,255,255,.20); border-color: rgba(255,255,255,.55);
        }
        .sv-qin {
          flex: 1; border: none; outline: none; background: transparent;
          padding: 10px 14px; color: #fff;
          font-family: 'Outfit', sans-serif; font-size: 13.5px; font-weight: 500;
        }
        .sv-qin::placeholder { color: rgba(255,255,255,.52); }
        .sv-qsend {
          width: 34px; height: 34px; border-radius: 50%; border: none; margin: 3px;
          background: linear-gradient(135deg, #25d366, #128c7e);
          color: #fff; font-size: 14px; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(37,211,102,.45);
          transition: opacity .18s, transform .15s;
        }
        .sv-qsend:hover:not(:disabled) { opacity: .88; transform: scale(1.08); }
        .sv-qsend:disabled { opacity: .3; cursor: not-allowed; }

        /* reaction buttons */
        .sv-rbtn {
          width: 42px; height: 42px; border-radius: 50%; border: none; flex-shrink: 0;
          background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.22);
          color: #fff; font-size: 20px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(6px); transition: background .15s, transform .15s;
        }
        .sv-rbtn:hover { background: rgba(255,255,255,.25); transform: scale(1.1); }
        .sv-rbtn.liked { background: rgba(244,63,94,.35); border-color: rgba(244,63,94,.6); }
        .sv-rbtn.panel-on { background: rgba(99,102,241,.4); border-color: #a78bfa; }

        /* ═══════════════════════════════════════
           SLIDE-UP PANEL
        ═══════════════════════════════════════ */
        .sv-pbd {
          position: absolute; inset: 0; z-index: 20;
          background: rgba(0,0,0,.45); backdrop-filter: blur(3px);
          display: flex; align-items: flex-end;
          animation: bdIn .2s ease both;
        }
        @keyframes bdIn { from{opacity:0} to{opacity:1} }
        .sv-panel {
          width: 100%; background: #fff;
          border-radius: 24px 24px 0 0; max-height: 70dvh;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 -8px 40px rgba(0,0,0,.3);
          animation: panUp .28s cubic-bezier(.34,1.36,.64,1) both;
        }
        @keyframes panUp { from{transform:translateY(70px);opacity:0} to{transform:none;opacity:1} }

        /* Panel drag handle */
        .sv-phandle {
          width: 40px; height: 4px; background: #e4e7f0; border-radius: 4px;
          margin: 10px auto 0; flex-shrink: 0;
        }

        .sv-ph {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px 12px; border-bottom: 1px solid #f0f1f8; flex-shrink: 0;
        }
        .sv-ph-title { font-size: 15px; font-weight: 800; color: #1a1a2e; }
        .sv-ph-close {
          width: 28px; height: 28px; border-radius: 50%;
          background: #f4f5fb; border: none; color: #6b7280;
          font-size: 13px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s, color .15s;
        }
        .sv-ph-close:hover { background: #fff0f0; color: #ef4444; }

        /* Panel tabs (owner) */
        .sv-ptabs { display: flex; border-bottom: 1px solid #f0f1f8; flex-shrink: 0; }
        .sv-ptab {
          flex: 1; padding: 10px 4px; border: none;
          border-bottom: 2.5px solid transparent; background: none;
          font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 800;
          letter-spacing: .06em; text-transform: uppercase; color: #b0b7c9;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;
          transition: color .15s, border-color .15s;
        }
        .sv-ptab.on { color: #6366f1; border-bottom-color: #6366f1; background: #f7f8ff; }
        .sv-ptab-n {
          background: #6366f1; color: #fff; border-radius: 20px;
          font-size: 9px; font-weight: 800; padding: 1px 6px; line-height: 1.6;
        }

        /* Panel body */
        .sv-pbody { overflow-y: auto; flex: 1; }
        .sv-pbody::-webkit-scrollbar { width: 3px; }
        .sv-pbody::-webkit-scrollbar-thumb { background: #e4e7f0; border-radius: 3px; }

        /* Person row */
        .sv-prow {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 18px; border-bottom: 1px solid #f7f8fc;
          transition: background .12s;
        }
        .sv-prow:hover { background: #f8f9ff; }
        .sv-prow-name { font-size: 13.5px; font-weight: 700; color: #1a1a2e; flex: 1; }
        .sv-ptag {
          font-size: 10.5px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
        }
        .sv-ptag.liked  { background: #fff0f3; color: #f43f5e; }
        .sv-ptag.viewed { background: #f0f1ff; color: #6366f1; }

        /* Comment row */
        .sv-crow {
          display: flex; gap: 10px; padding: 11px 18px; border-bottom: 1px solid #f7f8fc;
        }
        .sv-crow-b { flex: 1; min-width: 0; }
        .sv-crow-n { font-size: 12px; font-weight: 800; color: #6366f1; margin-bottom: 2px; }
        .sv-crow-t { font-size: 13.5px; color: #2d2d3a; font-weight: 500; line-height: 1.45; }
        .sv-crow-d { font-size: 10.5px; color: #b0b7c9; margin-top: 3px; }

        .sv-empty {
          padding: 40px 20px; text-align: center; color: #c4c9de; font-size: 13.5px; font-weight: 600;
        }

        /* Comment input in panel */
        .sv-pinput {
          display: flex; gap: 9px; align-items: center;
          padding: 10px 14px; border-top: 1px solid #f0f1f8; flex-shrink: 0;
        }
        .sv-pcin {
          flex: 1; background: #f8f9ff; border: 1.5px solid #e4e7f0; border-radius: 50px;
          padding: 9px 16px; font-family: 'Outfit', sans-serif; font-size: 13.5px;
          font-weight: 500; color: #1a1a2e; outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .sv-pcin:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.10); background: #fff; }
        .sv-pcin::placeholder { color: #c4c9de; }
        .sv-psend {
          width: 36px; height: 36px; border-radius: 50%; border: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
          font-size: 15px; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 10px rgba(99,102,241,.35);
          transition: opacity .18s, transform .15s;
        }
        .sv-psend:hover:not(:disabled) { opacity: .88; transform: scale(1.08); }
        .sv-psend:disabled { opacity: .35; cursor: not-allowed; }

        @media (max-width: 480px) {
          .sv-story { max-width: 100%; max-height: none; border-radius: 0; }
        }
      `}</style>

      {/* ═══════════════════════════════════════
          VERTICAL LIST
      ═══════════════════════════════════════ */}
      <div className="sl">
        <div className="sl-card">
          <div className="sl-head">
            <span className="sl-title">Status</span>
            {groups.length > 0 && <span className="sl-count">{groups.length} updates</span>}
          </div>

          {groups.length === 0
            ? <div className="sl-empty">✨ No status updates yet</div>
            : groups.map((grp, gi) => {
                const seen = allSeen(grp);
                const latest = grp.items[0];
                return (
                  <div key={grp.user?._id} className="sl-row" onClick={() => openGroup(gi, 0)}>
                    <div className="sl-ring-w">
                      <div className={`sl-ring${seen ? " seen" : ""}`}>
                        <div className="sl-ring-in">
                          <Ava user={grp.user} size={50} />
                        </div>
                      </div>
                      {grp.items.length > 1 && <div className="sl-ring-cnt">{grp.items.length}</div>}
                    </div>

                    <div className="sl-info">
                      <div className="sl-uname">{grp.user?.name}</div>
                      <div className="sl-umeta">
                        {grp.items.length} update{grp.items.length > 1 ? "s" : ""} · {timeAgo(latest.createdAt)}
                        {latest.caption && ` · "${latest.caption.slice(0, 30)}${latest.caption.length > 30 ? "…" : ""}"`}
                      </div>
                    </div>

                    {!seen && <div className="sl-unseen-dot" />}
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* ═══════════════════════════════════════
          FULLSCREEN VIEWER
      ═══════════════════════════════════════ */}
      {groupIdx !== null && currentStatus && (() => {
        const grp = groups[groupIdx];
        const panelTitle =
          panel === "comments" ? "💬 Comments" :
          panel === "likes"    ? "❤️ Likes"    : "👁 Viewers";

        return (
          <div className="sv">
            <div
              className="sv-story"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onContextMenu={e => e.preventDefault()}
            >
              {/* Media */}
              <div className="sv-media">
                {currentStatus.fileType === "image"
                  ? <img key={currentStatus._id} src={`${BASE}${currentStatus.file}`} alt="" draggable={false} />
                  : <video key={currentStatus._id} src={`${BASE}${currentStatus.file}`}
                      autoPlay playsInline style={{ pointerEvents: "none" }} onEnded={tapRight} />
                }
              </div>

              <div className="sv-gtop" />
              <div className="sv-gbot" />

              {/* Progress bars */}
              <div className="sv-bars">
                {grp.items.map((_, i) => (
                  <div key={i} className="sv-bar" onClick={() => goSlide(i)}>
                    <div className="sv-bar-fill" style={{
                      width: i < slideIdx ? "100%" : i === slideIdx ? `${pct}%` : "0%"
                    }} />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="sv-head">
                <Ava user={grp.user} size={34} />
                <div>
                  <div className="sv-hname">{grp.user?.name}</div>
                  <div className="sv-htime">{slideIdx + 1}/{grp.items.length} · {timeAgo(currentStatus.createdAt)}</div>
                </div>
                <div className="sv-hbtns">
                  <button className="sv-ibtn close" onClick={closeModal}>✕</button>
                </div>
              </div>

              {/* Pause indicator */}
              {paused && !panel && (
                <div className="sv-hold-pill">⏸ Hold</div>
              )}

              {/* Tap zones */}
              <div className="sv-tl" onClick={tapLeft} />
              <div className="sv-tr" onClick={tapRight} />

              {/* Caption */}
              {currentStatus.caption && !panel && (
                <div className="sv-cap">
                  <div className="sv-cap-name">{grp.user?.name}</div>
                  <div className="sv-cap-text">{currentStatus.caption}</div>
                </div>
              )}

              {/* Bottom actions */}
              {!panel && (
                <div className="sv-bottom">
                  {/* Owner insight pills */}
                  {isOwn && (
                    <div className="sv-insights">
                      <button className={`sv-ins-pill${panel === "viewers" ? " active" : ""}`}
                        onClick={() => setPanel("viewers")}>
                        👁 {currentStatus.viewers?.length || 0} views
                      </button>
                      <button className={`sv-ins-pill${panel === "likes" ? " active" : ""}`}
                        onClick={() => setPanel("likes")}>
                        ❤️ {currentStatus.likes?.length || 0} likes
                      </button>
                      <button className={`sv-ins-pill${panel === "comments" ? " active" : ""}`}
                        onClick={() => setPanel("comments")}>
                        💬 {currentStatus.comments?.length || 0} comments
                      </button>
                    </div>
                  )}

                  {/* Comment input + like + comment toggle */}
                  <div className="sv-qrow">
                    <div className="sv-qfield">
                      <input
                        className="sv-qin"
                        placeholder="Reply to status…"
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        onFocus={() => doPause()}
                        onBlur={() => { if (!comment.trim()) doResume(); }}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { handleComment(); doResume(); } }}
                      />
                      <button className="sv-qsend" onClick={() => { handleComment(); doResume(); }}
                        disabled={sending || !comment.trim()}>➤</button>
                    </div>

                    <button className={`sv-rbtn${liked ? " liked" : ""}`} onClick={handleLike}>
                      {liked ? "❤️" : "🤍"}
                    </button>
                    <button className={`sv-rbtn${panel === "comments" ? " panel-on" : ""}`}
                      onClick={() => setPanel("comments")}>💬</button>
                  </div>
                </div>
              )}

              {/* ── SLIDE-UP PANEL ── */}
              {panel && (
                <div className="sv-pbd"
                  onClick={e => { if (e.target === e.currentTarget) setPanel(null); }}>
                  <div className="sv-panel">
                    <div className="sv-phandle" />

                    <div className="sv-ph">
                      <span className="sv-ph-title">{panelTitle}</span>
                      <button className="sv-ph-close" onClick={() => setPanel(null)}>✕</button>
                    </div>

                    {/* Tabs for owner */}
                    {isOwn && (
                      <div className="sv-ptabs">
                        {[
                          { key: "viewers",  icon: "👁",  label: "Viewers",  n: currentStatus.viewers?.length  || 0 },
                          { key: "likes",    icon: "❤️",  label: "Likes",    n: currentStatus.likes?.length    || 0 },
                          { key: "comments", icon: "💬",  label: "Comments", n: currentStatus.comments?.length || 0 },
                        ].map(t => (
                          <button key={t.key} className={`sv-ptab${panel === t.key ? " on" : ""}`}
                            onClick={() => setPanel(t.key)}>
                            {t.icon} {t.label}
                            {t.n > 0 && <span className="sv-ptab-n">{t.n}</span>}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="sv-pbody">
                      {panelItems.length === 0
                        ? <div className="sv-empty">
                            {panel === "viewers"  ? "👁 No viewers yet" :
                             panel === "likes"     ? "❤️ No likes yet" :
                                                    "💬 No comments yet"}
                          </div>
                        : panel === "comments"
                          ? panelItems.map((c, i) => (
                              <div key={i} className="sv-crow">
                                <Ava user={c.user} size={30} />
                                <div className="sv-crow-b">
                                  <div className="sv-crow-n">{c.user?.name || "User"}</div>
                                  <div className="sv-crow-t">{c.text}</div>
                                  <div className="sv-crow-d">{timeAgo(c.createdAt)}</div>
                                </div>
                              </div>
                            ))
                          : panelItems.map((u, i) => {
                              const p = typeof u === "object" ? u : { name: "User" };
                              return (
                                <div key={i} className="sv-prow">
                                  <Ava user={p} size={36} />
                                  <span className="sv-prow-name">{p.name}</span>
                                  <span className={`sv-ptag ${panel === "likes" ? "liked" : "viewed"}`}>
                                    {panel === "likes" ? "❤️ Liked" : "👁 Viewed"}
                                  </span>
                                </div>
                              );
                            })
                      }
                    </div>

                    {/* Comment input inside panel */}
                    {panel === "comments" && (
                      <div className="sv-pinput">
                        <input className="sv-pcin" placeholder="Add a comment…"
                          value={comment} onChange={e => setComment(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleComment()} />
                        <button className="sv-psend" onClick={handleComment}
                          disabled={sending || !comment.trim()}>➤</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}