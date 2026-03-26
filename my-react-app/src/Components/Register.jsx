import React, { useState } from "react";
import API from "../api";
import "../auth.css";

function Register({ setToken }) {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post("/auth/register", { name, email, password });
      setToken(res.data.token, res.data.user);
    } catch (err) {
      alert(err.response?.data?.message);
    }
  };

  return (
    <div className="auth-container">

      <div className="auth-card">

        <h2 className="auth-title">Create Account ✨</h2>

        <form onSubmit={handleSubmit}>

          <input
            className="auth-input"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e)=>setName(e.target.value)}
          />

          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />

          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
          />

          <button className="auth-btn" type="submit">
            Register
          </button>

        </form>

      </div>

    </div>
  );
}

export default Register;