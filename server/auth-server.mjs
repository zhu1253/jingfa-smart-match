import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { hashPassword, verifyPassword } from './password.mjs';
import { createMysqlStore } from './auth-store.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const safeUser = user => ({ id:user.public_id, username:user.username, displayName:user.display_name, role:user.role_code });
function nextPath(value) { return typeof value==='string' && value.startsWith('/') && !value.startsWith('//') && !/[\\\r\n]/.test(value) && value.length<=1500 ? value : '/'; }

export async function createAuthServer({ store, origin, secure = true, sessionSeconds = 8*60*60, publicDir = path.resolve('public-login') }) {
  const dummyHash = await hashPassword(randomBytes(32).toString('hex'));
  const cookieName = secure ? '__Host-jingfa_session' : 'jingfa_dev_session';
  const cookie = (token, age=sessionSeconds) => `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure?'; Secure':''}`;
  const send = (res, status, value, headers={}) => {
    res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers});
    res.end(value===null ? '' : JSON.stringify(value));
  };
  const fail = (res,status,code,message,headers) => send(res,status,{error:{code,message}},headers);
  function tokenFrom(req) {
    const raw = (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
    return raw && /^[a-f0-9]{64}$/.test(raw) ? digest(raw) : null;
  }
  async function body(req) {
    if(!String(req.headers['content-type']||'').startsWith('application/json')) throw Object.assign(new Error('仅支持 JSON 请求。'),{status:415});
    const chunks=[];let size=0;
    for await (const chunk of req) { size+=chunk.length;if(size>8192)throw Object.assign(new Error('请求内容过长。'),{status:413});chunks.push(chunk); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {throw Object.assign(new Error('请求格式不正确。'),{status:400});}
  }
  const server=http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://auth.internal');
      if(['GET','HEAD'].includes(req.method) && (url.pathname==='/login' || url.pathname.startsWith('/login-assets/'))) {
        const relative=url.pathname==='/login'?'login.html':url.pathname.slice(1);
        const file=path.resolve(publicDir,relative);
        if(!file.startsWith(path.resolve(publicDir)+path.sep))return fail(res,404,'not_found','页面不存在。');
        const bytes=await readFile(file).catch(()=>null);
        if(!bytes)return fail(res,404,'not_found','页面不存在。');
        const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html';
        res.writeHead(200,{'content-type':`${type}; charset=utf-8`,'content-length':bytes.length,'cache-control':file.endsWith('.html')?'no-store':'public,max-age=31536000,immutable','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});
        return res.end(req.method==='HEAD'?undefined:bytes);
      }
      if(req.method==='GET'&&url.pathname==='/health'){await store.ping();return send(res,200,{status:'ok',service:'jingfa-auth'});}
      const tokenHash=tokenFrom(req);
      if(req.method==='GET'&&['/api/auth/session','/api/auth/verify','/api/auth/verify-page'].includes(url.pathname)) {
        const user=tokenHash?await store.session(tokenHash):null;
        if(!user) {
          if(url.pathname.endsWith('verify-page'))return send(res,303,null,{location:`/login?next=${encodeURIComponent(nextPath(req.headers['x-forwarded-uri']))}`});
          return fail(res,401,'unauthenticated','请登录后继续。');
        }
        return url.pathname==='/api/auth/session'?send(res,200,{user:safeUser(user)}):send(res,204,null);
      }
      if(req.method!=='POST')return fail(res,404,'not_found','接口不存在。');
      if(req.headers.origin!==origin)return fail(res,403,'origin_denied','请求来源无效，请刷新页面后重试。');
      if(url.pathname==='/api/auth/login') {
        const data=await body(req);
        const username=typeof data?.username==='string'?data.username.trim().toLowerCase():'';
        const password=typeof data?.password==='string'?data.password:'';
        if(!/^[a-z0-9_.-]{3,100}$/.test(username)||!password||password.length>128)return fail(res,400,'invalid_credentials','账号或密码不正确。');
        const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim();
        const accountKey=digest(`account:${username}`);
        const allowed=await Promise.all([store.attempt(digest(`ip:${ip}`),60),store.attempt(accountKey,12)]);
        if(allowed.some(v=>!v))return fail(res,429,'rate_limited','尝试次数过多，请15分钟后重试。',{'retry-after':'900'});
        const user=await store.findUser(username);
        const valid=await verifyPassword(password,user?.password_hash||dummyHash);
        if(!valid||user?.status!=='active')return fail(res,401,'invalid_credentials','账号或密码不正确。');
        const token=randomBytes(32).toString('hex');
        await store.createSession(digest(token),user.id,new Date(Date.now()+sessionSeconds*1000));
        await store.resetAttempt(accountKey);
        return send(res,200,{user:safeUser(user)},{'set-cookie':cookie(token)});
      }
      if(!['/api/auth/logout','/api/auth/password'].includes(url.pathname))return fail(res,404,'not_found','接口不存在。');
      const user=tokenHash?await store.session(tokenHash):null;
      if(!user)return fail(res,401,'unauthenticated','登录已过期，请重新登录。',{'set-cookie':cookie('',0)});
      if(url.pathname==='/api/auth/logout'){await store.logout(tokenHash);return send(res,200,{ok:true},{'set-cookie':cookie('',0)});}
      const data=await body(req);
      if(typeof data?.currentPassword!=='string'||typeof data?.newPassword!=='string'||data.currentPassword.length>128||data.newPassword.length<8||data.newPassword.length>128)return fail(res,400,'invalid_password','新密码需要8–128个字符。');
      if(!await store.attempt(digest(`password:${user.id}`),12))return fail(res,429,'rate_limited','尝试次数过多，请15分钟后重试。',{'retry-after':'900'});
      if(!await verifyPassword(data.currentPassword,user.password_hash))return fail(res,400,'wrong_password','当前密码不正确。');
      if(data.currentPassword===data.newPassword)return fail(res,400,'same_password','请使用与当前密码不同的新密码。');
      if(!await store.changePassword(user.id,user.password_hash,await hashPassword(data.newPassword)))return fail(res,409,'account_changed','账号状态已变化，请重新登录。');
      return send(res,200,{ok:true,message:'密码已更新，请重新登录。'},{'set-cookie':cookie('',0)});
    } catch(error) {
      if(!res.headersSent)fail(res,error.status||503,'service_error',error.status?error.message:'账号服务暂时不可用，请稍后重试。');
      else res.end();
      if(!error.status)console.error(JSON.stringify({event:'auth_error',code:error.code||'internal_error'}));
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  return server;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const origin=process.env.PUBLIC_ORIGIN;
  if(!origin || !process.env.MYSQL_PASSWORD)throw new Error('PUBLIC_ORIGIN and database credentials are required');
  const store=await createMysqlStore(process.env);
  await store.ping();
  const server=await createAuthServer({store,origin,secure:process.env.COOKIE_SECURE!=='false',publicDir:process.env.LOGIN_PUBLIC_DIR||path.resolve('public-login')});
  server.listen(Number(process.env.PORT||3100),'0.0.0.0',()=>console.log('jingfa_auth_started'));
  const timer=setInterval(()=>store.cleanup().catch(()=>{}),10*60*1000);timer.unref();
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{clearInterval(timer);await store.close();process.exit(0);}));
}
