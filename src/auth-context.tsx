import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { accountRequest, loginLocation, type AccountUser } from './auth-api';
const AuthContext = createContext<AccountUser | null>(null);

export function clearPrivateSession() {
  sessionStorage.removeItem('jingfa-library-session');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const identity = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let checking = false;
    const expire = () => { clearPrivateSession(); setUser(null); window.location.replace(loginLocation('expired')); };
    const check = async () => {
      if (checking || controller.signal.aborted) return;
      checking = true;
      try {
        const payload = await accountRequest<{ user: AccountUser }>('session', undefined, controller.signal);
        if (identity.current && identity.current !== payload.user.id) clearPrivateSession();
        identity.current = payload.user.id;
        setUser(payload.user); setError('');
      } catch (error) {
        if (!controller.signal.aborted && !((error as { status?: number }).status === 401)) setError(error instanceof Error ? error.message : '登录状态验证失败。');
      } finally { checking = false; }
    };
    window.addEventListener('auth-expired', expire);
    window.addEventListener('focus', check);
    const restored = (event: PageTransitionEvent) => { if(event.persisted) { setUser(null); void check(); } };
    window.addEventListener('pageshow', restored);
    const timer = window.setInterval(check, 60_000);
    void check();
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('auth-expired', expire); window.removeEventListener('focus', check); window.removeEventListener('pageshow', restored); };
  }, [retry]);
  if (!user) return <div className="auth-status" role="status"><span className="logo-mark"><span /><span /></span><h1>京发智配</h1><p>{error || '正在验证登录状态…'}</p>{error ? <button className="button primary" onClick={() => { setError(''); setRetry(value => value + 1); }}>重新连接</button> : null}</div>;
  return <AuthContext.Provider key={user.id} value={user}>{children}</AuthContext.Provider>;
}

export function useAccount() {
  const user = useContext(AuthContext);
  if (!user) throw new Error('Account provider missing');
  return user;
}
