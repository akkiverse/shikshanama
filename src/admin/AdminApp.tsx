import React, { useEffect, useState } from "react";
import { CropKind } from "../cropper";
import { ImageCropperModal } from "./ImageCropperModal";

type AdminTab =
  | "dashboard"
  | "results"
  | "founders"
  | "homepage"
  | "courses"
  | "batches"
  | "branches"
  | "settings"
  | "testimonials"
  | "gallery"
  | "leads"
  | "staff";

const SECTION_HEADING_KEYS: [string, string][] = [
  ["results", "Hall of Fame Results"],
  ["courses", "Courses & Streams"],
  ["batches", "Upcoming Batches"],
  ["founders", "Founders' Desk"],
  ["branches", "Our Branches"],
  ["campus", "Life at Shikshanama & Testimonials"],
  ["demo", "Free Demo Class Form"],
];

const ImageAttachmentPreview: React.FC<{
  url: string;
  kind: string;
  aspectRatio?: "1/1" | "4/5" | "16/9";
  onChange: () => void;
  onRemove?: () => void;
}> = ({ url, kind, aspectRatio = "1/1", onChange, onRemove }) => {
  const is169 = aspectRatio === "16/9";
  const is45 = aspectRatio === "4/5";
  const w = is169 ? "120px" : is45 ? "64px" : "68px";
  const h = is169 ? "68px" : is45 ? "80px" : "68px";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.75rem 1rem",
        background: "var(--surface)",
        border: "1px solid var(--accent)",
        borderRadius: "var(--border-radius)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <img
        src={url}
        alt="Cropped Preview"
        style={{
          width: w,
          height: h,
          objectFit: "cover",
          borderRadius: "6px",
          border: "2px solid var(--accent)",
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: "0.9rem" }}>
          ✓ {kind} Attached & Ready
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
          Photo uploaded. Complete details below and click Save to publish.
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          className="mobile-menu-btn"
          style={{ display: "inline-flex", fontSize: "0.8rem" }}
          onClick={onChange}
        >
          Change
        </button>
        {onRemove && (
          <button
            type="button"
            className="mobile-menu-btn"
            style={{ display: "inline-flex", fontSize: "0.8rem", color: "#f87171" }}
            onClick={onRemove}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

export const AdminApp: React.FC = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{ id: number; email: string } | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const initialTab = (): AdminTab => {
    const seg = window.location.pathname.replace(/^\/admin\/?/, "").split("/")[0] as AdminTab;
    const valid: AdminTab[] = [
      "dashboard",
      "results",
      "founders",
      "homepage",
      "courses",
      "batches",
      "branches",
      "settings",
      "testimonials",
      "gallery",
      "leads",
      "staff",
    ];
    return valid.includes(seg) ? seg : "dashboard";
  };

  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [toast, setToast] = useState<string>("");
  const [lastUploaded, setLastUploaded] = useState<{ url: string; kind: CropKind; timestamp: number } | null>(null);
  const [cropperTarget, setCropperTarget] = useState<{
    kind: CropKind;
    onDone: (url: string) => void;
  } | null>(null);

  // Admin state slices
  const [dashboard, setDashboard] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [founders, setFounders] = useState<any[]>([]);
  const [heroStats, setHeroStats] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  // Inline edit state trackers
  const [editingResult, setEditingResult] = useState<any | null>(null);
  const [editingFounder, setEditingFounder] = useState<any | null>(null);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [editingTestimonial, setEditingTestimonial] = useState<any | null>(null);
  const [editingGallery, setEditingGallery] = useState<any | null>(null);
  const [leadNotes, setLeadNotes] = useState<Record<number, string>>({});

  // Filters
  const [resultFilterClass, setResultFilterClass] = useState("All");
  const [resultFilterStream, setResultFilterStream] = useState("All");
  const [resultFilterConsent, setResultFilterConsent] = useState("All");
  const [leadFilterStatus, setLeadFilterStatus] = useState("All");
  const [leadFilterBranch, setLeadFilterBranch] = useState("All");

  // Form states for quick creation
  const [newResult, setNewResult] = useState({
    name: "",
    photo_url: "",
    class_name: "12",
    stream: "Science",
    score_text: "",
    rank_text: "",
    year: "2025-26",
    parent_name: "",
    parent_whatsapp: "",
    published: true,
    pinned: false,
  });

  const [newFounder, setNewFounder] = useState({
    name: "",
    photo_url: "",
    designation: "",
    vision: "",
    visible: true,
  });

  const [newHeroStat, setNewHeroStat] = useState({
    label: "",
    value: "",
    visible: true,
  });

  const [newCourse, setNewCourse] = useState({
    stream: "Science",
    name: "",
    classes: "11 – 12",
    subjectsText: "",
    highlightsText: "",
    visible: true,
  });

  const [newBatch, setNewBatch] = useState({
    class_name: "12",
    stream: "Science",
    branch_id: 1,
    start_date: "2027-04-15",
    timings: "Mon/Wed/Fri · 4:00 PM – 6:00 PM",
    status: "Open",
    active: true,
  });

  const [newBranch, setNewBranch] = useState({
    name: "",
    address: "",
    maps_url: "",
    phone: "",
    whatsapp: "",
    is_flagship: false,
    active: true,
  });

  const [newTestimonial, setNewTestimonial] = useState({
    quote: "",
    name: "",
    role: "Student",
    class_year: "",
    photo_url: "",
    visible: true,
  });

  const [newGallery, setNewGallery] = useState({
    image_url: "",
    caption: "",
    visible: true,
  });

  const [newStaff, setNewStaff] = useState({ email: "", password: "" });

  const checkSession = async () => {
    try {
      const resp = await fetch("/api/admin/session");
      if (resp.ok) {
        const data = await resp.json();
        setUser(data.user);
        setCsrfToken(data.csrf_token);
      } else {
        setUser(null);
      }
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const loadAllAdminData = async () => {
    if (!user) return;
    const [dRes, rRes, fRes, hRes, sRes, cRes, baRes, brRes, tRes, gRes, lRes, stRes] = await Promise.all([
      fetch("/api/admin/dashboard"),
      fetch("/api/admin/results"),
      fetch("/api/admin/founders"),
      fetch("/api/admin/hero-stats"),
      fetch("/api/admin/settings"),
      fetch("/api/admin/courses"),
      fetch("/api/admin/batches"),
      fetch("/api/admin/branches"),
      fetch("/api/admin/testimonials"),
      fetch("/api/admin/gallery"),
      fetch("/api/admin/leads"),
      fetch("/api/admin/staff"),
    ]);
    if (dRes.ok) setDashboard(await dRes.json());
    if (rRes.ok) setResults((await rRes.json()).results || []);
    if (fRes.ok) setFounders((await fRes.json()).founders || []);
    if (hRes.ok) setHeroStats((await hRes.json()).hero_stats || []);
    if (sRes.ok) setSettings((await sRes.json()).settings || null);
    if (cRes.ok) setCourses((await cRes.json()).courses || []);
    if (baRes.ok) setBatches((await baRes.json()).batches || []);
    if (brRes.ok) {
      const bList = (await brRes.json()).branches || [];
      setBranches(bList);
      if (bList.length > 0) setNewBatch((p) => ({ ...p, branch_id: bList[0].id }));
    }
    if (tRes.ok) setTestimonials((await tRes.json()).testimonials || []);
    if (gRes.ok) setGallery((await gRes.json()).gallery || []);
    if (lRes.ok) {
      const lList = (await lRes.json()).leads || [];
      setLeads(lList);
      const notesMap: Record<number, string> = {};
      lList.forEach((item: any) => {
        notesMap[item.id] = item.note || "";
      });
      setLeadNotes(notesMap);
    }
    if (stRes.ok) setStaff((await stRes.json()).staff || []);
  };

  useEffect(() => {
    if (user) loadAllAdminData();
  }, [user]);

  const adminFetch = async (url: string, method: string, body?: any) => {
    const resp = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.detail || "Action failed");
    }
    return data;
  };

  const reorderItems = async (endpoint: string, list: any[], index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const copy = [...list];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    const ids = copy.map((item) => item.id);
    try {
      await adminFetch(endpoint, "POST", { ids });
      setToast("Order updated!");
      await loadAllAdminData();
    } catch (err: any) {
      setToast(err.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const resp = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setLoginError(data.detail || "Email or password is wrong");
      return;
    }
    setUser(data.user);
    setCsrfToken(data.csrf_token);
    window.history.replaceState({}, "", "/admin");
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setUser(null);
    window.history.replaceState({}, "", "/admin/login");
  };

  const switchTab = (next: AdminTab) => {
    setTab(next);
    const path = next === "dashboard" ? "/admin" : `/admin/${next}`;
    window.history.pushState({}, "", path);
  };

  if (!authChecked) {
    return <div className="container" style={{ padding: "3rem 1rem" }}>Checking admin session...</div>;
  }

  if (!user) {
    return (
      <div className="container" style={{ maxWidth: "440px", padding: "4rem 1rem" }}>
        <div className="bento-card">
          <h1 style={{ marginTop: 0, fontSize: "1.45rem" }}>
            <span className="hi-part">शिक्षा</span>Nama · Admin Login
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Sign in to manage results, batches, branches, consents, and student demo leads.
          </p>
          {loginError && (
            <div
              role="alert"
              style={{
                padding: "0.65rem",
                background: "rgba(239,68,68,0.16)",
                color: "#f87171",
                borderRadius: "0.5rem",
                marginBottom: "0.85rem",
              }}
            >
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin} style={{ display: "grid", gap: "0.85rem" }}>
            <label>
              Staff Email
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@shikshanama.in"
                style={{ width: "100%", padding: "0.65rem", borderRadius: "0.5rem", marginTop: "0.25rem" }}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{ width: "100%", padding: "0.65rem", borderRadius: "0.5rem", marginTop: "0.25rem" }}
              />
            </label>
            <button type="submit" className="btn-primary">
              Sign In to Admin CMS
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredResults = results.filter((r) => {
    if (resultFilterClass !== "All" && String(r.class_name) !== resultFilterClass) return false;
    if (resultFilterStream !== "All" && String(r.stream) !== resultFilterStream) return false;
    if (resultFilterConsent !== "All" && String(r.consent_status) !== resultFilterConsent) return false;
    return true;
  });

  const filteredLeads = leads.filter((l) => {
    if (leadFilterStatus !== "All" && String(l.status) !== leadFilterStatus) return false;
    if (leadFilterBranch !== "All" && String(l.branch_id) !== leadFilterBranch) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "4rem" }}>
      {cropperTarget && (
        <ImageCropperModal
          kind={cropperTarget.kind}
          csrfToken={csrfToken}
          onUploaded={(url) => {
            setLastUploaded({ url, kind: cropperTarget.kind, timestamp: Date.now() });
            cropperTarget.onDone(url);
            setCropperTarget(null);
            setToast("✓ Photo cropped & uploaded successfully! Attached to form below. Click Save to publish.");
          }}
          onCancel={() => setCropperTarget(null)}
        />
      )}

      <header className="sticky-nav">
        <div className="nav-inner">
          <a href="/" className="brand-logo">
            <span className="hi-part">शिक्षा</span>Nama <small style={{ fontSize: "0.75rem", opacity: 0.75 }}>CMS</small>
          </a>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{user.email}</span>
            <a href="/" className="mobile-menu-btn" style={{ display: "inline-flex", textDecoration: "none" }}>
              View Public Site ↗
            </a>
            <button type="button" onClick={handleLogout} className="mobile-menu-btn" style={{ display: "inline-flex" }}>
              Log Out
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{ marginTop: "1.25rem" }}>
        <nav style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          {(
            [
              ["dashboard", "Dashboard"],
              ["homepage", "Hero Stats & Headings"],
              ["branches", "Branches & Address"],
              ["courses", "Courses"],
              ["batches", "Batches"],
              ["results", "Results & Consents"],
              ["founders", "Founders"],
              ["testimonials", "Testimonials"],
              ["gallery", "Gallery"],
              ["leads", `Leads (${dashboard?.new_leads_count ?? 0} New)`],
              ["settings", "Contacts & Socials"],
              ["staff", "Staff"],
            ] as [AdminTab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchTab(key)}
              className={tab === key ? "btn-primary" : "mobile-menu-btn"}
              style={{ display: "inline-flex", padding: "0.45rem 0.85rem", fontSize: "0.84rem" }}
            >
              {label}
            </button>
          ))}
        </nav>

        {toast && (
          <div
            role="status"
            style={{
              padding: "0.7rem 1rem",
              background: "rgba(34,197,94,0.16)",
              color: "#4ade80",
              borderRadius: "0.6rem",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{toast}</span>
            <button type="button" onClick={() => setToast("")} style={{ background: "none", border: "none", color: "#4ade80" }}>
              ✕
            </button>
          </div>
        )}

        {/* ================= DASHBOARD ================= */}
        {tab === "dashboard" && dashboard && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div className="bento-card">
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>New Student Leads</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-primary)" }}>
                  {dashboard.new_leads_count}
                </div>
              </div>
              <div className="bento-card">
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Results Waiting Consent</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#fbbf24" }}>
                  {dashboard.pending_consents_count}
                </div>
              </div>
              <div className="bento-card">
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Total Results</div>
                <div style={{ fontSize: "2rem", fontWeight: 800 }}>{dashboard.total_results}</div>
              </div>
              <div className="bento-card">
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Active Batches</div>
                <div style={{ fontSize: "2rem", fontWeight: 800 }}>{dashboard.total_batches}</div>
              </div>
            </div>

            {/* Live Media & Upload Verification Card */}
            <div className="bento-card" style={{ borderTop: "3px solid var(--accent)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem" }}>📸 Stored Media & Photos Verification</h3>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    Verify photos currently active in the database for Founders, Results, Hero Banner, and Gallery.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button type="button" className="btn-secondary" style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }} onClick={() => switchTab("founders")}>
                    + Add Founder
                  </button>
                  <button type="button" className="btn-secondary" style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }} onClick={() => switchTab("results")}>
                    + Add Result
                  </button>
                  <button type="button" className="btn-secondary" style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }} onClick={() => switchTab("homepage")}>
                    Hero Banner
                  </button>
                </div>
              </div>

              {lastUploaded && (
                <div style={{ marginTop: "1rem", padding: "0.85rem", background: "rgba(201, 162, 39, 0.12)", border: "1px solid var(--accent)", borderRadius: "var(--border-radius)", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <img src={lastUploaded.url} alt="Latest upload" style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "6px", border: "2px solid var(--accent)" }} />
                  <div>
                    <strong style={{ color: "var(--accent)", display: "block" }}>✓ Latest Photo Uploaded Successfully</strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--text)" }}>
                      Type: <strong>{lastUploaded.kind.toUpperCase()}</strong> · <a href={lastUploaded.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontWeight: 600 }}>Open Direct Image ↗</a>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Remember to complete the form details and click Save in its tab to publish.
                    </div>
                  </div>
                </div>
              )}

              {/* Photos Overview Grid */}
              <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                {/* Founders Photos */}
                <div style={{ padding: "0.85rem", background: "var(--bg)", borderRadius: "var(--border-radius)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <strong style={{ fontSize: "0.88rem" }}>Founders ({founders.length})</strong>
                    <button type="button" onClick={() => switchTab("founders")} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}>
                      Manage →
                    </button>
                  </div>
                  {founders.length === 0 ? (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No founders uploaded yet.</div>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {founders.map((f) => (
                        <div key={f.id} style={{ textAlign: "center" }}>
                          <img src={f.photo_url} alt={f.name} style={{ width: "52px", height: "65px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border)" }} />
                          <div style={{ fontSize: "0.72rem", maxWidth: "56px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hero Banner */}
                <div style={{ padding: "0.85rem", background: "var(--bg)", borderRadius: "var(--border-radius)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <strong style={{ fontSize: "0.88rem" }}>Hero Banner (16:9)</strong>
                    <button type="button" onClick={() => switchTab("homepage")} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}>
                      Manage →
                    </button>
                  </div>
                  {settings?.hero_image_url ? (
                    <div>
                      <img src={settings.hero_image_url} alt="Hero Banner" style={{ width: "100%", maxHeight: "85px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border)" }} />
                      <div style={{ fontSize: "0.75rem", color: "var(--accent)", marginTop: "0.25rem" }}>✓ Active on Homepage</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No custom 16:9 banner set.</div>
                  )}
                </div>

                {/* Achievers / Results */}
                <div style={{ padding: "0.85rem", background: "var(--bg)", borderRadius: "var(--border-radius)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <strong style={{ fontSize: "0.88rem" }}>Toppers & Achievers ({results.length})</strong>
                    <button type="button" onClick={() => switchTab("results")} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}>
                      Manage →
                    </button>
                  </div>
                  {results.length === 0 ? (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No results uploaded yet.</div>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {results.slice(0, 6).map((r) => (
                        <div key={r.id} style={{ textAlign: "center" }}>
                          <img src={r.photo_url} alt={r.name} style={{ width: "52px", height: "52px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border)" }} />
                          <div style={{ fontSize: "0.72rem", maxWidth: "56px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                        </div>
                      ))}
                      {results.length > 6 && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", alignSelf: "center" }}>+{results.length - 6} more</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bento-card">
              <h3 style={{ marginTop: 0 }}>Quick Edit Shortcuts</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 0 }}>
                Jump directly to edit institute numbers, branch addresses, courses, or toppers:
              </p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button type="button" className="btn-secondary" onClick={() => switchTab("homepage")}>
                  Edit Total Toppers / Experience Counters
                </button>
                <button type="button" className="btn-secondary" onClick={() => switchTab("branches")}>
                  Edit Branch Address & Phone
                </button>
                <button type="button" className="btn-secondary" onClick={() => switchTab("courses")}>
                  Edit Courses & Subjects
                </button>
                <button type="button" className="btn-secondary" onClick={() => switchTab("settings")}>
                  Edit Global WhatsApp & Instagram
                </button>
              </div>
            </div>

            <div className="bento-card" style={{ borderColor: "rgba(245, 158, 11, 0.5)" }}>
              <h3 style={{ marginTop: 0 }}>
                Demo Sample Mode: {settings?.demo_mode ? "🟢 ON (Showing Sample Data)" : "⚪ OFF (Real Content Only)"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                When Demo Mode is OFF, sample toppers, sample founders, sample batches, and secondary sample branches are
                hidden from the public site while keeping your Flagship West Patel Nagar branch, Hero counters, and Courses
                live. You can edit any item in the tabs above to make it real, or delete all sample records permanently.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {settings && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      try {
                        const nextDemo = !settings.demo_mode;
                        await adminFetch("/api/admin/settings", "PUT", { ...settings, demo_mode: nextDemo });
                        setToast(nextDemo ? "Demo Sample Mode enabled." : "Demo Sample Mode turned OFF.");
                        loadAllAdminData();
                      } catch (e: any) {
                        setToast(e.message);
                      }
                    }}
                  >
                    {settings.demo_mode ? "Hide Sample Content (Turn Demo Mode OFF)" : "Show Sample Content (Turn Demo Mode ON)"}
                  </button>
                )}
                {dashboard.has_sample_content && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      try {
                        await adminFetch("/api/admin/sample-content/remove", "POST");
                        setToast("Removed all sample content permanently.");
                        loadAllAdminData();
                      } catch (e: any) {
                        setToast(e.message);
                      }
                    }}
                  >
                    Remove all sample content
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= HOMEPAGE: HERO COUNTERS, TICKER, BANNER & HEADINGS ================= */}
        {tab === "homepage" && settings && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            {/* Hero Trust Counters */}
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Hero Trust Counters (Total Toppers, Years of Excellence, etc.)</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: 0 }}>
                Edit any counter label or number directly below and click Save, or add a new counter.
              </p>
              <div style={{ display: "grid", gap: "0.65rem", marginBottom: "1rem" }}>
                {heroStats.map((stat, idx) => (
                  <div
                    key={stat.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "0.5rem",
                      alignItems: "center",
                      padding: "0.65rem",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.6rem",
                    }}
                  >
                    <input
                      aria-label={`Counter Label ${stat.id}`}
                      value={stat.label}
                      placeholder="Label (e.g. Total Toppers)"
                      onChange={(e) =>
                        setHeroStats((prev) =>
                          prev.map((s) => (s.id === stat.id ? { ...s, label: e.target.value } : s))
                        )
                      }
                    />
                    <input
                      aria-label={`Counter Value ${stat.id}`}
                      value={stat.value}
                      placeholder="Value (e.g. 1,250+)"
                      onChange={(e) =>
                        setHeroStats((prev) =>
                          prev.map((s) => (s.id === stat.id ? { ...s, value: e.target.value } : s))
                        )
                      }
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
                      <input
                        type="checkbox"
                        checked={stat.visible}
                        onChange={(e) =>
                          setHeroStats((prev) =>
                            prev.map((s) => (s.id === stat.id ? { ...s, visible: e.target.checked } : s))
                          )
                        }
                      />
                      Visible
                    </label>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: "0.38rem 0.75rem", fontSize: "0.8rem" }}
                        onClick={async () => {
                          try {
                            await adminFetch(`/api/admin/hero-stats/${stat.id}`, "PUT", {
                              label: stat.label,
                              value: stat.value,
                              visible: stat.visible,
                            });
                            setToast(`Saved counter "${stat.label}"!`);
                            loadAllAdminData();
                          } catch (err: any) {
                            setToast(err.message);
                          }
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="mobile-menu-btn"
                        style={{ display: "inline-flex", fontSize: "0.78rem" }}
                        disabled={idx === 0}
                        onClick={() => reorderItems("/api/admin/hero-stats/reorder", heroStats, idx, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="mobile-menu-btn"
                        style={{ display: "inline-flex", fontSize: "0.78rem" }}
                        disabled={idx === heroStats.length - 1}
                        onClick={() => reorderItems("/api/admin/hero-stats/reorder", heroStats, idx, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="mobile-menu-btn"
                        style={{ display: "inline-flex", color: "#f87171", fontSize: "0.78rem" }}
                        onClick={async () => {
                          await adminFetch(`/api/admin/hero-stats/${stat.id}`, "DELETE");
                          setToast("Counter deleted.");
                          loadAllAdminData();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await adminFetch("/api/admin/hero-stats", "POST", newHeroStat);
                    setNewHeroStat({ label: "", value: "", visible: true });
                    setToast("Added new Hero Counter!");
                    loadAllAdminData();
                  } catch (err: any) {
                    setToast(err.message);
                  }
                }}
                style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}
              >
                <input
                  placeholder="New Counter Label (e.g. Selection Ratio)"
                  required
                  value={newHeroStat.label}
                  onChange={(e) => setNewHeroStat((p) => ({ ...p, label: e.target.value }))}
                />
                <input
                  placeholder="Value (e.g. 94%)"
                  required
                  value={newHeroStat.value}
                  onChange={(e) => setNewHeroStat((p) => ({ ...p, value: e.target.value }))}
                />
                <button type="submit" className="btn-secondary">
                  + Add Counter
                </button>
              </form>
            </div>

            {/* Announcement Ticker & Hero Banner */}
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Announcement Ticker & 16:9 Hero Banner</h2>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={settings.ticker_enabled}
                    onChange={(e) => setSettings((p: any) => ({ ...p, ticker_enabled: e.target.checked }))}
                  />
                  Show Top Announcement Ticker
                </label>
                <input
                  placeholder="Ticker Text (max 200 chars)"
                  maxLength={200}
                  value={settings.ticker_text}
                  onChange={(e) => setSettings((p: any) => ({ ...p, ticker_text: e.target.value }))}
                />
                <input
                  placeholder="Optional Ticker Link (e.g. /batches or #demo-form)"
                  value={settings.ticker_link}
                  onChange={(e) => setSettings((p: any) => ({ ...p, ticker_link: e.target.value }))}
                />
                {settings.hero_image_url ? (
                  <div style={{ display: "grid", gap: "0.65rem" }}>
                    <ImageAttachmentPreview
                      url={settings.hero_image_url}
                      kind="16:9 Hero Banner"
                      aspectRatio="16/9"
                      onChange={() =>
                        setCropperTarget({
                          kind: "banner",
                          onDone: (url) => setSettings((p: any) => ({ ...p, hero_image_url: url })),
                        })
                      }
                      onRemove={() => setSettings((p: any) => ({ ...p, hero_image_url: "" }))}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: "fit-content" }}
                      onClick={async () => {
                        try {
                          await adminFetch("/api/admin/settings", "PUT", settings);
                          setToast("✓ Homepage 16:9 Hero Banner and Ticker saved successfully!");
                          loadAllAdminData();
                        } catch (err: any) {
                          setToast(err.message);
                        }
                      }}
                    >
                      Save Hero Banner & Ticker Now
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: "fit-content" }}
                    onClick={() =>
                      setCropperTarget({
                        kind: "banner",
                        onDone: (url) => setSettings((p: any) => ({ ...p, hero_image_url: url })),
                      })
                    }
                  >
                    📷 Upload & Crop 16:9 Hero Banner
                  </button>
                )}
              </div>
            </div>

            {/* Bilingual Section Headings */}
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Section Headings (English + Hindi Accent Line)</h2>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {SECTION_HEADING_KEYS.map(([secKey, secTitle]) => {
                  const sec = settings.section_headings?.[secKey] || { en: "", hi: "" };
                  return (
                    <div
                      key={secKey}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "0.5rem",
                        alignItems: "center",
                        padding: "0.5rem",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      <strong style={{ fontSize: "0.88rem" }}>{secTitle}</strong>
                      <input
                        placeholder="English Heading"
                        value={sec.en}
                        onChange={(e) =>
                          setSettings((p: any) => ({
                            ...p,
                            section_headings: {
                              ...(p.section_headings || {}),
                              [secKey]: { ...sec, en: e.target.value },
                            },
                          }))
                        }
                      />
                      <input
                        placeholder="Hindi Accent Line"
                        value={sec.hi}
                        onChange={(e) =>
                          setSettings((p: any) => ({
                            ...p,
                            section_headings: {
                              ...(p.section_headings || {}),
                              [secKey]: { ...sec, hi: e.target.value },
                            },
                          }))
                        }
                      />
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    try {
                      await adminFetch("/api/admin/settings", "PUT", settings);
                      setToast("Homepage Ticker, Banner & Section Headings saved!");
                      loadAllAdminData();
                    } catch (err: any) {
                      setToast(err.message);
                    }
                  }}
                >
                  Save Homepage & Headings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= BRANCHES ================= */}
        {tab === "branches" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Add New Branch Location</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await adminFetch("/api/admin/branches", "POST", newBranch);
                    setNewBranch({
                      name: "",
                      address: "",
                      maps_url: "",
                      phone: "",
                      whatsapp: "",
                      is_flagship: false,
                      active: true,
                    });
                    setToast("Branch created!");
                    loadAllAdminData();
                  } catch (err: any) {
                    setToast(err.message);
                  }
                }}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.75rem" }}
              >
                <input
                  placeholder="Branch Name *"
                  required
                  value={newBranch.name}
                  onChange={(e) => setNewBranch((p) => ({ ...p, name: e.target.value }))}
                />
                <input
                  placeholder="Full Address *"
                  required
                  value={newBranch.address}
                  onChange={(e) => setNewBranch((p) => ({ ...p, address: e.target.value }))}
                />
                <input
                  placeholder="Google Maps URL (https://...)"
                  value={newBranch.maps_url}
                  onChange={(e) => setNewBranch((p) => ({ ...p, maps_url: e.target.value }))}
                />
                <input
                  placeholder="Phone (+91...)"
                  value={newBranch.phone}
                  onChange={(e) => setNewBranch((p) => ({ ...p, phone: e.target.value }))}
                />
                <input
                  placeholder="WhatsApp (+91...)"
                  value={newBranch.whatsapp}
                  onChange={(e) => setNewBranch((p) => ({ ...p, whatsapp: e.target.value }))}
                />
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={newBranch.is_flagship}
                    onChange={(e) => setNewBranch((p) => ({ ...p, is_flagship: e.target.checked }))}
                  />
                  Mark as Primary Branch
                </label>
                <button type="submit" className="btn-primary">
                  Save Branch
                </button>
              </form>
            </div>

            {branches.map((b, idx) => (
              <div key={b.id} className="bento-card" style={{ display: "grid", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <strong>{b.name}</strong> {b.is_flagship && "⭐ Primary"}{" "}
                    {!b.active && <span style={{ color: "#fbbf24" }}>(Inactive)</span>}
                    {b.is_sample && !b.is_flagship && (
                      <span style={{ fontSize: "0.75rem", color: "#fbbf24", marginLeft: "0.4rem" }}>[Sample]</span>
                    )}
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{b.address}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Phone: {b.phone || "Uses Global"} · WhatsApp: {b.whatsapp || "Uses Global"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={() => setEditingBranch(editingBranch?.id === b.id ? null : { ...b })}
                    >
                      {editingBranch?.id === b.id ? "Close Edit" : "Edit Address / Details"}
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", fontSize: "0.78rem" }}
                      disabled={idx === 0}
                      onClick={() => reorderItems("/api/admin/branches/reorder", branches, idx, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", fontSize: "0.78rem" }}
                      disabled={idx === branches.length - 1}
                      onClick={() => reorderItems("/api/admin/branches/reorder", branches, idx, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", color: "#f87171", fontSize: "0.8rem" }}
                      onClick={async () => {
                        try {
                          await adminFetch(`/api/admin/branches/${b.id}`, "DELETE");
                          setToast("Branch deleted.");
                          loadAllAdminData();
                        } catch (err: any) {
                          setToast(err.message);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingBranch?.id === b.id && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await adminFetch(`/api/admin/branches/${b.id}`, "PUT", editingBranch);
                        setToast(`Updated branch "${editingBranch.name}"!`);
                        setEditingBranch(null);
                        loadAllAdminData();
                      } catch (err: any) {
                        setToast(err.message);
                      }
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "0.65rem",
                      paddingTop: "0.65rem",
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    <input
                      placeholder="Branch Name *"
                      required
                      value={editingBranch.name}
                      onChange={(e) => setEditingBranch((p: any) => ({ ...p, name: e.target.value }))}
                    />
                    <input
                      placeholder="Full Street Address *"
                      required
                      value={editingBranch.address}
                      onChange={(e) => setEditingBranch((p: any) => ({ ...p, address: e.target.value }))}
                    />
                    <input
                      placeholder="Google Maps URL (https://...)"
                      value={editingBranch.maps_url}
                      onChange={(e) => setEditingBranch((p: any) => ({ ...p, maps_url: e.target.value }))}
                    />
                    <input
                      placeholder="Branch Phone (+91...)"
                      value={editingBranch.phone}
                      onChange={(e) => setEditingBranch((p: any) => ({ ...p, phone: e.target.value }))}
                    />
                    <input
                      placeholder="Branch WhatsApp (+91...)"
                      value={editingBranch.whatsapp}
                      onChange={(e) => setEditingBranch((p: any) => ({ ...p, whatsapp: e.target.value }))}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={editingBranch.is_flagship}
                        onChange={(e) => setEditingBranch((p: any) => ({ ...p, is_flagship: e.target.checked }))}
                      />
                      Primary Branch
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={editingBranch.active}
                        onChange={(e) => setEditingBranch((p: any) => ({ ...p, active: e.target.checked }))}
                      />
                      Active on Public Site
                    </label>
                    <button type="submit" className="btn-primary">
                      Save Branch Changes
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ================= COURSES ================= */}
        {tab === "courses" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Add Course Stream</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const subjects = newCourse.subjectsText
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    const highlights = newCourse.highlightsText
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    await adminFetch("/api/admin/courses", "POST", {
                      stream: newCourse.stream,
                      name: newCourse.name,
                      classes: newCourse.classes,
                      subjects,
                      highlights,
                      visible: newCourse.visible,
                    });
                    setNewCourse({
                      stream: "Science",
                      name: "",
                      classes: "11 – 12",
                      subjectsText: "",
                      highlightsText: "",
                      visible: true,
                    });
                    setToast("Course added!");
                    loadAllAdminData();
                  } catch (err: any) {
                    setToast(err.message);
                  }
                }}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.75rem" }}
              >
                <input
                  placeholder="Stream (e.g. Science) *"
                  required
                  value={newCourse.stream}
                  onChange={(e) => setNewCourse((p) => ({ ...p, stream: e.target.value }))}
                />
                <input
                  placeholder="Course Title *"
                  required
                  value={newCourse.name}
                  onChange={(e) => setNewCourse((p) => ({ ...p, name: e.target.value }))}
                />
                <input
                  placeholder="Classes (e.g. 11 – 12) *"
                  required
                  value={newCourse.classes}
                  onChange={(e) => setNewCourse((p) => ({ ...p, classes: e.target.value }))}
                />
                <input
                  placeholder="Subjects (comma-separated)"
                  value={newCourse.subjectsText}
                  onChange={(e) => setNewCourse((p) => ({ ...p, subjectsText: e.target.value }))}
                />
                <input
                  placeholder="Highlights (comma-separated)"
                  value={newCourse.highlightsText}
                  onChange={(e) => setNewCourse((p) => ({ ...p, highlightsText: e.target.value }))}
                />
                <button type="submit" className="btn-primary">
                  Add Course
                </button>
              </form>
            </div>

            {courses.map((c, idx) => (
              <div key={c.id} className="bento-card" style={{ display: "grid", gap: "0.65rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <strong>{c.stream}</strong>: {c.name} (Classes {c.classes}){" "}
                    {!c.visible && <span style={{ color: "#fbbf24" }}>(Hidden)</span>}
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      Subjects: {(c.subjects || []).join(", ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={() =>
                        setEditingCourse(
                          editingCourse?.id === c.id
                            ? null
                            : {
                                ...c,
                                subjectsText: (c.subjects || []).join(", "),
                                highlightsText: (c.highlights || []).join(", "),
                              }
                        )
                      }
                    >
                      {editingCourse?.id === c.id ? "Close Edit" : "Edit Course"}
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", fontSize: "0.78rem" }}
                      disabled={idx === 0}
                      onClick={() => reorderItems("/api/admin/courses/reorder", courses, idx, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", fontSize: "0.78rem" }}
                      disabled={idx === courses.length - 1}
                      onClick={() => reorderItems("/api/admin/courses/reorder", courses, idx, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", color: "#f87171", fontSize: "0.8rem" }}
                      onClick={async () => {
                        await adminFetch(`/api/admin/courses/${c.id}`, "DELETE");
                        setToast("Course deleted.");
                        loadAllAdminData();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingCourse?.id === c.id && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const subjects = editingCourse.subjectsText
                          .split(",")
                          .map((s: string) => s.trim())
                          .filter(Boolean);
                        const highlights = editingCourse.highlightsText
                          .split(",")
                          .map((s: string) => s.trim())
                          .filter(Boolean);
                        await adminFetch(`/api/admin/courses/${c.id}`, "PUT", {
                          stream: editingCourse.stream,
                          name: editingCourse.name,
                          classes: editingCourse.classes,
                          subjects,
                          highlights,
                          visible: editingCourse.visible,
                        });
                        setToast(`Saved course "${editingCourse.name}"!`);
                        setEditingCourse(null);
                        loadAllAdminData();
                      } catch (err: any) {
                        setToast(err.message);
                      }
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                      gap: "0.65rem",
                      paddingTop: "0.65rem",
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    <input
                      placeholder="Stream *"
                      required
                      value={editingCourse.stream}
                      onChange={(e) => setEditingCourse((p: any) => ({ ...p, stream: e.target.value }))}
                    />
                    <input
                      placeholder="Course Name *"
                      required
                      value={editingCourse.name}
                      onChange={(e) => setEditingCourse((p: any) => ({ ...p, name: e.target.value }))}
                    />
                    <input
                      placeholder="Classes *"
                      required
                      value={editingCourse.classes}
                      onChange={(e) => setEditingCourse((p: any) => ({ ...p, classes: e.target.value }))}
                    />
                    <input
                      placeholder="Subjects (comma-separated)"
                      value={editingCourse.subjectsText}
                      onChange={(e) => setEditingCourse((p: any) => ({ ...p, subjectsText: e.target.value }))}
                    />
                    <input
                      placeholder="Highlights (comma-separated)"
                      value={editingCourse.highlightsText}
                      onChange={(e) => setEditingCourse((p: any) => ({ ...p, highlightsText: e.target.value }))}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={editingCourse.visible}
                        onChange={(e) => setEditingCourse((p: any) => ({ ...p, visible: e.target.checked }))}
                      />
                      Visible on Public Site
                    </label>
                    <button type="submit" className="btn-primary">
                      Save Course Changes
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ================= BATCHES ================= */}
        {tab === "batches" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Add Upcoming Batch</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await adminFetch("/api/admin/batches", "POST", newBatch);
                    setToast("Batch created!");
                    loadAllAdminData();
                  } catch (err: any) {
                    setToast(err.message);
                  }
                }}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}
              >
                <input
                  placeholder="Class (e.g. 12)"
                  value={newBatch.class_name}
                  onChange={(e) => setNewBatch((p) => ({ ...p, class_name: e.target.value }))}
                />
                <select value={newBatch.stream} onChange={(e) => setNewBatch((p) => ({ ...p, stream: e.target.value }))}>
                  <option value="Foundation">Foundation</option>
                  <option value="Science">Science</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Humanities">Humanities</option>
                </select>
                <select
                  value={newBatch.branch_id}
                  onChange={(e) => setNewBatch((p) => ({ ...p, branch_id: Number(e.target.value) }))}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newBatch.start_date}
                  onChange={(e) => setNewBatch((p) => ({ ...p, start_date: e.target.value }))}
                />
                <input
                  placeholder="Timings"
                  value={newBatch.timings}
                  onChange={(e) => setNewBatch((p) => ({ ...p, timings: e.target.value }))}
                />
                <select value={newBatch.status} onChange={(e) => setNewBatch((p) => ({ ...p, status: e.target.value }))}>
                  <option value="Open">Open</option>
                  <option value="Filling Fast">Filling Fast</option>
                  <option value="Full">Full</option>
                </select>
                <button type="submit" className="btn-primary">
                  Save Batch
                </button>
              </form>
            </div>

            {batches.map((b) => (
              <div key={b.id} className="bento-card" style={{ display: "grid", gap: "0.65rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <strong>
                      Class {b.class_name} {b.stream}
                    </strong>{" "}
                    · {b.branch_name} · {b.start_date_formatted} ({b.status}){" "}
                    {!b.active && <span style={{ color: "#fbbf24" }}>(Hidden)</span>}
                    {b.is_sample && <span style={{ fontSize: "0.75rem", color: "#fbbf24", marginLeft: "0.4rem" }}>[Sample]</span>}
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{b.timings}</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={() => setEditingBatch(editingBatch?.id === b.id ? null : { ...b })}
                    >
                      {editingBatch?.id === b.id ? "Close Edit" : "Edit Batch"}
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", color: "#f87171", fontSize: "0.8rem" }}
                      onClick={async () => {
                        await adminFetch(`/api/admin/batches/${b.id}`, "DELETE");
                        loadAllAdminData();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingBatch?.id === b.id && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await adminFetch(`/api/admin/batches/${b.id}`, "PUT", editingBatch);
                        setToast("Batch updated!");
                        setEditingBatch(null);
                        loadAllAdminData();
                      } catch (err: any) {
                        setToast(err.message);
                      }
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "0.65rem",
                      paddingTop: "0.65rem",
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    <input
                      placeholder="Class"
                      value={editingBatch.class_name}
                      onChange={(e) => setEditingBatch((p: any) => ({ ...p, class_name: e.target.value }))}
                    />
                    <select
                      value={editingBatch.stream}
                      onChange={(e) => setEditingBatch((p: any) => ({ ...p, stream: e.target.value }))}
                    >
                      <option value="Foundation">Foundation</option>
                      <option value="Science">Science</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Humanities">Humanities</option>
                    </select>
                    <select
                      value={editingBatch.branch_id}
                      onChange={(e) => setEditingBatch((p: any) => ({ ...p, branch_id: Number(e.target.value) }))}
                    >
                      {branches.map((br) => (
                        <option key={br.id} value={br.id}>
                          {br.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={editingBatch.start_date}
                      onChange={(e) => setEditingBatch((p: any) => ({ ...p, start_date: e.target.value }))}
                    />
                    <input
                      placeholder="Timings"
                      value={editingBatch.timings}
                      onChange={(e) => setEditingBatch((p: any) => ({ ...p, timings: e.target.value }))}
                    />
                    <select
                      value={editingBatch.status}
                      onChange={(e) => setEditingBatch((p: any) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="Open">Open</option>
                      <option value="Filling Fast">Filling Fast</option>
                      <option value="Full">Full</option>
                    </select>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={editingBatch.active}
                        onChange={(e) => setEditingBatch((p: any) => ({ ...p, active: e.target.checked }))}
                      />
                      Active
                    </label>
                    <button type="submit" className="btn-primary">
                      Save Batch Changes
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ================= RESULTS & CONSENTS ================= */}
        {tab === "results" && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div className="bento-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <h2 style={{ margin: 0 }}>Add Student Result (1:1 Cropper + Parent Consent)</h2>
                <a href="/api/admin/consent-pdf/blank" className="mobile-menu-btn" style={{ display: "inline-flex", textDecoration: "none" }}>
                  ⬇ Blank Consent Form PDF
                </a>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await adminFetch("/api/admin/results", "POST", newResult);
                    setToast(res.warning ? `Saved! Note: ${res.warning}` : "Result created!");
                    setNewResult({
                      name: "",
                      photo_url: "",
                      class_name: "12",
                      stream: "Science",
                      score_text: "",
                      rank_text: "",
                      year: "2025-26",
                      parent_name: "",
                      parent_whatsapp: "",
                      published: true,
                      pinned: false,
                    });
                    loadAllAdminData();
                  } catch (err: any) {
                    setToast(err.message);
                  }
                }}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}
              >
                <input
                  placeholder="Student Name *"
                  required
                  value={newResult.name}
                  onChange={(e) => setNewResult((p) => ({ ...p, name: e.target.value }))}
                />
                <input
                  placeholder="Class (e.g. 12) *"
                  required
                  value={newResult.class_name}
                  onChange={(e) => setNewResult((p) => ({ ...p, class_name: e.target.value }))}
                />
                <select
                  value={newResult.stream}
                  onChange={(e) => setNewResult((p) => ({ ...p, stream: e.target.value }))}
                >
                  <option value="Science">Science</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Humanities">Humanities</option>
                  <option value="Foundation">Foundation</option>
                </select>
                <input
                  placeholder="Marks / % (e.g. 98.4%) *"
                  required
                  value={newResult.score_text}
                  onChange={(e) => setNewResult((p) => ({ ...p, score_text: e.target.value }))}
                />
                <input
                  placeholder="Rank / Distinction Badge"
                  value={newResult.rank_text}
                  onChange={(e) => setNewResult((p) => ({ ...p, rank_text: e.target.value }))}
                />
                <input
                  placeholder="Academic Year (e.g. 2025-26)"
                  value={newResult.year}
                  onChange={(e) => setNewResult((p) => ({ ...p, year: e.target.value }))}
                />
                <input
                  placeholder="Parent Name (Admin-only)"
                  value={newResult.parent_name}
                  onChange={(e) => setNewResult((p) => ({ ...p, parent_name: e.target.value }))}
                />
                <input
                  placeholder="Parent WhatsApp (+91...)"
                  value={newResult.parent_whatsapp}
                  onChange={(e) => setNewResult((p) => ({ ...p, parent_whatsapp: e.target.value }))}
                />
                {newResult.photo_url ? (
                  <ImageAttachmentPreview
                    url={newResult.photo_url}
                    kind="1:1 Achiever"
                    aspectRatio="1/1"
                    onChange={() =>
                      setCropperTarget({
                        kind: "result",
                        onDone: (url) => setNewResult((p) => ({ ...p, photo_url: url })),
                      })
                    }
                    onRemove={() => setNewResult((p) => ({ ...p, photo_url: "" }))}
                  />
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: "fit-content" }}
                    onClick={() =>
                      setCropperTarget({
                        kind: "result",
                        onDone: (url) => setNewResult((p) => ({ ...p, photo_url: url })),
                      })
                    }
                  >
                    📷 Upload & Crop 1:1 Photo *
                  </button>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <input
                    type="checkbox"
                    checked={newResult.pinned}
                    onChange={(e) => setNewResult((p) => ({ ...p, pinned: e.target.checked }))}
                  />
                  Pin to Homepage (max 8)
                </label>
                <button type="submit" className="btn-primary">
                  Save Result
                </button>
              </form>
            </div>

            {/* Filter Bar */}
            <div className="bento-card" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <strong>Filter Results:</strong>
              <select value={resultFilterClass} onChange={(e) => setResultFilterClass(e.target.value)}>
                <option value="All">All Classes</option>
                <option value="10">Class 10</option>
                <option value="12">Class 12</option>
              </select>
              <select value={resultFilterStream} onChange={(e) => setResultFilterStream(e.target.value)}>
                <option value="All">All Streams</option>
                <option value="Science">Science</option>
                <option value="Commerce">Commerce</option>
                <option value="Humanities">Humanities</option>
                <option value="Foundation">Foundation</option>
              </select>
              <select value={resultFilterConsent} onChange={(e) => setResultFilterConsent(e.target.value)}>
                <option value="All">All Consent States</option>
                <option value="Given">Given</option>
                <option value="Given (sample)">Given (sample)</option>
                <option value="Waiting">Waiting</option>
                <option value="Not requested">Not requested</option>
                <option value="Declined">Declined</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </div>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              {filteredResults.map((r, idx) => (
                <div key={r.id} className="bento-card" style={{ display: "grid", gap: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
                      <img src={r.photo_url} alt={r.name} width={56} height={56} style={{ borderRadius: "50%", objectFit: "cover" }} />
                      <div>
                        <strong>{r.name}</strong> · Class {r.class_name} ({r.stream}) ·{" "}
                        <span style={{ color: "var(--accent-primary)" }}>{r.score_text}</span>
                        {r.pinned && <span style={{ marginLeft: "0.4rem", fontSize: "0.78rem" }}>📌 Pinned</span>}
                        {r.is_sample && <span style={{ marginLeft: "0.4rem", fontSize: "0.75rem", color: "#fbbf24" }}>[Sample]</span>}
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          Consent: <strong>{r.consent_status}</strong>{" "}
                          {r.is_live ? "· 🟢 Live on Public Site" : "· 🔒 Hidden until consent"}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "0.38rem 0.7rem", fontSize: "0.8rem" }}
                        onClick={() => setEditingResult(editingResult?.id === r.id ? null : { ...r })}
                      >
                        {editingResult?.id === r.id ? "Close Edit" : "Edit"}
                      </button>
                      <button
                        type="button"
                        className="mobile-menu-btn"
                        style={{ display: "inline-flex", fontSize: "0.78rem" }}
                        disabled={idx === 0}
                        onClick={() => reorderItems("/api/admin/results/reorder", filteredResults, idx, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="mobile-menu-btn"
                        style={{ display: "inline-flex", fontSize: "0.78rem" }}
                        disabled={idx === filteredResults.length - 1}
                        onClick={() => reorderItems("/api/admin/results/reorder", filteredResults, idx, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "0.38rem 0.7rem", fontSize: "0.8rem" }}
                        onClick={async () => {
                          try {
                            const data = await adminFetch(`/api/admin/results/${r.id}/request-consent`, "POST");
                            window.open(data.whatsapp_url, "_blank", "noopener");
                            loadAllAdminData();
                          } catch (err: any) {
                            setToast(err.message);
                          }
                        }}
                      >
                        Ask Consent on WhatsApp
                      </button>
                      <a
                        href={`/api/admin/results/${r.id}/consent-pdf`}
                        className="mobile-menu-btn"
                        style={{ display: "inline-flex", textDecoration: "none", fontSize: "0.8rem" }}
                      >
                        ⬇ PDF Form
                      </a>
                      <button
                        type="button"
                        className="mobile-menu-btn"
                        style={{ display: "inline-flex", fontSize: "0.8rem" }}
                        onClick={async () => {
                          await adminFetch(`/api/admin/results/${r.id}/paper-consent`, "POST", {
                            staff_name: user.email,
                          });
                          setToast("Marked paper consent received.");
                          loadAllAdminData();
                        }}
                      >
                        ✓ Paper Received
                      </button>
                      {r.consent_status === "Given" && (
                        <button
                          type="button"
                          className="mobile-menu-btn"
                          style={{ display: "inline-flex", fontSize: "0.8rem" }}
                          onClick={async () => {
                            await adminFetch(`/api/admin/results/${r.id}/withdraw-consent`, "POST");
                            setToast("Consent withdrawn; removed from public pages.");
                            loadAllAdminData();
                          }}
                        >
                          Withdraw Consent
                        </button>
                      )}
                      <button
                        type="button"
                        className="mobile-menu-btn"
                        style={{ display: "inline-flex", fontSize: "0.8rem", color: "#f87171" }}
                        onClick={async () => {
                          await adminFetch(`/api/admin/results/${r.id}`, "DELETE");
                          loadAllAdminData();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {editingResult?.id === r.id && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await adminFetch(`/api/admin/results/${r.id}`, "PUT", editingResult);
                          setToast(res.warning ? `Updated! ${res.warning}` : "Result updated!");
                          setEditingResult(null);
                          loadAllAdminData();
                        } catch (err: any) {
                          setToast(err.message);
                        }
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: "0.65rem",
                        paddingTop: "0.65rem",
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      <input
                        placeholder="Student Name *"
                        required
                        value={editingResult.name}
                        onChange={(e) => setEditingResult((p: any) => ({ ...p, name: e.target.value }))}
                      />
                      <input
                        placeholder="Class *"
                        required
                        value={editingResult.class_name}
                        onChange={(e) => setEditingResult((p: any) => ({ ...p, class_name: e.target.value }))}
                      />
                      <select
                        value={editingResult.stream}
                        onChange={(e) => setEditingResult((p: any) => ({ ...p, stream: e.target.value }))}
                      >
                        <option value="Science">Science</option>
                        <option value="Commerce">Commerce</option>
                        <option value="Humanities">Humanities</option>
                        <option value="Foundation">Foundation</option>
                      </select>
                      <input
                        placeholder="Score / Marks *"
                        required
                        value={editingResult.score_text}
                        onChange={(e) => setEditingResult((p: any) => ({ ...p, score_text: e.target.value }))}
                      />
                      <input
                        placeholder="Rank / Distinction"
                        value={editingResult.rank_text}
                        onChange={(e) => setEditingResult((p: any) => ({ ...p, rank_text: e.target.value }))}
                      />
                      <input
                        placeholder="Academic Year"
                        value={editingResult.year}
                        onChange={(e) => setEditingResult((p: any) => ({ ...p, year: e.target.value }))}
                      />
                      <input
                        placeholder="Parent Name"
                        value={editingResult.parent_name}
                        onChange={(e) => setEditingResult((p: any) => ({ ...p, parent_name: e.target.value }))}
                      />
                      <input
                        placeholder="Parent WhatsApp"
                        value={editingResult.parent_whatsapp}
                        onChange={(e) => setEditingResult((p: any) => ({ ...p, parent_whatsapp: e.target.value }))}
                      />
                      {editingResult.photo_url ? (
                        <ImageAttachmentPreview
                          url={editingResult.photo_url}
                          kind="1:1 Achiever"
                          aspectRatio="1/1"
                          onChange={() =>
                            setCropperTarget({
                              kind: "result",
                              onDone: (url) => setEditingResult((p: any) => ({ ...p, photo_url: url })),
                            })
                          }
                        />
                      ) : (
                        <button
                          type="button"
                          className="mobile-menu-btn"
                          style={{ display: "inline-flex" }}
                          onClick={() =>
                            setCropperTarget({
                              kind: "result",
                              onDone: (url) => setEditingResult((p: any) => ({ ...p, photo_url: url })),
                            })
                          }
                        >
                          Upload 1:1 Photo
                        </button>
                      )}
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <input
                          type="checkbox"
                          checked={editingResult.published}
                          onChange={(e) => setEditingResult((p: any) => ({ ...p, published: e.target.checked }))}
                        />
                        Published
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <input
                          type="checkbox"
                          checked={editingResult.pinned}
                          onChange={(e) => setEditingResult((p: any) => ({ ...p, pinned: e.target.checked }))}
                        />
                        Pinned (max 8)
                      </label>
                      <button type="submit" className="btn-primary">
                        Save Result Changes
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= FOUNDERS ================= */}
        {tab === "founders" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Add Founder Profile (Locked 4:5 Portrait Cropper)</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await adminFetch("/api/admin/founders", "POST", newFounder);
                    setNewFounder({ name: "", photo_url: "", designation: "", vision: "", visible: true });
                    setToast("Founder added!");
                    loadAllAdminData();
                  } catch (err: any) {
                    setToast(err.message);
                  }
                }}
                style={{ display: "grid", gap: "0.75rem" }}
              >
                <input
                  placeholder="Founder Name *"
                  required
                  value={newFounder.name}
                  onChange={(e) => setNewFounder((p) => ({ ...p, name: e.target.value }))}
                />
                <input
                  placeholder="Designation / Subject Expertise *"
                  required
                  value={newFounder.designation}
                  onChange={(e) => setNewFounder((p) => ({ ...p, designation: e.target.value }))}
                />
                <textarea
                  placeholder="Vision Message (max 1,200 chars)"
                  maxLength={1200}
                  value={newFounder.vision}
                  onChange={(e) => setNewFounder((p) => ({ ...p, vision: e.target.value }))}
                />
                {newFounder.photo_url ? (
                  <ImageAttachmentPreview
                    url={newFounder.photo_url}
                    kind="4:5 Founder Portrait"
                    aspectRatio="4/5"
                    onChange={() =>
                      setCropperTarget({
                        kind: "founder",
                        onDone: (url) => setNewFounder((p) => ({ ...p, photo_url: url })),
                      })
                    }
                    onRemove={() => setNewFounder((p) => ({ ...p, photo_url: "" }))}
                  />
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: "fit-content" }}
                    onClick={() =>
                      setCropperTarget({
                        kind: "founder",
                        onDone: (url) => setNewFounder((p) => ({ ...p, photo_url: url })),
                      })
                    }
                  >
                    📷 Upload & Crop 4:5 Portrait *
                  </button>
                )}
                <button type="submit" className="btn-primary">
                  Save Founder
                </button>
              </form>
            </div>
            {founders.map((f, idx) => (
              <div key={f.id} className="bento-card" style={{ display: "grid", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <img src={f.photo_url} alt={f.name} width={48} height={60} style={{ borderRadius: "0.4rem", objectFit: "cover" }} />
                    <div>
                      <strong>{f.name}</strong> · {f.designation}{" "}
                      {!f.visible && <span style={{ color: "#fbbf24" }}>(Hidden)</span>}
                      {f.is_sample && <span style={{ fontSize: "0.75rem", color: "#fbbf24", marginLeft: "0.4rem" }}>[Sample]</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={() => setEditingFounder(editingFounder?.id === f.id ? null : { ...f })}
                    >
                      {editingFounder?.id === f.id ? "Close Edit" : "Edit Founder"}
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", fontSize: "0.78rem" }}
                      disabled={idx === 0}
                      onClick={() => reorderItems("/api/admin/founders/reorder", founders, idx, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", fontSize: "0.78rem" }}
                      disabled={idx === founders.length - 1}
                      onClick={() => reorderItems("/api/admin/founders/reorder", founders, idx, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", color: "#f87171", fontSize: "0.8rem" }}
                      onClick={async () => {
                        await adminFetch(`/api/admin/founders/${f.id}`, "DELETE");
                        loadAllAdminData();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingFounder?.id === f.id && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await adminFetch(`/api/admin/founders/${f.id}`, "PUT", editingFounder);
                        setToast("Founder updated!");
                        setEditingFounder(null);
                        loadAllAdminData();
                      } catch (err: any) {
                        setToast(err.message);
                      }
                    }}
                    style={{
                      display: "grid",
                      gap: "0.65rem",
                      paddingTop: "0.65rem",
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    <input
                      placeholder="Founder Name *"
                      required
                      value={editingFounder.name}
                      onChange={(e) => setEditingFounder((p: any) => ({ ...p, name: e.target.value }))}
                    />
                    <input
                      placeholder="Designation *"
                      required
                      value={editingFounder.designation}
                      onChange={(e) => setEditingFounder((p: any) => ({ ...p, designation: e.target.value }))}
                    />
                    <textarea
                      placeholder="Vision Message (max 1,200 chars)"
                      maxLength={1200}
                      value={editingFounder.vision}
                      onChange={(e) => setEditingFounder((p: any) => ({ ...p, vision: e.target.value }))}
                    />
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                    {editingFounder.photo_url ? (
                      <ImageAttachmentPreview
                        url={editingFounder.photo_url}
                        kind="4:5 Founder Portrait"
                        aspectRatio="4/5"
                        onChange={() =>
                          setCropperTarget({
                            kind: "founder",
                            onDone: (url) => setEditingFounder((p: any) => ({ ...p, photo_url: url })),
                          })
                        }
                      />
                    ) : (
                      <button
                        type="button"
                        className="mobile-menu-btn"
                        style={{ display: "inline-flex" }}
                        onClick={() =>
                          setCropperTarget({
                            kind: "founder",
                            onDone: (url) => setEditingFounder((p: any) => ({ ...p, photo_url: url })),
                          })
                        }
                      >
                        Upload 4:5 Portrait
                      </button>
                    )}
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <input
                          type="checkbox"
                          checked={editingFounder.visible}
                          onChange={(e) => setEditingFounder((p: any) => ({ ...p, visible: e.target.checked }))}
                        />
                        Visible on Public Site
                      </label>
                    </div>
                    <button type="submit" className="btn-primary">
                      Save Founder Changes
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ================= TESTIMONIALS ================= */}
        {tab === "testimonials" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Add Testimonial (Optional 1:1 Photo Cropper)</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await adminFetch("/api/admin/testimonials", "POST", newTestimonial);
                  setNewTestimonial({ quote: "", name: "", role: "Student", class_year: "", photo_url: "", visible: true });
                  setToast("Testimonial added!");
                  loadAllAdminData();
                }}
                style={{ display: "grid", gap: "0.75rem" }}
              >
                <textarea
                  placeholder="Quote (max 500 chars) *"
                  maxLength={500}
                  required
                  value={newTestimonial.quote}
                  onChange={(e) => setNewTestimonial((p) => ({ ...p, quote: e.target.value }))}
                />
                <input
                  placeholder="Name *"
                  required
                  value={newTestimonial.name}
                  onChange={(e) => setNewTestimonial((p) => ({ ...p, name: e.target.value }))}
                />
                <input
                  placeholder="Class & Year (e.g. Class 12 Commerce · 2025-26)"
                  value={newTestimonial.class_year}
                  onChange={(e) => setNewTestimonial((p) => ({ ...p, class_year: e.target.value }))}
                />
                <select value={newTestimonial.role} onChange={(e) => setNewTestimonial((p) => ({ ...p, role: e.target.value }))}>
                  <option value="Student">Student</option>
                  <option value="Parent">Parent</option>
                </select>
                {newTestimonial.photo_url ? (
                  <ImageAttachmentPreview
                    url={newTestimonial.photo_url}
                    kind="1:1 Testimonial"
                    aspectRatio="1/1"
                    onChange={() =>
                      setCropperTarget({
                        kind: "testimonial",
                        onDone: (url) => setNewTestimonial((p) => ({ ...p, photo_url: url })),
                      })
                    }
                    onRemove={() => setNewTestimonial((p) => ({ ...p, photo_url: "" }))}
                  />
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: "fit-content" }}
                    onClick={() =>
                      setCropperTarget({
                        kind: "testimonial",
                        onDone: (url) => setNewTestimonial((p) => ({ ...p, photo_url: url })),
                      })
                    }
                  >
                    Optional 1:1 Photo
                  </button>
                )}
                <button type="submit" className="btn-primary">
                  Save Testimonial
                </button>
              </form>
            </div>

            {testimonials.map((t, idx) => (
              <div key={t.id} className="bento-card" style={{ display: "grid", gap: "0.65rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <strong>{t.name}</strong> ({t.role}) · {t.class_year}{" "}
                    {!t.visible && <span style={{ color: "#fbbf24" }}>(Hidden)</span>}
                    {t.is_sample && <span style={{ fontSize: "0.75rem", color: "#fbbf24", marginLeft: "0.4rem" }}>[Sample]</span>}
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>"{t.quote}"</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={() => setEditingTestimonial(editingTestimonial?.id === t.id ? null : { ...t })}
                    >
                      {editingTestimonial?.id === t.id ? "Close Edit" : "Edit"}
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", fontSize: "0.78rem" }}
                      disabled={idx === 0}
                      onClick={() => reorderItems("/api/admin/testimonials/reorder", testimonials, idx, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", fontSize: "0.78rem" }}
                      disabled={idx === testimonials.length - 1}
                      onClick={() => reorderItems("/api/admin/testimonials/reorder", testimonials, idx, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", color: "#f87171", fontSize: "0.8rem" }}
                      onClick={async () => {
                        await adminFetch(`/api/admin/testimonials/${t.id}`, "DELETE");
                        loadAllAdminData();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingTestimonial?.id === t.id && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await adminFetch(`/api/admin/testimonials/${t.id}`, "PUT", editingTestimonial);
                      setToast("Testimonial updated!");
                      setEditingTestimonial(null);
                      loadAllAdminData();
                    }}
                    style={{ display: "grid", gap: "0.65rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border-color)" }}
                  >
                    <textarea
                      maxLength={500}
                      required
                      value={editingTestimonial.quote}
                      onChange={(e) => setEditingTestimonial((p: any) => ({ ...p, quote: e.target.value }))}
                    />
                    <input
                      required
                      value={editingTestimonial.name}
                      onChange={(e) => setEditingTestimonial((p: any) => ({ ...p, name: e.target.value }))}
                    />
                    <input
                      placeholder="Class & Year"
                      value={editingTestimonial.class_year}
                      onChange={(e) => setEditingTestimonial((p: any) => ({ ...p, class_year: e.target.value }))}
                    />
                    <select
                      value={editingTestimonial.role}
                      onChange={(e) => setEditingTestimonial((p: any) => ({ ...p, role: e.target.value }))}
                    >
                      <option value="Student">Student</option>
                      <option value="Parent">Parent</option>
                    </select>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={editingTestimonial.visible}
                        onChange={(e) => setEditingTestimonial((p: any) => ({ ...p, visible: e.target.checked }))}
                      />
                      Visible
                    </label>
                    <button type="submit" className="btn-primary">
                      Save Testimonial Changes
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ================= GALLERY ================= */}
        {tab === "gallery" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Add Classroom Gallery Photo (Locked 16:9 Cropper)</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await adminFetch("/api/admin/gallery", "POST", newGallery);
                  setNewGallery({ image_url: "", caption: "", visible: true });
                  setToast("Gallery photo saved!");
                  loadAllAdminData();
                }}
                style={{ display: "grid", gap: "0.75rem" }}
              >
                <input
                  placeholder="Caption (max 120 chars)"
                  maxLength={120}
                  value={newGallery.caption}
                  onChange={(e) => setNewGallery((p) => ({ ...p, caption: e.target.value }))}
                />
                {newGallery.image_url ? (
                  <ImageAttachmentPreview
                    url={newGallery.image_url}
                    kind="16:9 Gallery"
                    aspectRatio="16/9"
                    onChange={() =>
                      setCropperTarget({
                        kind: "gallery",
                        onDone: (url) => setNewGallery((p) => ({ ...p, image_url: url })),
                      })
                    }
                    onRemove={() => setNewGallery((p) => ({ ...p, image_url: "" }))}
                  />
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: "fit-content" }}
                    onClick={() =>
                      setCropperTarget({
                        kind: "gallery",
                        onDone: (url) => setNewGallery((p) => ({ ...p, image_url: url })),
                      })
                    }
                  >
                    📷 Upload & Crop 16:9 Photo *
                  </button>
                )}
                <button type="submit" className="btn-primary">
                  Save Gallery Photo
                </button>
              </form>
            </div>

            {gallery.map((g, idx) => (
              <div key={g.id} className="bento-card" style={{ display: "grid", gap: "0.65rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <img src={g.image_url} alt={g.caption} width={88} height={50} style={{ borderRadius: "0.4rem", objectFit: "cover" }} />
                    <div>
                      <strong>{g.caption || "Untitled Photo"}</strong>{" "}
                      {!g.visible && <span style={{ color: "#fbbf24" }}>(Hidden)</span>}
                      {g.is_sample && <span style={{ fontSize: "0.75rem", color: "#fbbf24", marginLeft: "0.4rem" }}>[Sample]</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={() => setEditingGallery(editingGallery?.id === g.id ? null : { ...g })}
                    >
                      {editingGallery?.id === g.id ? "Close Edit" : "Edit"}
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", fontSize: "0.78rem" }}
                      disabled={idx === 0}
                      onClick={() => reorderItems("/api/admin/gallery/reorder", gallery, idx, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", fontSize: "0.78rem" }}
                      disabled={idx === gallery.length - 1}
                      onClick={() => reorderItems("/api/admin/gallery/reorder", gallery, idx, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex", color: "#f87171", fontSize: "0.8rem" }}
                      onClick={async () => {
                        await adminFetch(`/api/admin/gallery/${g.id}`, "DELETE");
                        loadAllAdminData();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingGallery?.id === g.id && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await adminFetch(`/api/admin/gallery/${g.id}`, "PUT", editingGallery);
                      setToast("Gallery item updated!");
                      setEditingGallery(null);
                      loadAllAdminData();
                    }}
                    style={{ display: "grid", gap: "0.65rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border-color)" }}
                  >
                    <input
                      placeholder="Caption (max 120 chars)"
                      maxLength={120}
                      value={editingGallery.caption}
                      onChange={(e) => setEditingGallery((p: any) => ({ ...p, caption: e.target.value }))}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={editingGallery.visible}
                        onChange={(e) => setEditingGallery((p: any) => ({ ...p, visible: e.target.checked }))}
                      />
                      Visible
                    </label>
                    <button type="submit" className="btn-primary">
                      Save Gallery Changes
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ================= LEADS INBOX ================= */}
        {tab === "leads" && (
          <div className="bento-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={{ margin: 0 }}>Student Leads Inbox ({filteredLeads.length})</h2>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <select value={leadFilterStatus} onChange={(e) => setLeadFilterStatus(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Enrolled">Enrolled</option>
                </select>
                <select value={leadFilterBranch} onChange={(e) => setLeadFilterBranch(e.target.value)}>
                  <option value="All">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <a href="/api/admin/leads/export.csv" className="btn-primary">
                  ⬇ Export CSV (UTF-8)
                </a>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "0.5rem" }}>Time (IST)</th>
                    <th style={{ padding: "0.5rem" }}>Student</th>
                    <th style={{ padding: "0.5rem" }}>Mobile</th>
                    <th style={{ padding: "0.5rem" }}>Class / Stream</th>
                    <th style={{ padding: "0.5rem" }}>Branch</th>
                    <th style={{ padding: "0.5rem" }}>Status</th>
                    <th style={{ padding: "0.5rem" }}>Counsellor Note</th>
                    <th style={{ padding: "0.5rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((l) => (
                    <tr key={l.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.5rem" }}>{l.created_at}</td>
                      <td style={{ padding: "0.5rem", fontWeight: 700 }}>{l.student_name}</td>
                      <td style={{ padding: "0.5rem" }}>{l.mobile}</td>
                      <td style={{ padding: "0.5rem" }}>
                        Class {l.class_name} · {l.stream}
                      </td>
                      <td style={{ padding: "0.5rem" }}>{l.branch_name}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <select
                          value={l.status}
                          onChange={async (e) => {
                            await adminFetch(`/api/admin/leads/${l.id}`, "PATCH", {
                              status: e.target.value,
                              note: leadNotes[l.id] ?? l.note,
                            });
                            loadAllAdminData();
                          }}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Enrolled">Enrolled</option>
                        </select>
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <input
                            placeholder="Short note..."
                            value={leadNotes[l.id] ?? ""}
                            onChange={(e) => setLeadNotes((p) => ({ ...p, [l.id]: e.target.value }))}
                            style={{ width: "130px" }}
                          />
                          <button
                            type="button"
                            className="mobile-menu-btn"
                            style={{ display: "inline-flex", fontSize: "0.75rem" }}
                            onClick={async () => {
                              await adminFetch(`/api/admin/leads/${l.id}`, "PATCH", {
                                status: l.status,
                                note: leadNotes[l.id] ?? "",
                              });
                              setToast("Lead note saved!");
                              loadAllAdminData();
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "0.5rem", display: "flex", gap: "0.4rem" }}>
                        <a
                          href={l.whatsapp_url}
                          target="_blank"
                          rel="noopener"
                          className="btn-secondary"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.78rem" }}
                        >
                          WhatsApp
                        </a>
                        <button
                          type="button"
                          className="mobile-menu-btn"
                          style={{ display: "inline-flex", color: "#f87171", fontSize: "0.78rem" }}
                          onClick={async () => {
                            await adminFetch(`/api/admin/leads/${l.id}`, "DELETE");
                            loadAllAdminData();
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= GLOBAL CONTACTS & SOCIALS ================= */}
        {tab === "settings" && settings && (
          <div className="bento-card" style={{ display: "grid", gap: "0.75rem" }}>
            <h2 style={{ marginTop: 0 }}>Global Contact Numbers & Social Links</h2>
            <label>
              Brand Name
              <input
                placeholder="Shikshanama (शिक्षाNama)"
                value={settings.brand_name}
                onChange={(e) => setSettings((p: any) => ({ ...p, brand_name: e.target.value }))}
              />
            </label>
            <label>
              Main Institute Phone (+91...)
              <input
                placeholder="Main Phone"
                value={settings.global_phone}
                onChange={(e) => setSettings((p: any) => ({ ...p, global_phone: e.target.value }))}
              />
            </label>
            <label>
              Main Institute WhatsApp (+91...)
              <input
                placeholder="Main WhatsApp"
                value={settings.global_whatsapp}
                onChange={(e) => setSettings((p: any) => ({ ...p, global_whatsapp: e.target.value }))}
              />
            </label>
            <label>
              Instagram Handle (without @)
              <input
                placeholder="shikshanamaofficial"
                value={settings.instagram_handle}
                onChange={(e) => setSettings((p: any) => ({ ...p, instagram_handle: e.target.value }))}
              />
            </label>
            <label>
              YouTube Channel URL (optional)
              <input
                placeholder="https://youtube.com/..."
                value={settings.youtube_url}
                onChange={(e) => setSettings((p: any) => ({ ...p, youtube_url: e.target.value }))}
              />
            </label>
            <label>
              Facebook Page URL (optional)
              <input
                placeholder="https://facebook.com/..."
                value={settings.facebook_url}
                onChange={(e) => setSettings((p: any) => ({ ...p, facebook_url: e.target.value }))}
              />
            </label>
            <label>
              Default WhatsApp Inquiry Message
              <textarea
                placeholder="WhatsApp Inquiry Template"
                value={settings.whatsapp_template}
                onChange={(e) => setSettings((p: any) => ({ ...p, whatsapp_template: e.target.value }))}
              />
            </label>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                try {
                  await adminFetch("/api/admin/settings", "PUT", settings);
                  setToast("Global Contacts & Social Settings saved!");
                  loadAllAdminData();
                } catch (err: any) {
                  setToast(err.message);
                }
              }}
            >
              Save Settings
            </button>
          </div>
        )}

        {/* ================= STAFF ACCOUNTS ================= */}
        {tab === "staff" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Staff Accounts</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await adminFetch("/api/admin/staff", "POST", newStaff);
                  setNewStaff({ email: "", password: "" });
                  setToast("Staff account created!");
                  loadAllAdminData();
                }}
                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
              >
                <input
                  type="email"
                  required
                  placeholder="Staff Email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff((p) => ({ ...p, email: e.target.value }))}
                />
                <input
                  type="password"
                  required
                  placeholder="Password (min 6 chars)"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff((p) => ({ ...p, password: e.target.value }))}
                />
                <button type="submit" className="btn-primary">
                  Add Staff
                </button>
              </form>
            </div>
            {staff.map((st) => (
              <div key={st.id} className="bento-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{st.email}</strong> ({st.active ? "Active" : "Disabled"})
                </div>
                <button
                  type="button"
                  className="mobile-menu-btn"
                  style={{ display: "inline-flex" }}
                  onClick={async () => {
                    await adminFetch(`/api/admin/staff/${st.id}`, "PATCH", { active: !st.active });
                    loadAllAdminData();
                  }}
                >
                  {st.active ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApp;
