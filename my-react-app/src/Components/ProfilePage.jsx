// ProfilePage.jsx
import React, { useEffect, useState } from "react";
import API from "../api";
import { useParams, useNavigate } from "react-router-dom";

const BASE = "http://localhost:5000";

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function UserRow({ user, onClick }) {
  return (
    <div className="pp-user-row" onClick={onClick}>
      <img
        src={user?.profilePic ? `${BASE}${user.profilePic}` : "/default-profile.png"}
        alt={user?.name} className="pp-modal-avatar"
      />
      <span className="pp-modal-name">{user?.name}</span>
      <span className="pp-modal-arrow">→</span>
    </div>
  );
}

export default function ProfilePage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user"));

  const [user,          setUser]          = useState(null);
  const [posts,         setPosts]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [following,     setFollowing]     = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [activePost,    setActivePost]    = useState(null);
  const [commentText,   setCommentText]   = useState("");
  const [submitting,    setSubmitting]    = useState(false);

  const token = localStorage.getItem("token");

  /* ── fetch user ── */
  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/user/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const isFollowing = res.data.followers?.some(f => f._id === currentUser?._id);
      setUser({ ...res.data });
      setFollowing(isFollowing);
    } catch (err) { console.log(err); }
    finally { setLoading(false); }
  };

  /* ── fetch user's posts ── */
  const fetchPosts = async () => {
    try {
      const res = await API.get(`/posts/user/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(res.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => {
    fetchUser();
    fetchPosts();
  }, [id]);

  /* ── follow/unfollow ── */
  const handleFollow = async () => {
    try {
      await API.put(`/user/follow/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFollowing(f => !f);
      fetchUser();
    } catch (err) { console.log(err); }
  };

  /* ── like from modal ── */
  const handleLike = async (postId) => {
    try {
      const res = await API.post(`/posts/like/${postId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const likes = res.data.likes;
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes } : p));
      if (activePost?._id === postId) setActivePost(p => ({ ...p, likes }));
    } catch (err) { console.log(err); }
  };

  /* ── comment from modal ── */
  const handleComment = async () => {
    if (!commentText.trim() || !activePost) return;
    setSubmitting(true);
    try {
      const res = await API.post(
        `/posts/comment/${activePost._id}`,
        { text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const comments = res.data.comments;
      setPosts(prev => prev.map(p => p._id === activePost._id ? { ...p, comments } : p));
      setActivePost(p => ({ ...p, comments }));
      setCommentText("");
    } catch (err) { console.log(err); }
    setSubmitting(false);
  };

  const isLiked = (post) =>
    post?.likes?.some(l => l === currentUser?._id || l?._id === currentUser?._id);

  if (loading) return (
    <div style={{ display:"flex",justifyContent:"center",alignItems:"center",height:"60vh" }}>
      <div style={{ width:40,height:40,border:"3px solid #eef0ff",borderTopColor:"#6366f1",borderRadius:"50%",animation:"spin .7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return (
    <div style={{ textAlign:"center",padding:80,color:"#9ca3af",fontFamily:"'Outfit',sans-serif" }}>
      User not found
    </div>
  );

  const isOwn = currentUser?._id === user._id;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

        .pp-root {
          font-family:'Outfit',sans-serif; min-height:100vh;
          padding:28px 16px 80px;
          background:linear-gradient(160deg,#f8f9ff 0%,#f0f1fa 100%);
        }
        .pp-inner { max-width:680px; margin:0 auto; }

        /* ─── Profile Card ─── */
        .pp-card {
          background:#fff; border:1px solid #eaedf5; border-radius:24px; overflow:hidden;
          box-shadow:0 8px 40px rgba(99,102,241,.10), 0 1px 4px rgba(0,0,0,.04);
          animation:popIn .3s cubic-bezier(.34,1.26,.64,1) both; margin-bottom:24px;
        }
        @keyframes popIn { from{opacity:0;transform:scale(.97) translateY(12px)} to{opacity:1;transform:none} }

        .pp-banner {
          height:120px;
          background:linear-gradient(135deg,#6366f1 0%,#a78bfa 55%,#f472b6 100%);
        }
        .pp-avatar-zone {
          display:flex; flex-direction:column; align-items:center;
          margin-top:-56px; position:relative; z-index:2;
        }
        .pp-avatar {
          width:112px; height:112px; border-radius:50%; object-fit:cover;
          border:4.5px solid #fff; box-shadow:0 4px 24px rgba(99,102,241,.28);
        }
        .pp-info { text-align:center; padding:12px 28px 0; }
        .pp-name { font-size:22px; font-weight:800; color:#1a1a2e; margin-bottom:4px; }
        .pp-bio  { font-size:14px; color:#6b7280; font-weight:500; line-height:1.5; max-width:340px; margin:0 auto; }

        /* Stats */
        .pp-stats { display:flex; border-top:1px solid #f0f1f8; border-bottom:1px solid #f0f1f8; margin-top:20px; }
        .pp-stat {
          flex:1; padding:16px 8px; text-align:center;
          border-right:1px solid #f0f1f8; cursor:pointer; transition:background .15s;
        }
        .pp-stat:last-child { border-right:none; }
        .pp-stat:hover { background:#f8f9ff; }
        .pp-stat-num   { font-size:20px; font-weight:800; color:#1a1a2e; line-height:1; margin-bottom:3px; }
        .pp-stat-label { font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:#9ca3af; }

        /* Buttons */
        .pp-actions { display:flex; gap:10px; justify-content:center; padding:18px 28px 24px; }
        .pp-follow-btn {
          flex:1; padding:11px;
          background:linear-gradient(135deg,#6366f1,#8b5cf6);
          border:none; border-radius:50px; color:#fff;
          font-family:'Outfit',sans-serif; font-size:14px; font-weight:800; cursor:pointer;
          box-shadow:0 4px 14px rgba(99,102,241,.35); transition:opacity .18s, transform .15s;
        }
        .pp-follow-btn:hover { opacity:.88; transform:translateY(-1px); }
        .pp-follow-btn.following { background:none; border:2px solid #e4e7f0; color:#6b7280; box-shadow:none; }
        .pp-follow-btn.following:hover { border-color:#ef4444; color:#ef4444; background:#fff0f0; }
        .pp-msg-btn {
          flex:1; padding:11px; background:#f8f9ff;
          border:2px solid #e4e7f0; border-radius:50px; color:#6366f1;
          font-family:'Outfit',sans-serif; font-size:14px; font-weight:800; cursor:pointer;
          transition:background .15s, border-color .15s, transform .15s;
        }
        .pp-msg-btn:hover { background:#eef0ff; border-color:#c7d0ff; transform:translateY(-1px); }

        /* ─── Posts Grid ─── */
        .pp-posts-section { animation:fadeUp .4s ease .1s both; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .pp-posts-header {
          display:flex; align-items:center; gap:10px; margin-bottom:14px;
          font-size:12px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#9ca3af;
        }
        .pp-posts-header-line { flex:1; height:1px; background:linear-gradient(90deg,#e8ecf4,transparent); }
        .pp-post-count { color:#6366f1; font-weight:800; font-size:13px; }

        .pp-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:3px; border-radius:16px; overflow:hidden; }
        @media(max-width:460px) { .pp-grid { grid-template-columns:repeat(2,1fr); } }

        .pp-grid-item {
          position:relative; aspect-ratio:1; overflow:hidden; cursor:pointer; background:#f0f1f8;
        }
        .pp-grid-img  { width:100%; height:100%; object-fit:cover; transition:transform .25s ease; display:block; }
        .pp-grid-item:hover .pp-grid-img { transform:scale(1.06); }
        .pp-grid-overlay {
          position:absolute; inset:0; background:rgba(99,102,241,.0);
          display:flex; align-items:center; justify-content:center; gap:16px;
          transition:background .2s;
        }
        .pp-grid-item:hover .pp-grid-overlay { background:rgba(20,10,50,.44); }
        .pp-grid-stat {
          display:flex; align-items:center; gap:5px;
          color:#fff; font-size:14px; font-weight:800; opacity:0; transition:opacity .2s;
        }
        .pp-grid-item:hover .pp-grid-stat { opacity:1; }
        .pp-grid-text {
          width:100%; height:100%; padding:12px;
          display:flex; align-items:center; justify-content:center;
          background:linear-gradient(135deg,#eef0ff,#f4f0ff);
          font-size:12px; color:#6366f1; font-weight:600; text-align:center; line-height:1.4; overflow:hidden;
          transition:background .2s;
        }
        .pp-grid-item:hover .pp-grid-text { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; }
        .pp-video-badge {
          position:absolute; top:6px; right:6px;
          background:rgba(0,0,0,.55); color:#fff; font-size:10px;
          padding:2px 7px; border-radius:20px; font-weight:700;
        }
        .pp-no-posts {
          text-align:center; padding:56px 20px;
          background:#fff; border:1px solid #eaedf5; border-radius:20px;
          color:#c4c9de; font-size:15px; font-weight:600;
        }
        .pp-no-posts-icon { font-size:40px; margin-bottom:12px; }

        /* ─── Post Detail Modal ─── */
        .pp-post-backdrop {
          position:fixed; inset:0; z-index:1060;
          background:rgba(10,10,30,.65); backdrop-filter:blur(14px);
          display:flex; align-items:center; justify-content:center; padding:16px;
        }
        .pp-post-modal {
          width:100%; max-width:840px; max-height:92dvh;
          background:#fff; border-radius:22px; border:1px solid #eaedf5;
          display:flex; overflow:hidden;
          box-shadow:0 32px 80px rgba(0,0,0,.22);
          animation:popIn .22s cubic-bezier(.34,1.26,.64,1) both;
        }
        @media(max-width:620px) {
          .pp-post-modal { flex-direction:column; max-height:96dvh; border-radius:20px 20px 0 0; }
          .pp-post-backdrop { padding:0; align-items:flex-end; }
          .pp-post-media { max-height:240px; }
        }

        .pp-post-media {
          flex:1; background:#000; min-width:0;
          display:flex; align-items:center; justify-content:center; overflow:hidden;
        }
        .pp-post-media img,
        .pp-post-media video { width:100%; height:100%; object-fit:contain; display:block; }
        .pp-post-text-only {
          width:100%; height:100%; min-height:300px; padding:32px;
          display:flex; align-items:center; justify-content:center;
          background:linear-gradient(135deg,#eef0ff,#f4f0ff);
          font-size:18px; color:#6366f1; font-weight:700; text-align:center; line-height:1.5;
        }

        .pp-post-side {
          width:320px; flex-shrink:0; display:flex; flex-direction:column; overflow:hidden;
        }
        @media(max-width:620px) { .pp-post-side { width:100%; } }

        .pp-post-side-head {
          display:flex; align-items:center; gap:10px;
          padding:14px 16px; border-bottom:1px solid #f0f1f8; flex-shrink:0;
        }
        .pp-side-avatar { width:36px; height:36px; border-radius:50%; object-fit:cover; border:2px solid #eef0ff; flex-shrink:0; }
        .pp-side-uname  { font-size:14px; font-weight:800; color:#1a1a2e; }
        .pp-side-time   { font-size:11.5px; color:#9ca3af; font-weight:500; }
        .pp-modal-close {
          margin-left:auto; width:28px; height:28px; border-radius:50%;
          background:#f4f5fb; border:none; color:#6b7280; font-size:13px;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          transition:background .15s, color .15s; flex-shrink:0;
        }
        .pp-modal-close:hover { background:#fff0f0; color:#ef4444; }

        /* caption in modal */
        .pp-side-caption {
          padding:12px 16px; border-bottom:1px solid #f7f8fc; flex-shrink:0;
          font-size:14px; color:#2d2d3a; line-height:1.55; font-weight:500;
        }
        .pp-side-caption strong { color:#6366f1; margin-right:4px; }

        .pp-side-comments { flex:1; overflow-y:auto; padding:8px 0; }
        .pp-side-comments::-webkit-scrollbar { width:3px; }
        .pp-side-comments::-webkit-scrollbar-thumb { background:#e4e7f0; border-radius:3px; }

        .pp-cmt-row  { display:flex; gap:9px; padding:9px 14px; }
        .pp-cmt-av   { width:28px; height:28px; border-radius:50%; object-fit:cover; flex-shrink:0; border:1.5px solid #eef0ff; }
        .pp-cmt-bub  { flex:1; background:#f8f9ff; border:1px solid #eaedf5; border-radius:12px; padding:7px 11px; }
        .pp-cmt-name { font-size:11.5px; font-weight:800; color:#6366f1; margin-bottom:2px; }
        .pp-cmt-text { font-size:13px; color:#2d2d3a; font-weight:500; line-height:1.4; }
        .pp-cmt-time { font-size:10px; color:#c4c9de; margin-top:2px; font-weight:600; }
        .pp-no-cmt   { padding:32px; text-align:center; color:#c4c9de; font-size:13px; font-weight:600; }

        .pp-side-actions {
          display:flex; gap:2px; padding:8px 12px;
          border-top:1px solid #f0f1f8; flex-shrink:0;
        }
        .pp-act {
          display:flex; align-items:center; gap:5px; background:none; border:none;
          font-family:'Outfit',sans-serif; font-size:13px; font-weight:600;
          color:#9ca3af; cursor:pointer; padding:7px 11px; border-radius:50px;
          transition:background .15s, color .15s;
        }
        .pp-act:hover   { background:#f4f5fb; color:#6366f1; }
        .pp-act.liked   { color:#ef4444; }
        .pp-act.liked:hover { background:#fff0f0; }
        .pp-act .act-icon { font-size:16px; transition:transform .2s; }
        .pp-act:hover .act-icon { transform:scale(1.18); }

        .pp-cmt-input-row {
          display:flex; gap:8px; align-items:center;
          padding:10px 14px; border-top:1px solid #f0f1f8; flex-shrink:0;
        }
        .pp-cmt-in-wrap {
          flex:1; display:flex; background:#f8f9ff;
          border:1.5px solid #e4e7f0; border-radius:50px; overflow:hidden;
          transition:border-color .2s, box-shadow .2s;
        }
        .pp-cmt-in-wrap:focus-within { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.10); background:#fff; }
        .pp-cmt-in {
          flex:1; border:none; outline:none; background:transparent;
          padding:8px 14px; font-family:'Outfit',sans-serif; font-size:13px; font-weight:500; color:#1a1a2e;
        }
        .pp-cmt-in::placeholder { color:#c4c9de; }
        .pp-cmt-send {
          width:32px; height:32px; margin:2px; border:none; border-radius:50%;
          background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
          font-size:13px; cursor:pointer; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 2px 8px rgba(99,102,241,.3); transition:opacity .18s, transform .15s;
        }
        .pp-cmt-send:hover:not(:disabled) { opacity:.88; transform:scale(1.08); }
        .pp-cmt-send:disabled { opacity:.35; cursor:not-allowed; }

        /* ─── People Modals ─── */
        .pp-backdrop {
          position:fixed; inset:0; z-index:1070;
          background:rgba(10,10,30,.55); backdrop-filter:blur(10px);
          display:flex; align-items:center; justify-content:center; padding:20px;
        }
        .pp-ppl-modal {
          width:100%; max-width:380px; background:#fff;
          border-radius:22px; border:1px solid #eaedf5; overflow:hidden;
          box-shadow:0 24px 64px rgba(0,0,0,.18); max-height:80dvh;
          display:flex; flex-direction:column;
          animation:popIn .22s cubic-bezier(.34,1.26,.64,1) both;
        }
        .pp-ppl-head {
          display:flex; align-items:center; justify-content:space-between;
          padding:16px 20px; border-bottom:1px solid #f0f1f8; flex-shrink:0;
        }
        .pp-ppl-title { font-size:16px; font-weight:800; color:#1a1a2e; }
        .pp-ppl-close {
          width:28px; height:28px; border-radius:50%;
          background:#f4f5fb; border:none; color:#6b7280; font-size:14px;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          transition:background .15s, color .15s;
        }
        .pp-ppl-close:hover { background:#fff0f0; color:#ef4444; }
        .pp-ppl-body { overflow-y:auto; flex:1; padding:8px 0; }

        .pp-user-row   { display:flex; align-items:center; gap:12px; padding:11px 20px; cursor:pointer; transition:background .12s; }
        .pp-user-row:hover { background:#f8f9ff; }
        .pp-modal-avatar { width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid #eef0ff; flex-shrink:0; }
        .pp-modal-name   { font-size:14px; font-weight:700; color:#1a1a2e; flex:1; }
        .pp-modal-arrow  { font-size:14px; color:#c4c9de; }
        .pp-modal-empty  { padding:40px; text-align:center; color:#c4c9de; font-size:14px; font-weight:600; }
      `}</style>

      <div className="pp-root">
        <div className="pp-inner">

          {/* ── Profile Card ── */}
          <div className="pp-card">
            <div className="pp-banner" />
            <div className="pp-avatar-zone">
              <img
                src={user.profilePic ? `${BASE}${user.profilePic}` : "/default-profile.png"}
                alt={user.name} className="pp-avatar"
              />
            </div>
            <div className="pp-info">
              <div className="pp-name">{user.name}</div>
              {user.description && <div className="pp-bio">{user.description}</div>}
            </div>

            {/* Stats — posts count comes from fetched posts */}
            <div className="pp-stats">
              <div className="pp-stat">
                <div className="pp-stat-num">{posts.length}</div>
                <div className="pp-stat-label">Posts</div>
              </div>
              <div className="pp-stat" onClick={() => setShowFollowers(true)}>
                <div className="pp-stat-num">{user.followers?.length || 0}</div>
                <div className="pp-stat-label">Followers</div>
              </div>
              <div className="pp-stat" onClick={() => setShowFollowing(true)}>
                <div className="pp-stat-num">{user.following?.length || 0}</div>
                <div className="pp-stat-label">Following</div>
              </div>
            </div>

            {!isOwn ? (
              <div className="pp-actions">
                <button
                  className={`pp-follow-btn${following ? " following" : ""}`}
                  onClick={handleFollow}
                >{following ? "✓ Following" : "+ Follow"}</button>
                <button className="pp-msg-btn" onClick={() => navigate(`/chat/${user._id}`)}>
                  💬 Message
                </button>
              </div>
            ) : (
              <div className="pp-actions">
                <button className="pp-msg-btn" style={{ flex:"0 0 auto", padding:"11px 32px" }}
                  onClick={() => navigate("/profile")}>
                  ✏️ Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* ── Posts Grid ── */}
          <div className="pp-posts-section">
            <div className="pp-posts-header">
              <span>Posts</span>
              <div className="pp-posts-header-line" />
              <span className="pp-post-count">{posts.length}</span>
            </div>

            {posts.length === 0 ? (
              <div className="pp-no-posts">
                <div className="pp-no-posts-icon">📷</div>
                {isOwn ? "You haven't posted yet" : "No posts yet"}
              </div>
            ) : (
              <div className="pp-grid">
                {posts.map((post, i) => (
                  <div
                    key={post._id} className="pp-grid-item"
                    style={{ animationDelay: `${i * 0.04}s` }}
                    onClick={() => { setActivePost(post); setCommentText(""); }}
                  >
                    {post.fileType === "image" && (
                      <img src={`${BASE}${post.file}`} alt="" className="pp-grid-img" />
                    )}
                    {post.fileType === "video" && (
                      <>
                        <video src={`${BASE}${post.file}`} className="pp-grid-img" muted />
                        <div className="pp-video-badge">▶</div>
                      </>
                    )}
                    {!post.file && (
                      <div className="pp-grid-text">
                        {post.content?.slice(0, 80)}{post.content?.length > 80 ? "…" : ""}
                      </div>
                    )}
                    <div className="pp-grid-overlay">
                      <div className="pp-grid-stat">❤️ {post.likes?.length || 0}</div>
                      <div className="pp-grid-stat">💬 {post.comments?.length || 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Post Detail Modal ── */}
      {activePost && (
        <div className="pp-post-backdrop" onClick={e => e.target === e.currentTarget && setActivePost(null)}>
          <div className="pp-post-modal">
            {/* Media */}
            <div className="pp-post-media">
              {activePost.fileType === "image" && <img src={`${BASE}${activePost.file}`} alt="post" />}
              {activePost.fileType === "video" && <video src={`${BASE}${activePost.file}`} controls autoPlay />}
              {!activePost.file && <div className="pp-post-text-only">{activePost.content}</div>}
            </div>

            {/* Info side */}
            <div className="pp-post-side">
              <div className="pp-post-side-head">
                <img
                  src={user.profilePic ? `${BASE}${user.profilePic}` : "/default-profile.png"}
                  alt={user.name} className="pp-side-avatar"
                />
                <div>
                  <div className="pp-side-uname">{user.name}</div>
                  <div className="pp-side-time">{timeAgo(activePost.createdAt)}</div>
                </div>
                <button className="pp-modal-close" onClick={() => setActivePost(null)}>✕</button>
              </div>

              {/* Caption */}
              {activePost.content && (
                <div className="pp-side-caption">
                  <strong>{user.name}</strong>
                  {activePost.content}
                </div>
              )}

              {/* Comments */}
              <div className="pp-side-comments">
                {!activePost.comments?.length
                  ? <div className="pp-no-cmt">No comments yet — be first!</div>
                  : activePost.comments.map((c, i) => (
                      <div key={i} className="pp-cmt-row">
                        <img
                          src={c.user?.profilePic ? `${BASE}${c.user.profilePic}` : "/default-profile.png"}
                          alt={c.user?.name} className="pp-cmt-av"
                        />
                        <div className="pp-cmt-bub">
                          <div className="pp-cmt-name">{c.user?.name || "User"}</div>
                          <div className="pp-cmt-text">{c.text}</div>
                          <div className="pp-cmt-time">{timeAgo(c.createdAt || new Date())}</div>
                        </div>
                      </div>
                    ))
                }
              </div>

              {/* Like / comment count */}
              <div className="pp-side-actions">
                <button
                  className={`pp-act${isLiked(activePost) ? " liked" : ""}`}
                  onClick={() => handleLike(activePost._id)}
                >
                  <span className="act-icon">{isLiked(activePost) ? "❤️" : "🤍"}</span>
                  {activePost.likes?.length || 0}
                </button>
                <button className="pp-act">
                  <span className="act-icon">💬</span>
                  {activePost.comments?.length || 0}
                </button>
              </div>

              {/* Comment input */}
              <div className="pp-cmt-input-row">
                <div className="pp-cmt-in-wrap">
                  <input
                    className="pp-cmt-in"
                    placeholder="Add a comment…"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleComment()}
                  />
                </div>
                <button
                  className="pp-cmt-send" onClick={handleComment}
                  disabled={submitting || !commentText.trim()}
                >➤</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Followers Modal ── */}
      {showFollowers && (
        <div className="pp-backdrop" onClick={e => e.target === e.currentTarget && setShowFollowers(false)}>
          <div className="pp-ppl-modal">
            <div className="pp-ppl-head">
              <span className="pp-ppl-title">Followers · {user.followers?.length || 0}</span>
              <button className="pp-ppl-close" onClick={() => setShowFollowers(false)}>✕</button>
            </div>
            <div className="pp-ppl-body">
              {!user.followers?.length
                ? <div className="pp-modal-empty">No followers yet</div>
                : user.followers.map(f => (
                    <UserRow key={f._id} user={f} onClick={() => { setShowFollowers(false); navigate(`/profile/${f._id}`); }} />
                  ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Following Modal ── */}
      {showFollowing && (
        <div className="pp-backdrop" onClick={e => e.target === e.currentTarget && setShowFollowing(false)}>
          <div className="pp-ppl-modal">
            <div className="pp-ppl-head">
              <span className="pp-ppl-title">Following · {user.following?.length || 0}</span>
              <button className="pp-ppl-close" onClick={() => setShowFollowing(false)}>✕</button>
            </div>
            <div className="pp-ppl-body">
              {!user.following?.length
                ? <div className="pp-modal-empty">Not following anyone yet</div>
                : user.following.map(f => (
                    <UserRow key={f._id} user={f} onClick={() => { setShowFollowing(false); navigate(`/profile/${f._id}`); }} />
                  ))
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
}