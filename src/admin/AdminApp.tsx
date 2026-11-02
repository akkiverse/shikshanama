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
  });

  const [newGallery, setNewGallery] = useState({
    image_url: "",
    caption: "",
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
    if (lRes.ok) setLeads((await lRes.json()).leads || []);
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

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "4rem" }}>
      {cropperTarget && (
        <ImageCropperModal
          kind={cropperTarget.kind}
          csrfToken={csrfToken}
          onUploaded={(url) => {
            cropperTarget.onDone(url);
            setCropperTarget(null);
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
              ["results", "Results & Consents"],
              ["leads", `Leads (${dashboard?.new_leads_count ?? 0} New)`],
              ["batches", "Batches"],
              ["courses", "Courses"],
              ["homepage", "Homepage & Headings"],
              ["founders", "Founders"],
              ["branches", "Branches"],
              ["testimonials", "Testimonials"],
              ["gallery", "Gallery"],
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

            {dashboard.has_sample_content && (
              <div className="bento-card" style={{ borderColor: "rgba(245, 158, 11, 0.5)" }}>
                <h3 style={{ marginTop: 0 }}>Demo Sample Content is Active</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Ready for a real launch? Click below to delete all fictional sample records and their images in one go,
                  leaving real content untouched.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    try {
                      await adminFetch("/api/admin/sample-content/remove", "POST");
                      setToast("Removed all sample content.");
                      loadAllAdminData();
                    } catch (e: any) {
                      setToast(e.message);
                    }
                  }}
                >
                  Remove all sample content
                </button>
              </div>
            )}
          </div>
        )}

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
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    className="mobile-menu-btn"
                    style={{ display: "inline-flex" }}
                    onClick={() =>
                      setCropperTarget({
                        kind: "result",
                        onDone: (url) => setNewResult((p) => ({ ...p, photo_url: url })),
                      })
                    }
                  >
                    {newResult.photo_url ? "✓ 1:1 Photo Cropped" : "Upload & Crop 1:1 Photo *"}
                  </button>
                </div>
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

            <div style={{ display: "grid", gap: "0.75rem" }}>
              {results.map((r) => (
                <div key={r.id} className="bento-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
                    <img src={r.photo_url} alt={r.name} width={56} height={56} style={{ borderRadius: "50%", objectFit: "cover" }} />
                    <div>
                      <strong>{r.name}</strong> · Class {r.class_name} ({r.stream}) · <span style={{ color: "var(--accent-primary)" }}>{r.score_text}</span>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        Consent: <strong>{r.consent_status}</strong> {r.is_live ? "· 🟢 Live on Public Site" : "· 🔒 Hidden until consent"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
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
              ))}
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div className="bento-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={{ margin: 0 }}>Student Leads Inbox ({leads.length})</h2>
              <a href="/api/admin/leads/export.csv" className="btn-primary">
                ⬇ Export CSV (UTF-8)
              </a>
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
                    <th style={{ padding: "0.5rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
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
                            await adminFetch(`/api/admin/leads/${l.id}`, "PATCH", { status: e.target.value, note: l.note });
                            loadAllAdminData();
                          }}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Enrolled">Enrolled</option>
                        </select>
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
                <button
                  type="button"
                  className="mobile-menu-btn"
                  style={{ display: "inline-flex", width: "fit-content" }}
                  onClick={() =>
                    setCropperTarget({
                      kind: "founder",
                      onDone: (url) => setNewFounder((p) => ({ ...p, photo_url: url })),
                    })
                  }
                >
                  {newFounder.photo_url ? "✓ 4:5 Portrait Cropped" : "Upload & Crop 4:5 Portrait *"}
                </button>
                <button type="submit" className="btn-primary">
                  Save Founder
                </button>
              </form>
            </div>
            {founders.map((f) => (
              <div key={f.id} className="bento-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{f.name}</strong> · {f.designation}
                </div>
                <button
                  type="button"
                  className="mobile-menu-btn"
                  style={{ display: "inline-flex", color: "#f87171" }}
                  onClick={async () => {
                    await adminFetch(`/api/admin/founders/${f.id}`, "DELETE");
                    loadAllAdminData();
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "batches" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Add Upcoming Batch</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await adminFetch("/api/admin/batches", "POST", newBatch);
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
              <div key={b.id} className="bento-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>Class {b.class_name} {b.stream}</strong> · {b.branch_name} · {b.start_date_formatted} ({b.status})
                </div>
                <button
                  type="button"
                  className="mobile-menu-btn"
                  style={{ display: "inline-flex", color: "#f87171" }}
                  onClick={async () => {
                    await adminFetch(`/api/admin/batches/${b.id}`, "DELETE");
                    loadAllAdminData();
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "branches" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Add Branch Location</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await adminFetch("/api/admin/branches", "POST", newBranch);
                    setNewBranch({ name: "", address: "", maps_url: "", phone: "", whatsapp: "", is_flagship: false, active: true });
                    loadAllAdminData();
                  } catch (err: any) {
                    setToast(err.message);
                  }
                }}
                style={{ display: "grid", gap: "0.75rem" }}
              >
                <input placeholder="Branch Name *" required value={newBranch.name} onChange={(e) => setNewBranch((p) => ({ ...p, name: e.target.value }))} />
                <input placeholder="Full Address *" required value={newBranch.address} onChange={(e) => setNewBranch((p) => ({ ...p, address: e.target.value }))} />
                <input placeholder="Google Maps URL (https://...)" value={newBranch.maps_url} onChange={(e) => setNewBranch((p) => ({ ...p, maps_url: e.target.value }))} />
                <input placeholder="Phone (+91...)" value={newBranch.phone} onChange={(e) => setNewBranch((p) => ({ ...p, phone: e.target.value }))} />
                <input placeholder="WhatsApp (+91...)" value={newBranch.whatsapp} onChange={(e) => setNewBranch((p) => ({ ...p, whatsapp: e.target.value }))} />
                <label>
                  <input type="checkbox" checked={newBranch.is_flagship} onChange={(e) => setNewBranch((p) => ({ ...p, is_flagship: e.target.checked }))} /> Mark as Flagship
                </label>
                <button type="submit" className="btn-primary">Save Branch</button>
              </form>
            </div>
            {branches.map((b) => (
              <div key={b.id} className="bento-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{b.name}</strong> {b.is_flagship && "⭐ Flagship"}
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{b.address}</div>
                </div>
                <button
                  type="button"
                  className="mobile-menu-btn"
                  style={{ display: "inline-flex", color: "#f87171" }}
                  onClick={async () => {
                    try {
                      await adminFetch(`/api/admin/branches/${b.id}`, "DELETE");
                      loadAllAdminData();
                    } catch (err: any) {
                      setToast(err.message);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "homepage" && settings && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Announcement Ticker & Hero Banner (16:9 Cropper)</h2>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={settings.ticker_enabled}
                    onChange={(e) => setSettings((p: any) => ({ ...p, ticker_enabled: e.target.checked }))}
                  />{" "}
                  Show Top Announcement Ticker
                </label>
                <input
                  placeholder="Ticker Text (max 200 chars)"
                  maxLength={200}
                  value={settings.ticker_text}
                  onChange={(e) => setSettings((p: any) => ({ ...p, ticker_text: e.target.value }))}
                />
                <input
                  placeholder="Optional Ticker Link"
                  value={settings.ticker_link}
                  onChange={(e) => setSettings((p: any) => ({ ...p, ticker_link: e.target.value }))}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="mobile-menu-btn"
                    style={{ display: "inline-flex" }}
                    onClick={() =>
                      setCropperTarget({
                        kind: "banner",
                        onDone: (url) => setSettings((p: any) => ({ ...p, hero_image_url: url })),
                      })
                    }
                  >
                    Upload 16:9 Hero Banner
                  </button>
                  {settings.hero_image_url && (
                    <button
                      type="button"
                      className="mobile-menu-btn"
                      style={{ display: "inline-flex" }}
                      onClick={() => setSettings((p: any) => ({ ...p, hero_image_url: "" }))}
                    >
                      Remove Banner
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    await adminFetch("/api/admin/settings", "PUT", settings);
                    setToast("Homepage & Ticker updated!");
                    loadAllAdminData();
                  }}
                >
                  Save Homepage & Headings
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "courses" && (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {courses.map((c) => (
              <div key={c.id} className="bento-card">
                <strong>{c.stream}</strong>: {c.name} (Classes {c.classes})
              </div>
            ))}
          </div>
        )}

        {tab === "testimonials" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Add Testimonial (Optional 1:1 Photo Cropper)</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await adminFetch("/api/admin/testimonials", "POST", newTestimonial);
                  setNewTestimonial({ quote: "", name: "", role: "Student", class_year: "", photo_url: "" });
                  loadAllAdminData();
                }}
                style={{ display: "grid", gap: "0.75rem" }}
              >
                <textarea placeholder="Quote (max 500 chars) *" maxLength={500} required value={newTestimonial.quote} onChange={(e) => setNewTestimonial((p) => ({ ...p, quote: e.target.value }))} />
                <input placeholder="Name *" required value={newTestimonial.name} onChange={(e) => setNewTestimonial((p) => ({ ...p, name: e.target.value }))} />
                <select value={newTestimonial.role} onChange={(e) => setNewTestimonial((p) => ({ ...p, role: e.target.value }))}>
                  <option value="Student">Student</option>
                  <option value="Parent">Parent</option>
                </select>
                <button
                  type="button"
                  className="mobile-menu-btn"
                  style={{ display: "inline-flex", width: "fit-content" }}
                  onClick={() =>
                    setCropperTarget({
                      kind: "testimonial",
                      onDone: (url) => setNewTestimonial((p) => ({ ...p, photo_url: url })),
                    })
                  }
                >
                  {newTestimonial.photo_url ? "✓ 1:1 Photo Cropped" : "Optional 1:1 Photo"}
                </button>
                <button type="submit" className="btn-primary">Save Testimonial</button>
              </form>
            </div>
          </div>
        )}

        {tab === "gallery" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Add Classroom Gallery Photo (Locked 16:9 Cropper)</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await adminFetch("/api/admin/gallery", "POST", newGallery);
                  setNewGallery({ image_url: "", caption: "" });
                  loadAllAdminData();
                }}
                style={{ display: "grid", gap: "0.75rem" }}
              >
                <input placeholder="Caption (max 120 chars)" maxLength={120} value={newGallery.caption} onChange={(e) => setNewGallery((p) => ({ ...p, caption: e.target.value }))} />
                <button
                  type="button"
                  className="mobile-menu-btn"
                  style={{ display: "inline-flex", width: "fit-content" }}
                  onClick={() =>
                    setCropperTarget({
                      kind: "gallery",
                      onDone: (url) => setNewGallery((p) => ({ ...p, image_url: url })),
                    })
                  }
                >
                  {newGallery.image_url ? "✓ 16:9 Image Cropped" : "Upload & Crop 16:9 Photo *"}
                </button>
                <button type="submit" className="btn-primary">Save Gallery Photo</button>
              </form>
            </div>
          </div>
        )}

        {tab === "settings" && settings && (
          <div className="bento-card" style={{ display: "grid", gap: "0.75rem" }}>
            <h2 style={{ marginTop: 0 }}>Global Contact Numbers & Social Links</h2>
            <input placeholder="Main Phone" value={settings.global_phone} onChange={(e) => setSettings((p: any) => ({ ...p, global_phone: e.target.value }))} />
            <input placeholder="Main WhatsApp" value={settings.global_whatsapp} onChange={(e) => setSettings((p: any) => ({ ...p, global_whatsapp: e.target.value }))} />
            <input placeholder="Instagram Handle" value={settings.instagram_handle} onChange={(e) => setSettings((p: any) => ({ ...p, instagram_handle: e.target.value }))} />
            <textarea placeholder="WhatsApp Inquiry Template" value={settings.whatsapp_template} onChange={(e) => setSettings((p: any) => ({ ...p, whatsapp_template: e.target.value }))} />
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                await adminFetch("/api/admin/settings", "PUT", settings);
                setToast("Settings saved!");
                loadAllAdminData();
              }}
            >
              Save Settings
            </button>
          </div>
        )}

        {tab === "staff" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="bento-card">
              <h2 style={{ marginTop: 0 }}>Staff Accounts</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await adminFetch("/api/admin/staff", "POST", newStaff);
                  setNewStaff({ email: "", password: "" });
                  loadAllAdminData();
                }}
                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
              >
                <input type="email" required placeholder="Staff Email" value={newStaff.email} onChange={(e) => setNewStaff((p) => ({ ...p, email: e.target.value }))} />
                <input type="password" required placeholder="Password (min 6 chars)" value={newStaff.password} onChange={(e) => setNewStaff((p) => ({ ...p, password: e.target.value }))} />
                <button type="submit" className="btn-primary">Add Staff</button>
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
