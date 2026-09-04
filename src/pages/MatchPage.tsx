import { useMemo, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, CircleAlert, Copy, Download, FilePenLine, PackageSearch, ShieldCheck, Sparkles } from "lucide-react";
import { getMissingFields, runMatching } from "../matcher";
import type { ClientProfile, ClientRecord, MatchResult, Product, ProductStatus } from "../types";
import { MatchDetail } from "../components/MatchDetail";
import { CompletionBar, StatusTag } from "../components/ui";

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

function CustomerSwitcher({ records, selectedId, onSelect }: { records: ClientRecord[]; selectedId: string; onSelect: (id: string) => void }) {
  return <label className="customer-switcher"><span>当前客户</span><select value={selectedId} onChange={(event) => onSelect(event.target.value)}>{records.map((record) => <option value={record.id} key={record.id}>{record.profile.companyName} · {record.profile.city}</option>)}</select></label>;
}

function IntakeForm({ record, client, setClient, onRun, onBack }: { record: ClientRecord; client: ClientProfile; setClient: (client: ClientProfile) => void; onRun: () => void; onBack: () => void }) {
  const missing = getMissingFields(client);
  const updateText = (key: keyof ClientProfile, value: string) => setClient({ ...client, [key]: value });
  const updateNumber = (key: keyof ClientProfile, value: string) => setClient({ ...client, [key]: value === "" ? Number.NaN : Number(value) });
  const toggles: Array<{ key: keyof ClientProfile; label: string }> = [
    { key: "hasCurrentOverdue", label: "存在当前逾期" }, { key: "hasM3Overdue", label: "历史存在 M3 逾期" }, { key: "hasDomesticProperty", label: "本人或配偶有国内房产" }, { key: "hasHongKongCompany", label: "持有香港分支或关联公司" }, { key: "hasHsbcAccount", label: "已开立汇丰账户" }, { key: "isTradelinkWhitelist", label: "贸易通特选白名单客户" },
  ];
  const renderNumber = (field: (typeof numberFields)[number]) => <label key={field.key}><span>{field.label}</span><div className="input-suffix"><input type="number" min={field.min} step={field.step} value={Number.isNaN(client[field.key]) ? "" : String(client[field.key])} onChange={(event) => updateNumber(field.key, event.target.value)} /><i>{field.suffix}</i></div></label>;
  return <div className="intake-page">
    <header className="intake-header"><button className="button quiet" onClick={onBack}><ArrowLeft size={16} />返回工作台</button><div><h1>编辑客户资料</h1><p>{record.profile.companyName} · 一次补全信息后运行全部产品比对</p></div><span><ShieldCheck size={16} />仅收集融资匹配所需信息</span></header>
    {missing.length ? <div className="feedback-banner error" role="alert"><CircleAlert size={18} /><div><strong>还需补全 {missing.length} 项信息</strong><p>{missing.join("、")}</p></div></div> : <div className="feedback-banner success" role="status"><CheckCircle2 size={18} /><div><strong>资料已满足匹配要求</strong><p>保存后将重新计算全部产品的匹配结果。</p></div></div>}
    <section className="form-panel"><header><h2>基础与经营信息</h2><span>企业身份、经营规模与平台情况</span></header><div className="form-grid"><label><span>客户 / 企业名称</span><input maxLength={80} value={client.companyName} onChange={(event) => updateText("companyName", event.target.value)} /></label><label><span>所属行业</span><select value={client.industry} onChange={(event) => updateText("industry", event.target.value)}><option>跨境电商</option><option>进出口贸易</option><option>供应链服务</option><option>SaaS服务</option><option>其他</option></select></label><label><span>所在城市</span><input maxLength={60} value={client.city} onChange={(event) => updateText("city", event.target.value)} /></label><label><span>主要经营平台</span><select value={client.platform} onChange={(event) => updateText("platform", event.target.value)}><option>亚马逊美国站</option><option>亚马逊其他站点</option><option>沃尔玛</option><option>TikTok Shop</option><option>Shopee / Lazada</option><option>独立站</option><option>B2B出口</option></select></label>{numberFields.slice(0, 4).map(renderNumber)}</div></section>
    <section className="form-panel"><header><h2>征信与资产情况</h2><span>仅填写匹配规则直接使用的字段</span></header><div className="form-grid">{numberFields.slice(4, 7).map(renderNumber)}<label className="span-2"><span>资产状况</span><input maxLength={160} value={client.assets} onChange={(event) => updateText("assets", event.target.value)} placeholder="如：房产、库存、应收账款、设备" /></label></div><div className="toggle-grid">{toggles.map(({ key, label }) => <label key={key}><input type="checkbox" checked={Boolean(client[key])} onChange={(event) => setClient({ ...client, [key]: event.target.checked })} /><span><Check size={13} /></span>{label}</label>)}</div></section>
    <section className="form-panel"><header><h2>融资需求与平台数据</h2><span>用于估算额度、期限与场景匹配</span></header><div className="form-grid">{numberFields.slice(7).map(renderNumber)}<label><span>资金用途</span><select value={client.purpose} onChange={(event) => updateText("purpose", event.target.value)}><option>采购备货</option><option>订单履约</option><option>物流周转</option><option>营销投放</option><option>日常经营周转</option><option>设备采购</option></select></label></div></section>
    <footer className="sticky-actions"><p><CircleAlert size={14} />不承诺放款，额度、利率与结果以资金方最终审批为准。</p><button className="button primary" onClick={onRun} disabled={missing.length > 0}><Sparkles size={16} />保存并重新匹配</button></footer>
  </div>;
}

function Results({ record, results, onEdit, onBack, notify }: { record: ClientRecord; results: MatchResult[]; onEdit: () => void; onBack: () => void; notify: (message: string, tone?: "success" | "error") => void }) {
  const [filter, setFilter] = useState<"全部" | ProductStatus>("全部");
  const [selectedId, setSelectedId] = useState(results[0]?.product.id ?? "");
  const visible = filter === "全部" ? results : results.filter((result) => result.status === filter);
  const selected = results.find((result) => result.product.id === selectedId) ?? results[0];
  const doable = results.filter((result) => result.status === "可做").length;
  const summaryText = () => {
    const profile = record.profile;
    const lines = [`${profile.companyName}融资匹配建议`, `需求：${profile.requestedAmount}万 / ${profile.requestedTerm}个月 / ${profile.purpose}`];
    results.slice(0, 5).forEach((result, index) => lines.push(`${index + 1}. 【${result.status}】${result.product.name}｜匹配度${result.score}%｜预估额度${result.estimate}｜${result.status === "可做" ? result.passes.slice(0, 2).join("；") : result.failures.join("；")}`));
    lines.push("以上为初步匹配建议，具体以资金方最终审批为准。");
    return lines.join("\n");
  };
  const copy = async () => { try { await navigator.clipboard.writeText(summaryText()); notify("转发摘要已复制"); } catch { notify("复制失败，请允许浏览器访问剪贴板后重试", "error"); } };
  const download = () => { const url = URL.createObjectURL(new Blob([summaryText()], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `${record.profile.companyName}-融资匹配报告.txt`; link.click(); URL.revokeObjectURL(url); notify("匹配报告已生成"); };
  return <div className="results-page"><header className="results-header"><button className="button quiet" onClick={onBack}><ArrowLeft size={16} />返回工作台</button><div><h1>{record.profile.companyName} · 匹配结果</h1><p>共比对 {results.length} 个产品，{doable} 个产品当前可做</p></div><button className="button secondary" onClick={onEdit}><FilePenLine size={16} />编辑客户资料</button></header>
    <section className="result-summary"><div><span>客户行业</span><strong>{record.profile.industry}</strong></div><div><span>月均流水</span><strong>{record.profile.monthlyFlow}万</strong></div><div><span>负债率</span><strong>{record.profile.debtRatio}%</strong></div><div><span>融资需求</span><strong>{record.profile.requestedAmount}万 / {record.profile.requestedTerm}个月</strong></div><CompletionBar value={record.completeness} /></section>
    <div className="results-layout"><section className="results-main"><div className="result-tabs" role="tablist">{(["全部", "可做", "不建议"] as const).map((item) => <button role="tab" aria-selected={filter === item} className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}{item === "全部" ? ` ${results.length}` : item === "可做" ? ` ${doable}` : ` ${results.length - doable}`}</button>)}<span>按匹配度降序</span></div><div className="data-table result-table"><div className="table-head"><span>状态</span><span>匹配度</span><span>产品 / 资金方</span><span>额度</span><span>利率</span><span>期限</span></div>{visible.map((result) => <button className={`table-row ${selected?.product.id === result.product.id ? "selected" : ""}`} key={result.product.id} onClick={() => setSelectedId(result.product.id)}><span><StatusTag status={result.status} /></span><span className="score-cell">{result.score}%</span><span><strong>{result.product.name}</strong><small>{result.product.funder}</small></span><span>{result.estimate}</span><span>{result.product.rateLabel}</span><span>{result.product.termLabel}</span></button>)}</div><footer className="result-actions"><button className="button secondary" onClick={download}><Download size={16} />导出报告</button><button className="button primary" onClick={copy}><Copy size={16} />复制转发摘要</button></footer></section>{selected ? <MatchDetail result={selected} /> : null}</div>
  </div>;
}

export function MatchPage({ records, productItems, selectedId, initialMode, onSelect, onUpdate, onBack, notify }: { records: ClientRecord[]; productItems: Product[]; selectedId: string; initialMode: "intake" | "results"; onSelect: (id: string) => void; onUpdate: (record: ClientRecord) => void; onBack: () => void; notify: (message: string, tone?: "success" | "error") => void }) {
  const record = records.find((item) => item.id === selectedId) ?? records[0];
  const [client, setClient] = useState<ClientProfile>(record.profile);
  const [mode, setMode] = useState(initialMode);
  const results = useMemo(() => runMatching(client, productItems), [client, productItems]);
  const run = () => { if (getMissingFields(client).length) return; onUpdate({ ...record, profile: client, completeness: 100, stage: "可匹配", updatedAt: "刚刚" }); setMode("results"); notify("客户资料已保存，匹配结果已更新"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className="page match-page"><div className="match-switch-row"><CustomerSwitcher records={records} selectedId={record.id} onSelect={onSelect} /><span><PackageSearch size={15} />切换后自动同步客户资料与匹配结果</span></div>{mode === "intake" ? <IntakeForm record={record} client={client} setClient={setClient} onRun={run} onBack={onBack} /> : <Results record={{ ...record, profile: client }} results={results} onEdit={() => setMode("intake")} onBack={onBack} notify={notify} />}</div>;
}
