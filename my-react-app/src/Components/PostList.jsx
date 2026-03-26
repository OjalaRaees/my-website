// PostList.jsx  — with Instagram-style swipeable carousel for multi-media posts
import React, { useEffect, useState, useRef, useCallback } from "react";
import API from "../api";
import { Dropdown } from "react-bootstrap";

const BASE = "http://localhost:5000";

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Avatar({ user, size = 40 }) {
  return (
    <img
      src={user?.profilePic ? `${BASE}${user.profilePic}` : "/default-profile.png"}
      alt={user?.name}
      style={{
        width: size, height: size, borderRadius: "50%", objectFit: "cover",
        flexShrink: 0, border: "2.5px solid #eef0ff",
        boxShadow: "0 2px 8px rgba(99,102,241,.18)",
      }}
    />
  );
}

// ── Carousel component ───────────────────────────────────────────
function MediaCarousel({ media }) {
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const trackRef = useRef();

  const count = media.length;
  const canPrev = index > 0;
  const canNext = index < count - 1;

  const goTo = useCallback((i) => setIndex(Math.max(0, Math.min(count - 1, i))), [count]);

  // Mouse drag
  const onMouseDown = (e) => { setDragging(true); setStartX(e.clientX); setOffsetX(0); };
  const onMouseMove = (e) => { if (!dragging) return; setOffsetX(e.clientX - startX); };
  const onMouseUp   = () => {
    if (!dragging) return;
    if (offsetX < -50 && canNext) goTo(index + 1);
    if (offsetX >  50 && canPrev) goTo(index - 1);
    setDragging(false); setOffsetX(0);
  };

  // Touch
  const onTouchStart = (e) => { setStartX(e.touches[0].clientX); setOffsetX(0); };
  const onTouchMove  = (e) => { setOffsetX(e.touches[0].clientX - startX); };
  const onTouchEnd   = () => {
    if (offsetX < -50 && canNext) goTo(index + 1);
    if (offsetX >  50 && canPrev) goTo(index - 1);
    setOffsetX(0);
  };

  if (count === 1) {
    const m = media[0];
    return m.fileType === "image"
      ? <img src={`${BASE}${m.file}`} alt="post" className="pl-media" />
      : <video controls className="pl-media"><source src={`${BASE}${m.file}`} type="video/mp4" /></video>;
  }

  return (
    <div className="carousel-root">
      {/* Track */}
      <div
        className="carousel-viewport"
        ref={trackRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <div
          className="carousel-track"
          style={{
            transform: `translateX(calc(${index * -100}% + ${dragging ? offsetX : 0}px))`,
            transition: dragging ? "none" : "transform .35s cubic-bezier(.25,.46,.45,.94)",
          }}
        >
          {media.map((m, i) => (
            <div key={i} className="carousel-slide">
              {m.fileType === "image"
                ? <img src={`${BASE}${m.file}`} alt={`slide ${i + 1}`} className="carousel-img" draggable={false} />
                : <video controls className="carousel-img" onClick={e => e.stopPropagation()}>
                    <source src={`${BASE}${m.file}`} type="video/mp4" />
                  </video>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Prev / Next arrows */}
      {canPrev && (
        <button className="carousel-arrow carousel-arrow-left" onClick={() => goTo(index - 1)}>
          ‹
        </button>
      )}
      {canNext && (
        <button className="carousel-arrow carousel-arrow-right" onClick={() => goTo(index + 1)}>
          ›
        </button>
      )}

      {/* Dot indicators */}
      <div className="carousel-dots">
        {media.map((_, i) => (
          <button
            key={i}
            className={`carousel-dot${i === index ? " active" : ""}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      {/* Counter pill (top-right) */}
      <div className="carousel-counter">{index + 1} / {count}</div>
    </div>
  );
}

// ── Resolve media for legacy posts (single file) ─────────────────
function resolveMedia(post) {
  if (post.media && post.media.length > 0) return post.media;
  if (post.file) return [{ file: post.file, fileType: post.fileType }];
  return [];
}

// ── Single Post Card ─────────────────────────────────────────────
function PostCard({ post, currentUser, onUpdated, onDeleted }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText,  setCommentText]  = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [expanded,     setExpanded]     = useState(false);
  const [sharing,      setSharing]      = useState(false);
  const commentInputRef = useRef();
  const token = localStorage.getItem("token");

  const media   = resolveMedia(post);
  const isLiked = post.likes?.some(l => l === currentUser?._id || l?._id === currentUser?._id);
  const isOwn   = post.user?._id === currentUser?._id;
  const longText = (post.content?.length || 0) > 180;

  const handleLike = async () => {
    try {
      const res = await API.post(`/posts/like/${post._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onUpdated({ ...post, likes: res.data.likes });
    } catch (e) { console.error(e); }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await API.post(
        `/posts/comment/${post._id}`,
        { text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onUpdated({ ...post, comments: res.data.comments });
      setCommentText("");
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const handleDeleteComment = async (cid) => {
    try {
      const res = await API.delete(`/posts/comment/${post._id}/${cid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onUpdated({ ...post, comments: res.data.comments });
    } catch (e) { console.error(e); }
  };

  const handleShare = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`); }
    catch { /* silent */ }
    setSharing(true);
    setTimeout(() => setSharing(false), 2200);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await API.delete(`/posts/${post._id}`, { headers: { Authorization: `Bearer ${token}` } });
      onDeleted(post._id);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="pl-card">

      {/* ── Header ── */}
      <div className="pl-card-head">
        <Avatar user={post.user} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pl-uname">{post.user?.name || "Unknown"}</div>
          <div className="pl-time">{timeAgo(post.createdAt)}</div>
        </div>
        {isOwn && (
          <Dropdown>
            <Dropdown.Toggle className="pl-menu-btn" id={`dd-${post._id}`}>⋮</Dropdown.Toggle>
            <Dropdown.Menu align="end" style={{
              borderRadius: 12, border: "1px solid #eaedf5",
              boxShadow: "0 8px 28px rgba(0,0,0,.10)",
              fontFamily: "'Outfit',sans-serif", fontSize: 14, minWidth: 160,
            }}>
              <Dropdown.Item
                style={{ color: "#ef4444", fontWeight: 600, padding: "10px 18px" }}
                onClick={handleDelete}
              >🗑 Delete Post</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
      </div>

      {/* ── Media / Carousel ── */}
      {media.length > 0 && <MediaCarousel media={media} />}

      {/* ── Caption (name + text, Instagram-style) ── */}
      {post.content && (
        <div className="pl-caption-block">
          <span className="pl-caption-author">{post.user?.name || "Unknown"}</span>
          {" "}
          <span className={`pl-caption-text${!expanded && longText ? " clamp" : ""}`}>
            {post.content}
          </span>
          {longText && (
            <button className="pl-readmore" onClick={() => setExpanded(p => !p)}>
              {expanded ? " less" : " more"}
            </button>
          )}
        </div>
      )}

      {/* ── Stats ── */}
      {((post.likes?.length > 0) || (post.comments?.length > 0)) && (
        <div className="pl-stats">
          {post.likes?.length > 0 && (
            <span className="pl-stat-item">
              <span style={{ fontSize: 13 }}>
                {["❤️","🧡","💛"].slice(0, Math.min(3, post.likes.length)).join("")}
              </span>
              {" "}{post.likes.length} {post.likes.length === 1 ? "like" : "likes"}
            </span>
          )}
          {post.comments?.length > 0 && (
            <button className="pl-stat-btn" onClick={() => setShowComments(p => !p)}>
              {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="pl-actions">
        <button className={`pl-action-btn${isLiked ? " liked" : ""}`} onClick={handleLike}>
          <span className={`pl-icon${isLiked ? " pop" : ""}`}>{isLiked ? "❤️" : "🤍"}</span>
          {isLiked ? "Liked" : "Like"}
        </button>
        <button
          className={`pl-action-btn${showComments ? " active" : ""}`}
          onClick={() => { setShowComments(p => !p); setTimeout(() => commentInputRef.current?.focus(), 100); }}
        >
          <span className="pl-icon">💬</span>Comment
        </button>
        <button className={`pl-action-btn${sharing ? " sharing" : ""}`} onClick={handleShare}>
          <span className="pl-icon">{sharing ? "✓" : "🔗"}</span>
          {sharing ? "Copied!" : "Share"}
        </button>
      </div>

      {/* ── Comments ── */}
      {showComments && (
        <div className="pl-comments">
          {post.comments?.length > 0 && (
            <div className="pl-cmt-list">
              {post.comments.map((c, i) => {
                const isOwnCmt = c.user?._id === currentUser?._id || c.user === currentUser?._id;
                return (
                  <div key={i} className="pl-cmt-row">
                    <Avatar user={c.user} size={28} />
                    <div className="pl-cmt-bubble">
                      <span className="pl-cmt-name">{c.user?.name || "User"} </span>
                      <span className="pl-cmt-text">{c.text}</span>
                      <div className="pl-cmt-time">{timeAgo(c.createdAt || new Date())}</div>
                    </div>
                    {isOwnCmt && (
                      <button className="pl-cmt-del" onClick={() => handleDeleteComment(c._id)}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="pl-cmt-input-row">
            <Avatar user={currentUser} size={30} />
            <div className="pl-cmt-input-wrap">
              <input
                ref={commentInputRef}
                className="pl-cmt-input"
                placeholder="Add a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleComment()}
              />
              <button
                className="pl-cmt-send"
                onClick={handleComment}
                disabled={submitting || !commentText.trim()}
              >{submitting ? "…" : "➤"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Feed ────────────────────────────────────────────────────
export default function PostList({ currentUser }) {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const res = await API.get("/posts/post");
      setPosts(res.data);
    } catch (err) { console.log(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleUpdated = (u) => setPosts(prev => prev.map(p => p._id === u._id ? u : p));
  const handleDeleted = (id) => setPosts(prev => prev.filter(p => p._id !== id));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

        .pl-root { font-family:'Outfit',sans-serif; min-height:60vh; padding:24px 0 60px; }
        .pl-feed { max-width:600px; margin:0 auto; padding:0 16px; display:flex; flex-direction:column; gap:20px; }

        .pl-heading {
          display:flex; align-items:center; gap:10px;
          font-size:12px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#9ca3af;
        }
        .pl-heading-line { flex:1; height:1px; background:linear-gradient(90deg,#e8ecf4,transparent); }

        /* ── Card ── */
        .pl-card {
          background:#fff; border:1px solid #eaedf5; border-radius:20px; overflow:hidden;
          box-shadow:0 2px 16px rgba(99,102,241,.06), 0 1px 4px rgba(0,0,0,.04);
          transition:transform .2s ease, box-shadow .2s ease;
          animation:cardIn .35s ease both;
        }
        .pl-card:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(99,102,241,.12), 0 2px 8px rgba(0,0,0,.06); }
        @keyframes cardIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }

        .pl-card-head { display:flex; align-items:center; gap:11px; padding:14px 16px 12px; }
        .pl-uname { font-size:14.5px; font-weight:700; color:#1a1a2e; }
        .pl-time  { font-size:11.5px; color:#9ca3af; font-weight:500; margin-top:1px; }

        .pl-menu-btn {
          background:#f8f9ff !important; border:1px solid #e8ecf4 !important;
          border-radius:8px !important; padding:1px 9px !important;
          font-size:20px !important; line-height:1.4 !important; color:#6b7280 !important;
        }
        .pl-menu-btn:hover { background:#eef0ff !important; color:#6366f1 !important; }
        .pl-menu-btn::after { display:none !important; }

        /* single media */
        .pl-media { width:100%; max-height:500px; object-fit:cover; display:block; background:#f0f1f8; }

        /* ── CAROUSEL ── */
        .carousel-root { position:relative; overflow:hidden; background:#000; user-select:none; }
        .carousel-viewport { overflow:hidden; }
        .carousel-track {
          display:flex; will-change:transform;
        }
        .carousel-slide {
          min-width:100%; max-height:500px;
          display:flex; align-items:center; justify-content:center; background:#111;
        }
        .carousel-img {
          width:100%; max-height:500px; object-fit:contain; display:block;
        }

        /* Arrows */
        .carousel-arrow {
          position:absolute; top:50%; transform:translateY(-50%);
          width:36px; height:36px; border-radius:50%; border:none;
          background:rgba(255,255,255,.92);
          color:#1a1a2e; font-size:22px; font-weight:700; line-height:1;
          cursor:pointer; z-index:10;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 2px 12px rgba(0,0,0,.18);
          transition:background .15s, transform .15s;
        }
        .carousel-arrow:hover { background:#fff; transform:translateY(-50%) scale(1.08); }
        .carousel-arrow-left  { left:10px; }
        .carousel-arrow-right { right:10px; }

        /* Dots */
        .carousel-dots {
          position:absolute; bottom:10px; left:50%; transform:translateX(-50%);
          display:flex; gap:5px; z-index:10;
        }
        .carousel-dot {
          width:7px; height:7px; border-radius:50%; border:none; cursor:pointer;
          background:rgba(255,255,255,.5); padding:0;
          transition:background .2s, transform .2s;
        }
        .carousel-dot.active { background:#fff; transform:scale(1.25); }

        /* Counter */
        .carousel-counter {
          position:absolute; top:10px; right:12px;
          background:rgba(0,0,0,.52); color:#fff;
          font-family:'Outfit',sans-serif; font-size:12px; font-weight:800;
          padding:3px 10px; border-radius:20px; z-index:10;
        }

        /* ── Caption ── */
        .pl-caption-block {
          padding:10px 16px 6px;
          font-size:14px; line-height:1.6; color:#1a1a2e;
        }
        .pl-caption-author { font-weight:800; color:#1a1a2e; }
        .pl-caption-text   { font-weight:500; color:#2d2d3a; }
        .pl-caption-text.clamp {
          display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;
        }
        .pl-readmore {
          background:none; border:none; padding:0; margin:0;
          font-family:'Outfit',sans-serif; font-size:13px; font-weight:700; color:#9ca3af; cursor:pointer;
        }
        .pl-readmore:hover { color:#6366f1; }

        /* Stats */
        .pl-stats {
          display:flex; align-items:center; justify-content:space-between;
          padding:6px 16px; font-size:12.5px; color:#9ca3af; font-weight:600;
          border-top:1px solid #f4f5fb;
        }
        .pl-stat-item { display:flex; align-items:center; gap:4px; }
        .pl-stat-btn {
          background:none; border:none; font-family:'Outfit',sans-serif;
          font-size:12.5px; font-weight:600; color:#9ca3af; cursor:pointer; padding:0; transition:color .15s;
        }
        .pl-stat-btn:hover { color:#6366f1; }

        /* Actions */
        .pl-actions {
          display:flex; align-items:center; padding:6px 10px 10px;
          border-top:1px solid #f4f5fb; gap:2px;
        }
        .pl-action-btn {
          flex:1; display:flex; align-items:center; justify-content:center; gap:5px;
          background:none; border:none; border-radius:10px;
          font-family:'Outfit',sans-serif; font-size:13px; font-weight:600;
          color:#9ca3af; cursor:pointer; padding:9px 6px; transition:background .15s, color .15s;
        }
        .pl-action-btn:hover   { background:#f4f5fb; color:#6366f1; }
        .pl-action-btn.liked   { color:#ef4444; }
        .pl-action-btn.liked:hover { background:#fff0f0; }
        .pl-action-btn.active  { color:#6366f1; background:#eef0ff; }
        .pl-action-btn.sharing { color:#22c55e; }

        .pl-icon { font-size:16px; transition:transform .2s; }
        .pl-action-btn:hover .pl-icon { transform:scale(1.18); }
        .pl-icon.pop { animation:heartPop .3s ease; }
        @keyframes heartPop { 0%{transform:scale(1)} 50%{transform:scale(1.45)} 100%{transform:scale(1)} }

        /* Comments */
        .pl-comments { border-top:1px solid #f4f5fb; background:#fafbff; animation:slideOpen .22s ease both; }
        @keyframes slideOpen { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
        .pl-cmt-list { padding:10px 14px 4px; display:flex; flex-direction:column; gap:8px; }
        .pl-cmt-row  { display:flex; align-items:flex-start; gap:9px; }
        .pl-cmt-bubble { flex:1; background:#fff; border:1px solid #eaedf5; border-radius:14px; padding:7px 11px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .pl-cmt-name { font-size:12px; font-weight:800; color:#6366f1; }
        .pl-cmt-text { font-size:13.5px; color:#2d2d3a; font-weight:500; }
        .pl-cmt-time { font-size:10.5px; color:#c4c9de; margin-top:3px; font-weight:600; }
        .pl-cmt-del {
          background:none; border:none; color:#c4c9de; font-size:11px;
          cursor:pointer; padding:4px; border-radius:50%; flex-shrink:0; margin-top:4px;
          transition:color .15s, background .15s;
        }
        .pl-cmt-del:hover { color:#ef4444; background:#fff0f0; }
        .pl-cmt-input-row { display:flex; align-items:center; gap:9px; padding:10px 14px 12px; }
        .pl-cmt-input-wrap {
          flex:1; display:flex; background:#fff;
          border:1.5px solid #e4e7f0; border-radius:50px; overflow:hidden;
          transition:border-color .2s, box-shadow .2s;
        }
        .pl-cmt-input-wrap:focus-within { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.10); }
        .pl-cmt-input {
          flex:1; border:none; outline:none; background:transparent;
          padding:9px 14px; font-family:'Outfit',sans-serif; font-size:13.5px; font-weight:500; color:#1a1a2e;
        }
        .pl-cmt-input::placeholder { color:#c4c9de; }
        .pl-cmt-send {
          width:36px; height:36px; border:none; border-radius:50%;
          background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
          font-size:14px; cursor:pointer; flex-shrink:0; margin:2px 2px 2px 0;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 2px 8px rgba(99,102,241,.3); transition:opacity .18s, transform .15s;
        }
        .pl-cmt-send:hover:not(:disabled) { opacity:.88; transform:scale(1.08); }
        .pl-cmt-send:disabled { opacity:.35; cursor:not-allowed; }

        /* Loading / Empty */
        .pl-loading { display:flex; flex-direction:column; align-items:center; gap:14px; padding:80px 20px; color:#9ca3af; font-size:14px; font-weight:600; }
        .pl-spinner { width:36px; height:36px; border:3px solid #eef0ff; border-top-color:#6366f1; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .pl-empty { text-align:center; padding:64px 20px; background:#fff; border:1px solid #eaedf5; border-radius:20px; }
        .pl-empty-icon  { font-size:48px; margin-bottom:14px; }
        .pl-empty-title { font-size:18px; font-weight:800; color:#1a1a2e; margin-bottom:6px; }
        .pl-empty-sub   { font-size:14px; color:#9ca3af; font-weight:500; }
      `}</style>

      <div className="pl-root">
        <div className="pl-feed">
          <div className="pl-heading">
            <span>Latest Posts</span>
            <div className="pl-heading-line" />
          </div>

          {loading && (
            <div className="pl-loading">
              <div className="pl-spinner" />
              Loading feed…
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="pl-empty">
              <div className="pl-empty-icon">🌱</div>
              <div className="pl-empty-title">Nothing here yet</div>
              <div className="pl-empty-sub">Be the first to post something!</div>
            </div>
          )}

          {posts.map((post, i) => (
            <div key={post._id} style={{ animationDelay: `${i * 0.06}s` }}>
              <PostCard
                post={post}
                currentUser={currentUser}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}