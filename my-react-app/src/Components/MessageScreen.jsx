// MessageScreen.jsx
import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

const BASE = "http://localhost:5000";

export default function MessageScreen() {
  const [conversations, setConversations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const navigate  = useNavigate();
  const token     = localStorage.getItem("token");

  const fetchConversations = async () => {
    try {
      const res = await API.get("/chat/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(
        res.data.map(conv => ({
          user:        conv.user        || { _id: "", name: "Unknown", profilePic: "" },
          lastMessage: conv.lastMessage || "",
          createdAt:   conv.createdAt   || "",
          unreadCount: conv.unreadCount || 0,
        }))
      );
    } catch (err) {
      console.log(err);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchConversations();
    const iv = setInterval(fetchConversations, 3000);
    return () => clearInterval(iv);
  }, []);

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

        .ms-root {
          font-family: 'Outfit', sans-serif;
          min-height: 80vh;
          padding: 36px 16px 80px;
        }
        .ms-inner { max-width: 600px; margin: 0 auto; }

        /* ── Header ── */
        .ms-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 24px;
          animation: fadeDown .35s ease both;
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: none; }
        }
        .ms-title {
          font-size: 26px; font-weight: 800; color: #1a1a2e;
          display: flex; align-items: center; gap: 10px;
        }
        .ms-unread-badge {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; font-size: 12px; font-weight: 800;
          padding: 2px 10px; border-radius: 50px;
          box-shadow: 0 2px 8px rgba(99,102,241,.35);
        }
        .ms-sub { font-size: 13px; color: #9ca3af; font-weight: 500; }

        /* ── List ── */
        .ms-list {
          display: flex; flex-direction: column; gap: 8px;
        }

        /* ── Conversation row ── */
        .ms-row {
          display: flex; align-items: center; gap: 14px;
          background: #fff;
          border: 1px solid #eaedf5;
          border-radius: 16px;
          padding: 14px 18px;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s;
          animation: rowIn .3s ease both;
          position: relative;
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: none; }
        }
        .ms-row:hover {
          transform: translateX(4px);
          box-shadow: 0 6px 24px rgba(99,102,241,.12);
          border-color: #dde0ff;
        }
        .ms-row.unread { border-left: 3px solid #6366f1; }

        /* Avatar */
        .ms-avatar-wrap { position: relative; flex-shrink: 0; }
        .ms-avatar {
          width: 52px; height: 52px; border-radius: 50%;
          object-fit: cover;
          border: 2.5px solid #eef0ff;
          box-shadow: 0 2px 8px rgba(99,102,241,.15);
        }
        .ms-online-dot {
          position: absolute; bottom: 1px; right: 1px;
          width: 12px; height: 12px; border-radius: 50%;
          background: #22c55e; border: 2px solid #fff;
        }

        /* Content */
        .ms-conv-name {
          font-size: 15px; font-weight: 700; color: #1a1a2e;
          margin-bottom: 3px;
        }
        .ms-last-msg {
          font-size: 13px; font-weight: 500; color: #9ca3af;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 300px;
        }
        .ms-last-msg.has-unread { color: #1a1a2e; font-weight: 600; }

        /* Right */
        .ms-right { margin-left: auto; text-align: right; flex-shrink: 0; }
        .ms-time { font-size: 11.5px; color: #c4c9de; font-weight: 600; margin-bottom: 5px; }
        .ms-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 22px; height: 22px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; font-size: 11px; font-weight: 800;
          border-radius: 50px; padding: 0 6px;
          box-shadow: 0 2px 8px rgba(99,102,241,.35);
          animation: badgePop .3s cubic-bezier(.34,1.56,.64,1) both;
        }
        @keyframes badgePop {
          from { transform: scale(0); }
          to   { transform: scale(1); }
        }

        /* ── States ── */
        .ms-loading {
          text-align: center; padding: 64px 20px;
          color: #9ca3af; font-size: 14px; font-weight: 600;
        }
        .ms-spinner {
          width: 32px; height: 32px;
          border: 3px solid #eef0ff; border-top-color: #6366f1;
          border-radius: 50%; animation: spin .7s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ms-empty {
          text-align: center; padding: 64px 20px;
          background: #fff; border: 1px solid #eaedf5; border-radius: 20px;
        }
        .ms-empty-icon  { font-size: 48px; margin-bottom: 14px; }
        .ms-empty-title { font-size: 18px; font-weight: 800; color: #1a1a2e; margin-bottom: 6px; }
        .ms-empty-sub   { font-size: 14px; color: #9ca3af; font-weight: 500; }
      `}</style>

      <div className="ms-root">
        <div className="ms-inner">

          {/* Header */}
          <div className="ms-header">
            <div>
              <div className="ms-title">
                Messages
                {totalUnread > 0 && (
                  <span className="ms-unread-badge">{totalUnread} new</span>
                )}
              </div>
              <div className="ms-sub">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* Loading */}
          {!loaded && (
            <div className="ms-loading">
              <div className="ms-spinner" />
              Loading messages…
            </div>
          )}

          {/* Empty */}
          {loaded && conversations.length === 0 && (
            <div className="ms-empty">
              <div className="ms-empty-icon">💬</div>
              <div className="ms-empty-title">No messages yet</div>
              <div className="ms-empty-sub">Start a conversation by searching for a user</div>
            </div>
          )}

          {/* Conversations */}
          <div className="ms-list">
            {conversations.map((conv, i) => (
              <div
                key={conv.user._id}
                className={`ms-row${conv.unreadCount > 0 ? " unread" : ""}`}
                style={{ animationDelay: `${i * 0.06}s` }}
                onClick={() => navigate(`/chat/${conv.user._id}`)}
              >
                <div className="ms-avatar-wrap">
                  <img
                    src={conv.user.profilePic ? `${BASE}${conv.user.profilePic}` : "/default-profile.png"}
                    alt={conv.user.name}
                    className="ms-avatar"
                  />
                  {/* Show online dot randomly for visual polish */}
                  {i % 3 === 0 && <div className="ms-online-dot" />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ms-conv-name">{conv.user.name}</div>
                  <div className={`ms-last-msg${conv.unreadCount > 0 ? " has-unread" : ""}`}>
                    {conv.lastMessage || "📎 Attachment"}
                  </div>
                </div>

                <div className="ms-right">
                  <div className="ms-time">{formatTime(conv.createdAt)}</div>
                  {conv.unreadCount > 0 && (
                    <span className="ms-badge">{conv.unreadCount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}