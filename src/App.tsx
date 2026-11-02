import React, { Suspense, useEffect, useState } from "react";

const AdminApp = React.lazy(() => import("./admin/AdminApp"));

declare global {
  interface Window {
    __SHIKSHANAMA_BOOTSTRAP__?: any;
  }
}

const SectionHeading: React.FC<{ en: string; hi?: string }> = ({ en }) => (
  <div style={{ marginBottom: "1.35rem" }}>
    <h2 className="section-title">
      {en}
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
          <h1 style={{ marginTop: 0, fontSize: "1.35rem" }}>Shikshanama (<span className="hi-part">शिक्षा</span>Nama)</h1>
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
          <span className="hi-part">शिक्षा</span>Nama · Parent Consent
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
              <p style={{ margin: 0 }}>{info.consent_text_en}</p>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>{info.withdrawal_info}</p>

            {submitErr && <div role="alert" style={{ color: "#f87171", fontWeight: 600 }}>{submitErr}</div>}

            <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              Parent / Guardian Full Name *
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
                I Agree
              </button>
              <button type="button" onClick={() => submitDecision("decline")} className="mobile-menu-btn" style={{ display: "inline-flex" }}>
                I Do Not Agree
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
    return <div className="container" style={{ padding: "3rem 1rem" }}>Loading Shikshanama (<span className="hi-part">शिक्षा</span>Nama)...</div>;
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
          <h3 style={{ color: "#34d399", marginTop: 0 }}>{leadSuccess.message}</h3>
          <p style={{ color: "var(--text-secondary)" }}>
            Our academic counselling team will contact you shortly.
          </p>
          {leadSuccess.whatsapp_url && (
            <a href={leadSuccess.whatsapp_url} target="_blank" rel="noopener" className="btn-secondary">
              💬 Chat on WhatsApp now
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={handleLeadSubmit} method="post" action="/api/public/leads/form" style={{ display: "grid", gap: "0.85rem" }}>
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

          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
            We use your mobile number only to contact you regarding batch timings and class admissions.
          </p>

          <button type="submit" className="btn-primary" style={{ justifySelf: "start" }}>
            Book Free Demo Class
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
            background: "rgba(245, 158, 11, 0.14)",
            borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
            color: "#fbbf24",
            fontSize: "0.78rem",
            textAlign: "center",
            padding: "0.3rem 0.75rem",
            fontWeight: 600,
          }}
        >
          Preview Mode · Sample student profiles shown for illustration.
        </div>
      )}

      {/* Top Announcement Ticker */}
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

      {/* Sticky Glassmorphic Navbar */}
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
              Book Free Demo
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

      {/* Mobile Full-Screen Sheet */}
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
            Results & Toppers
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
            Book Free Demo
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="container section-animate" style={{ paddingTop: "2.75rem", paddingBottom: "2.75rem" }}>
        <div className="bento-card" style={{ padding: "clamp(1.5rem, 4vw, 3rem)" }}>
          <span className="badge" style={{ marginBottom: "1rem" }}>
            West Patel Nagar's Premier Coaching · Classes 6 to 12
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", fontWeight: 900, margin: "0 0 1rem", lineHeight: 1.2, letterSpacing: "-0.03em" }}>
            Build Board & Competitive Excellence with{" "}
            <span className="hi-part">
              शिक्षाNama
            </span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.08rem", maxWidth: "740px", marginBottom: "1.75rem", lineHeight: 1.65 }}>
            Personal small-batch mentorship in Foundation (Classes 6–10), Science, Commerce, and Humanities (Classes 11–12).
            Structured daily doubt sessions, weekly CBSE board mock drills, and top percentile results.
          </p>

          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginBottom: "2.25rem" }}>
            <button type="button" onClick={() => setDemoModalOpen(true)} className="btn-primary">
              Book a Free Demo Class
            </button>
            {settings.global_whatsapp_url && (
              <a href={settings.global_whatsapp_url} target="_blank" rel="noopener" className="btn-secondary">
                💬 Chat on WhatsApp
              </a>
            )}
          </div>

          {settings.hero_image_url && (
            <div style={{ marginBottom: "1.75rem", borderRadius: "1rem", overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <img
                src={settings.hero_image_url}
                alt="Shikshanama Campus Banner"
                width={1280}
                height={720}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          )}

          {/* Dynamic Trust Counters */}
          {hero_stats && hero_stats.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
              {hero_stats.map((st: any) => (
                <div
                  key={st.id}
                  className="stat-card"
                >
                  <div className="stat-value">
                    <CountUpValue valueText={st.value} />
                  </div>
                  <div className="stat-label">
                    {st.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Hall of Fame / Results Showcase */}
      <section id="hall-of-fame" className="container section-animate" style={{ paddingBottom: "2.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <SectionHeading en={headings.results?.en || "Hall of Fame"} />
          {pathname !== "/results" && (
            <a href="/results" style={{ color: "var(--accent-secondary)", fontWeight: 700, textDecoration: "none", marginBottom: "1.35rem" }}>
              View Full Hall of Fame ({results.length}) →
            </a>
          )}
        </div>

        {/* Filter Bar */}
        <div className="bento-card" style={{ marginBottom: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <strong style={{ fontSize: "0.88rem" }}>Filter Achievers:</strong>
          <select
            aria-label="Filter by Class"
            value={classFilter}
            onChange={(e) => updateFilterUrl(e.target.value, streamFilter, yearFilter)}
            style={{ padding: "0.5rem 0.85rem", borderRadius: "0.6rem" }}
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
            style={{ padding: "0.5rem 0.85rem", borderRadius: "0.6rem" }}
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
            style={{ padding: "0.5rem 0.85rem", borderRadius: "0.6rem" }}
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
          <div className="bento-card" data-testid="no-results-msg" style={{ textAlign: "center", padding: "2.5rem" }}>
            <p style={{ fontSize: "1.05rem", marginTop: 0, color: "var(--text-secondary)" }}>No student results yet for this filter.</p>
            <button type="button" onClick={() => setDemoModalOpen(true)} className="btn-primary">
              Book Free Demo Class
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(265px, 1fr))", gap: "1.1rem" }}>
            {(pathname === "/" && classFilter === "All" && streamFilter === "All" && yearFilter === "All" && pinned_results && pinned_results.length > 0
              ? pinned_results
              : filteredResults
            ).map((r: any) => (
              <article key={r.id} className="bento-card" data-testid="result-card">
                <div style={{ display: "flex", gap: "0.95rem", alignItems: "center" }}>
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
                        padding: "0.2rem 0.65rem",
                        borderRadius: "9999px",
                        marginBottom: "0.3rem",
                        boxShadow: "0 2px 10px var(--accent-glow)",
                      }}
                    >
                      {r.score_text}
                    </span>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{r.name}</h3>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
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

      {/* Courses & Live Upcoming Batches */}
      <section id="courses" className="container section-animate" style={{ paddingBottom: "2.75rem" }}>
        <SectionHeading en={headings.courses?.en || "Courses & Streams"} />

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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.1rem", marginBottom: "2rem" }}>
          {(courses || [])
            .filter((c: any) => c.stream.toLowerCase() === activeCourseStream.toLowerCase())
            .map((c: any) => (
              <div key={c.id} className="bento-card">
                <div style={{ color: "var(--accent-secondary)", fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {c.stream} · Classes {c.classes}
                </div>
                <h3 style={{ margin: "0.35rem 0 0.85rem", fontSize: "1.2rem" }}>{c.name}</h3>
                <div style={{ marginBottom: "0.85rem", display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  {(c.subjects || []).map((sub: string) => (
                    <span
                      key={sub}
                      style={{
                        fontSize: "0.78rem",
                        padding: "0.22rem 0.6rem",
                        borderRadius: "0.45rem",
                        background: "rgba(6, 182, 212, 0.12)",
                        color: "var(--accent-secondary)",
                        fontWeight: 600,
                        border: "1px solid rgba(6, 182, 212, 0.2)",
                      }}
                    >
                      {sub}
                    </span>
                  ))}
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.15rem", fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {(c.highlights || []).map((hl: string) => (
                    <li key={hl}>{hl}</li>
                  ))}
                </ul>
              </div>
            ))}
        </div>

        {/* Upcoming Batches Schedule */}
        <SectionHeading en={headings.batches?.en || "Live Upcoming Batches"} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1.1rem" }}>
          {(batches || []).map((b: any) => (
            <div key={b.id} className="bento-card" data-testid="batch-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                  Class {b.class_name} · {b.stream}
                </span>
                <span
                  className={b.status === "Filling Fast" ? "badge-filling-fast" : ""}
                  style={{
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    padding: "0.22rem 0.65rem",
                    borderRadius: "9999px",
                    background:
                      b.status === "Open"
                        ? "rgba(16, 185, 129, 0.15)"
                        : b.status === "Full"
                        ? "rgba(244, 63, 94, 0.15)"
                        : undefined,
                    color: b.status === "Open" ? "#34d399" : b.status === "Full" ? "#f43f5e" : undefined,
                  }}
                >
                  {b.status}
                </span>
              </div>
              <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.6 }}>
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

      {/* Founders & Mentors Section */}
      <section id="founders" className="container section-animate" style={{ paddingBottom: "2.75rem" }}>
        <SectionHeading en={headings.founders?.en || "Founders & Mentors"} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1.25rem" }}>
          {(founders || []).map((f: any) => {
            const isLong = (f.vision || "").length > 280;
            const expanded = !!expandedFounders[f.id];
            const textToShow = isLong && !expanded ? f.vision.slice(0, 280) + "…" : f.vision;
            return (
              <div key={f.id} className="bento-card founder-card" data-testid="founder-card">
                <div style={{ display: "flex", gap: "1.1rem", alignItems: "flex-start" }}>
                  <img
                    src={f.photo_url}
                    alt={f.name}
                    width={96}
                    height={120}
                    loading="lazy"
                    style={{ width: "96px", height: "120px", objectFit: "cover", borderRadius: "0.85rem", flexShrink: 0, border: "1px solid var(--border-color)" }}
                  />
                  <div>
                    <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem" }}>{f.name}</h3>
                    <div style={{ color: "var(--accent-secondary)", fontSize: "0.84rem", fontWeight: 700, marginBottom: "0.6rem" }}>
                      {f.designation}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
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
                          padding: "0.35rem 0 0",
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

      {/* Multi-Branch Locator */}
      <section id="branches" className="container section-animate" style={{ paddingBottom: "2.75rem" }}>
        <SectionHeading en={headings.branches?.en || "Our Branches"} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.1rem" }}>
          {(branches || []).map((b: any) => {
            const cleanName = (b.name || "").replace(/\s*\([Ff]lagship\)/g, "").trim();
            const cleanAddress = (b.address || "").replace(/\s*\([Ff]lagship\)/g, "").trim();
            return (
              <div key={b.id} className="bento-card" data-testid="branch-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.55rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.15rem" }}>{cleanName}</h3>
                </div>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.55 }}>{cleanAddress}</p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <a href={b.maps_url} target="_blank" rel="noopener" className="mobile-menu-btn" style={{ display: "inline-flex", textDecoration: "none", fontSize: "0.82rem" }}>
                    📍 Directions
                  </a>
                  {b.tel_url && (
                    <a href={b.tel_url} className="mobile-menu-btn" style={{ display: "inline-flex", textDecoration: "none", fontSize: "0.82rem" }}>
                      📞 Call {b.phone}
                    </a>
                  )}
                  {b.whatsapp_url && (
                    <a href={b.whatsapp_url} target="_blank" rel="noopener" className="btn-secondary" style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem" }}>
                      💬 WhatsApp
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Campus Life, Testimonials & Instagram Hub */}
      <section id="campus" className="container section-animate" style={{ paddingBottom: "2.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <SectionHeading en={headings.campus?.en || "Campus Life & Voices"} />
          <a
            href={settings.instagram_url}
            target="_blank"
            rel="noopener"
            className="btn-primary"
            style={{ marginBottom: "1.35rem" }}
          >
            📸 Follow @{settings.instagram_handle}
          </a>
        </div>

        {/* Testimonials Auto-Sliding Marquee */}
        {testimonials && testimonials.length > 0 && (
          <div className="marquee-container" style={{ marginBottom: "1.75rem" }}>
            <div className="marquee-track">
              {[...testimonials, ...testimonials].map((t: any, idx: number) => (
                <div key={`${t.id}-${idx}`} className="bento-card" style={{ width: "320px", flexShrink: 0 }}>
                  <p style={{ fontSize: "0.88rem", marginTop: 0, lineHeight: 1.55 }}>“{t.quote}”</p>
                  <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
                    {t.photo_url && (
                      <img src={t.photo_url} alt={t.name} width={40} height={40} loading="lazy" style={{ borderRadius: "50%", border: "1px solid var(--border-color)" }} />
                    )}
                    <div>
                      <strong style={{ fontSize: "0.88rem" }}>{t.name}</strong>
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

        {/* 16:9 Classroom Gallery with Lightbox on Tap */}
        {gallery && gallery.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "1.1rem" }}>
            {gallery.map((g: any, idx: number) => (
              <div
                key={g.id}
                className="bento-card"
                style={{ padding: "0.65rem", cursor: "pointer" }}
                onClick={() => setLightboxIdx(idx)}
              >
                <img
                  src={g.image_url}
                  alt={g.caption || "Shikshanama Classroom"}
                  width={640}
                  height={360}
                  loading="lazy"
                  style={{ width: "100%", height: "auto", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "0.85rem" }}
                />
                {g.caption && (
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", padding: "0.5rem 0.35rem 0.15rem" }}>
                    {g.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      {lightboxIdx !== null && gallery?.[lightboxIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxIdx(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 95,
            background: "rgba(7, 9, 14, 0.92)",
            backdropFilter: "blur(16px)",
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
              style={{ width: "100%", height: "auto", borderRadius: "0.85rem" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.85rem" }}>
              <span style={{ fontWeight: 600 }}>{gallery[lightboxIdx].caption}</span>
              <button type="button" onClick={() => setLightboxIdx(null)} className="mobile-menu-btn" style={{ display: "inline-flex" }}>
                Close ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Book a Free Demo Section */}
      <section id="demo-form" className="container section-animate" style={{ paddingBottom: "2rem" }}>
        <div className="bento-card" style={{ padding: "clamp(1.5rem, 3.5vw, 2.5rem)" }}>
          <SectionHeading en={headings.demo?.en || "Book a Free Demo Class"} />
          {renderLeadForm()}
        </div>
      </section>

      {/* Slide-up / Modal Demo Form */}
      {demoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Book a Free Demo Class"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 85,
            background: "rgba(7, 9, 14, 0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div className="bento-card" style={{ maxWidth: "560px", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem" }}>Book Free Demo Class</h3>
              <button type="button" onClick={() => setDemoModalOpen(false)} className="mobile-menu-btn" style={{ display: "inline-flex" }}>
                ✕
              </button>
            </div>
            {renderLeadForm()}
          </div>
        </div>
      )}

      {/* Floating WhatsApp and Call Buttons */}
      <div className="floating-contact-dock" data-testid="floating-contact-dock">
        {settings.global_whatsapp && settings.global_whatsapp_url && (
          <a
            href={settings.global_whatsapp_url}
            target="_blank"
            rel="noopener"
            className="fab-btn"
            style={{ background: "#10b981" }}
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
            style={{ background: "#4f46e5" }}
            aria-label="Call Shikshanama now"
          >
            <span>📞</span>
            <span className="fab-label">Call now</span>
          </a>
        )}
      </div>

      <footer className="container" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.75rem", fontSize: "0.86rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <strong>{settings.brand_name}</strong> · {(branches?.[0]?.address || "West Patel Nagar, New Delhi").replace(/\s*\([Ff]lagship\)/g, "").trim()}
        </div>
        <div style={{ display: "flex", gap: "1.25rem" }}>
          <a href={settings.instagram_url} target="_blank" rel="noopener" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            @{settings.instagram_handle}
          </a>
          <a href="/admin" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            Staff Admin
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
