"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Lightbulb,
  History,
  FileDown,
  Upload,
  Cpu,
  FileCheck,
  Download,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Target,
  Lock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", display: "flex", flexDirection: "column" }}>
      {/* 1. Header / Navbar */}
      <header
        style={{
          borderBottom: "1px solid #f1f5f9",
          padding: "18px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(8px)",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #e11d48, #be123c)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "800",
              fontSize: "16px",
            }}
          >
            BQ
          </div>
          <div>
            <span style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.3px" }}>
              BQ PRINTERS
            </span>
            <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "500" }}>
              Print Smarter. Grow Faster.
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: "32px", fontSize: "14px", fontWeight: "600", color: "#475569" }}>
          <Link href="#features" style={{ color: "#e11d48" }}>
            Home
          </Link>
          <Link href="#features" style={{ transition: "color 0.2s" }}>
            Features
          </Link>
          <Link href="#how-it-works" style={{ transition: "color 0.2s" }}>
            How It Works
          </Link>
          <Link href="/reports" style={{ transition: "color 0.2s" }}>
            Reports
          </Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/dashboard" className="btn-primary" style={{ padding: "8px 20px", fontSize: "13px" }}>
            <span>Launch Dashboard</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section style={{ padding: "64px 48px 48px", textAlign: "left", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "40px", alignItems: "center" }}>
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "9999px",
                background: "#fff1f2",
                color: "#e11d48",
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              PRINTING SHOP DEMAND ANALYZER
            </div>

            <h1
              style={{
                fontSize: "44px",
                lineHeight: "1.15",
                fontWeight: "800",
                color: "#0f172a",
                letterSpacing: "-1px",
                marginBottom: "20px",
              }}
            >
              Turn Your Printing Shop Data into{" "}
              <span style={{ color: "#e11d48" }}>Smarter Decisions.</span>
            </h1>

            <p style={{ fontSize: "16px", color: "#64748b", lineHeight: "1.6", marginBottom: "28px" }}>
              BQ PRINTERS helps you analyze your 7-day printing shop data, identify demand patterns, find peak hours and get actionable recommendations — all in one easy-to-use platform.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", marginBottom: "20px" }}>
              <Link href="/dashboard" className="btn-primary" style={{ padding: "12px 26px", fontSize: "14px" }}>
                <span>Launch Dashboard</span>
                <ArrowRight size={16} />
              </Link>
              <Link href="/upload" className="btn-secondary" style={{ padding: "12px 22px", fontSize: "14px" }}>
                <span>Upload Dataset</span>
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
              <ShieldCheck size={16} color="#059669" />
              <span>Direct Open Access • Mathematical Demand Analyzer</span>
            </div>
          </div>

          {/* Hero Laptop Visual Representation */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                background: "#0f172a",
                borderRadius: "16px",
                padding: "12px 12px 16px",
                boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
                border: "1px solid #1e293b",
              }}
            >
              {/* Window controls */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "10px", paddingLeft: "6px" }}>
                <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#ef4444" }} />
                <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#f59e0b" }} />
                <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#10b981" }} />
              </div>

              {/* Mockup Screen */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {/* Mini Top Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "9px", color: "#64748b" }}>Total Demand</div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>1,872</div>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "9px", color: "#64748b" }}>Avg Daily</div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>267.43</div>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "9px", color: "#64748b" }}>Peak Slot</div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#e11d48" }}>11AM - 1PM</div>
                  </div>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "9px", color: "#64748b" }}>Top Service</div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>B&W (49%)</div>
                  </div>
                </div>

                {/* Mini Charts Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "8px" }}>
                  <div style={{ background: "#fff", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", height: "90px", display: "flex", alignItems: "flex-end", justifyContent: "space-around" }}>
                    <div style={{ width: "18px", height: "65%", background: "#e11d48", borderRadius: "2px" }} />
                    <div style={{ width: "18px", height: "95%", background: "#e11d48", borderRadius: "2px" }} />
                    <div style={{ width: "18px", height: "55%", background: "#e11d48", borderRadius: "2px" }} />
                    <div style={{ width: "18px", height: "25%", background: "#e11d48", borderRadius: "2px" }} />
                  </div>
                  <div style={{ background: "#fff", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", height: "90px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "60px", height: "60px", borderRadius: "50%", border: "8px solid #e11d48", borderTopColor: "#1e293b", borderRightColor: "#fb7185" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Four Feature Cards Grid */}
      <section id="features" style={{ padding: "48px 48px", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {/* Card 1 */}
          <div className="card" style={{ padding: "24px", textAlign: "left" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "#fff1f2",
                color: "#e11d48",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <BarChart3 size={22} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
              Automated Demand Analysis
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
              Get accurate insights using advanced mathematical models and statistical calculations.
            </p>
          </div>

          {/* Card 2 */}
          <div className="card" style={{ padding: "24px", textAlign: "left" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "#fff1f2",
                color: "#e11d48",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <Lightbulb size={22} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
              Actionable Recommendations
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
              Understand your peak hours, most demanded services and key business opportunities.
            </p>
          </div>

          {/* Card 3 */}
          <div className="card" style={{ padding: "24px", textAlign: "left" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "#fff1f2",
                color: "#e11d48",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <History size={22} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
              Weekly History
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
              Access and compare previous weeks&apos; data, analysis and reports anytime.
            </p>
          </div>

          {/* Card 4 */}
          <div className="card" style={{ padding: "24px", textAlign: "left" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "#fff1f2",
                color: "#e11d48",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <FileDown size={22} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
              Downloadable Reports
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
              Generate professional PDF reports with complete analysis, charts and recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" style={{ padding: "48px 48px 64px", textAlign: "center", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "#e11d48", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>
          HOW IT WORKS
        </div>
        <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px", marginBottom: "40px" }}>
          Get Insights in 4 Simple Steps
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", position: "relative" }}>
          {/* Step 1 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#fff1f2",
                  color: "#e11d48",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Upload size={24} />
              </div>
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  left: -4,
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#e11d48",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                1
              </span>
            </div>
            <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
              Upload Your 7-Day Data
            </h4>
            <p style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
              Upload a CSV file with your last 7 days of printing shop data.
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#fff1f2",
                  color: "#e11d48",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Cpu size={24} />
              </div>
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  left: -4,
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#e11d48",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                2
              </span>
            </div>
            <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
              We Analyze Automatically
            </h4>
            <p style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
              Our system calculates demand matrices, peak hours, service analysis and more.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#fff1f2",
                  color: "#e11d48",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileCheck size={24} />
              </div>
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  left: -4,
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#e11d48",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                3
              </span>
            </div>
            <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
              Get Recommendations
            </h4>
            <p style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
              Receive clear insights and practical suggestions to improve your operations.
            </p>
          </div>

          {/* Step 4 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#fff1f2",
                  color: "#e11d48",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Download size={24} />
              </div>
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  left: -4,
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#e11d48",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                4
              </span>
            </div>
            <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
              Generate Your Report
            </h4>
            <p style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
              Create a complete weekly business report in PDF format and save it for future reference.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Bottom Dark Banner matching Reference Image 2 */}
      <section
        style={{
          background: "#0f172a",
          color: "#ffffff",
          padding: "48px 48px",
          marginTop: "auto",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 2fr",
              gap: "40px",
              alignItems: "center",
              paddingBottom: "36px",
              borderBottom: "1px solid #1e293b",
            }}
          >
            <div>
              <h2 style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px" }}>
                Smarter Data. <br />
                <span style={{ color: "#e11d48" }}>Better Decisions.</span>
              </h2>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "8px" }}>
                Built for printing shop owners who want to work smarter, plan better and grow faster.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
              <div style={{ textAlign: "center" }}>
                <Target size={24} color="#e11d48" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "15px", fontWeight: "800" }}>100%</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Data-Driven Insights</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <Lock size={24} color="#e11d48" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "15px", fontWeight: "800" }}>Secure</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Your Data Stays Private</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <Sparkles size={24} color="#e11d48" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "15px", fontWeight: "800" }}>Easy to Use</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>No Technical Skills Needed</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <TrendingUp size={24} color="#e11d48" style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "15px", fontWeight: "800" }}>Grow Faster</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Make Confident Decisions</div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div
            style={{
              paddingTop: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <strong style={{ color: "#ffffff", fontSize: "14px" }}>BQ PRINTERS</strong>
              <span>Print Smarter. Grow Faster.</span>
            </div>

            <div style={{ display: "flex", gap: "24px" }}>
              <Link href="#features">Home</Link>
              <Link href="#features">Features</Link>
              <Link href="#how-it-works">How It Works</Link>
              <Link href="#">Privacy Policy</Link>
              <Link href="#">Terms of Service</Link>
            </div>

            <div>© 2026 BQ PRINTERS. All rights reserved.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
