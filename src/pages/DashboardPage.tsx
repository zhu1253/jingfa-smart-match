import { useCallback, useMemo, useRef, useState, type MouseEvent } from "react";
import { ArrowRight, Building2, CheckCircle2, CircleAlert, Clock3, FilePenLine, PackageSearch } from "lucide-react";
import { runMatching } from "../matcher";
import type { ClientRecord, Product } from "../types";
import { ProductDetailDrawer } from "../components/ProductDetailDrawer";
import { CompletionBar, StatusTag } from "../components/ui";

export function DashboardPage({ records, productItems, selectedId, onSelect, onMatch, onEdit, onClients, onProducts }: { records: ClientRecord[]; productItems: Product[]; selectedId: string; onSelect: (id: string) => void; onMatch: () => void; onEdit: () => void; onClients: () => void; onProducts: () => void }) {
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [matchFilter, setMatchFilter] = useState<"全部" | "可做" | "不建议">("全部");
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const selected = records.find((record) => record.id === selectedId) ?? records[0];
  const matches = useMemo(() => runMatching(selected.profile, productItems), [selected.profile, productItems]);
  const visibleMatches = matchFilter === "全部" ? matches : matches.filter((result) => result.status === matchFilter);
  const doable = matches.filter((result) => result.status === "可做").length;
  const profile = selected.profile;
  const openDetail = (productId: string, event: MouseEvent<HTMLButtonElement>) => { detailTriggerRef.current = event.currentTarget; setDetailProductId(productId); };
  const closeDetail = useCallback(() => { setDetailProductId(null); window.requestAnimationFrame(() => detailTriggerRef.current?.focus()); }, []);
  return <div className="page dashboard-page">
    <header className="workspace-heading"><div><h1>客户匹配工作台</h1><p>切换客户即可同步查看资料概况与产品准入结果。</p></div><div><span className="approval-boundary"><CircleAlert size={14} />以资金方最终审批为准</span><button className="button primary" onClick={onEdit}><FilePenLine size={16} />编辑客户资料</button></div></header>

    <section className="insight-strip" aria-label="工作台数据概览"><div><strong>{records.length}</strong><span>当前客户</span></div><div><strong>{productItems.length}</strong><span>结构化产品</span></div><div><strong>{doable}</strong><span>当前可做</span></div><div><strong>{profile.requestedAmount}万</strong><span>融资需求</span></div></section>

    <div className="workspace-shell">
      <aside className="customer-rail"><header><div><h2>客户列表</h2><span>{records.length} 家</span></div><button className="text-button" onClick={onClients}>全部客户</button></header><div className="customer-list">{records.map((record) => <button key={record.id} className={record.id === selected.id ? "selected" : ""} onClick={() => onSelect(record.id)} aria-pressed={record.id === selected.id}><span className="company-icon"><Building2 size={17} /></span><span><strong>{record.profile.companyName}</strong><small>{record.profile.industry} · {record.profile.city}</small><i><Clock3 size={12} />{record.updatedAt}</i></span><StatusTag status={record.stage} /></button>)}</div></aside>

      <section className="matching-workspace">
        <div className="customer-overview"><header><div><h2>{profile.companyName}</h2><StatusTag status={selected.stage} /></div><p>{profile.industry} · {profile.city} · {profile.platform}</p></header><div className="customer-facts"><div><span>经营年限</span><strong>{profile.operatingYears}年</strong></div><div><span>月均流水</span><strong>{profile.monthlyFlow}万</strong></div><div><span>资产负债率</span><strong>{profile.debtRatio}%</strong></div><div><span>融资需求</span><strong>{profile.requestedAmount}万 / {profile.requestedTerm}个月</strong></div></div><CompletionBar value={selected.completeness} /><div className="overview-actions"><span><CheckCircle2 size={15} />已根据当前资料完成 {productItems.length} 个产品比对</span><button className="button secondary" onClick={onMatch}><PackageSearch size={16} />查看完整匹配</button></div></div>

        <div className="match-table-block"><div className="section-toolbar"><div><h2>产品匹配结果</h2><p>已按匹配度从高到低排序</p></div><div className="match-toolbar-actions"><div className="compact-filter" role="group" aria-label="筛选匹配状态">{(["全部", "可做", "不建议"] as const).map((item) => <button key={item} className={matchFilter === item ? "active" : ""} aria-pressed={matchFilter === item} onClick={() => setMatchFilter(item)}>{item}</button>)}</div><button className="text-button" onClick={onProducts}>进入产品中心<ArrowRight size={14} /></button></div></div><div className="data-table match-preview-table" role="table"><div className="table-head" role="row"><span>排名</span><span>产品 / 资金方</span><span>预估额度</span><span>利率</span><span>匹配度</span><span>状态</span><span>操作</span></div>{visibleMatches.length ? visibleMatches.slice(0, 6).map((result) => { const rank = matches.findIndex((item) => item.product.id === result.product.id) + 1; return <div className={`table-row ${detailProductId === result.product.id ? "selected" : ""}`} key={result.product.id} role="row" data-product-id={result.product.id}><span>{rank}</span><span><strong>{result.product.name}</strong><small>{result.product.funder} · {result.product.type}</small></span><span>{result.estimate}</span><span>{result.product.rateLabel}</span><span className="score-cell">{result.score}%</span><span><StatusTag status={result.status} /></span><span><button className="row-detail-button" onClick={(event) => openDetail(result.product.id, event)} aria-label={`查看${result.product.name}详情`}>查看详情<ArrowRight size={14} /></button></span></div>; }) : <div className="match-table-empty"><CircleAlert size={22} /><strong>当前筛选下暂无产品</strong><p>请选择其他匹配状态查看结果。</p><button className="button quiet" onClick={() => setMatchFilter("全部")}>查看全部结果</button></div>}</div></div>
      </section>
    </div>
    <ProductDetailDrawer productId={detailProductId} results={matches} onClose={closeDetail} />
  </div>;
}
