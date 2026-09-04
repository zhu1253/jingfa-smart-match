import type { ReactNode } from "react";
import { ArrowLeft, Building2, CheckCircle2, ChevronRight, Inbox, Plus } from "lucide-react";
import type { ProductStatus } from "../types";

export function Logo() {
  return <div className="logo" aria-label="京发智配"><span className="logo-mark"><span /><span /></span><span>京发智配</span></div>;
}

export function StatusTag({ status }: { status: ProductStatus | "待补全" | "跟进中" | "可匹配" | "优先合作" | "合作中" | "待接洽" }) {
  const tone = ["可做", "可匹配", "优先合作", "合作中"].includes(status)
    ? "success"
    : ["不建议"].includes(status)
      ? "danger"
      : "warning";
  return <span className={`status-tag ${tone}`}><i aria-hidden="true" />{status}</span>;
}

export function PageHeader({ title, description, action, onAction, trail }: { title: string; description: string; action?: string; onAction?: () => void; trail?: string }) {
  return (
    <header className="page-header">
      <div>{trail ? <span className="breadcrumb">{trail}<ChevronRight size={13} aria-hidden="true" /></span> : null}<h1>{title}</h1><p>{description}</p></div>
      {action ? <button className="button primary" onClick={onAction}><Plus size={16} />{action}</button> : null}
    </header>
  );
}

export function DetailHeader({ title, subtitle, onBack, onEdit }: { title: string; subtitle: string; onBack: () => void; onEdit?: () => void }) {
  return (
    <header className="detail-page-header">
      <button className="button quiet" onClick={onBack}><ArrowLeft size={16} />返回列表</button>
      <div><span className="entity-icon"><Building2 size={19} /></span><div><h1>{title}</h1><p>{subtitle}</p></div></div>
      {onEdit ? <button className="button secondary" onClick={onEdit}>编辑资料</button> : null}
    </header>
  );
}

export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><Inbox size={28} /><h2>{title}</h2><p>{description}</p>{action ? <button className="button secondary" onClick={onAction}>{action}</button> : null}</div>;
}

export function InfoGrid({ items }: { items: Array<[string, ReactNode]> }) {
  return <dl className="info-grid">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function CompletionBar({ value }: { value: number }) {
  return <div className="completion-bar" aria-label={`资料完整度 ${value}%`}><div><span>资料完整度</span><strong>{value}%</strong></div><span className="progress-track"><i style={{ width: `${value}%` }} /></span></div>;
}

export function SuccessMark() {
  return <CheckCircle2 size={16} aria-hidden="true" />;
}

