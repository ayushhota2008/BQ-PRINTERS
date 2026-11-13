"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, Sun, Moon } from "lucide-react";

interface TopHeaderProps {
  lastUpdated?: string;
  onOpenUpload?: () => void;
  shopkeeperName?: string;
}

export default function TopHeader({
  lastUpdated = "Today",
  shopkeeperName = "BQ Shop Owner",
}: TopHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync theme on client mount from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("bq_theme");
      if (savedTheme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.classList.add("dark");
        queueMicrotask(() => setTheme("dark"));
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.documentElement.classList.remove("dark");
        queueMicrotask(() => setTheme("light"));
      }
    } catch {}
  }, []);

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    try {
      localStorage.setItem("bq_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <header
      className="top-header"
      style={{
        padding: "20px 32px",
        borderBottom: "1px solid var(--border-card, #e2e8f0)",
        background: "var(--bg-card, #ffffff)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative",
      }}
    >
      <div className="header-title">
        <h1 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-main, #0f172a)", letterSpacing: "-0.4px" }}>
          Demand Analyzer Dashboard
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted, #64748b)", marginTop: "2px" }}>
          Turn your printing data into clear insights and better decisions.
        </p>
      </div>

      <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--border-light, #f1f5f9)",
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "12px",
            color: "var(--text-muted, #475569)",
            fontWeight: "500",
          }}
        >
          <Calendar size={14} color="#e11d48" />
          <span>
            Last Updated: <strong style={{ color: "var(--text-main, #0f172a)" }}>{lastUpdated}</strong>
          </span>
        </div>

        {/* Profile / Preferences Container */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            type="button"
            id="profile-dropdown-button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "#be123c",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "15px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(190, 18, 60, 0.2)",
              outline: "none",
              transition: "transform 0.15s ease",
              overflow: "hidden",
              padding: 0,
            }}
            title="Shop Settings & Theme"
          >
            BQ
          </button>

          {/* Preferences Dropdown Menu */}
          {isDropdownOpen && (
            <div
              id="profile-dropdown-menu"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "250px",
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-card, #e2e8f0)",
                borderRadius: "12px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
                zIndex: 1000,
                overflow: "hidden",
                textAlign: "left",
                animation: "fadeIn 0.15s ease-out",
              }}
            >
              {/* Shop Info Header */}
              <div style={{ padding: "16px 18px", display: "flex", gap: "12px", alignItems: "center" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "var(--brand-primary-light, #fff1f2)",
                    color: "var(--brand-primary, #e11d48)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  BQ
                </div>
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main, #0f172a)", lineHeight: 1.25 }}>
                    {shopkeeperName}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--brand-primary, #e11d48)", fontWeight: "600", marginTop: "3px", lineHeight: 1.25 }}>
                    Shop Manager
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--border-light, #f1f5f9)" }} />

              {/* Theme Selector Section */}
              <div style={{ padding: "14px 18px 16px 18px" }}>
                <div style={{ fontSize: "13px", color: "var(--text-muted, #64748b)", marginBottom: "10px", fontWeight: "500" }}>
                  Display Theme
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--border-card, #cbd5e1)",
                    borderRadius: "12px",
                    padding: "4px",
                    background: theme === "dark" ? "#1e293b" : "#f1f5f9",
                    gap: "6px",
                  }}
                >
                  <button
                    type="button"
                    id="theme-light-btn"
                    onClick={() => handleThemeChange("light")}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "34px",
                      border: "none",
                      borderRadius: "8px",
                      background: theme === "light" ? "#ffffff" : "transparent",
                      color: theme === "light" ? "#e11d48" : "#94a3b8",
                      boxShadow: theme === "light" ? "0 1px 3px rgba(0, 0, 0, 0.12)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    title="Light Theme"
                  >
                    <Sun size={17} strokeWidth={theme === "light" ? 2.2 : 1.75} />
                  </button>
                  <button
                    type="button"
                    id="theme-dark-btn"
                    onClick={() => handleThemeChange("dark")}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "34px",
                      border: "none",
                      borderRadius: "8px",
                      background: theme === "dark" ? "#0f172a" : "transparent",
                      color: theme === "dark" ? "#fb7185" : "#64748b",
                      boxShadow: theme === "dark" ? "0 1px 4px rgba(0, 0, 0, 0.3)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    title="Dark Theme"
                  >
                    <Moon size={17} strokeWidth={theme === "dark" ? 2.2 : 1.75} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
