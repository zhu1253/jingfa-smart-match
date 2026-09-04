import { useState, type ReactNode } from "react";
import { Banknote, BookOpen, Bot, Building2, ChevronDown, Handshake, LayoutDashboard, LockKeyhole, Menu, PackageSearch, PanelLeftClose, Search, Send, Settings, Users, X } from "lucide-react";
import { Logo } from "./ui";

export type View = "dashboard" | "match" | "clients" | "products" | "partners" | "library" | "settings" | "company";

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

function AgentDock() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<string[]>([]);
  const send = () => {
    const value = message.trim();
    if (!value) return;
    setDrafts((current) => [...current, value]);
    setMessage("");
  };
  return <div className={`agent-dock ${open ? "open" : ""}`}>
    {open ? <section className="agent-window" aria-label="智能体顾问窗口">
      <header><span className="agent-avatar"><Bot size={18} /></span><div><strong>智能体顾问</strong><small><i />等待接入配置</small></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="关闭智能体窗口"><X size={18} /></button></header>
      <div className="agent-body"><div className="agent-message">您好，我可以协助整理客户资料并解释匹配结果。当前窗口尚未连接外部智能体。</div>{drafts.map((item, index) => <div className="user-message" key={`${item}-${index}`}>{item}</div>)}{drafts.length ? <div className="agent-message">消息已保存在当前页面，接入完成后将返回实际分析结果。</div> : null}</div>
      <footer><textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="输入客户情况或提问…" rows={2} /><button onClick={send} aria-label="发送消息" disabled={!message.trim()}><Send size={17} /></button></footer>
      <p>请勿输入与融资匹配无关的敏感信息</p>
    </section> : <button className="agent-launcher" onClick={() => setOpen(true)}><Bot size={19} /><span>智能体顾问</span><i /></button>}
  </div>;
}

export function AppShell({ view, onNavigate, libraryUnlocked, children }: { view: View; onNavigate: (view: View) => void; libraryUnlocked: boolean; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const select = (next: View) => { onNavigate(next); setMobileOpen(false); };
  const activeLabel = items.find((item) => item.id === view)?.label ?? "工作台";
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <Logo />
      <nav aria-label="主导航">{items.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => select(item.id)} aria-current={view === item.id ? "page" : undefined} title={item.label}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === "library" && !libraryUnlocked ? <LockKeyhole className="nav-lock" size={13} /> : null}</button>; })}</nav>
      <div className="sidebar-agent"><Bot size={18} /><div><strong>智能体顾问</strong><small>接口等待配置</small></div></div>
      <button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "展开导航" : "收起导航"}><PanelLeftClose size={17} /><span>收起菜单</span></button>
    </aside>
    {mobileOpen ? <button className="mobile-backdrop" aria-label="关闭导航" onClick={() => setMobileOpen(false)} /> : null}
    <section className="main-column">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="打开导航" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div className="topbar-title"><span>京发智配</span><i>/</i><strong>{activeLabel}</strong></div><label className="global-search"><Search size={16} /><input aria-label="搜索产品、客户或伙伴" placeholder="搜索产品、客户或伙伴" onFocus={() => select("products")} readOnly /></label><button className="help-button" onClick={() => select("library")}>帮助中心</button><div className="user-menu"><span className="avatar">张</span><span><strong>张顾问</strong><small>融资顾问</small></span><ChevronDown size={14} /></div></header>
      <main id="main-content">{children}</main>
    </section>
    <AgentDock />
  </div>;
}
