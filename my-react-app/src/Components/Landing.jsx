import React from "react";
import { Link } from "react-router-dom";
import "../auth.css";

function Landing() {
  return (
    <div className="landing-container">
      <div className="landing-card">
        <h1 className="logo">EchoSphere</h1>
        <p className="tagline">Connect • Share • Explore</p>

        <div className="btn-group">
          <Link to="/login" className="btn btn-main">
            Login
          </Link>

          <Link to="/register" className="btn btn-outline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Landing;