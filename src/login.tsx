import { StrictMode, useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { accountRequest, type AccountUser } from './auth-api';
import './login.css';

function destination() {
  const value = new URLSearchParams(window.location.search).get('next') || '/';
  return value.startsWith('/') && !value.startsWith('//') && !/[\\\r\n]/.test(value) && !value.startsWith('/login') ? `${value}${value.includes('#') ? '' : window.location.hash}` : '/';
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const reason = new URLSearchParams(window.location.search).get('reason');
  useEffect(() => {
    const controller = new AbortController();
    accountRequest<{ user: AccountUser }>('session', undefined, controller.signal).then(() => window.location.replace(destination())).catch(() => {});
    return () => controller.abort();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!username.trim() || !password) { setError('请输入账号和密码。'); return; }
    setPending(true); setError('');
    try {
      await accountRequest('login', { username: username.trim(), password });
      setPassword('');
      window.location.replace(destination());
    } catch (error) { setError(error instanceof Error ? error.message : '登录失败，请重试。'); setPending(false); }
  };
  return <main className="login-layout">
    <section className="login-brand" aria-label="京发智配介绍">
      <a className="login-logo" href="/login"><span className="login-logo-mark"><i /><i /></span>京发智配</a>
      <div className="login-intro"><h1>让每一次业务判断<br />都有据可依。</h1><p>连接客户、资金与行业知识，<br />在同一个工作空间推进业务。</p><div className="login-capabilities"><span>客户管理</span><span>产品匹配</span><span>业务智能体</span></div></div>
      <p className="login-brand-foot">京发智配 · 跨境融资业务工作平台</p>
    </section>
    <section className="login-main"><form className="login-form" onSubmit={submit} noValidate aria-busy={pending}>
      <span className="login-lock"><LockKeyhole size={23} /></span>
      <h2>登录工作台</h2><p className="login-description">使用你的平台账号继续</p>
      {reason === 'password_changed' ? <p className="login-notice" role="status">密码已更新，请使用新密码登录。</p> : reason === 'expired' ? <p className="login-notice" role="status">登录已过期，请重新登录。</p> : null}
      <label htmlFor="username">账号</label><input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={e => { setUsername(e.target.value); setError(''); }} placeholder="请输入账号" maxLength={100} disabled={pending} aria-describedby={error ? 'login-error' : undefined} />
      <label htmlFor="password">密码</label><div className="login-password"><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="请输入密码" maxLength={128} disabled={pending} aria-describedby={error ? 'login-error' : undefined} /><button type="button" aria-label={visible ? '隐藏密码' : '显示密码'} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
      {error ? <p id="login-error" className="login-error" role="alert">{error}</p> : null}
      <button className="login-submit" type="submit" disabled={pending}>{pending ? <><LoaderCircle className="login-spin" size={18} />正在登录…</> : <>登录<ArrowRight size={18} /></>}</button>
      <p className="login-assistance">账号由管理员分配。如需开通或重置，请联系平台管理员。</p>
    </form><footer>请在受信任的设备上登录，使用后及时退出。</footer></section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><LoginPage /></StrictMode>);
