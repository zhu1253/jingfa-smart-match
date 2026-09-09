import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, BookOpen, Eye, EyeOff, FileText, KeyRound, LockKeyhole, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { verifyLibraryPassword } from "../security";
import { PageHeader } from "../components/ui";
import { libraryDocuments } from "../data";

function LockedLibrary({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password) { setError("请输入管理员密码"); inputRef.current?.focus(); return; }
    setChecking(true); setError("");
    try { const valid = await verifyLibraryPassword(password); if (valid) { onUnlock(); return; } setError("密码不正确，请重新输入"); setPassword(""); requestAnimationFrame(() => inputRef.current?.focus()); } catch { setError("当前浏览器无法完成安全验证，请升级浏览器后重试"); } finally { setChecking(false); }
  };
  const reset = () => { setPassword(""); setError(""); inputRef.current?.focus(); };
  return <div className="page library-lock-page"><PageHeader title="资料库" description="产品资料与生态文档的受控访问空间。" /><section className="unlock-layout"><div className="unlock-copy"><span className="lock-visual"><LockKeyhole size={30} /></span><h2>资料库已锁定</h2><p>资料库包含产品规则和合作资料。请输入管理员密码完成本次会话验证。</p><ul><li><ShieldCheck size={15} />使用浏览器 Web Crypto 派生验证</li><li><KeyRound size={15} />解锁状态仅保留在当前浏览器会话</li><li><LogOut size={15} />可随时退出并重新锁定</li></ul></div><form className="unlock-form" onSubmit={submit} noValidate><header><h2>管理员验证</h2><p>验证通过后进入资料库</p></header><label><span>管理员密码</span><div className={`password-control ${error ? "invalid" : ""}`}><input ref={inputRef} autoFocus type={visible ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError(""); }} autoComplete="current-password" aria-invalid={Boolean(error)} aria-describedby="password-help password-error" placeholder="请输入密码" /><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "隐藏密码" : "显示密码"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small id="password-help">密码只用于本次访问验证，不会写入本地存储。</small>{error ? <span className="field-error" id="password-error" role="alert">{error}</span> : null}</label><button className="button primary full-button" disabled={checking} type="submit">{checking ? <span className="button-loader" /> : <LockKeyhole size={16} />}{checking ? "正在验证…" : "验证并进入"}</button>{error ? <button type="button" className="button quiet full-button" onClick={reset}><RotateCcw size={15} />重新输入</button> : null}</form></section></div>;
}

export function LibraryPage({ unlocked, onUnlock, onLock, notify }: { unlocked: boolean; onUnlock: () => void; onLock: () => void; notify: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!unlocked) return <LockedLibrary onUnlock={() => { onUnlock(); notify("管理员验证通过，资料库已解锁"); }} />;
  const selected = libraryDocuments.find((document) => document.id === selectedId);
  if (selected) return <div className="page detail-page"><header className="document-detail-header"><button className="button quiet" onClick={() => setSelectedId(null)}><ArrowLeft size={16} />返回资料库</button><span className="document-icon"><FileText size={22} /></span><div><h1>{selected.name}</h1><p>{selected.type} · 更新于 {selected.updated}</p></div></header><section className="document-preview"><div><h2>资料摘要</h2><p>{selected.summary}</p></div><dl><div><dt>资料类型</dt><dd>{selected.type}</dd></div><div><dt>已提取规则</dt><dd>{selected.rules} 条</dd></div><div><dt>结构化状态</dt><dd>已完成</dd></div><div><dt>使用范围</dt><dd>内部业务初筛</dd></div></dl><div className="document-notice"><ShieldCheck size={17} /><p>本页展示的是已提取的业务要点。产品政策可能发生变化，使用前应复核资金方最新资料。</p></div></section></div>;
  return <div className="page list-page"><PageHeader title="资料库" description="产品资料与生态文档的结构化索引。" /><div className="library-access-bar"><div><BookOpen size={18} /><span><strong>管理员会话已验证</strong><small>关闭当前浏览器会话后将自动锁定</small></span></div><button className="button secondary" onClick={() => { onLock(); notify("资料库已重新锁定"); }}><LogOut size={15} />退出并锁定</button></div><section className="library-list">{libraryDocuments.map((document) => <button key={document.id} onClick={() => setSelectedId(document.id)}><span className="document-icon"><FileText size={20} /></span><div><strong>{document.name}</strong><p>{document.summary}</p><small>{document.type} · 更新于 {document.updated}</small></div><span><b>{document.rules}</b><small>条规则</small></span></button>)}</section></div>;
}
