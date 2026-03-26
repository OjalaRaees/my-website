// UploadPost.jsx
import React, { useState, useRef } from "react";
import API from "../api";

export default function UploadPost({ token, refreshPosts }) {
  const [tab,          setTab]          = useState("post");
  /* post */
  const [postText,     setPostText]     = useState("");
  const [postFiles,    setPostFiles]    = useState([]);
  const [postPreviews, setPostPreviews] = useState([]);
  const [posting,      setPosting]      = useState(false);
  /* status */
  const [stCaption,    setStCaption]    = useState("");
  const [stFiles,      setStFiles]      = useState([]);
  const [stPreviews,   setStPreviews]   = useState([]);
  const [stPosting,    setStPosting]    = useState(false);

  const postFileRef   = useRef();
  const statusFileRef = useRef();

  const ftype = (f) => f.type.startsWith("video/") ? "video" : "image";

  /* ── Post ── */
  const handlePostFiles = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPostFiles(files);
    setPostPreviews(files.map(f => ({ url: URL.createObjectURL(f), type: ftype(f) })));
    e.target.value = "";
  };
  const removePostFile = (i) => {
    setPostFiles(p => p.filter((_, idx) => idx !== i));
    setPostPreviews(p => p.filter((_, idx) => idx !== i));
  };
  const handlePost = async () => {
    if (!postText.trim() && postFiles.length === 0) return;
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append("content", postText.trim());
      postFiles.forEach(f => fd.append("files", f));
      await API.post("/posts/upload", fd, { headers: { Authorization: `Bearer ${token}` } });
      setPostText(""); setPostFiles([]); setPostPreviews([]);
      if (refreshPosts) refreshPosts();
    } catch (err) { console.error(err); }
    setPosting(false);
  };

  /* ── Status (multiple files → multiple statuses, shared caption) ── */
  const handleStFiles = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setStFiles(files);
    setStPreviews(files.map(f => ({ url: URL.createObjectURL(f), type: ftype(f) })));
    e.target.value = "";
  };
  const removeStFile = (i) => {
    setStFiles(p => p.filter((_, idx) => idx !== i));
    setStPreviews(p => p.filter((_, idx) => idx !== i));
  };
  const handleStatus = async () => {
    if (!stFiles.length) return;
    setStPosting(true);
    try {
      const fd = new FormData();
      stFiles.forEach(f => fd.append("files", f));
      if (stCaption.trim()) fd.append("caption", stCaption.trim());
      await API.post("/status/upload", fd, { headers: { Authorization: `Bearer ${token}` } });
      setStCaption(""); setStFiles([]); setStPreviews([]);
    } catch (err) { console.error(err); }
    setStPosting(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        .up-root { font-family:'Outfit',sans-serif; padding:20px 16px 0; max-width:600px; margin:0 auto; }
        .up-card {
          background:#fff; border:1px solid #eaedf5; border-radius:20px;
          box-shadow:0 2px 20px rgba(99,102,241,.08); overflow:hidden; margin-bottom:20px;
        }
        .up-tabs { display:flex; border-bottom:1px solid #f0f1f8; }
        .up-tab {
          flex:1; padding:13px 8px; background:none; border:none;
          border-bottom:2.5px solid transparent;
          font-family:'Outfit',sans-serif; font-size:13px; font-weight:700; color:#9ca3af;
          cursor:pointer; transition:color .15s, border-color .15s;
          display:flex; align-items:center; justify-content:center; gap:6px;
        }
        .up-tab.active { color:#6366f1; border-bottom-color:#6366f1; background:#fafbff; }
        .up-tab:hover:not(.active) { color:#6b7280; }
        .up-body { padding:14px 16px 16px; }
        .up-textarea {
          width:100%; resize:none; min-height:68px;
          border:1.5px solid #e4e7f0; border-radius:12px;
          background:#f8f9ff; padding:11px 14px;
          font-family:'Outfit',sans-serif; font-size:14px; font-weight:500; color:#1a1a2e;
          outline:none; transition:border-color .2s, box-shadow .2s; line-height:1.55;
          box-sizing:border-box;
        }
        .up-textarea:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.10); background:#fff; }
        .up-textarea::placeholder { color:#c4c9de; }
        .up-note {
          display:flex; align-items:center; gap:8px; margin-top:10px;
          background:linear-gradient(135deg,#eef0ff,#f4f0ff);
          border:1px solid #dde0ff; border-radius:10px; padding:8px 12px;
          font-size:12.5px; font-weight:700; color:#6366f1;
        }
        .up-previews { display:flex; gap:8px; margin-top:10px; overflow-x:auto; padding-bottom:4px; }
        .up-previews::-webkit-scrollbar { height:3px; }
        .up-previews::-webkit-scrollbar-thumb { background:#e4e7f0; border-radius:3px; }
        .up-pitem {
          position:relative; width:88px; height:88px; flex-shrink:0;
          border-radius:10px; overflow:hidden; background:#f0f1f8;
          border:2px solid #eef0ff;
        }
        .up-pitem.first { border-color:#6366f1; }
        .up-pthumb { width:100%; height:100%; object-fit:cover; display:block; }
        .up-pdel {
          position:absolute; top:3px; right:3px; width:18px; height:18px;
          background:rgba(0,0,0,.6); border:none; border-radius:50%; color:#fff;
          font-size:9px; cursor:pointer; display:flex; align-items:center; justify-content:center;
        }
        .up-pdel:hover { background:rgba(239,68,68,.85); }
        .up-pnum {
          position:absolute; bottom:3px; right:3px;
          background:rgba(99,102,241,.82); color:#fff; font-size:9px; font-weight:800;
          width:17px; height:17px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
        }
        .up-pbadge {
          position:absolute; bottom:3px; left:3px;
          background:rgba(0,0,0,.55); color:#fff; font-size:9px; font-weight:700;
          padding:1px 5px; border-radius:8px;
        }
        .up-footer { display:flex; align-items:center; justify-content:space-between; margin-top:12px; gap:10px; flex-wrap:wrap; }
        .up-file-btn {
          display:inline-flex; align-items:center; gap:7px; padding:8px 16px; border-radius:50px;
          background:#f4f5fb; border:1.5px solid #e4e7f0; color:#6366f1;
          font-family:'Outfit',sans-serif; font-size:13px; font-weight:700; cursor:pointer;
          transition:background .15s, border-color .15s;
        }
        .up-file-btn:hover { background:#eef0ff; border-color:#c7d0ff; }
        .up-submit {
          padding:10px 26px; border:none; border-radius:50px;
          background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
          font-family:'Outfit',sans-serif; font-size:14px; font-weight:800;
          cursor:pointer; box-shadow:0 3px 12px rgba(99,102,241,.3);
          transition:opacity .18s, transform .15s;
          display:flex; align-items:center; gap:7px;
        }
        .up-submit:hover:not(:disabled) { opacity:.88; transform:translateY(-1px); }
        .up-submit:disabled { opacity:.4; cursor:not-allowed; box-shadow:none; }
        .up-spin {
          width:14px; height:14px;
          border:2.5px solid rgba(255,255,255,.35); border-top-color:#fff;
          border-radius:50%; animation:spin .65s linear infinite;
        }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <div className="up-root">
        <div className="up-card">
          <div className="up-tabs">
            <button className={`up-tab${tab==="post"?" active":""}`} onClick={()=>setTab("post")}>🖼 New Post</button>
            <button className={`up-tab${tab==="status"?" active":""}`} onClick={()=>setTab("status")}>⚡ Add Status</button>
          </div>

          {/* ── POST ── */}
          {tab === "post" && (
            <div className="up-body">
              <textarea className="up-textarea" placeholder="What's on your mind?" value={postText}
                onChange={e=>setPostText(e.target.value)} rows={3} />
              {postPreviews.length > 1 && (
                <div className="up-note">🎠 {postPreviews.length} photos — one swipeable carousel post</div>
              )}
              {postPreviews.length > 0 && (
                <div className="up-previews">
                  {postPreviews.map((pv,i) => (
                    <div key={i} className={`up-pitem${i===0?" first":""}`}>
                      {pv.type==="image"
                        ? <img src={pv.url} alt="" className="up-pthumb"/>
                        : <video src={pv.url} className="up-pthumb" muted/>}
                      <button className="up-pdel" onClick={()=>removePostFile(i)}>✕</button>
                      {pv.type==="video" && <span className="up-pbadge">▶</span>}
                      {postPreviews.length>1 && <span className="up-pnum">{i+1}</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className="up-footer">
                <input type="file" accept="image/*,video/*" multiple ref={postFileRef}
                  style={{display:"none"}} onChange={handlePostFiles}/>
                <button className="up-file-btn" onClick={()=>postFileRef.current.click()}>
                  📎 {postFiles.length>0?`${postFiles.length} file${postFiles.length>1?"s":""} selected`:"Add Photos/Videos"}
                </button>
                <button className="up-submit" onClick={handlePost}
                  disabled={posting||(!postText.trim()&&postFiles.length===0)}>
                  {posting?<><span className="up-spin"/>Posting…</>
                    :postFiles.length>1?"🎠 Post Carousel":"Publish Post"}
                </button>
              </div>
            </div>
          )}

          {/* ── STATUS ── */}
          {tab === "status" && (
            <div className="up-body">
              <textarea className="up-textarea" placeholder="Caption for all statuses (optional)…"
                value={stCaption} onChange={e=>setStCaption(e.target.value)} rows={2}/>
              {stPreviews.length > 1 && (
                <div className="up-note">⚡ {stPreviews.length} statuses will be posted — same caption applies to all</div>
              )}
              {stPreviews.length > 0 && (
                <div className="up-previews">
                  {stPreviews.map((pv,i) => (
                    <div key={i} className={`up-pitem${i===0?" first":""}`}>
                      {pv.type==="image"
                        ? <img src={pv.url} alt="" className="up-pthumb"/>
                        : <video src={pv.url} className="up-pthumb" muted/>}
                      <button className="up-pdel" onClick={()=>removeStFile(i)}>✕</button>
                      {pv.type==="video" && <span className="up-pbadge">▶</span>}
                      {stPreviews.length>1 && <span className="up-pnum">{i+1}</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className="up-footer">
                <input type="file" accept="image/*,video/*" multiple ref={statusFileRef}
                  style={{display:"none"}} onChange={handleStFiles}/>
                <button className="up-file-btn" onClick={()=>statusFileRef.current.click()}>
                  {stFiles.length>0?`📁 ${stFiles.length} file${stFiles.length>1?"s":""} selected`:"📎 Choose Media"}
                </button>
                <button className="up-submit" onClick={handleStatus} disabled={stPosting||stFiles.length===0}>
                  {stPosting?<><span className="up-spin"/>Sharing…</>
                    :stFiles.length>1?`⚡ Share ${stFiles.length} Statuses`:"Share Status"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}