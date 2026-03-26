// SearchPage.jsx
import React, { useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

const BASE = "http://localhost:5000";

export default function SearchPage() {
  const [query, setQuery]   = useState("");
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await API.get(`/user/search?q=${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

        .sp-root {
          font-family: 'Outfit', sans-serif;
          min-height: 80vh;
          padding: 40px 16px 80px;
        }
        .sp-inner { max-width: 640px; margin: 0 auto; }

        /* ── Hero ── */
        .sp-hero {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeDown .4s ease both;
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: none; }
        }
        .sp-hero-icon {
          width: 64px; height: 64px; border-radius: 18px;
          background: linear-gradient(135deg, #6366f1, #a78bfa);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; margin: 0 auto 16px;
          box-shadow: 0 8px 24px rgba(99,102,241,.35);
        }
        .sp-hero-title {
          font-size: 26px; font-weight: 800; color: #1a1a2e; margin-bottom: 6px;
        }
        .sp-hero-sub { font-size: 14px; color: #9ca3af; font-weight: 500; }

        /* ── Search bar ── */
        .sp-bar-wrap {
          display: flex; gap: 0;
          background: #fff;
          border: 1.5px solid #e4e7f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(99,102,241,.10);
          margin-bottom: 28px;
          transition: border-color .2s, box-shadow .2s;
          animation: fadeUp .4s ease .1s both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
        .sp-bar-wrap:focus-within {
          border-color: #6366f1;
          box-shadow: 0 4px 20px rgba(99,102,241,.22), 0 0 0 3px rgba(99,102,241,.10);
        }
        .sp-input {
          flex: 1; border: none; outline: none; padding: 14px 20px;
          font-family: 'Outfit', sans-serif;
          font-size: 15px; font-weight: 500; color: #1a1a2e;
          background: transparent;
        }
        .sp-input::placeholder { color: #c4c9de; }
        .sp-search-btn {
          padding: 0 26px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none; color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 700;
          cursor: pointer; letter-spacing: .02em;
          display: flex; align-items: center; gap: 7px;
          transition: opacity .18s;
          white-space: nowrap;
        }
        .sp-search-btn:hover { opacity: .88; }
        .sp-search-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* ── Results ── */
        .sp-results {
          display: flex; flex-direction: column; gap: 10px;
          animation: fadeUp .3s ease both;
        }

        .sp-user-card {
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px;
          background: #fff;
          border: 1px solid #eaedf5;
          border-radius: 16px;
          padding: 14px 18px;
          cursor: pointer;
          box-shadow: 0 2px 12px rgba(99,102,241,.05);
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s;
          animation: cardIn .3s ease both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
        .sp-user-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(99,102,241,.13);
          border-color: #dde0ff;
        }

        .sp-avatar {
          width: 50px; height: 50px; border-radius: 50%;
          object-fit: cover; flex-shrink: 0;
          border: 2.5px solid #eef0ff;
          box-shadow: 0 2px 8px rgba(99,102,241,.15);
        }
        .sp-uname { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 2px; }
        .sp-email { font-size: 12.5px; color: #9ca3af; font-weight: 500; }

        .sp-msg-btn {
          padding: 8px 18px;
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          border: none; border-radius: 50px; color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 700;
          cursor: pointer; flex-shrink: 0;
          box-shadow: 0 3px 10px rgba(99,102,241,.25);
          transition: opacity .18s, transform .15s;
          display: flex; align-items: center; gap: 5px;
        }
        .sp-msg-btn:hover { opacity: .88; transform: scale(1.04); }

        /* ── States ── */
        .sp-loading {
          text-align: center; padding: 48px 20px;
          color: #9ca3af; font-size: 14px; font-weight: 600;
        }
        .sp-spinner {
          width: 32px; height: 32px;
          border: 3px solid #eef0ff; border-top-color: #6366f1;
          border-radius: 50%; animation: spin .7s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .sp-empty {
          text-align: center; padding: 48px 20px;
          background: #fff; border: 1px solid #eaedf5;
          border-radius: 20px;
        }
        .sp-empty-icon { font-size: 40px; margin-bottom: 12px; }
        .sp-empty-text { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
        .sp-empty-sub  { font-size: 13px; color: #9ca3af; font-weight: 500; }
      `}</style>

      <div className="sp-root">
        <div className="sp-inner">

          {/* Hero */}
          <div className="sp-hero">
            <div className="sp-hero-icon">🔍</div>
            <h1 className="sp-hero-title">Find People</h1>
            <p className="sp-hero-sub">Search by name to discover and connect</p>
          </div>

          {/* Search bar */}
          <div className="sp-bar-wrap">
            <input
              className="sp-input"
              placeholder="Search by name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <button className="sp-search-btn" onClick={handleSearch} disabled={loading}>
              {loading
                ? <><span style={{ fontSize:13 }}>⟳</span> Searching…</>
                : <><span>⌕</span> Search</>
              }
            </button>
          </div>

          {/* Results */}
          {loading && (
            <div className="sp-loading">
              <div className="sp-spinner" />
              Finding users…
            </div>
          )}

          {!loading && searched && users.length === 0 && (
            <div className="sp-empty">
              <div className="sp-empty-icon">🤷</div>
              <div className="sp-empty-text">No users found</div>
              <div className="sp-empty-sub">Try a different name or spelling</div>
            </div>
          )}

          {!loading && (
            <div className="sp-results">
              {users.map((user, i) => (
                <div
                  key={user._id}
                  className="sp-user-card"
                  style={{ animationDelay: `${i * 0.07}s` }}
                  onClick={() => navigate(`/profile/${user._id}`)}
                >
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={user.profilePic ? `${BASE}${user.profilePic}` : "/default-profile.png"}
                      alt={user.name}
                      className="sp-avatar"
                    />
                    <div>
                      <div className="sp-uname">{user.name}</div>
                      <div className="sp-email">{user.email}</div>
                    </div>
                  </div>

                  <button
                    className="sp-msg-btn"
                    onClick={e => { e.stopPropagation(); navigate(`/chat/${user._id}`); }}
                  >
                    💬 Message
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}