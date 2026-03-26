// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login        from "./Components/Login";
import Register     from "./Components/Register";
import UploadPost   from "./Components/UploadPost";
import PostList     from "./Components/PostList";
import MyNavbar     from "./Components/Navbar";
import Landing      from "./Components/Landing";
import Profile      from "./Components/Profile";
import SearchPage   from "./Components/SearchPage";
import ProfilePage  from "./Components/ProfilePage";
import ChatPage     from "./Components/ChatPage";
import MessageScreen from "./Components/MessageScreen";
import StatusList   from "./Components/StatusList";
import Aichat       from "./Components/Aichat";

function App() {
  const [token,       setToken]       = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser  = localStorage.getItem("user");
    if (savedToken) setToken(savedToken);
    if (savedUser)  setCurrentUser(JSON.parse(savedUser));
  }, []);

  const handleLogin = (token, user) => {
    setToken(token);
    setCurrentUser(user);
    localStorage.setItem("token",  token);
    localStorage.setItem("user",   JSON.stringify(user));
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const refreshPosts = () => { window.location.reload(); };

  return (
    <>
      <MyNavbar token={token} onLogout={handleLogout} />

      <div style={{ marginTop: "70px" }}>
        <Routes>
          {/* ── Public ── */}
          <Route path="/"        element={!token ? <Landing />  : <Navigate to="/post" />} />
          <Route path="/login"   element={!token ? <Login    setToken={handleLogin} /> : <Navigate to="/post" />} />
          <Route path="/register" element={!token ? <Register setToken={handleLogin} /> : <Navigate to="/post" />} />

          {/* ── Protected ── */}
          <Route path="/post"
            element={token ? <PostList currentUser={currentUser} /> : <Navigate to="/login" />} />

          <Route path="/upload"
            element={token ? <UploadPost token={token} refreshPosts={refreshPosts} /> : <Navigate to="/login" />} />

          <Route path="/profile"
            element={token ? <Profile token={token} /> : <Navigate to="/login" />} />

          <Route path="/profile/:id"
            element={token ? <ProfilePage /> : <Navigate to="/login" />} />

          <Route path="/search"
            element={token ? <SearchPage /> : <Navigate to="/login" />} />

          <Route path="/chat/:id"
            element={token ? <ChatPage /> : <Navigate to="/login" />} />

          <Route path="/messages"
            element={token ? <MessageScreen /> : <Navigate to="/login" />} />

          <Route path="/aichat"
  element={token ? <Aichat token={token} /> : <Navigate to="/login" />}
/>

          {/* ── Status — pass both token AND currentUserId ── */}
          <Route path="/status"
            element={token
              ? <StatusList token={token} currentUserId={currentUser?._id} />
              : <Navigate to="/login" />
            }
          />
          
          

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </>
  );
}

export default App;