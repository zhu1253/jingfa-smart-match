import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Building2, CircleHelp, FileQuestion, Handshake, LayoutDashboard, PackageSearch, Search, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { View } from "../components/AppShell";
import { EmptyState } from "../components/ui";

type HelpCategory = "all" | "customer" | "product" | "partner" | "library";
type Guide = { id: string; view: View; category: Exclude<HelpCategory, "all">; title: string; purpose: string; scenario: string; steps: string[]; keywords: string; icon: LucideIcon };

const categories: Array<{ id: HelpCategory; label: string }> = [
  { id: "all", label: "全部板块" },
  { id: "customer", label: "客户业务" },
  { id: "product", label: "产品匹配" },
  { id: "partner", label: "生态协同" },
  { id: "library", label: "资料库" },
];

const guides: Guide[] = [
  { id: "guide-dashboard", view: "dashboard", category: "customer", title: "客户匹配工作台", purpose: "集中查看客户经营概况，并快速比较当前客户与全部融资产品的匹配结果。", scenario: "首次判断客户融资方向、切换客户复核结果、打开产品详情解释匹配依据。", keywords: "工作台 切换客户 匹配结果 查看详情 筛选 可做 不建议", icon: LayoutDashboard, steps: ["在左侧客户列表选择目标客户，顶部客户概况与结果会同步更新。", "在“产品匹配结果”中按“全部、可做、不建议”筛选，结果保持按匹配度排序。", "点击对应产品的“查看详情”，核对产品类型、适用客户、匹配原因、额度、利率和材料。", "关闭详情后可继续查看原筛选结果；最终结论以资金方审批为准。"] },
  { id: "guide-clients", view: "clients", category: "customer", title: "客户管理", purpose: "维护客户档案、资料完整度、融资需求和业务跟进状态。", scenario: "录入新客户、搜索已有客户、查看档案详情或补全经营与征信信息。", keywords: "客户管理 录入客户 客户详情 编辑资料 完整度 征信 流水", icon: Users, steps: ["进入“客户管理”，使用搜索框按客户名称、行业或城市定位客户。", "点击客户所在行进入详情，查看经营、征信、资产和融资需求。", "选择“编辑资料”补全信息；录入时仅填写融资匹配需要的字段。", "在客户详情选择“查看匹配”，进入该客户的产品匹配结果。"] },
  { id: "guide-products", view: "products", category: "product", title: "产品中心", purpose: "统一维护资金方产品要素、目标客群、准入规则和申请材料。", scenario: "查找具体产品、查看当前客户适配度、维护产品展示信息。", keywords: "产品中心 产品详情 资金方 准入规则 利率 额度 材料 编辑产品", icon: PackageSearch, steps: ["进入“产品中心”，按产品名称、资金方或目标客群搜索。", "点击产品行查看完整产品要素和当前客户的匹配判断。", "需要调整展示信息时选择“编辑资料”，核对后保存。", "从详情页进入完整匹配，复核该产品与其他产品的推荐顺序。"] },
  { id: "guide-partners", view: "partners", category: "partner", title: "生态伙伴", purpose: "管理资金、数据、场景与渠道伙伴的合作信息及优先级。", scenario: "查找合作机构、查看伙伴能力、维护联系人和合作说明。", keywords: "生态伙伴 资金方 渠道方 合作机构 优先级 编辑伙伴", icon: Handshake, steps: ["进入“生态伙伴”，按机构名称、类型或地区搜索。", "点击伙伴卡片查看机构能力、合作状态与详细说明。", "选择“编辑资料”维护合作信息，并保存最新内容。", "结合产品中心和资料库复核伙伴可支持的融资场景。"] },
  { id: "guide-library", view: "library", category: "library", title: "资料库", purpose: "在受控空间查看产品规则、合作资料和已结构化的业务文档。", scenario: "复核产品政策来源、查看资料摘要、核对已提取规则。", keywords: "资料库 密码 管理员 解锁 文档 规则 登录 12531253", icon: BookOpen, steps: ["从左侧导航点击“资料库”；帮助中心不会代替或自动打开资料库。", "输入管理员密码并完成验证，可使用显示/隐藏按钮检查输入内容。", "验证通过后选择文档，查看资料摘要、规则数量和使用范围。", "使用完成后点击“退出并锁定”；产品政策变化时应复核资金方最新资料。"] },
];

const faqs = [
  { question: "切换客户后为什么结果发生变化？", answer: "匹配结果由当前客户的行业、经营年限、流水、征信、资产及融资需求实时计算。请先确认左侧选中的客户名称和资料完整度。", keywords: "切换客户 结果变化" },
  { question: "点击产品“查看详情”没有反应怎么办？", answer: "先确认按钮处于可点击状态并刷新页面。正常情况下会打开该产品专属详情抽屉；关闭后仍会保留原筛选条件和页面位置。", keywords: "查看详情 无反应 产品" },
  { question: "没有任何“可做”产品怎么办？", answer: "查看“不建议”产品的具体卡点，根据提示补充流水、降低负债或增加抵押物后重新匹配。系统不承诺放款结果，以资金方最终审批为准。", keywords: "没有可做 不建议 卡点" },
  { question: "资料库密码提示错误怎么办？", answer: "检查大小写和输入内容后重新输入。密码只用于资料库管理员验证；帮助中心无需密码，也不会跳转到资料库。", keywords: "资料库 密码 错误 重新输入" },
  { question: "产品或伙伴信息修改后在哪里查看？", answer: "保存成功后返回对应详情或列表即可查看最新内容。正式使用时仍需根据资金方最新政策复核准入要求。", keywords: "修改 保存 产品 伙伴" },
];

const contextGuideId: Partial<Record<View, string>> = { dashboard: "guide-dashboard", match: "guide-dashboard", clients: "guide-clients", products: "guide-products", partners: "guide-partners", library: "guide-library" };
const viewLabels: Partial<Record<View, string>> = { dashboard: "工作台", match: "智能匹配", clients: "客户管理", products: "产品中心", partners: "生态伙伴", library: "资料库", company: "公司介绍", settings: "系统设置" };

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HelpPage({ contextView, onBack, onNavigate }: { contextView: View; onBack: () => void; onNavigate: (view: View) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategory>("all");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGuides = useMemo(() => guides.filter((guide) => {
    const inCategory = category === "all" || guide.category === category;
    const searchable = `${guide.title}${guide.purpose}${guide.scenario}${guide.steps.join("")}${guide.keywords}`.toLowerCase();
    return inCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
  }), [category, normalizedQuery]);
  const visibleFaqs = useMemo(() => faqs.filter((item) => !normalizedQuery || `${item.question}${item.answer}${item.keywords}`.toLowerCase().includes(normalizedQuery)), [normalizedQuery]);
  const contextualGuide = guides.find((guide) => guide.id === contextGuideId[contextView]);
  const resetAndScroll = (id: string) => { setQuery(""); setCategory("all"); window.requestAnimationFrame(() => window.requestAnimationFrame(() => scrollToSection(id))); };
  const resultCount = visibleGuides.length + visibleFaqs.length;

  return <div className="page help-page">
    <header className="help-page-header"><button className="button quiet" onClick={onBack}><ArrowLeft size={16} />返回{viewLabels[contextView] ?? "上一页"}</button><div><h1>帮助中心</h1><p>了解京发智配的各项功能，快速找到当前任务的操作方法。</p></div><label className="help-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索功能或操作问题" aria-label="搜索帮助内容" />{query ? <button onClick={() => setQuery("")} aria-label="清空帮助搜索"><X size={15} /></button> : null}</label></header>

    <div className="help-layout"><aside className="help-directory"><div className="context-help"><CircleHelp size={18} /><div><strong>从“{viewLabels[contextView] ?? "系统"}”进入</strong><p>{contextualGuide ? `建议先查看“${contextualGuide.title}”操作说明。` : "可从系统概览开始了解主要功能。"}</p>{contextualGuide ? <button onClick={() => resetAndScroll(contextualGuide.id)}>查看相关说明<ArrowRight size={13} /></button> : null}</div></div><nav aria-label="帮助目录"><strong>页面目录</strong><button onClick={() => resetAndScroll("help-overview")}>系统概览</button><button onClick={() => resetAndScroll("help-guides")}>板块介绍与操作流程</button><button onClick={() => resetAndScroll("help-faq")}>常见问题</button></nav><p className="help-boundary">帮助中心仅提供操作说明；产品资料与业务文档请从“资料库”独立访问。</p></aside>

      <main className="help-content"><section className="help-overview" id="help-overview"><div><span className="help-section-icon"><Building2 size={20} /></span><div><h2>系统概览</h2><p>京发智配面向融资顾问与渠道伙伴，用于集中管理客户、资金产品和生态伙伴，并根据客户经营、征信、资产及融资需求生成可解释的产品匹配结果。</p></div></div><dl><div><dt>核心用途</dt><dd>客户信息一次录入，多产品逐条比对</dd></div><div><dt>适用场景</dt><dd>跨境电商、进出口贸易与供应链融资初筛</dd></div><div><dt>决策边界</dt><dd>结果用于业务参考，以资金方最终审批为准</dd></div></dl></section>

        <section className="help-guides-section" id="help-guides"><header><div><h2>板块介绍与操作流程</h2><p>选择分类，快速定位当前业务环节。</p></div>{normalizedQuery ? <span>找到 {resultCount} 条相关内容</span> : null}</header><div className="help-categories" role="group" aria-label="帮助板块分类">{categories.map((item) => <button key={item.id} className={category === item.id ? "active" : ""} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div><div className="help-guide-list">{visibleGuides.map((guide) => { const Icon = guide.icon; return <article className="help-guide" id={guide.id} key={guide.id}><header><span><Icon size={18} /></span><div><h3>{guide.title}</h3><p>{guide.purpose}</p></div><button className="text-button" onClick={() => onNavigate(guide.view)}>前往板块<ArrowRight size={14} /></button></header><div className="help-guide-body"><div><strong>适用场景</strong><p>{guide.scenario}</p></div><div><strong>操作步骤</strong><ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol></div></div></article>; })}</div>{visibleGuides.length === 0 ? <EmptyState title="未找到相关操作说明" description="请更换关键词或选择其他板块分类。" action="清除筛选" onAction={() => { setQuery(""); setCategory("all"); }} /> : null}</section>

        <section className="help-faq" id="help-faq"><header><span className="help-section-icon"><FileQuestion size={20} /></span><div><h2>常见问题</h2><p>常见操作问题、可能原因与处理方式。</p></div></header>{visibleFaqs.length ? <div>{visibleFaqs.map((item) => <details key={item.question} open={Boolean(normalizedQuery)}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div> : <p className="help-no-faq">当前关键词下没有相关常见问题。</p>}</section>
      </main></div>
  </div>;
}
