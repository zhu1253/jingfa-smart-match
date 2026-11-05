import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, LoaderCircle, LockKeyhole, RotateCcw, Save } from "lucide-react";
import { PageHeader } from "../components/ui";
import type { View } from "../components/AppShell";
import { usePreferences } from "../preferences-context";
import { defaultPreferences, startPages, type UserPreferences } from "../preferences";
import { checkAgentHealth } from "../agent";

type Health = { status: "idle" | "checking" | "success" | "error"; message: string };

export function SettingsPage({ onNavigate, libraryUnlocked, onLockLibrary, onDirtyChange, notify }: {
  onNavigate: (view: View) => void;
  libraryUnlocked: boolean;
  onLockLibrary: () => void;
  onDirtyChange: (dirty: boolean) => void;
  notify: (message: string) => void;
}) {
  const { preferences, warning, save } = usePreferences();
  const [draft, setDraft] = useState<Partial<UserPreferences>>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [health, setHealth] = useState<Health>({ status: "idle", message: "尚未检测。检测只检查代理服务连通性，不发送对话，也不代表模型回答可用。" });
  const controller = useRef<AbortController | null>(null);
  const values = { ...preferences, ...draft };
  const dirty = (Object.keys(values) as Array<keyof UserPreferences>).some(key => values[key] !== preferences[key]);

  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => () => controller.current?.abort(), []);

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setDraft(current => ({ ...current, [key]: value })); setError(""); setStatus("");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try { save(values); setDraft({}); setError(""); setStatus("设置已保存并生效。"); notify("系统设置已保存"); }
    catch (error) { setError(error instanceof Error ? error.message : "保存失败，请重试。"); setStatus(""); }
  };
  const testConnection = async () => {
    if (health.status === "checking") return;
    const current = new AbortController(); controller.current = current;
    setHealth({ status: "checking", message: "正在检测代理服务连通性…" });
    const timeout = window.setTimeout(() => current.abort("timeout"), 10_000);
    try {
      await checkAgentHealth(current.signal);
      if (controller.current === current) setHealth({ status: "success", message: "代理服务连接正常。模型对话是否可用，请在业务智能体中发送问题验证。" });
    } catch (error) {
      if (current.signal.aborted && current.signal.reason !== "timeout") return;
      setHealth({ status: "error", message: current.signal.reason === "timeout" ? "连接检测超时，请检查网络后重新检测。" : error instanceof Error ? error.message : "连接检测失败，请稍后重试。" });
    } finally { window.clearTimeout(timeout); }
  };

  return <div className="page preferences-page">
    <PageHeader title="系统设置" description="调整个人使用偏好，管理账号安全与服务连接。" />
    <p className="preferences-scope">以下偏好仅保存到当前账号在此浏览器中的配置；其他账号、浏览器和设备互不影响。</p>
    {warning ? <p className="preferences-warning" role="status"><CircleAlert size={17} />{warning}</p> : null}
    <form className="preferences-form" onSubmit={submit} aria-label="个人偏好设置">
      <section className="preferences-section" aria-labelledby="preferences-general-title">
        <header><h2 id="preferences-general-title">常规与显示</h2><p>保存后立即应用。默认进入页面在下次从首页打开时生效。</p></header>
        <div className="preference-row"><label htmlFor="preference-start-page"><strong id="start-page-label">默认进入页面</strong><span id="start-page-help">直接访问首页时打开此页面；已有页面链接仍优先保留。</span></label><select id="preference-start-page" value={values.startPage} onChange={event => update("startPage", event.target.value as UserPreferences["startPage"])} aria-labelledby="start-page-label" aria-describedby="start-page-help">{startPages.map(page => <option key={page.value} value={page.value}>{page.label}</option>)}</select></div>
        <div className="preference-row"><label htmlFor="preference-density"><strong id="density-label">列表显示密度</strong><span id="density-help">调整客户、产品、匹配结果和资料列表的行间距。</span></label><select id="preference-density" value={values.density} onChange={event => update("density", event.target.value as UserPreferences["density"])} aria-labelledby="density-label" aria-describedby="density-help"><option value="comfortable">舒适</option><option value="compact">紧凑</option></select></div>
        <div className="preference-row"><div><strong id="sidebar-setting-label">导航默认收起</strong><span id="sidebar-setting-help">桌面端显示图标导航，也可随时使用左下角按钮展开。</span></div><button type="button" className="preference-switch" role="switch" aria-checked={values.sidebarCollapsed} aria-labelledby="sidebar-setting-label" aria-describedby="sidebar-setting-help" onClick={() => update("sidebarCollapsed", !values.sidebarCollapsed)}><span /></button></div>
        <div className="preference-row"><div><strong id="motion-setting-label">减少动效</strong><span id="motion-setting-help">减少页面、抽屉与滚动动画；同时遵循设备的减少动态效果设置。</span></div><button type="button" className="preference-switch" role="switch" aria-checked={values.reduceMotion} aria-labelledby="motion-setting-label" aria-describedby="motion-setting-help" onClick={() => update("reduceMotion", !values.reduceMotion)}><span /></button></div>
      </section>
      <footer className="preferences-save-bar"><div aria-live="polite">{error ? <p className="field-error" role="alert">{error}</p> : status ? <p className="preferences-saved"><CheckCircle2 size={16} />{status}</p> : <p>{dirty ? "有未保存的更改" : "当前设置已同步到页面"}</p>}</div><div><button className="button quiet" type="button" onClick={() => { setDraft({ ...defaultPreferences }); setError(""); setStatus("已填入默认值，点击保存后生效。"); }}><RotateCcw size={15} />恢复默认值</button><button className="button secondary" type="button" disabled={!dirty} onClick={() => { setDraft({}); setError(""); setStatus("已取消未保存的更改。"); }}>取消更改</button><button className="button primary" type="submit" disabled={!dirty && !warning}><Save size={16} />保存设置</button></div></footer>
    </form>

    <section className="preferences-section" aria-labelledby="preferences-security-title"><header><h2 id="preferences-security-title">账号与访问</h2><p>账号密码与资料库访问独立管理。</p></header>
      <div className="preference-row"><div><strong>登录账号与密码</strong><span>查看当前登录身份，或验证当前密码后修改登录密码。</span></div><button className="button secondary" onClick={() => onNavigate("account")}>管理账号<ArrowRight size={15} /></button></div>
      <div className="preference-row"><div><strong>资料库访问 <span className={`preference-access ${libraryUnlocked ? "unlocked" : ""}`}>{libraryUnlocked ? "已解锁" : "已锁定"}</span></strong><span>解锁状态仅在当前会话有效，可随时重新锁定。</span></div>{libraryUnlocked ? <button className="button secondary" onClick={() => { onLockLibrary(); notify("资料库已锁定"); }}><LockKeyhole size={15} />立即锁定</button> : <button className="button secondary" onClick={() => onNavigate("library")}>前往验证<ArrowRight size={15} /></button>}</div>
    </section>
    <section className="preferences-section" aria-labelledby="preferences-service-title"><header><h2 id="preferences-service-title">智能体连接</h2><p>连接参数与密钥由服务器管理；产品匹配在对话窗口中手动开启，默认关闭。</p></header><div className="preference-row"><div><strong>业务智能体代理</strong><p className={`preference-health ${health.status}`} role={health.status === "error" ? "alert" : "status"}>{health.status === "success" ? <CheckCircle2 size={16} /> : health.status === "error" ? <CircleAlert size={16} /> : null}{health.message}</p></div><button className="button secondary" disabled={health.status === "checking"} onClick={testConnection}>{health.status === "checking" ? <LoaderCircle size={16} className="spin" /> : null}{health.status === "checking" ? "检测中…" : "检测连接"}</button></div></section>
  </div>;
}
