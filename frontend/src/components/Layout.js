import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

function Layout({ children, title, subtitle }) {
  // Initialize from localStorage to persist state across page transitions
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const toggleSidebar = (value) => {
    const newState = typeof value === "boolean" ? value : !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", newState);
  };

  return (
    <div className={`App ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar collapsed={isCollapsed} setCollapsed={toggleSidebar} />
      <main className="main-content">
        <TopBar title={title} subtitle={subtitle} />
        <div className="page-body">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
