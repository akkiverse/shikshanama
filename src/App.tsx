import React, { Suspense, useEffect, useState } from "react";

const AdminApp = React.lazy(() => import("./admin/AdminApp"));

declare global {
  interface Window {
    __SHIKSHANAMA_BOOTSTRAP__?: any;
  }
}

const SectionHeading: React.FC<{ en: string; hi?: string }> = ({ en, hi }) => (
  <div style={{ marginBottom: "1.35rem" }}>
    <h2 style={{ margin: 0, fontSize: "clamp(1.5rem, 3vw, 2.15rem)", fontWeight: 800 }}>
      {en}
      {hi ? (
        <span className="hi-accent" style={{ display: "block", fontSize: "1.05rem", color: "var(--accent-primary)", fontWeight: 600 }}>
          {hi}
        </span>
      ) : null}
    </h2>
  </div>
);

const CountUpValue: React.FC<{ valueText: string }> = ({ valueText }) => {
  const [display, setDisplay] = useState(valueText);
  useEffect(() => {
    const match = valueText.match(/^(\d+)(.*)$/);
    if (!match) {
      setDisplay(valueText);
      return;
    }
    const target = parseInt(match[1], 10);
    const suffix = match[2] || "";
    let step = 0;
    const totalSteps = 16;
    const timer = window.setInterval(() => {
      step += 1;
      if (step >= totalSteps) {
        setDisplay(`${target}${suffix}`);
        window.clearInterval(timer);
      } else {
        setDisplay(`${Math.round((target * step) / totalSteps)}${suffix}`);
      }
    }, 28);
    return () => window.clearInterval(timer);
  }, [valueText]);

  return <span>{display}</span>;
};

const ConsentPublicPage: React.FC<{ token: string }> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<any>(null);
  const [parentName, setParentName] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
  const [submitErr, setSubmitErr] = useState("");

  useEffect(() => {
    fetch(`/api/public/consent/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(d.detail || "This link is no longer valid, please contact Shikshanama");
        }
        setInfo(d);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const submitDecision = async (decision: "agree" | "decline") => {
    setSubmitErr("");
    if (decision === "agree" && !parentName.trim()) {
      setSubmitErr("Please type your full name to give consent.");
      return;
    }
    const resp = await fetch(`/api/public/consent/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, parent_name: parentName }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setSubmitErr(data.detail || "Unable to submit decision");
      return;
    }
    setDoneMsg(data.message);
  };

  if (loading) {
    return <div className="container" style={{ padding: "3rem 1rem" }}>Loading consent form...</div>;
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: "540px", padding: "3.5rem 1rem" }}>
        <div className="bento-card">
          <h1 style={{ marginTop: 0, fontSize: "1.35rem" }}>Shikshanama (शिक्षाNama)</h1>
          <p role="alert" style={{ color: "#f87171", fontWeight: 700 }}>{error}</p>
          <a href="/" className="btn-primary">Back to Homepage</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "600px", padding: "2.5rem 1rem" }}>
      <div className="bento-card">
        <h1 style={{ marginTop: 0, fontSize: "1.45rem" }}>
          <span className="hi-part">शिक्षा</span>Nama · Parent Consent / अभिभावक सहमति
        </h1>
        {doneMsg ? (
          <div>
            <p style={{ color: "#4ade80", fontWeight: 700, fontSize: "1.05rem" }}>{doneMsg}</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{info?.withdrawal_info}</p>
            <a href="/" className="btn-primary">Visit Shikshanama Website</a>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <img
                src={info.student.photo_url}
                alt={info.student.name}
                width={84}
                height={84}
                style={{ borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent-primary)" }}
              />
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{info.student.name}</h2>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Class {info.student.class_name} · {info.student.stream} · {info.student.year}
                </div>
                <div style={{ color: "var(--accent-primary)", fontWeight: 800 }}>
                  {info.student.score_text} · {info.student.rank_text}
                </div>
              </div>
            </div>

            <div style={{ fontSize: "0.88rem", background: "rgba(15,23,42,0.5)", padding: "0.85rem", borderRadius: "0.65rem" }}>
              <p style={{ marginTop: 0 }}>{info.consent_text_en}</p>
              <p className="hi-accent" lang="hi" style={{ marginBottom: 0 }}>{info.consent_text_hi}</p>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>{info.withdrawal_info}</p>

            {submitErr && <div role="alert" style={{ color: "#f87171", fontWeight: 600 }}>{submitErr}</div>}

            <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              Parent / Guardian Full Name (माता-पिता का नाम) *
              <input
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Type your full name"
                style={{ width: "100%", padding: "0.65rem", borderRadius: "0.5rem", marginTop: "0.3rem" }}
              />
            </label>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button type="button" onClick={() => submitDecision("agree")} className="btn-primary">
                I agree / मैं सहमत हूँ
              </button>
              <button type="button" onClick={() => submitDecision("decline")} className="mobile-menu-btn" style={{ display: "inline-flex" }}>
                I do not agree
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [data, setData] = useState<any>(() => window.__SHIKSHANAMA_BOOTSTRAP__ || null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("shikshanama_theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  // Filters synced with URL query (AC-3.2, AC-3.3)
  const initialParams = new URLSearchParams(window.location.search);
  const [classFilter, setClassFilter] = useState(initialParams.get("class") || "All");
  const [streamFilter, setStreamFilter] = useState(initialParams.get("stream") || "All");
  const [yearFilter, setYearFilter] = useState(initialParams.get("year") || "All");

  // Active stream tab for courses (AC-4.1)
  const [activeCourseStream, setActiveCourseStream] = useState("Science");

  // Expanded founder visions (AC-5.2)
  const [expandedFounders, setExpandedFounders] = useState<Record<number, boolean>>({});

  // Lightbox for gallery (AC-7.2)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Demo modal & form state (US-9)
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    student_name: "",
    mobile: "",
    class_name: "12",
    stream: "Science",
    branch_id: 1,
    website_url: "",
  });
  const [leadError, setLeadError] = useState("");
  const [leadSuccess, setLeadSuccess] = useState<{ message: string; whatsapp_url: string } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("shikshanama_theme", theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setDemoModalOpen(false);
        setLightboxIdx(null);
      }
    };
    const onPopState = () => {
      setPathname(window.location.pathname);
      const q = new URLSearchParams(window.location.search);
      setClassFilter(q.get("class") || "All");
      setStreamFilter(q.get("stream") || "All");
      setYearFilter(q.get("year") || "All");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/consent/")) {
      fetch("/api/public/bootstrap")
        .then((r) => r.json())
        .then((d) => {
          setData(d);
          if (d?.branches?.[0]?.id) {
            setLeadForm((p) => ({ ...p, branch_id: d.branches[0].id }));
          }
        })
        .catch(() => {});
    }
  }, [pathname]);

  const updateFilterUrl = (nextClass: string, nextStream: string, nextYear: string) => {
    setClassFilter(nextClass);
    setStreamFilter(nextStream);
    setYearFilter(nextYear);
    const params = new URLSearchParams();
    if (nextClass !== "All") params.set("class", nextClass);
    if (nextStream !== "All") params.set("stream", nextStream);
    if (nextYear !== "All") params.set("year", nextYear);
    const qs = params.toString();
    const targetUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState({}, "", targetUrl);
  };

  if (pathname.startsWith("/admin")) {
    return (
      <Suspense fallback={<div className="container" style={{ padding: "3rem 1rem" }}>Loading Admin CMS...</div>}>
        <AdminApp />
      </Suspense>
    );
  }

  if (pathname.startsWith("/consent/")) {
    const token = pathname.replace(/^\/consent\//, "").split("/")[0];
    return <ConsentPublicPage token={token} />;
  }

  if (!data) {
    return <div className="container" style={{ padding: "3rem 1rem" }}>Loading Shikshanama (शिक्षाNama)...</div>;
  }

  const { settings, hero_stats, pinned_results, results, courses, batches, founders, branches, testimonials, gallery } = data;
  const headings = settings.section_headings || {};

  const filteredResults = (results || []).filter((r: any) => {
    if (classFilter !== "All" && String(r.class_name).toLowerCase() !== classFilter.toLowerCase()) return false;
    if (streamFilter !== "All" && String(r.stream).toLowerCase() !== streamFilter.toLowerCase()) return false;
    if (yearFilter !== "All" && String(r.year).toLowerCase() !== yearFilter.toLowerCase()) return false;
    return true;
  });

  const openWaitlistForm = (batch: any) => {
    setLeadForm((p) => ({
      ...p,
      class_name: batch.class_name,
      stream: batch.stream,
      branch_id: batch.branch_id,
    }));
    setLeadSuccess(null);
    setLeadError("");
    setDemoModalOpen(true);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadError("");
    const resp = await fetch("/api/public/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...leadForm, source: pathname }),
    });
    const resData = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setLeadError(resData.detail || "Please check your details and try again.");
      return;
    }
    setLeadSuccess({
      message: resData.message || "Thank you! Our counsellor will call you shortly.",
      whatsapp_url: resData.whatsapp_url || settings.global_whatsapp_url,
    });
  };

  const renderLeadForm = () => (
    <div>
      {leadSuccess ? (
        <div className="section-animate" style={{ textAlign: "center", padding: "1rem 0" }}>
          <h3 style={{ color: "#4ade80", marginTop: 0 }}>{leadSuccess.message}</h3>
          <p className="hi-accent" style={{ color: "var(--text-secondary)" }}>
            धन्यवाद! हमारी टीम जल्द ही आपसे संपर्क करेगी।
          </p>
          {leadSuccess.whatsapp_url && (
            <a href={leadSuccess.whatsapp_url} target="_blank" rel="noopener" className="btn-secondary">
              💬 Chat on WhatsApp now
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={handleLeadSubmit} method="post" action="/api/public/leads/form" style={{ display: "grid", gap: "0.8rem" }}>
          {leadError && (
            <div role="alert" style={{ padding: "0.6rem", background: "rgba(239,68,68,0.16)", color: "#f87171", borderRadius: "0.5rem", fontSize: "0.88rem" }}>
              {leadError}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.86rem", fontWeight: 600 }}>
              Student Name *
              <input
                name="student_name"
                required
                value={leadForm.student_name}
                onChange={(e) => setLeadForm((p) => ({ ...p, student_name: e.target.value }))}
                placeholder="Enter student's full name"
                style={{ width: "100%", padding: "0.65rem", borderRadius: "0.5rem", marginTop: "0.25rem" }}
              />
            </label>
            <label style={{ fontSize: "0.86rem", fontWeight: 600 }}>
              Mobile Number (10-digit) *
              <input
                name="mobile"
                required
                value={leadForm.mobile}
                onChange={(e) => setLeadForm((p) => ({ ...p, mobile: e.target.value }))}
                placeholder="98XXXXXXXX"
                style={{ width: "100%", padding: "0.65rem", borderRadius: "0.5rem", marginTop: "0.25rem" }}
              />
            </label>
            <label style={{ fontSize: "0.86rem", fontWeight: 600 }}>
              Class *
              <select
                name="class_name"
                value={leadForm.class_name}
                onChange={(e) => setLeadForm((p) => ({ ...p, class_name: e.target.value }))}
                style={{ width: "100%", padding: "0.65rem", borderRadius: "0.5rem", marginTop: "0.25rem" }}
              >
                {(settings.classes_list || ["6", "7", "8", "9", "10", "11", "12"]).map((c: string) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: "0.86rem", fontWeight: 600 }}>
              Stream *
              <select
                name="stream"
                value={leadForm.stream}
                onChange={(e) => setLeadForm((p) => ({ ...p, stream: e.target.value }))}
                style={{ width: "100%", padding: "0.65rem", borderRadius: "0.5rem", marginTop: "0.25rem" }}
              >
                {(settings.streams_list || ["Foundation", "Science", "Commerce", "Humanities"]).map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: "0.86rem", fontWeight: 600 }}>
              Preferred Branch *
              <select
                name="branch_id"
                value={leadForm.branch_id}
                onChange={(e) => setLeadForm((p) => ({ ...p, branch_id: Number(e.target.value) }))}
                style={{ width: "100%", padding: "0.65rem", borderRadius: "0.5rem", marginTop: "0.25rem" }}
              >
                {(branches || []).map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Hidden Honeypot field (AC-9.4) */}
          <input
            type="text"
            name="website_url"
            value={leadForm.website_url}
            onChange={(e) => setLeadForm((p) => ({ ...p, website_url: e.target.value }))}
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
          />

          <p className="hi-accent" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
            We use your number only to contact you about classes. / आपका नंबर सिर्फ़ क्लास की जानकारी के लिए।
          </p>

          <button type="submit" className="btn-primary" style={{ justifySelf: "start" }}>
            Book Free Demo · फ्री डेमो बुक करें
          </button>
        </form>
      )}
    </div>
  );

  return (
    <div style={{ paddingBottom: "4.5rem" }}>
      {/* Demo Content Ribbon (AC-18.2) */}
      {settings.demo_mode && (
        <div
          data-testid="demo-content-ribbon"
          style={{
            background: "rgba(245, 158, 11, 0.18)",
            borderBottom: "1px solid rgba(245, 158, 11, 0.4)",
            color: "#fbbf24",
            fontSize: "0.78rem",
            textAlign: "center",
            padding: "0.3rem 0.75rem",
            fontWeight: 600,
          }}
        >
          Demo content · Sample student profiles & avatars shown for preview.
        </div>
      )}

      {/* Top Announcement Ticker (US-1: AC-1.1, AC-1.2, AC-1.3) */}
      {settings.ticker_enabled && settings.ticker_text ? (
        <div className="ticker-bar" data-testid="announcement-ticker">
          {settings.ticker_link ? (
            <a href={settings.ticker_link} style={{ color: "#ffffff", textDecoration: "none" }}>
              <span className="ticker-track">
                📢 {settings.ticker_text} &nbsp; • &nbsp; 📢 {settings.ticker_text}
              </span>
            </a>
          ) : (
            <span className="ticker-track">
              📢 {settings.ticker_text} &nbsp; • &nbsp; 📢 {settings.ticker_text}
            </span>
          )}
        </div>
      ) : null}

      {/* Sticky Glassmorphic Navbar (AC-1.4, AC-1.6, AC-23.5) */}
      <nav className={`sticky-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-inner">
          <a href="/" className="brand-logo">
            <span className="hi-part">शिक्षा</span>Nama
          </a>

          <div className="nav-links">
            <a href="#hall-of-fame">Results</a>
            <a href="#courses">Courses</a>
            <a href="#founders">Founders</a>
            <a href="#branches">Branches</a>
            <a href="#demo-form">Contact</a>
            <button
              type="button"
              aria-label="Toggle colour theme"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="mobile-menu-btn"
              style={{ display: "inline-flex" }}
            >
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button type="button" onClick={() => setDemoModalOpen(true)} className="btn-primary">
              Book Free Demo · फ्री डेमो बुक करें
            </button>
          </div>

          <button
            type="button"
            className="mobile-menu-btn"
            aria-label="Open navigation menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            ☰ Menu
          </button>
        </div>
      </nav>

      {/* Mobile Full-Screen Sheet (AC-1.6) */}
      {mobileMenuOpen && (
        <div className="mobile-sheet" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="brand-logo">
              <span className="hi-part">शिक्षा</span>Nama
            </span>
            <button type="button" className="mobile-menu-btn" style={{ display: "inline-flex" }} onClick={() => setMobileMenuOpen(false)}>
              ✕ Close
            </button>
          </div>
          <a href="#hall-of-fame" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: "1.2rem", color: "var(--text-primary)", textDecoration: "none", fontWeight: 700 }}>
            Results · नतीजे
          </a>
          <a href="#courses" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: "1.2rem", color: "var(--text-primary)", textDecoration: "none", fontWeight: 700 }}>
            Courses & Batches
          </a>
          <a href="#founders" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: "1.2rem", color: "var(--text-primary)", textDecoration: "none", fontWeight: 700 }}>
            Founders
          </a>
          <a href="#branches" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: "1.2rem", color: "var(--text-primary)", textDecoration: "none", fontWeight: 700 }}>
            Branches
          </a>
          <a href="#demo-form" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: "1.2rem", color: "var(--text-primary)", textDecoration: "none", fontWeight: 700 }}>
            Contact
          </a>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setMobileMenuOpen(false);
              setDemoModalOpen(true);
            }}
          >
            Book Free Demo · फ्री डेमो बुक करें
          </button>
        </div>
      )}

      {/* Hero Section (US-2) */}
      <section className="container section-animate" style={{ paddingTop: "2.5rem", paddingBottom: "2.5rem" }}>
        <div className="bento-card" style={{ padding: "clamp(1.5rem, 4vw, 2.75rem)" }}>
          <span
            className="hi-accent"
            style={{
              display: "inline-block",
              padding: "0.3rem 0.85rem",
              borderRadius: "9999px",
              background: "rgba(249,115,22,0.16)",
              color: "var(--accent-primary)",
              fontWeight: 700,
              fontSize: "0.85rem",
              marginBottom: "0.9rem",
            }}
          >
            West Patel Nagar's Most Trusted Coaching · क्लास 6 से 12 तक पक्की तैयारी
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.35rem)", fontWeight: 900, margin: "0 0 0.85rem", lineHeight: 1.25 }}>
            Build Board & Competitive Confidence with{" "}
            <span className="hi-part" style={{ color: "var(--accent-primary)" }}>
              शिक्षाNama
            </span>{" "}
            (Shikshanama)
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", maxWidth: "740px", marginBottom: "1.5rem" }}>
            Small-batch personal mentorship in Foundation (Class 6–10), Science, Commerce, and Humanities (Class 11–12).
            Daily doubt counters, weekly board mock tests, and proven results across West Patel Nagar.
          </p>

          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginBottom: "2rem" }}>
            <button type="button" onClick={() => setDemoModalOpen(true)} className="btn-primary">
              Book a Free Demo Class · फ्री डेमो बुक करें
            </button>
            {settings.global_whatsapp_url && (
              <a href={settings.global_whatsapp_url} target="_blank" rel="noopener" className="btn-secondary">
                💬 Chat on WhatsApp
              </a>
            )}
          </div>

          {settings.hero_image_url && (
            <div style={{ marginBottom: "1.75rem", borderRadius: "0.85rem", overflow: "hidden" }}>
              <img
                src={settings.hero_image_url}
                alt="Shikshanama Campus Banner"
                width={1280}
                height={720}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          )}

          {/* Dynamic Trust Counters (AC-2.2) */}
          {hero_stats && hero_stats.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
              {hero_stats.map((st: any) => (
                <div
                  key={st.id}
                  style={{
                    padding: "0.95rem",
                    borderRadius: "0.85rem",
                    background: "rgba(15, 23, 42, 0.45)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--accent-primary)" }}>
                    <CountUpValue valueText={st.value} />
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>{st.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Hall of Fame / Results Showcase (US-3) */}
      <section id="hall-of-fame" className="container section-animate" style={{ paddingBottom: "2.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <SectionHeading
            en={headings.results?.en || "Hall of Fame"}
            hi={headings.results?.hi}
          />
          {pathname !== "/results" && (
            <a href="/results" style={{ color: "var(--accent-secondary)", fontWeight: 700, textDecoration: "none", marginBottom: "1.35rem" }}>
              View Full Hall of Fame ({results.length}) →
            </a>
          )}
        </div>

        {/* Filter Bar (AC-3.2, AC-3.3) */}
        <div className="bento-card" style={{ marginBottom: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <strong style={{ fontSize: "0.88rem" }}>Filter Achievers:</strong>
          <select
            aria-label="Filter by Class"
            value={classFilter}
            onChange={(e) => updateFilterUrl(e.target.value, streamFilter, yearFilter)}
            style={{ padding: "0.45rem 0.75rem", borderRadius: "0.5rem" }}
          >
            <option value="All">All Classes</option>
            <option value="10">Class 10</option>
            <option value="11">Class 11</option>
            <option value="12">Class 12</option>
          </select>

          <select
            aria-label="Filter by Stream"
            value={streamFilter}
            onChange={(e) => updateFilterUrl(classFilter, e.target.value, yearFilter)}
            style={{ padding: "0.45rem 0.75rem", borderRadius: "0.5rem" }}
          >
            <option value="All">All Streams</option>
            <option value="Science">Science</option>
            <option value="Commerce">Commerce</option>
            <option value="Humanities">Humanities</option>
            <option value="Foundation">Foundation</option>
          </select>

          <select
            aria-label="Filter by Academic Year"
            value={yearFilter}
            onChange={(e) => updateFilterUrl(classFilter, streamFilter, e.target.value)}
            style={{ padding: "0.45rem 0.75rem", borderRadius: "0.5rem" }}
          >
            <option value="All">All Years</option>
            {(data.available_years || ["2025-26", "2024-25"]).map((yr: string) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {(classFilter !== "All" || streamFilter !== "All" || yearFilter !== "All") && (
            <button
              type="button"
              className="mobile-menu-btn"
              style={{ display: "inline-flex", fontSize: "0.82rem" }}
              onClick={() => updateFilterUrl("All", "All", "All")}
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredResults.length === 0 ? (
          <div className="bento-card" data-testid="no-results-msg" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ fontSize: "1.05rem", marginTop: 0 }}>No results yet for this filter.</p>
            <button type="button" onClick={() => setDemoModalOpen(true)} className="btn-primary">
              Book Free Demo · फ्री डेमो बुक करें
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(265px, 1fr))", gap: "1rem" }}>
            {(pathname === "/" && classFilter === "All" && streamFilter === "All" && yearFilter === "All"
              ? pinned_results
              : filteredResults
            ).map((r: any) => (
              <article key={r.id} className="bento-card" data-testid="result-card">
                <div style={{ display: "flex", gap: "0.9rem", alignItems: "center" }}>
                  <div className="result-photo-wrap">
                    <img src={r.photo_url} alt={r.name} width={400} height={400} loading="lazy" />
                  </div>
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        background: "var(--accent-gradient)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        padding: "0.18rem 0.55rem",
                        borderRadius: "9999px",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {r.score_text}
                    </span>
                    <h3 style={{ margin: 0, fontSize: "1.08rem" }}>{r.name}</h3>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      Class {r.class_name} · {r.stream} · {r.year}
                    </div>
                  </div>
                </div>
                <div className="result-highlight-strip">🏆 {r.rank_text}</div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Courses & Live Upcoming Batches (US-4) */}
      <section id="courses" className="container section-animate" style={{ paddingBottom: "2.75rem" }}>
        <SectionHeading
          en={headings.courses?.en || "Courses & Streams"}
          hi={headings.courses?.hi}
        />

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          {["Foundation", "Science", "Commerce", "Humanities"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setActiveCourseStream(st)}
              className={activeCourseStream === st ? "btn-primary" : "mobile-menu-btn"}
              style={{ display: "inline-flex" }}
            >
              {st}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {(courses || [])
            .filter((c: any) => c.stream.toLowerCase() === activeCourseStream.toLowerCase())
            .map((c: any) => (
              <div key={c.id} className="bento-card">
                <div style={{ color: "var(--accent-primary)", fontWeight: 700, fontSize: "0.82rem" }}>
                  {c.stream} · Classes {c.classes}
                </div>
                <h3 style={{ margin: "0.3rem 0 0.75rem" }}>{c.name}</h3>
                <div style={{ marginBottom: "0.75rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {(c.subjects || []).map((sub: string) => (
                    <span
                      key={sub}
                      style={{
                        fontSize: "0.78rem",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "0.4rem",
                        background: "rgba(56,189,248,0.14)",
                        color: "var(--accent-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      {sub}
                    </span>
                  ))}
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                  {(c.highlights || []).map((hl: string) => (
                    <li key={hl}>{hl}</li>
                  ))}
                </ul>
              </div>
            ))}
        </div>

        {/* Upcoming Batches Schedule (AC-4.2, AC-4.4, AC-4.5) */}
        <SectionHeading
          en={headings.batches?.en || "Live Upcoming Batches"}
          hi={headings.batches?.hi}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1rem" }}>
          {(batches || []).map((b: any) => (
            <div key={b.id} className="bento-card" data-testid="batch-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                  Class {b.class_name} · {b.stream}
                </span>
                <span
                  className={b.status === "Filling Fast" ? "badge-filling-fast" : ""}
                  style={{
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "9999px",
                    background:
                      b.status === "Open"
                        ? "rgba(34,197,94,0.18)"
                        : b.status === "Full"
                        ? "rgba(239,68,68,0.18)"
                        : undefined,
                    color: b.status === "Open" ? "#4ade80" : b.status === "Full" ? "#f87171" : undefined,
                  }}
                >
                  {b.status}
                </span>
              </div>
              <div style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "0.85rem" }}>
                <div>📍 {b.branch_name}</div>
                <div>🗓 Starts: <strong>{b.start_date_formatted}</strong></div>
                <div>⏰ {b.timings}</div>
              </div>
              {b.status === "Full" ? (
                <button type="button" onClick={() => openWaitlistForm(b)} className="mobile-menu-btn" style={{ display: "inline-flex", width: "100%", justifyContent: "center" }}>
                  Join waitlist
                </button>
              ) : (
                <a
                  href={b.enroll_whatsapp_url}
                  target="_blank"
                  rel="noopener"
                  className="btn-secondary"
                  style={{ width: "100%" }}
                >
                  💬 Enrol on WhatsApp
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Founders & Leadership Section (US-5) */}
      <section id="founders" className="container section-animate" style={{ paddingBottom: "2.75rem" }}>
        <SectionHeading
          en={headings.founders?.en || "Founders & Mentors"}
          hi={headings.founders?.hi}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1.25rem" }}>
          {(founders || []).map((f: any) => {
            const isLong = (f.vision || "").length > 280;
            const expanded = !!expandedFounders[f.id];
            const textToShow = isLong && !expanded ? f.vision.slice(0, 280) + "…" : f.vision;
            return (
              <div key={f.id} className="bento-card founder-card" data-testid="founder-card">
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <img
                    src={f.photo_url}
                    alt={f.name}
                    width={96}
                    height={120}
                    loading="lazy"
                    style={{ width: "96px", height: "120px", objectFit: "cover", borderRadius: "0.75rem", flexShrink: 0 }}
                  />
                  <div>
                    <h3 style={{ margin: "0 0 0.2rem" }}>{f.name}</h3>
                    <div style={{ color: "var(--accent-primary)", fontSize: "0.84rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                      {f.designation}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                      “{textToShow}”
                    </p>
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => setExpandedFounders((p) => ({ ...p, [f.id]: !expanded }))}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--accent-secondary)",
                          fontWeight: 700,
                          padding: "0.3rem 0 0",
                          cursor: "pointer",
                        }}
                      >
                        {expanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Multi-Branch Locator (US-6) */}
      <section id="branches" className="container section-animate" style={{ paddingBottom: "2.75rem" }}>
        <SectionHeading
          en={headings.branches?.en || "Our Branches"}
          hi={headings.branches?.hi}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
          {(branches || []).map((b: any) => (
            <div key={b.id} className="bento-card" data-testid="branch-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{b.name}</h3>
                {b.is_flagship && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      padding: "0.2rem 0.55rem",
                      borderRadius: "9999px",
                      background: "rgba(249,115,22,0.2)",
                      color: "var(--accent-primary)",
                    }}
                  >
                    Flagship
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "0.85rem" }}>{b.address}</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <a href={b.maps_url} target="_blank" rel="noopener" className="mobile-menu-btn" style={{ display: "inline-flex", textDecoration: "none", fontSize: "0.82rem" }}>
                  📍 Get Directions
                </a>
                {b.tel_url && (
                  <a href={b.tel_url} className="mobile-menu-btn" style={{ display: "inline-flex", textDecoration: "none", fontSize: "0.82rem" }}>
                    📞 Call {b.phone}
                  </a>
                )}
                {b.whatsapp_url && (
                  <a href={b.whatsapp_url} target="_blank" rel="noopener" className="btn-secondary" style={{ padding: "0.45rem 0.8rem", fontSize: "0.82rem" }}>
                    💬 WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Campus Life, Testimonials & Instagram Hub (US-7) */}
      <section id="campus" className="container section-animate" style={{ paddingBottom: "2.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <SectionHeading
            en={headings.campus?.en || "Campus Life & Voices"}
            hi={headings.campus?.hi}
          />
          <a
            href={settings.instagram_url}
            target="_blank"
            rel="noopener"
            className="btn-primary"
            style={{ marginBottom: "1.35rem" }}
          >
            📸 Follow @{settings.instagram_handle} on Instagram
          </a>
        </div>

        {/* Testimonials Auto-Sliding Marquee (AC-7.1) */}
        {testimonials && testimonials.length > 0 && (
          <div className="marquee-container" style={{ marginBottom: "1.75rem" }}>
            <div className="marquee-track">
              {[...testimonials, ...testimonials].map((t: any, idx: number) => (
                <div key={`${t.id}-${idx}`} className="bento-card" style={{ width: "320px", flexShrink: 0 }}>
                  <p style={{ fontSize: "0.88rem", marginTop: 0 }}>“{t.quote}”</p>
                  <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
                    {t.photo_url && (
                      <img src={t.photo_url} alt={t.name} width={40} height={40} loading="lazy" style={{ borderRadius: "50%" }} />
                    )}
                    <div>
                      <strong style={{ fontSize: "0.86rem" }}>{t.name}</strong>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                        {t.role} {t.class_year ? `· ${t.class_year}` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 16:9 Classroom Gallery with Lightbox on Tap (AC-7.2) */}
        {gallery && gallery.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "1rem" }}>
            {gallery.map((g: any, idx: number) => (
              <div
                key={g.id}
                className="bento-card"
                style={{ padding: "0.6rem", cursor: "pointer" }}
                onClick={() => setLightboxIdx(idx)}
              >
                <img
                  src={g.image_url}
                  alt={g.caption || "Shikshanama Classroom"}
                  width={640}
                  height={360}
                  loading="lazy"
                  style={{ width: "100%", height: "auto", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "0.75rem" }}
                />
                {g.caption && (
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", padding: "0.45rem 0.25rem 0.1rem" }}>
                    {g.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox Modal (AC-7.2) */}
      {lightboxIdx !== null && gallery?.[lightboxIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxIdx(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 95,
            background: "rgba(9, 13, 22, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div className="bento-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "820px", width: "100%" }}>
            <img
              src={gallery[lightboxIdx].image_url}
              alt={gallery[lightboxIdx].caption}
              width={1280}
              height={720}
              style={{ width: "100%", height: "auto", borderRadius: "0.75rem" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
              <span>{gallery[lightboxIdx].caption}</span>
              <button type="button" onClick={() => setLightboxIdx(null)} className="mobile-menu-btn" style={{ display: "inline-flex" }}>
                Close ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Book a Free Demo Section (US-9) */}
      <section id="demo-form" className="container section-animate" style={{ paddingBottom: "2rem" }}>
        <div className="bento-card" style={{ padding: "clamp(1.25rem, 3vw, 2.25rem)" }}>
          <SectionHeading
            en={headings.demo?.en || "Book a Free Demo Class"}
            hi={headings.demo?.hi}
          />
          {renderLeadForm()}
        </div>
      </section>

      {/* Slide-up / Modal Demo Form (AC-9.1) */}
      {demoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Book a Free Demo Class"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 85,
            background: "rgba(9, 13, 22, 0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div className="bento-card" style={{ maxWidth: "560px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0 }}>Book Free Demo · फ्री डेमो बुक करें</h3>
              <button type="button" onClick={() => setDemoModalOpen(false)} className="mobile-menu-btn" style={{ display: "inline-flex" }}>
                ✕
              </button>
            </div>
            {renderLeadForm()}
          </div>
        </div>
      )}

      {/* Floating WhatsApp and Call Buttons (US-8: AC-8.1, AC-8.2, AC-8.3) */}
      <div className="floating-contact-dock" data-testid="floating-contact-dock">
        {settings.global_whatsapp && settings.global_whatsapp_url && (
          <a
            href={settings.global_whatsapp_url}
            target="_blank"
            rel="noopener"
            className="fab-btn"
            style={{ background: "#16a34a" }}
            aria-label="Chat with us on WhatsApp"
          >
            <span>💬</span>
            <span className="fab-label">Chat with us</span>
          </a>
        )}
        {settings.global_phone && (
          <a
            href={`tel:${settings.global_phone}`}
            className="fab-btn"
            style={{ background: "#0284c7" }}
            aria-label="Call Shikshanama now"
          >
            <span>📞</span>
            <span className="fab-label">Call now</span>
          </a>
        )}
      </div>

      <footer className="container" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem", fontSize: "0.84rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <strong>{settings.brand_name}</strong> · West Patel Nagar, New Delhi - 110008
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <a href={settings.instagram_url} target="_blank" rel="noopener" style={{ color: "var(--text-secondary)" }}>
            @{settings.instagram_handle}
          </a>
          <a href="/admin" style={{ color: "var(--text-secondary)" }}>
            Staff Admin
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
