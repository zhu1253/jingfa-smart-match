import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpen,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Copy,
  Database,
  Download,
  FileText,
  Handshake,
  Home,
  LayoutDashboard,
  Menu,
  PackageSearch,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Send,
  PlugZap,
} from "lucide-react";
import { defaultClient, partners, products, recentClients } from "./data";
import { getMissingFields, runMatching } from "./matcher";
import type { ClientProfile, MatchResult, ProductStatus } from "./types";

type View = "dashboard" | "match" | "clients" | "products" | "partners" | "library" | "settings" | "company";

const navItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "dashboard", label: "工作台", icon: LayoutDashboard },
  { id: "match", label: "智能匹配", icon: PackageSearch },
  { id: "clients", label: "客户管理", icon: Users },
  { id: "products", label: "产品中心", icon: Banknote },
  { id: "partners", label: "生态伙伴", icon: Handshake },
  { id: "library", label: "资料库", icon: BookOpen },
  { id: "company", label: "公司介绍", icon: Building2 },
  { id: "settings", label: "系统设置", icon: Settings },
];

function Logo() {
  return (
    <div className="logo">
      <span className="logo-mark"><span /><span /></span>
      <span>京发智配</span>
    </div>
  );
}

function AppShell({ view, onView, children }: { view: View; onView: (view: View) => void; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const selectView = (nextView: View) => { onView(nextView); setMobileOpen(false); };
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <Logo />
        <nav aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)} title={item.label}>
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button className="collapse-button" onClick={() => setCollapsed((value) => !value)}>
          <PanelLeftClose size={18} />
          <span>收起菜单</span>
        </button>
      </aside>
      {mobileOpen ? <button className="mobile-backdrop" aria-label="关闭导航" onClick={() => setMobileOpen(false)} /> : null}
      <section className="main-column">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="打开导航" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="topbar-spacer" />
          <button className="help-link" onClick={() => selectView("library")}>帮助中心</button>
          <div className="user-menu">
            <span className="avatar">张</span>
            <span><strong>张顾问</strong><small>渠道合作部</small></span>
            <ChevronDown size={15} />
          </div>
        </header>
        <main>{children}</main>
      </section>
      <AgentDock />
    </div>
  );
}

function AgentDock() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<string[]>([]);
  const send = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setDrafts((items) => [...items, trimmed]);
    setMessage("");
  };
  return (
    <div className={`agent-dock ${open ? "open" : ""}`}>
      {open ? (
        <section className="agent-window" aria-label="智能体顾问窗口">
          <header>
            <span className="agent-avatar"><Bot size={19} /></span>
            <div><strong>智能体顾问</strong><small><i /> 等待接入配置</small></div>
            <button className="icon-button" onClick={() => setOpen(false)} aria-label="关闭智能体窗口"><X size={18} /></button>
          </header>
          <div className="agent-body">
            <div className="agent-message">
              <p>窗口已就绪。接入后可协助提取客户信息、补问缺失项、运行产品匹配并生成转发方案。</p>
            </div>
            <div className="agent-config-card">
              <div><PlugZap size={16} /><strong>待提供的接入信息</strong></div>
              <p>智能体名称、调用地址、认证方式、请求与响应字段。</p>
            </div>
            {drafts.map((item, index) => <div className="user-message" key={`${item}-${index}`}>{item}</div>)}
            {drafts.length > 0 ? <div className="agent-message"><p>消息已保存在当前页面。智能体接入完成后，这里将返回实际分析结果。</p></div> : null}
          </div>
          <footer>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="输入客户情况或向智能体提问…" rows={2} />
            <button onClick={send} aria-label="发送消息"><Send size={17} /></button>
          </footer>
          <p className="agent-boundary">请勿输入与融资匹配无关的敏感信息</p>
        </section>
      ) : (
        <button className="agent-launcher" onClick={() => setOpen(true)}><Bot size={20} /><span>智能体顾问</span><i /></button>
      )}
    </div>
  );
}

function Stat({ icon: Icon, value, label, note }: { icon: typeof Home; value: string; label: string; note: string }) {
  return (
    <div className="stat">
      <span className="stat-icon"><Icon size={22} /></span>
      <span><strong>{value}</strong><b>{label}</b><small>{note}</small></span>
    </div>
  );
}

function StatusTag({ status }: { status: ProductStatus | "待补全" }) {
  return <span className={`status-tag ${status === "可做" ? "success" : status === "不建议" ? "danger" : "warning"}`}>{status}</span>;
}

function Dashboard({ onStartMatch, onView }: { onStartMatch: () => void; onView: (view: View) => void }) {
  const demoMatches = useMemo(() => runMatching(defaultClient).slice(0, 5), []);
  return (
    <div className="page dashboard-page">
      <section className="dashboard-heading">
        <div>
          <h1>为每一笔跨境融资，找到更合适的资金</h1>
          <p>从客户信息提取、准入比对到方案输出，一套流程完成。</p>
        </div>
        <div className="heading-actions">
          <button className="primary-button" onClick={onStartMatch}>开始客户匹配 <ArrowRight size={16} /></button>
          <label className="search-box"><Search size={17} /><input placeholder="搜索产品、资金方或客户" readOnly onFocus={() => onView("products")} /></label>
        </div>
      </section>

      <section className="stat-band">
        <Stat icon={Building2} value="12" label="资金方" note="银行、保理与持牌机构" />
        <Stat icon={Banknote} value={String(products.length)} label="已结构化产品" note="首批可运行准入比对" />
        <Stat icon={Handshake} value="160" label="生态伙伴" note="支付、ERP、物流与园区" />
        <Stat icon={ClipboardCheck} value="3" label="待补全客户" note="集中补问后即可匹配" />
      </section>

      <section className="section-panel workspace-panel">
        <div className="section-title"><div><h2>客户匹配工作台</h2><p>优先处理资料完整度较高的客户</p></div><button className="text-button" onClick={() => onView("clients")}>全部客户 <ArrowRight size={14} /></button></div>
        <div className="workspace-grid">
          <div className="recent-list">
            {recentClients.map((client, index) => (
              <button key={client.name} className={index === 0 ? "selected" : ""} onClick={index === 0 ? onStartMatch : undefined}>
                <span className="company-icon"><Building2 size={17} /></span>
                <span className="recent-copy"><strong>{client.name}</strong><small>{client.industry}｜{client.city}</small></span>
                <span className="completion"><strong>{client.completeness}%</strong><small>资料完整度</small></span>
              </button>
            ))}
          </div>
          <div className="readiness">
            <div className="readiness-head">
              <div><span>当前客户</span><strong>深圳海拓科技</strong><small>跨境电商 · 广东深圳</small></div>
              <div className="readiness-meter"><div><span>资料完整度</span><strong>100%</strong></div><i><b /></i></div>
            </div>
            <div className="readiness-steps">
              {["基础信息", "经营信息", "征信信息", "资产情况", "融资需求"].map((item) => <span key={item}><CheckCircle2 size={18} /><b>{item}</b><small>已完成</small></span>)}
            </div>
            <div className="ready-action">
              <div><strong>资料已齐全</strong><p>可直接比对全部产品准入条件。</p></div>
              <button className="secondary-button" onClick={onStartMatch}>查看匹配结果</button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-panel product-preview">
        <div className="section-title"><div><h2>推荐融资产品</h2><p>按示例客户当前匹配度排序</p></div><button className="text-button" onClick={() => onView("products")}>全部产品 <ArrowRight size={14} /></button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>产品 / 资金方</th><th>目标客群</th><th>额度</th><th>年化利率</th><th>期限</th><th>当前匹配</th></tr></thead>
            <tbody>{demoMatches.map((result) => <tr key={result.product.id} onClick={onStartMatch}><td><strong>{result.product.name}</strong><small>{result.product.funder}</small></td><td>{result.product.audience}</td><td>{result.estimate}</td><td>{result.product.rateLabel}</td><td>{result.product.termLabel}</td><td><StatusTag status={result.status} /><span className="score">{result.score}%</span></td></tr>)}</tbody>
          </table>
        </div>
        <p className="disclaimer"><CircleAlert size={14} /> 匹配结果仅供业务初筛，以资金方最终审批为准。</p>
      </section>

      <section className="partner-strip">
        <div className="section-title"><div><h2>生态伙伴</h2><p>共同构建跨境融资数据与场景网络</p></div><button className="text-button" onClick={() => onView("partners")}>全部伙伴 <ArrowRight size={14} /></button></div>
        <div className="partner-row">{partners.slice(0, 4).map((partner) => <button key={partner.name} onClick={() => onView("partners")}><span>{partner.name.slice(0, 2)}</span><div><strong>{partner.name}</strong><small>{partner.type}</small></div></button>)}</div>
      </section>
    </div>
  );
}

const numberFields: Array<{ key: keyof ClientProfile; label: string; suffix: string; min?: number; step?: number }> = [
  { key: "operatingYears", label: "经营年限", suffix: "年", min: 0, step: 0.5 },
  { key: "monthlyFlow", label: "月均开票额 / 流水", suffix: "万元", min: 0 },
  { key: "annualSales", label: "近12个月销售额", suffix: "万元", min: 0 },
  { key: "annualRepayment", label: "近12个月回款额", suffix: "万元", min: 0 },
  { key: "overdueSixMonths", label: "近6个月逾期次数", suffix: "次", min: 0 },
  { key: "inquiryTwoMonths", label: "近2个月征信查询", suffix: "次", min: 0 },
  { key: "debtRatio", label: "资产负债率", suffix: "%", min: 0 },
  { key: "requestedAmount", label: "融资需求金额", suffix: "万元", min: 0 },
  { key: "requestedTerm", label: "融资期限", suffix: "个月", min: 1 },
  { key: "amazonAhr", label: "亚马逊 AHR", suffix: "分", min: 0 },
  { key: "refundRate", label: "近3个月退款率", suffix: "%", min: 0 },
  { key: "usSalesShare", label: "美国站销售占比", suffix: "%", min: 0 },
  { key: "fbaTurns", label: "FBA 库存周转", suffix: "次", min: 0 },
];

function IntakeForm({ client, setClient, onRun }: { client: ClientProfile; setClient: (client: ClientProfile) => void; onRun: () => void }) {
  const missing = getMissingFields(client);
  const updateText = (key: keyof ClientProfile, value: string) => setClient({ ...client, [key]: value });
  const updateNumber = (key: keyof ClientProfile, value: string) => setClient({ ...client, [key]: value === "" ? Number.NaN : Number(value) });
  const toggles: Array<{ key: keyof ClientProfile; label: string }> = [
    { key: "hasCurrentOverdue", label: "存在当前逾期" },
    { key: "hasM3Overdue", label: "历史存在 M3 逾期" },
    { key: "hasDomesticProperty", label: "本人或配偶有国内房产" },
    { key: "hasHongKongCompany", label: "持有香港分支或关联公司" },
    { key: "hasHsbcAccount", label: "已开立汇丰账户" },
    { key: "isTradelinkWhitelist", label: "贸易通特选白名单客户" },
  ];
  return (
    <div className="match-intake">
      <section className="form-intro"><div><h1>录入客户资料</h1><p>一次填写关键信息，系统将逐条比对全部产品准入条件。</p></div><span><ShieldCheck size={18} /> 仅收集融资匹配所需信息</span></section>
      {missing.length > 0 ? <div className="missing-banner"><CircleAlert size={19} /><div><strong>请一次性补全以下 {missing.length} 项</strong><p>{missing.join("、")}</p></div></div> : <div className="complete-banner"><CheckCircle2 size={19} /><div><strong>客户资料已齐全</strong><p>可以开始进行全产品准入比对。</p></div></div>}
      <section className="form-section"><h2>基础与经营信息</h2><div className="form-grid">
        <label><span>客户 / 企业名称</span><input value={client.companyName} onChange={(e) => updateText("companyName", e.target.value)} /></label>
        <label><span>所属行业</span><select value={client.industry} onChange={(e) => updateText("industry", e.target.value)}><option>跨境电商</option><option>进出口贸易</option><option>供应链服务</option><option>SaaS服务</option><option>其他</option></select></label>
        <label><span>所在城市</span><input value={client.city} onChange={(e) => updateText("city", e.target.value)} /></label>
        <label><span>主要经营平台</span><select value={client.platform} onChange={(e) => updateText("platform", e.target.value)}><option>亚马逊美国站</option><option>亚马逊其他站点</option><option>沃尔玛</option><option>TikTok Shop</option><option>Shopee / Lazada</option><option>独立站</option><option>B2B出口</option></select></label>
        {numberFields.slice(0, 4).map((field) => <label key={field.key}><span>{field.label}</span><div className="input-suffix"><input type="number" min={field.min} step={field.step} value={Number.isNaN(client[field.key]) ? "" : String(client[field.key])} onChange={(e) => updateNumber(field.key, e.target.value)} /><i>{field.suffix}</i></div></label>)}
      </div></section>
      <section className="form-section"><h2>征信与资产情况</h2><div className="form-grid">
        {numberFields.slice(4, 7).map((field) => <label key={field.key}><span>{field.label}</span><div className="input-suffix"><input type="number" min={field.min} value={Number.isNaN(client[field.key]) ? "" : String(client[field.key])} onChange={(e) => updateNumber(field.key, e.target.value)} /><i>{field.suffix}</i></div></label>)}
        <label className="span-2"><span>资产状况</span><input value={client.assets} onChange={(e) => updateText("assets", e.target.value)} placeholder="如：房产、库存、应收账款、设备" /></label>
      </div><div className="toggle-grid">{toggles.map(({ key, label }) => <label key={key}><input type="checkbox" checked={Boolean(client[key])} onChange={(e) => setClient({ ...client, [key]: e.target.checked })} /><span><Check size={13} /></span>{label}</label>)}</div></section>
      <section className="form-section"><h2>融资需求与平台数据</h2><div className="form-grid">
        {numberFields.slice(7).map((field) => <label key={field.key}><span>{field.label}</span><div className="input-suffix"><input type="number" min={field.min} value={Number.isNaN(client[field.key]) ? "" : String(client[field.key])} onChange={(e) => updateNumber(field.key, e.target.value)} /><i>{field.suffix}</i></div></label>)}
        <label><span>资金用途</span><select value={client.purpose} onChange={(e) => updateText("purpose", e.target.value)}><option>采购备货</option><option>订单履约</option><option>物流周转</option><option>营销投放</option><option>日常经营周转</option><option>设备采购</option></select></label>
      </div></section>
      <footer className="form-footer"><p><CircleAlert size={15} /> 不承诺放款，所有额度、利率与审批结果以资金方最终审批为准。</p><button className="primary-button" onClick={onRun} disabled={missing.length > 0}>开始匹配全部产品 <Sparkles size={16} /></button></footer>
    </div>
  );
}

function ResultRow({ result, selected, onClick }: { result: MatchResult; selected: boolean; onClick: () => void }) {
  const reasons = result.status === "可做" ? result.passes.slice(0, 3) : result.failures.slice(0, 2);
  return (
    <button className={`result-row ${selected ? "selected" : ""}`} onClick={onClick}>
      <span><StatusTag status={result.status} /></span>
      <strong className="match-score">{result.score}%</strong>
      <span className="product-cell"><strong>{result.product.name}</strong><small>{result.product.funder}</small></span>
      <span>{result.estimate}</span>
      <span>{result.product.rateLabel}</span>
      <span>{result.product.termLabel}</span>
      <span className="reason-cell">{reasons.map((reason) => <small key={reason}>• {reason}</small>)}</span>
      <ArrowRight size={17} />
    </button>
  );
}

function ProductDetail({ result, onClose }: { result: MatchResult; onClose: () => void }) {
  const reasons = result.status === "可做" ? result.passes : result.failures;
  return (
    <aside className="detail-panel">
      <div className="detail-head"><div><h2>{result.product.name} <StatusTag status={result.status} /></h2><p>{result.product.funder} · {result.product.currency}</p></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div>
      <div className="detail-score"><div><span>匹配度</span><strong>{result.score}%</strong></div><div><span>预估额度</span><strong>{result.estimate}</strong></div></div>
      <section><h3>判断依据</h3><ul className={result.status === "可做" ? "check-list" : "fail-list"}>{reasons.map((reason) => <li key={reason}>{result.status === "可做" ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}<span>{reason}</span></li>)}</ul></section>
      <section><h3>建议方案</h3><dl><div><dt>推荐顺序</dt><dd>{result.status === "可做" ? "优先申请" : "暂缓申请"}</dd></div><div><dt>预估额度</dt><dd>{result.estimate}</dd></div><div><dt>年化利率</dt><dd>{result.product.rateLabel}</dd></div><div><dt>融资期限</dt><dd>{result.product.termLabel}</dd></div></dl><p className="inline-note">以上为预估，以资金方最终审批为准。</p></section>
      <section><h3>需准备材料</h3><ol className="material-list">{result.product.materials.map((item) => <li key={item}>{item}</li>)}</ol></section>
      <section className="source-note"><strong>规则来源</strong><p>{result.product.source}</p></section>
    </aside>
  );
}

function ClientSummary({ client }: { client: ClientProfile }) {
  const items = [
    ["所属行业", client.industry], ["经营时长", `${client.operatingYears}年`], ["月均流水", `${client.monthlyFlow}万`],
    ["近6月逾期", `${client.overdueSixMonths}次`], ["负债率", `${client.debtRatio}%`], ["融资需求", `${client.requestedAmount}万`],
    ["融资期限", `${client.requestedTerm}个月`], ["资金用途", client.purpose],
  ];
  return <section className="client-summary"><div className="client-summary-title"><div><h1>{client.companyName}</h1><span><BadgeCheck size={14} /> 资料完整</span></div><p>{client.city} · {client.platform}</p></div><div className="summary-items">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="complete-score"><span>资料完整度</span><strong>100%</strong><small>完整度高，匹配更精准</small></div></section>;
}

function MatchResults({ client, results, onEdit }: { client: ClientProfile; results: MatchResult[]; onEdit: () => void }) {
  const [filter, setFilter] = useState<"全部" | ProductStatus>("全部");
  const [selectedId, setSelectedId] = useState(results[0]?.product.id ?? "");
  const selected = results.find((item) => item.product.id === selectedId) ?? results[0];
  const visible = filter === "全部" ? results : results.filter((item) => item.status === filter);
  const doable = results.filter((item) => item.status === "可做").length;

  const summaryText = () => {
    const lines = [`${client.companyName}融资匹配建议`, `需求：${client.requestedAmount}万 / ${client.requestedTerm}个月 / ${client.purpose}`];
    results.slice(0, 5).forEach((r, index) => lines.push(`${index + 1}. 【${r.status}】${r.product.name}｜匹配度${r.score}%｜预估额度${r.estimate}｜${r.status === "可做" ? r.passes.slice(0, 2).join("；") : r.failures.join("；")}`));
    lines.push("以上为初步匹配建议，具体以资金方最终审批为准。");
    return lines.join("\n");
  };
  const copySummary = async () => {
    await navigator.clipboard.writeText(summaryText());
    window.alert("转发摘要已复制");
  };
  const downloadReport = () => {
    const blob = new Blob([summaryText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${client.companyName}-融资匹配报告.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="results-page">
      <div className="stepper">{["客户资料", "完整性检查", "产品比对", "方案输出"].map((step, index) => <span className={index === 3 ? "current" : "done"} key={step}><i>{index === 3 ? "4" : <Check size={14} />}</i><b>{step}</b><small>{index === 3 ? "当前步骤" : "已完成"}</small></span>)}</div>
      <ClientSummary client={client} />
      <div className="results-layout">
        <div className="results-main">
          <div className="result-tabs"><div>{(["全部", "可做", "不建议"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "全部" ? `全部结果 (${results.length})` : `${item} (${item === "可做" ? doable : results.length - doable})`}</button>)}</div><span>按匹配度从高到低排序</span></div>
          <div className="result-header"><span>匹配状态</span><span>匹配度</span><span>产品 / 资金方</span><span>预估额度</span><span>年化利率</span><span>期限</span><span>判断依据</span><span /></div>
          <div className="result-list">{visible.map((result) => <ResultRow key={result.product.id} result={result} selected={result.product.id === selectedId} onClick={() => setSelectedId(result.product.id)} />)}</div>
          <div className="result-actions"><button className="secondary-button" onClick={onEdit}><ArrowLeft size={16} /> 返回修改资料</button><div><button className="secondary-button" onClick={downloadReport}><Download size={16} /> 导出匹配报告</button><button className="primary-button" onClick={copySummary}><Copy size={16} /> 复制转发摘要</button></div></div>
        </div>
        {selected ? <ProductDetail result={selected} onClose={() => setSelectedId("")} /> : null}
      </div>
    </div>
  );
}

function MatchPage() {
  const [client, setClient] = useState<ClientProfile>(() => {
    const cached = localStorage.getItem("jingfa-client");
    return cached ? { ...defaultClient, ...JSON.parse(cached) } : defaultClient;
  });
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const run = () => {
    const missing = getMissingFields(client);
    if (missing.length > 0) return;
    localStorage.setItem("jingfa-client", JSON.stringify(client));
    setResults(runMatching(client));
  };
  return <div className="page match-page">{results ? <MatchResults client={client} results={results} onEdit={() => setResults(null)} /> : <IntakeForm client={client} setClient={setClient} onRun={run} />}</div>;
}

function ProductCenter() {
  const [query, setQuery] = useState("");
  const filtered = products.filter((p) => `${p.name}${p.funder}${p.audience}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page catalog-page"><PageHeading title="产品中心" description="集中管理资金方产品要素、准入规则与材料要求。" /><label className="catalog-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索产品、资金方或客群" /></label><section className="catalog-table"><div className="catalog-head"><span>产品 / 资金方</span><span>目标客群</span><span>额度</span><span>年化利率</span><span>期限</span><span>币种</span></div>{filtered.map((product) => <div className="catalog-row" key={product.id}><span><strong>{product.name}</strong><small>{product.funder}</small></span><span>{product.audience}</span><span>{product.amountLabel}</span><span>{product.rateLabel}</span><span>{product.termLabel}</span><span>{product.currency}</span></div>)}</section></div>;
}

function PartnersPage() {
  return <div className="page catalog-page"><PageHeading title="生态伙伴" description="覆盖资金、数据、场景与获客渠道的跨境融资生态网络。" /><div className="partner-summary"><div><strong>8</strong><span>渠道类型</span></div><div><strong>160</strong><span>候选机构</span></div><div><strong>32</strong><span>优先合作</span></div></div><section className="partner-list">{partners.map((partner, index) => <article key={partner.name}><span className="partner-logo">{partner.name.slice(0, 2)}</span><div><small>{partner.type}</small><h2>{partner.name}</h2><p>{partner.description}</p></div><span className={`priority p${index % 4}`}>{partner.priority}</span></article>)}</section></div>;
}

function PageHeading({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <header className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action ? <button className="primary-button" onClick={onAction}><Plus size={16} />{action}</button> : null}</header>;
}

function SimplePage({ view, onView }: { view: View; onView: (view: View) => void }) {
  const content: Record<Exclude<View, "dashboard" | "match" | "products" | "partners">, { title: string; description: string; body: React.ReactNode }> = {
    clients: { title: "客户管理", description: "查看渠道录入客户的资料完整度与匹配进度。", body: <div className="client-table">{recentClients.map((c) => <div key={c.name}><span className="company-icon"><Building2 size={17} /></span><span><strong>{c.name}</strong><small>{c.industry} · {c.city}</small></span><span>{c.completeness}%</span><StatusTag status={c.completeness === 100 ? "可做" : "待补全"} /></div>)}</div> },
    library: { title: "资料库", description: "产品资料与生态文档的结构化索引。", body: <div className="library-list">{["跨境金融—资金方与资产端合作清单", "微众跨境电商贷产品要素与亮点", "富融出海贷与PAOB采购贷产品大纲对比", "跨境金融—产品方清单", "外资银行与中资银行产品清单"].map((name, index) => <article key={name}><FileText size={20} /><div><strong>{name}</strong><small>已提取关键要素 · {index + 6} 条规则</small></div><span>附件资料</span></article>)}</div> },
    settings: { title: "系统设置", description: "配置匹配规则、用户权限与智能体连接。", body: <div className="settings-list"><article><Bot size={22} /><div><h2>智能体连接</h2><p>接口已预留。收到智能体名称、调用地址、认证方式与输入输出结构后即可接入。</p></div><span className="status-tag warning">待配置</span></article><article><Database size={22} /><div><h2>数据存储</h2><p>当前原型使用浏览器本地存储；生产环境建议接入权限隔离的业务数据库。</p></div><span className="status-tag success">原型可用</span></article><article><ShieldCheck size={22} /><div><h2>合规声明</h2><p>输出固定使用“以资金方最终审批为准”，不收集与融资匹配无关的敏感信息。</p></div><span className="status-tag success">已启用</span></article></div> },
    company: { title: "关于京发智配", description: "面向跨境企业与渠道伙伴的融资产品匹配基础设施。", body: <div className="company-story"><div><h2>把复杂的准入规则，变成可解释的匹配结果</h2><p>京发智配连接资金方、资产方与渠道伙伴，围绕跨境电商、进出口贸易、供应链等经营场景，统一沉淀产品要素与准入规则。渠道方只需一次录入客户关键信息，即可获得逐条判断、清晰排序和可直接转发的建议方案。</p></div><div className="company-points"><article><strong>可解释</strong><p>每个结果都展示匹配条件与明确卡点。</p></article><article><strong>可协同</strong><p>资金方、资产方与渠道资料统一管理。</p></article><article><strong>有边界</strong><p>不承诺审批结果，不收集无关敏感信息。</p></article></div></div> },
  };
  const item = content[view as keyof typeof content];
  return <div className="page simple-page"><PageHeading title={item.title} description={item.description} action={view === "clients" ? "录入客户" : undefined} onAction={view === "clients" ? () => onView("match") : undefined} />{item.body}</div>;
}

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const content = view === "dashboard" ? <Dashboard onStartMatch={() => setView("match")} onView={setView} /> : view === "match" ? <MatchPage /> : view === "products" ? <ProductCenter /> : view === "partners" ? <PartnersPage /> : <SimplePage view={view} onView={setView} />;
  return <AppShell view={view} onView={setView}>{content}</AppShell>;
}
