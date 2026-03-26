// Profile.jsx  (own profile — edit name, bio, pic)
import React, { useState, useEffect, useRef } from "react";
import API from "../api";

const BASE = "http://localhost:5000";

export default function Profile({ token }) {
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [profilePic,  setProfilePic]  = useState(null);
  const [newPic,      setNewPic]      = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [saved,       setSaved]       = useState(false);
  const fileRef = useRef();

  const fetchProfile = async () => {
    try {
      const res = await API.get("/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setName(res.data.name);
      setDescription(res.data.description || "");
      setProfilePic(res.data.profilePic);
    } catch (err) { console.log(err); }
  };

  useEffect(() => { if (token) fetchProfile(); }, [token]);

  const handlePicChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setNewPic(f);
    setPreview(URL.createObjectURL(f));
  };

  const handlePicUpload = async () => {
    if (!newPic) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", newPic);
      const res = await API.put("/profile/pic", fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      setProfilePic(res.data.profilePic);
      setNewPic(null); setPreview(null);
    } catch (err) { console.log(err); }
    setUploading(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await API.put("/profile", { name, description }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setName(res.data.name);
      setDescription(res.data.description);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { console.log(err); }
    setSaving(false);
  };

  const avatarSrc = preview
    || (profilePic ? `${BASE}${profilePic}` : "/default-profile.png");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

        .prf-root {
          font-family: 'Outfit', sans-serif;
          min-height: 80vh;
          padding: 40px 16px 80px;
          background: linear-gradient(160deg, #f8f9ff 0%, #f0f1fa 100%);
        }
        .prf-inner { max-width: 500px; margin: 0 auto; }

        /* ── Card ── */
        .prf-card {
          background: #fff;
          border: 1px solid #eaedf5;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 8px 40px rgba(99,102,241,.10), 0 1px 4px rgba(0,0,0,.04);
          animation: popIn .3s cubic-bezier(.34,1.26,.64,1) both;
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(.97) translateY(12px); }
          to   { opacity: 1; transform: none; }
        }

        /* ── Top banner ── */
        .prf-banner {
          height: 100px;
          background: linear-gradient(135deg, #6366f1 0%, #a78bfa 60%, #f472b6 100%);
          position: relative;
        }

        /* ── Avatar cluster ── */
        .prf-avatar-area {
          display: flex; flex-direction: column; align-items: center;
          margin-top: -52px; padding: 0 24px 0;
          position: relative; z-index: 2;
        }
        .prf-avatar-wrap {
          position: relative; cursor: pointer;
        }
        .prf-avatar {
          width: 104px; height: 104px; border-radius: 50%;
          object-fit: cover;
          border: 4px solid #fff;
          box-shadow: 0 4px 20px rgba(99,102,241,.25);
          display: block;
          transition: filter .2s;
        }
        .prf-avatar-wrap:hover .prf-avatar { filter: brightness(.88); }
        .prf-avatar-overlay {
          position: absolute; inset: 0; border-radius: 50%;
          background: rgba(99,102,241,.0);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; opacity: 0;
          transition: opacity .2s, background .2s;
        }
        .prf-avatar-wrap:hover .prf-avatar-overlay {
          opacity: 1; background: rgba(99,102,241,.35);
        }
        .prf-avatar-input { display: none; }

        /* Upload prompt */
        .prf-pic-row {
          display: flex; gap: 10px; align-items: center; margin-top: 12px;
        }
        .prf-pic-name {
          font-size: 12.5px; color: #9ca3af; font-weight: 500;
          max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .prf-upload-btn {
          padding: 7px 18px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none; border-radius: 50px; color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 12.5px; font-weight: 700;
          cursor: pointer; white-space: nowrap;
          box-shadow: 0 3px 10px rgba(99,102,241,.3);
          transition: opacity .18s, transform .15s;
        }
        .prf-upload-btn:hover:not(:disabled) { opacity: .88; transform: scale(1.04); }
        .prf-upload-btn:disabled { opacity: .45; cursor: not-allowed; }

        /* ── Form body ── */
        .prf-body { padding: 20px 28px 28px; }

        .prf-label {
          font-size: 11.5px; font-weight: 800;
          letter-spacing: .08em; text-transform: uppercase;
          color: #9ca3af; margin-bottom: 6px; display: block;
        }
        .prf-input {
          width: 100%; background: #f8f9ff;
          border: 1.5px solid #e4e7f0; border-radius: 12px;
          padding: 12px 16px;
          font-family: 'Outfit', sans-serif; font-size: 14.5px; font-weight: 500;
          color: #1a1a2e; outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .prf-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,.12);
          background: #fff;
        }
        .prf-input::placeholder { color: #c4c9de; }

        .prf-textarea { resize: none; min-height: 90px; line-height: 1.55; }

        .prf-rule { border: none; border-top: 1px solid #f0f1f8; margin: 20px 0; }

        .prf-save-btn {
          width: 100%; padding: 13px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none; border-radius: 50px; color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 15px; font-weight: 800;
          cursor: pointer; letter-spacing: .02em;
          box-shadow: 0 4px 16px rgba(99,102,241,.35);
          transition: opacity .18s, transform .15s, box-shadow .2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .prf-save-btn:hover:not(:disabled) {
          opacity: .9; transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(99,102,241,.45);
        }
        .prf-save-btn:disabled { opacity: .5; cursor: not-allowed; }
        .prf-save-btn.saved { background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 4px 16px rgba(34,197,94,.35); }

        .prf-spin {
          width: 16px; height: 16px;
          border: 2.5px solid rgba(255,255,255,.35); border-top-color: #fff;
          border-radius: 50%; animation: spin .65s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="prf-root">
        <div className="prf-inner">
          <div className="prf-card">

            {/* Banner */}
            <div className="prf-banner" />

            {/* Avatar */}
            <div className="prf-avatar-area">
              <div className="prf-avatar-wrap" onClick={() => fileRef.current.click()}>
                <img src={avatarSrc} alt="avatar" className="prf-avatar" />
                <div className="prf-avatar-overlay">📷</div>
                <input
                  type="file" accept="image/*"
                  className="prf-avatar-input"
                  ref={fileRef}
                  onChange={handlePicChange}
                />
              </div>

              {newPic && (
                <div className="prf-pic-row">
                  <span className="prf-pic-name">📁 {newPic.name}</span>
                  <button className="prf-upload-btn" onClick={handlePicUpload} disabled={uploading}>
                    {uploading ? "Uploading…" : "Upload Photo"}
                  </button>
                </div>
              )}
              {!newPic && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#c4c9de", fontWeight: 500 }}>
                  Click photo to change
                </div>
              )}
            </div>

            {/* Form */}
            <div className="prf-body">
              <div className="mb-3">
                <label className="prf-label">Display Name</label>
                <input
                  className="prf-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="mb-4">
                <label className="prf-label">Bio</label>
                <textarea
                  className="prf-input prf-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Tell people a little about yourself…"
                />
              </div>

              <hr className="prf-rule" />

              <button
                className={`prf-save-btn${saved ? " saved" : ""}`}
                onClick={handleUpdate}
                disabled={saving}
              >
                {saving
                  ? <><span className="prf-spin" /> Saving…</>
                  : saved
                    ? <>✓ Saved!</>
                    : <>Save Profile</>
                }
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}