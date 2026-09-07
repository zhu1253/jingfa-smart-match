import { CheckCircle2, CircleAlert, FileCheck2, Layers3, X } from "lucide-react";
import type { MatchResult } from "../types";
import { StatusTag } from "./ui";

export function MatchDetail({ result, onClose }: { result: MatchResult; onClose?: () => void }) {
  const reasons = result.status === "可做" ? result.passes : result.failures;
  return <aside className="match-detail" aria-label={`${result.product.name}匹配详情`}>
    <header><div><StatusTag status={result.status} /><h2>{result.product.name}</h2><p>{result.product.funder} · {result.product.currency}</p></div>{onClose ? <button className="icon-button" onClick={onClose} aria-label="关闭产品详情"><X size={18} /></button> : null}</header>
    <div className="detail-metrics"><div><span>匹配度</span><strong>{result.score}%</strong></div><div><span>预估额度</span><strong>{result.estimate}</strong></div></div>
    <section><h3><Layers3 size={16} />产品信息</h3><dl className="detail-definition"><div><dt>产品类型</dt><dd>{result.product.type}</dd></div><div><dt>适用客户</dt><dd>{result.product.audience}</dd></div></dl><strong className="feature-label">核心功能</strong><ul className="feature-list">{result.product.coreFeatures.map((feature) => <li key={feature}>{feature}</li>)}</ul></section>
    <section><h3>判断依据</h3><ul className={result.status === "可做" ? "reason-list success" : "reason-list danger"}>{reasons.map((reason) => <li key={reason}>{result.status === "可做" ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}<span>{reason}</span></li>)}</ul></section>
    <section><h3>建议方案</h3><dl className="detail-definition"><div><dt>申请顺序</dt><dd>{result.status === "可做" ? "优先申请" : "暂缓申请"}</dd></div><div><dt>参考利率</dt><dd>{result.product.rateLabel}</dd></div><div><dt>参考期限</dt><dd>{result.product.termLabel}</dd></div></dl><p className="approval-note">以上为初步测算，以资金方最终审批为准。</p></section>
    <section><h3><FileCheck2 size={16} />所需材料</h3><ol className="material-list">{result.product.materials.map((item) => <li key={item}>{item}</li>)}</ol></section>
    <section className="source-box"><strong>相关说明</strong><p>准入规则来源：{result.product.source}。匹配结果仅用于业务初筛，以资金方最终审批为准。</p></section>
  </aside>;
}
