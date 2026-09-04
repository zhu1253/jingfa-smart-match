import { useMemo, useState } from "react";
import { ArrowRight, Building2, FilePenLine, PackageSearch, Search } from "lucide-react";
import { runMatching } from "../matcher";
import type { ClientRecord, Product } from "../types";
import { CompletionBar, DetailHeader, EmptyState, InfoGrid, PageHeader, StatusTag } from "../components/ui";

export function ClientsPage({ records, productItems, onEdit, onMatch, onCreate }: { records: ClientRecord[]; productItems: Product[]; onEdit: (id: string) => void; onMatch: (id: string) => void; onCreate: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = records.filter((record) => `${record.profile.companyName}${record.profile.industry}${record.profile.city}`.toLowerCase().includes(query.toLowerCase()));
  const selected = records.find((record) => record.id === selectedId);
  const matches = useMemo(() => selected ? runMatching(selected.profile, productItems) : [], [selected, productItems]);
  if (selected) {
    const profile = selected.profile;
    return <div className="page detail-page"><DetailHeader title={profile.companyName} subtitle={`${profile.industry} · ${profile.city} · 负责人 ${selected.owner}`} onBack={() => setSelectedId(null)} onEdit={() => onEdit(selected.id)} />
      <section className="entity-summary"><div><StatusTag status={selected.stage} /><h2>客户融资画像</h2><p>更新于 {selected.updatedAt}</p></div><CompletionBar value={selected.completeness} /></section>
      <div className="detail-columns"><section className="detail-section"><header><h2>经营与融资信息</h2></header><InfoGrid items={[["所属行业", profile.industry], ["经营年限", `${profile.operatingYears}年`], ["主要平台", profile.platform], ["月均流水", `${profile.monthlyFlow}万元`], ["近12月销售额", `${profile.annualSales}万元`], ["资产状况", profile.assets], ["融资需求", `${profile.requestedAmount}万元`], ["需求期限", `${profile.requestedTerm}个月`], ["资金用途", profile.purpose]]} /></section>
      <section className="detail-section"><header><h2>征信与准入要点</h2></header><InfoGrid items={[["近6月逾期", `${profile.overdueSixMonths}次`], ["当前逾期", profile.hasCurrentOverdue ? "有" : "无"], ["历史 M3", profile.hasM3Overdue ? "有" : "无"], ["近2月机构查询", `${profile.inquiryTwoMonths}次`], ["资产负债率", `${profile.debtRatio}%`], ["国内房产", profile.hasDomesticProperty ? "有" : "无"], ["香港关联主体", profile.hasHongKongCompany ? "有" : "无"]]} /></section></div>
      <section className="detail-section"><header><div><h2>当前推荐产品</h2><p>根据已录入资料实时计算</p></div><button className="button secondary" onClick={() => onMatch(selected.id)}><PackageSearch size={16} />查看全部匹配</button></header><div className="recommendation-list">{matches.slice(0, 4).map((result, index) => <div key={result.product.id}><span>{index + 1}</span><div><strong>{result.product.name}</strong><small>{result.product.funder} · {result.estimate}</small></div><b>{result.score}%</b><StatusTag status={result.status} /></div>)}</div></section>
    </div>;
  }
  return <div className="page list-page"><PageHeader title="客户管理" description="集中查看客户资料、跟进进度和可匹配产品。" action="录入客户" onAction={onCreate} /><div className="list-toolbar"><label className="search-control"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索客户名称、行业或城市" /></label><span>共 {filtered.length} 家客户</span></div>{filtered.length ? <section className="data-table client-management-table"><div className="table-head"><span>客户</span><span>行业 / 城市</span><span>融资需求</span><span>完整度</span><span>阶段</span><span>负责人</span><span>操作</span></div>{filtered.map((record) => <button className="table-row" key={record.id} onClick={() => setSelectedId(record.id)}><span className="entity-name"><i><Building2 size={17} /></i><strong>{record.profile.companyName}</strong></span><span>{record.profile.industry}<small>{record.profile.city}</small></span><span>{record.profile.requestedAmount}万<small>{record.profile.requestedTerm}个月 · {record.profile.purpose}</small></span><span className="completion-cell"><strong>{record.completeness}%</strong><i><b style={{ width: `${record.completeness}%` }} /></i></span><span><StatusTag status={record.stage} /></span><span>{record.owner}<small>{record.updatedAt}</small></span><span className="row-action">查看详情<ArrowRight size={14} /></span></button>)}</section> : <EmptyState title="未找到相关客户" description="请调整关键词，或录入新的客户资料。" action="录入客户" onAction={onCreate} />}</div>;
}
