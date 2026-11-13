"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  BarChart3,
  Lightbulb,
  Settings,
  Printer,
} from "lucide-react";

interface SidebarProps {
  onOpenUpload?: () => void;
}

export default function Sidebar(_props: SidebarProps = {}) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Upload Data", href: "/upload", icon: UploadCloud },
    { label: "Reports", href: "/reports", icon: FileText },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
    { label: "Recommendations", href: "/recommendations", icon: Lightbulb },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div>
        <Link href="/" className="sidebar-logo">
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#e11d48",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            <Printer size={20} />
          </div>
          <div className="sidebar-logo-text">
            <h2>BQ PRINTERS</h2>
            <p>PRINT SMARTER. GROW FASTER.</p>
          </div>
        </Link>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-icon">
          <Printer size={18} />
        </div>
        <div className="sidebar-footer-text">
          <h4>BQ PRINTERS</h4>
          <p>Smarter Insights. Higher Productivity.</p>
        </div>
      </div>
    </aside>
  );
}
