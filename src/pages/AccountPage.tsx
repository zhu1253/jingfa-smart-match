import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { useAccount, clearPrivateSession } from '../auth-context';
import { accountRequest } from '../auth-api';

export function AccountPage() {
  const user = useAccount();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!currentPassword) { setError('请输入当前密码。'); return; }
    if (newPassword.length < 8) { setError('新密码至少需要8个字符。'); return; }
    if (newPassword !== confirmation) { setError('两次输入的新密码不一致。'); return; }
    setError(''); setPending(true);
    try {
      await accountRequest('password', { currentPassword, newPassword });
      clearPrivateSession();
      window.location.replace('/login?reason=password_changed');
    } catch (error) { setError(error instanceof Error ? error.message : '修改失败，请重试。'); setPending(false); }
  };
  return <div className="page account-page"><PageHeader title="我的账号" description="查看当前身份并管理登录密码。" />
    <section className="account-profile detail-section"><h2>账号信息</h2><dl><div><dt>显示名称</dt><dd>{user.displayName}</dd></div><div><dt>登录账号</dt><dd>{user.username}</dd></div><div><dt>账号角色</dt><dd>{user.role === 'admin' ? '管理员' : '融资顾问'}</dd></div></dl></section>
    <section className="detail-section account-password"><header><div><h2><KeyRound size={18} />修改密码</h2><p>修改后所有设备将退出登录，请使用新密码重新登录。</p></div></header>
      <form onSubmit={submit} noValidate aria-busy={pending}>
        {([{id:'current-password',label:'当前密码',value:currentPassword,set:setCurrent,complete:'current-password'},{id:'new-password',label:'新密码',value:newPassword,set:setNew,complete:'new-password'},{id:'confirm-password',label:'确认新密码',value:confirmation,set:setConfirmation,complete:'new-password'}] as const).map(field => <label key={field.id} htmlFor={field.id}><span>{field.label}</span><input id={field.id} type={visible ? 'text' : 'password'} autoComplete={field.complete} value={field.value} maxLength={128} disabled={pending} onChange={e => {field.set(e.target.value);setError('');}} aria-describedby={error ? 'password-change-error' : undefined} /></label>)}
        <button className="button quiet" type="button" aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}{visible ? '隐藏密码' : '显示密码'}</button>
        {error ? <p className="field-error" id="password-change-error" role="alert">{error}</p> : null}
        <button className="button primary" type="submit" disabled={pending}>{pending ? <LoaderCircle size={16} className="spin" /> : <KeyRound size={16} />}{pending ? '正在更新…' : '更新密码'}</button>
      </form>
    </section>
  </div>;
}
