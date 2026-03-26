// Navbar.jsx
import React, { useState, useEffect } from "react";
import { Nav, Navbar, Container, Button } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { useLocation } from "react-router-dom";

function MyNavbar({ token, onLogout }) {
  const [scrolled,  setScrolled]  = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setExpanded(false); }, [location.pathname]);

  const navLinks = [
    { to: "/post",     icon: "◈",  label: "Feed"     },
    { to: "/upload",   icon: "⊕",  label: "Create"   },
    { to: "/status",   icon: "◎",  label: "Status"   },
    { to: "/search",   icon: "⌕",  label: "Search"   },
    { to: "/messages", icon: "◉",  label: "Messages" },
    { to: "/aichat", icon: "✦", label: "AI Chat" },
    { to: "/profile",  icon: "◐",  label: "Profile"  },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

        :root {
          --nb-font:     'Outfit', sans-serif;
          --nb-bg:       rgba(10, 10, 22, 0.72);
          --nb-bg-solid: #0a0a16;
          --nb-border:   rgba(255,255,255,0.07);
          --nb-accent:   #7c6ef5;
          --nb-accent-2: #a78bfa;
          --nb-text:     rgba(255,255,255,0.75);
          --nb-text-hi:  #ffffff;
          --nb-glow:     0 0 32px rgba(124,110,245,0.28);
          --nb-shadow:   0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04);
        }

        .mnb {
          font-family: var(--nb-font) !important;
          background: var(--nb-bg) !important;
          backdrop-filter: blur(22px) saturate(160%) !important;
          -webkit-backdrop-filter: blur(22px) saturate(160%) !important;
          border-bottom: 1px solid var(--nb-border) !important;
          padding: 0 !important;
          transition: background 0.3s ease, box-shadow 0.3s ease !important;
          min-height: 64px;
        }
        .mnb.scrolled {
          background: rgba(10,10,22,0.92) !important;
          box-shadow: var(--nb-shadow) !important;
        }

        .mnb-brand {
          font-family: var(--nb-font) !important;
          font-size: 20px !important;
          font-weight: 800 !important;
          letter-spacing: -0.02em !important;
          color: var(--nb-text-hi) !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          padding: 0 !important;
          text-decoration: none !important;
          transition: opacity 0.2s !important;
          user-select: none;
        }
        .mnb-brand:hover { opacity: 0.85 !important; }

        .mnb-logo-mark {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, var(--nb-accent) 0%, var(--nb-accent-2) 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 17px;
          box-shadow: 0 4px 16px rgba(124,110,245,0.5), 0 0 0 1px rgba(255,255,255,0.12);
          flex-shrink: 0;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .mnb-brand:hover .mnb-logo-mark {
          box-shadow: 0 6px 22px rgba(124,110,245,0.65), 0 0 0 1px rgba(255,255,255,0.18);
          transform: scale(1.05) rotate(-3deg);
        }
        .mnb-brand-text {
          background: linear-gradient(90deg, #fff 40%, var(--nb-accent-2) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .mnb .navbar-toggler {
          border: 1px solid rgba(255,255,255,0.15) !important;
          border-radius: 10px !important;
          padding: 7px 10px !important;
          transition: background 0.2s !important;
        }
        .mnb .navbar-toggler:hover  { background: rgba(255,255,255,0.08) !important; }
        .mnb .navbar-toggler:focus  { box-shadow: 0 0 0 3px rgba(124,110,245,0.35) !important; }
        .mnb .navbar-toggler-icon   { filter: invert(1); }

        .mnb-link {
          position: relative;
          font-family: var(--nb-font) !important;
          font-size: 13.5px !important;
          font-weight: 600 !important;
          letter-spacing: 0.01em !important;
          color: var(--nb-text) !important;
          padding: 6px 13px !important;
          border-radius: 10px !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          transition: color 0.18s ease, background 0.18s ease !important;
          white-space: nowrap;
          text-decoration: none !important;
        }
        .mnb-link:hover {
          color: var(--nb-text-hi) !important;
          background: rgba(255,255,255,0.07) !important;
        }
        .mnb-link.active {
          color: var(--nb-text-hi) !important;
          background: rgba(124,110,245,0.18) !important;
        }
        .mnb-link.active::after {
          content: '';
          position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%);
          width: 20px; height: 2px; border-radius: 2px;
          background: linear-gradient(90deg, var(--nb-accent), var(--nb-accent-2));
          box-shadow: 0 0 8px rgba(124,110,245,0.7);
        }
        .mnb-link-icon {
          font-size: 15px; line-height: 1; color: var(--nb-accent-2);
          transition: transform 0.2s;
        }
        .mnb-link:hover .mnb-link-icon     { transform: scale(1.18); }
        .mnb-link.active .mnb-link-icon    {
          color: var(--nb-accent-2);
          filter: drop-shadow(0 0 4px rgba(167,139,250,0.8));
        }

        /* Special glow for AI Chat link */
        .mnb-link.ai-link .mnb-link-icon {
          color: #f0abfc;
          filter: drop-shadow(0 0 6px rgba(240,171,252,0.6));
        }
        .mnb-link.ai-link:hover {
          background: rgba(240,171,252,0.10) !important;
        }
        .mnb-link.ai-link.active {
          background: rgba(240,171,252,0.15) !important;
        }
        .mnb-link.ai-link.active::after {
          background: linear-gradient(90deg, #c084fc, #f0abfc);
          box-shadow: 0 0 8px rgba(240,171,252,0.7);
        }

        .mnb-divider {
          width: 1px; height: 22px;
          background: rgba(255,255,255,0.10);
          margin: 0 6px; flex-shrink: 0;
        }

        .mnb-logout {
          font-family: var(--nb-font) !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          letter-spacing: 0.02em !important;
          padding: 7px 18px !important;
          border-radius: 50px !important;
          border: 1.5px solid rgba(239,68,68,0.5) !important;
          background: rgba(239,68,68,0.10) !important;
          color: #fca5a5 !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          transition: all 0.2s ease !important;
          white-space: nowrap;
        }
        .mnb-logout:hover {
          background: rgba(239,68,68,0.22) !important;
          border-color: rgba(239,68,68,0.75) !important;
          color: #fecaca !important;
          box-shadow: 0 0 16px rgba(239,68,68,0.25) !important;
          transform: translateY(-1px) !important;
        }
        .mnb-logout:active { transform: translateY(0) !important; }

        .mnb .navbar-collapse { background: transparent !important; }

        @media (max-width: 991px) {
          .mnb .navbar-collapse {
            background: rgba(10,10,22,0.97) !important;
            border-top: 1px solid var(--nb-border) !important;
            border-radius: 0 0 18px 18px !important;
            padding: 12px 8px 18px !important;
            margin: 0 -12px !important;
            box-shadow: 0 16px 40px rgba(0,0,0,0.5) !important;
          }
          .mnb-link {
            padding: 11px 16px !important;
            border-radius: 12px !important;
            font-size: 14.5px !important;
          }
          .mnb-link.active::after { display: none; }
          .mnb-link.active {
            background: rgba(124,110,245,0.15) !important;
            border-left: 3px solid var(--nb-accent) !important;
          }
          .mnb-link.ai-link.active {
            border-left-color: #c084fc !important;
          }
          .mnb-divider {
            width: 100%; height: 1px;
            background: rgba(255,255,255,0.07);
            margin: 8px 0;
          }
          .mnb-logout {
            width: 100% !important;
            justify-content: center !important;
            padding: 11px 18px !important;
            border-radius: 12px !important;
          }
        }
      `}</style>

      <Navbar
        expand="lg"
        fixed="top"
        expanded={expanded}
        onToggle={setExpanded}
        className={`mnb${scrolled ? " scrolled" : ""}`}
      >
        <Container style={{ minHeight: 64 }}>

          {/* Brand */}
          <LinkContainer to="/">
            <Navbar.Brand className="mnb-brand me-4">
              <span className="mnb-logo-mark">✦</span>
              <span className="mnb-brand-text">Vibe</span>
            </Navbar.Brand>
          </LinkContainer>

          {/* Hamburger */}
          <Navbar.Toggle aria-controls="mnb-nav" />

          {/* Links */}
          <Navbar.Collapse id="mnb-nav">
            {token && (
              <Nav className="ms-auto align-items-lg-center" style={{ gap: "2px" }}>

                {navLinks.map(({ to, icon, label }) => (
                  <LinkContainer key={to} to={to}>
                    <Nav.Link
                      className={[
                        "mnb-link",
                        location.pathname === to ? "active" : "",
                        to === "/ai"             ? "ai-link" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <span className="mnb-link-icon">{icon}</span>
                      {label}
                    </Nav.Link>
                  </LinkContainer>
                ))}

                {/* Divider */}
                <div className="mnb-divider d-none d-lg-block" />

                {/* Logout */}
                <Button className="mnb-logout ms-lg-1" onClick={onLogout}>
                  <span style={{ fontSize: 14 }}>⏻</span>
                  Logout
                </Button>

              </Nav>
            )}
          </Navbar.Collapse>

        </Container>
      </Navbar>

      <div style={{ paddingTop: 64 }} />
    </>
  );
}

export default MyNavbar;