import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, Inbox, RefreshCw, X } from "lucide-react";
import type { MatchResult } from "../types";
import { MatchDetail } from "./MatchDetail";

type DetailState =
  | { status: "loading"; source: MatchResult[]; productId: string }
  | { status: "ready"; source: MatchResult[]; productId: string; result: MatchResult }
  | { status: "empty"; source: MatchResult[]; productId: string }
  | { status: "error"; source: MatchResult[]; productId: string; message: string };

export function ProductDetailDrawer({ productId, results, onClose }: { productId: string | null; results: MatchResult[]; onClose: () => void }) {
  const [state, setState] = useState<DetailState>({ status: "loading", source: [], productId: "" });
  const [retryToken, setRetryToken] = useState(0);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!productId) return undefined;
    setState({ status: "loading", source: results, productId });
    const timer = window.setTimeout(() => {
      if (results.length === 0) { setState({ status: "empty", source: results, productId }); return; }
      const result = results.find((item) => item.product.id === productId);
      setState(result ? { status: "ready", source: results, productId, result } : { status: "error", source: results, productId, message: "未找到该产品的匹配详情，产品可能已更新或移除。" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [productId, results, retryToken]);

  useEffect(() => {
    if (!productId) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => drawerRef.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => { window.clearTimeout(focusTimer); window.removeEventListener("keydown", handleKey); document.body.style.overflow = previousOverflow; };
  }, [productId, onClose]);

  if (!productId) return null;
  const visibleState: DetailState = state.source === results && state.productId === productId ? state : { status: "loading", source: results, productId };
  return createPortal(<div className="detail-drawer-layer"><button className="drawer-backdrop" tabIndex={-1} aria-label="关闭产品详情" onClick={onClose} /><aside className="product-detail-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-label="产品匹配详情">
    {visibleState.status === "ready" ? <MatchDetail result={visibleState.result} onClose={onClose} /> : <div className="drawer-state" aria-live="polite" aria-busy={visibleState.status === "loading"}>
      <header><div><strong>产品匹配详情</strong><span>正在读取当前产品数据</span></div><button className="icon-button" onClick={onClose} aria-label="关闭产品详情"><X size={18} /></button></header>
      {visibleState.status === "loading" ? <div className="detail-skeleton" aria-label="详情加载中"><i /><i /><i /><i /><i /></div> : null}
      {visibleState.status === "empty" ? <div className="drawer-message"><Inbox size={28} /><h2>暂无匹配详情</h2><p>当前客户还没有可展示的产品匹配数据。</p><button className="button secondary" onClick={onClose}>返回结果列表</button></div> : null}
      {visibleState.status === "error" ? <div className="drawer-message error"><CircleAlert size={28} /><h2>详情加载失败</h2><p>{visibleState.message}</p><button className="button secondary" onClick={() => setRetryToken((value) => value + 1)}><RefreshCw size={15} />重新加载</button></div> : null}
    </div>}
  </aside></div>, document.body);
}
