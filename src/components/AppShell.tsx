import { lazy, Suspense, useState, useEffect, useRef, type ReactNode } from "react";
import { Banknote, BookOpen, Bot, Building2, ChevronDown, CircleHelp, Handshake, LayoutDashboard, LockKeyhole, Menu, PackageSearch, PanelLeftClose, Search, Settings, Users } from "lucide-react";
import type { AgentContext } from "../agent";
import { Logo } from "./ui";
import { useAccount, clearPrivateSession } from "../auth-context";
import { accountRequest } from "../auth-api";

const AgentDock = lazy(() => import("./AgentDock").then((module) => ({ default: module.AgentDock })));

export type View = "dashboard" | "match" | "clients" | "products" | "partners" | "library" | "settings" | "company" | "help" | "account";

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
  const user = useAccount();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node) && menuRef.current) menuRef.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menuRef.current?.open) { menuRef.current.open = false; menuRef.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);
  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError('');
    try { await accountRequest('logout', {}); clearPrivateSession(); window.location.replace('/login'); }
    catch (error) { setLogoutError(error instanceof Error ? error.message : '退出失败，请重试。'); setLoggingOut(false); }
  };
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentLoaded, setAgentLoaded] = useState(false);
  const openAgent = () => { setAgentLoaded(true); setAgentOpen(true); setMobileOpen(false); };
  const select = (next: View) => { onNavigate(next); setMobileOpen(false); };
  const activeLabel = view === "account" ? "我的账号" : view === "help" ? "帮助中心" : items.find((item) => item.id === view)?.label ?? "工作台";
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <Logo />
      <nav aria-label="主导航">{items.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => select(item.id)} aria-current={view === item.id ? "page" : undefined} title={item.label}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === "library" && !libraryUnlocked ? <LockKeyhole className="nav-lock" size={13} /> : null}</button>; })}</nav>
      <button className="sidebar-agent" onClick={openAgent} aria-expanded={agentOpen} aria-controls="agent-window"><Bot size={18} /><div><strong>业务智能体</strong><small>通用问答 · 点击咨询</small></div></button>
      <button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "展开导航" : "收起导航"}><PanelLeftClose size={17} /><span>收起菜单</span></button>
    </aside>
    {mobileOpen ? <button className="mobile-backdrop" aria-label="关闭导航" onClick={() => setMobileOpen(false)} /> : null}
    <section className="main-column">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="打开导航" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div className="topbar-title"><span>京发智配</span><i>/</i><strong>{activeLabel}</strong></div><label className="global-search"><Search size={16} /><input aria-label="搜索产品、客户或伙伴" placeholder="搜索产品、客户或伙伴" onFocus={() => select("products")} readOnly /></label><button className={`help-button ${view === "help" ? "active" : ""}`} onClick={() => select("help")} aria-current={view === "help" ? "page" : undefined}><CircleHelp size={16} /><span>帮助中心</span></button><details className="account-menu" ref={menuRef}><summary className="user-menu" aria-label="账号菜单"><span className="avatar">{user.displayName.slice(0, 1)}</span><span><strong>{user.displayName}</strong><small>{user.role === 'admin' ? '管理员' : '融资顾问'}</small></span><ChevronDown size={14} /></summary><div className="account-dropdown"><p><strong>{user.displayName}</strong><span>{user.username}</span></p><button onClick={() => { if(menuRef.current) menuRef.current.open = false; select('account'); }}>我的账号与密码</button><button onClick={logout} disabled={loggingOut}>{loggingOut ? '正在退出…' : '退出登录'}</button>{logoutError ? <small role="alert">{logoutError}</small> : null}</div></details></header>
      <main id="main-content">{children}</main>
    </section>
    <div className={`agent-dock ${agentOpen ? "open" : ""}`}>{agentLoaded
      ? <Suspense fallback={<button className="agent-launcher" disabled><Bot size={19} /><span>正在打开…</span></button>}><AgentDock open={agentOpen} onOpenChange={setAgentOpen} context={agentContext} /></Suspense>
      : <button className="agent-launcher" onClick={openAgent} aria-expanded="false" aria-controls="agent-window"><Bot size={19} /><span>业务智能体</span><i /></button>}
    </div>
  </div>;
}
