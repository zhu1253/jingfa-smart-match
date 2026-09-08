import { lazy, Suspense, useState, type ReactNode } from "react";
import { Banknote, BookOpen, Bot, Building2, ChevronDown, CircleHelp, Handshake, LayoutDashboard, LockKeyhole, Menu, PackageSearch, PanelLeftClose, Search, Settings, Users } from "lucide-react";
import type { AgentContext } from "../agent";
import { Logo } from "./ui";

const AgentDock = lazy(() => import("./AgentDock").then((module) => ({ default: module.AgentDock })));

export type View = "dashboard" | "match" | "clients" | "products" | "partners" | "library" | "settings" | "company" | "help";

const items = [
  { id: "dashboard" as const, label: "工作台", icon: LayoutDashboard },
  { id: "match" as const, label: "智能匹配", icon: PackageSearch },
  { id: "clients" as const, label: "客户管理", icon: Users },
  { id: "products" as const, label: "产品中心", icon: Banknote },
  { id: "partners" as const, label: "生态伙伴", icon: Handshake },
  { id: "library" as const, label: "资料库", icon: BookOpen },
  { id: "company" as const, label: "公司介绍", icon: Building2 },
  { id: "settings" as const, label: "系统设置", icon: Settings },
];

export function AppShell({ view, onNavigate, libraryUnlocked, agentContext, children }: { view: View; onNavigate: (view: View) => void; libraryUnlocked: boolean; agentContext: AgentContext; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentLoaded, setAgentLoaded] = useState(false);
  const openAgent = () => { setAgentLoaded(true); setAgentOpen(true); setMobileOpen(false); };
  const select = (next: View) => { onNavigate(next); setMobileOpen(false); };
  const activeLabel = view === "help" ? "帮助中心" : items.find((item) => item.id === view)?.label ?? "工作台";
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <Logo />
      <nav aria-label="主导航">{items.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => select(item.id)} aria-current={view === item.id ? "page" : undefined} title={item.label}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === "library" && !libraryUnlocked ? <LockKeyhole className="nav-lock" size={13} /> : null}</button>; })}</nav>
      <button className="sidebar-agent" onClick={openAgent} aria-expanded={agentOpen} aria-controls="agent-window"><Bot size={18} /><div><strong>智能体顾问</strong><small>已接入 · 点击咨询</small></div></button>
      <button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "展开导航" : "收起导航"}><PanelLeftClose size={17} /><span>收起菜单</span></button>
    </aside>
    {mobileOpen ? <button className="mobile-backdrop" aria-label="关闭导航" onClick={() => setMobileOpen(false)} /> : null}
    <section className="main-column">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="打开导航" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div className="topbar-title"><span>京发智配</span><i>/</i><strong>{activeLabel}</strong></div><label className="global-search"><Search size={16} /><input aria-label="搜索产品、客户或伙伴" placeholder="搜索产品、客户或伙伴" onFocus={() => select("products")} readOnly /></label><button className={`help-button ${view === "help" ? "active" : ""}`} onClick={() => select("help")} aria-current={view === "help" ? "page" : undefined}><CircleHelp size={16} /><span>帮助中心</span></button><div className="user-menu"><span className="avatar">张</span><span><strong>张顾问</strong><small>融资顾问</small></span><ChevronDown size={14} /></div></header>
      <main id="main-content">{children}</main>
    </section>
    <div className={`agent-dock ${agentOpen ? "open" : ""}`}>{agentLoaded
      ? <Suspense fallback={<button className="agent-launcher" disabled><Bot size={19} /><span>正在打开…</span></button>}><AgentDock open={agentOpen} onOpenChange={setAgentOpen} context={agentContext} /></Suspense>
      : <button className="agent-launcher" onClick={openAgent} aria-expanded="false" aria-controls="agent-window"><Bot size={19} /><span>智能体顾问</span><i /></button>}
    </div>
  </div>;
}
