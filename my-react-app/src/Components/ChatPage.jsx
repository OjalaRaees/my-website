// src/Components/ChatPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewURL, setPreviewURL] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewerFile, setViewerFile] = useState(null);
  const [chatUser, setChatUser] = useState(null);
  const [seen, setSeen] = useState(false);
  const [dpViewer, setDpViewer] = useState(false);

  const chatEndRef = useRef(null);
  const dropRef = useRef(null);
  const socketRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"))?._id;
  const token = localStorage.getItem("token");

  // Helper: works whether sender/receiver is a plain ID string or populated object
  const extractId = (val) => {
    if (!val) return null;
    if (typeof val === "string") return val;
    return val._id?.toString() ?? null;
  };

  // ✅ Check if the last message YOU sent has been read by the other person
  const computeSeen = (msgs) => {
    const myMessages = msgs.filter((m) => extractId(m.sender) === currentUser);
    if (myMessages.length === 0) return false;
    const lastMine = myMessages[myMessages.length - 1];
    return lastMine.isRead === true;
  };

  // ---------------- SOCKET ----------------
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { auth: { token } });
    socketRef.current.emit("joinRoom", currentUser);

    socketRef.current.on("newMessage", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        const updated = [...prev, msg];
        setSeen(computeSeen(updated));
        return updated;
      });
      scrollToBottom();
    });

    // ✅ Backend now emits this when receiver opens the chat - sender sees "Seen"
    socketRef.current.on("messageRead", () => {
      setSeen(true);
    });

    return () => socketRef.current.disconnect();
  }, [currentUser, token]);

  // ---------------- FETCH USER ----------------
  const fetchChatUser = async () => {
    try {
      const res = await API.get(`/user/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChatUser(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // ---------------- FETCH MESSAGES ----------------
  const fetchMessages = async () => {
    try {
      const res = await API.get(`/chat/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages(res.data);
      scrollToBottom();

      // Mark unread messages from other user as read via socket
      res.data
        .filter((m) => extractId(m.receiver) === currentUser && !m.isRead)
        .forEach((msg) => {
          socketRef.current?.emit("markAsRead", msg._id);
        });

      // ✅ Correctly compute seen: was my last sent message read?
      setSeen(computeSeen(res.data));
    } catch (err) {
      console.log(err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // ---------------- SEND TEXT ----------------
  const sendMessage = async () => {
    if (!text.trim()) return;
    try {
      const res = await API.post(
        "/chat",
        { receiver: id, text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      socketRef.current.emit("sendMessage", res.data);
      setMessages((prev) => {
        if (prev.find((m) => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
      setText("");
      scrollToBottom();
      setSeen(false); // just sent, not read yet
    } catch (err) {
      console.log(err);
    }
  };

  // ---------------- FILE SELECT ----------------
  const handleFileSelect = (file) => {
    if (!file) return;
    setPreviewFile(file);
    setPreviewURL(URL.createObjectURL(file));
    setShowMenu(false);
  };

  // ---------------- SEND FILE ----------------
  const sendFile = async () => {
    if (!previewFile) return;
    const formData = new FormData();
    formData.append("file", previewFile);
    formData.append("receiverId", id);
    try {
      const res = await API.post("/chat/send-file", formData, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (e) =>
          setUploadProgress(Math.round((e.loaded * 100) / e.total)),
      });
      socketRef.current.emit("sendMessage", res.data);
      setMessages((prev) => {
        if (prev.find((m) => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
      setPreviewFile(null);
      setPreviewURL("");
      setUploadProgress(0);
      scrollToBottom();
      setSeen(false);
    } catch (err) {
      console.log(err);
    }
  };

  // ---------------- DRAG DROP ----------------
  useEffect(() => {
    const dropArea = dropRef.current;
    if (!dropArea) return;
    const preventDefault = (e) => e.preventDefault();
    const handleDrop = (e) => {
      e.preventDefault();
      handleFileSelect(e.dataTransfer.files[0]);
    };
    dropArea.addEventListener("dragover", preventDefault);
    dropArea.addEventListener("drop", handleDrop);
    return () => {
      dropArea.removeEventListener("dragover", preventDefault);
      dropArea.removeEventListener("drop", handleDrop);
    };
  }, []);

  // ---------------- INITIAL LOAD ----------------
  useEffect(() => {
    fetchChatUser();
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [id]);

  return (
    <div className="container mt-2" style={{ maxWidth: "650px" }}>
      <div className="card p-0">

        {/* HEADER */}
        {chatUser && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: 10,
              borderBottom: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
            onClick={() => navigate(-1)}
          >
            <img
              src={
                chatUser.profilePic
                  ? `http://localhost:5000${chatUser.profilePic}`
                  : "/default-profile.png"
              }
              alt="dp"
              style={{ width: 45, height: 45, borderRadius: "50%", marginRight: 10, cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); setDpViewer(true); }}
            />
            <h6 style={{ margin: 0 }}>{chatUser.name}</h6>
          </div>
        )}

        {/* CHAT AREA */}
        <div
          ref={dropRef}
          style={{ height: 420, overflowY: "auto", padding: 10, background: "#ECE5DD" }}
        >
          {messages.map((m) => {
            const isSender = extractId(m.sender) === currentUser;
            return (
              <div
                key={m._id}
                style={{
                  display: "flex",
                  justifyContent: isSender ? "flex-end" : "flex-start",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    background: isSender ? "#DCF8C6" : "#fff",
                    padding: "8px 10px",
                    borderRadius: 10,
                    maxWidth: "70%",
                    wordBreak: "break-word",
                  }}
                >
                  {m.text && <div>{m.text}</div>}

                  {m.fileType === "image" && (
                    <img
                      src={`http://localhost:5000${m.fileUrl}`}
                      style={{ width: 200, marginTop: 5, cursor: "pointer" }}
                      onClick={() => setViewerFile({ type: "image", url: `http://localhost:5000${m.fileUrl}` })}
                    />
                  )}

                  {m.fileType === "video" && (
                    <video width={200} style={{ marginTop: 5, cursor: "pointer" }}
                      onClick={() => setViewerFile({ type: "video", url: `http://localhost:5000${m.fileUrl}` })}>
                      <source src={`http://localhost:5000${m.fileUrl}`} />
                    </video>
                  )}

                  {m.fileType === "file" && (
                    <a href={`http://localhost:5000${m.fileUrl}`} target="_blank" rel="noreferrer">
                      📄 Download File
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={chatEndRef} />
        </div>

        {/* ✅ SEEN INDICATOR - sits between chat and input, always visible to both users */}
        {seen && (
          <div style={{
            textAlign: "right",
            fontSize: 12,
            color: "#555",
            padding: "3px 14px",
            background: "#f0f0f0",
            borderTop: "1px solid #e0e0e0",
          }}>
            ✓✓ Seen
          </div>
        )}

        {/* INPUT */}
        {!previewURL && (
          <div className="input-group p-2">
            <button className="btn btn-outline-secondary" onClick={() => setShowMenu(!showMenu)}>
              📎
            </button>

            {showMenu && (
              <div style={{
                position: "absolute", bottom: 60, background: "#fff",
                border: "1px solid #ddd", padding: 10, borderRadius: 10,
              }}>
                <div style={{ cursor: "pointer", padding: "4px 0" }} onClick={() => document.getElementById("imageInput").click()}>🖼 Images</div>
                <div style={{ cursor: "pointer", padding: "4px 0" }} onClick={() => document.getElementById("videoInput").click()}>🎥 Videos</div>
                <div style={{ cursor: "pointer", padding: "4px 0" }} onClick={() => document.getElementById("fileInput").click()}>📁 Files</div>
              </div>
            )}

            <input type="file" id="imageInput" accept="image/*" style={{ display: "none" }}
              onChange={(e) => handleFileSelect(e.target.files[0])} />
            <input type="file" id="videoInput" accept="video/*" style={{ display: "none" }}
              onChange={(e) => handleFileSelect(e.target.files[0])} />
            <input type="file" id="fileInput" style={{ display: "none" }}
              onChange={(e) => handleFileSelect(e.target.files[0])} />

            <input
              className="form-control"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button className="btn btn-primary" onClick={sendMessage}>Send</button>
          </div>
        )}

        {/* FILE PREVIEW */}
        {previewURL && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999,
          }}>
            <div style={{ textAlign: "center", position: "relative" }}>
              <button
                onClick={() => { setPreviewFile(null); setPreviewURL(""); }}
                style={{
                  position: "absolute", top: -20, right: -20, fontSize: 18,
                  background: "#fff", borderRadius: "50%", border: "none",
                  width: 30, height: 30, cursor: "pointer",
                }}>✖</button>

              {previewFile?.type?.startsWith("image") && <img src={previewURL} style={{ width: 400 }} />}
              {previewFile?.type?.startsWith("video") && (
                <video controls style={{ width: 400 }}><source src={previewURL} /></video>
              )}

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div style={{ color: "#fff", marginTop: 10 }}>{uploadProgress}%</div>
              )}

              <div style={{ marginTop: 20 }}>
                <button className="btn btn-success me-3" onClick={sendFile}>Send</button>
                <button className="btn btn-danger" onClick={() => { setPreviewFile(null); setPreviewURL(""); }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* VIEWER */}
        {viewerFile && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999,
          }}
            onClick={() => setViewerFile(null)}>
            {viewerFile.type === "image" && <img src={viewerFile.url} style={{ maxWidth: "90%", maxHeight: "90%" }} />}
            {viewerFile.type === "video" && (
              <video controls style={{ maxWidth: "90%", maxHeight: "90%" }}><source src={viewerFile.url} /></video>
            )}
          </div>
        )}

        {/* DP VIEWER MODAL */}
        {dpViewer && chatUser?.profilePic && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            display: "flex", justifyContent: "center", alignItems: "center",
            zIndex: 9999, cursor: "pointer",
          }}
            onClick={() => setDpViewer(false)}>
            <img
              src={`http://localhost:5000${chatUser.profilePic}`}
              alt="DP"
              style={{ width: 200, height: 200, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff" }}
            />
          </div>
        )}

      </div>
    </div>
  );
}

export default ChatPage;