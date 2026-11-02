import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createAuthServer } from './auth-server.mjs';
import { hashPassword,verifyPassword } from './password.mjs';
import { memoryStore } from './tests/memory-store.mjs';

const origin='https://app.example.test';
const password='Fixture-pass-9827';
async function fixture(t,options={}) {
  const user={id:1,public_id:'test-user-id',username:'test-admin',display_name:'测试管理员',role_code:'admin',status:'active',password_hash:await hashPassword(password)};
  const store=memoryStore(user);
  const server=await createAuthServer({store,origin,...options});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=(route,data,cookie,extra={})=>fetch(`${base}${route}`,{redirect:'manual',method:data===undefined?'GET':'POST',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{}),...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});
  const login=async()=>{const res=await request('/api/auth/login',{username:user.username,password});assert.equal(res.status,200);return res.headers.get('set-cookie').split(';')[0];};
  return {request,login,store,user};
}

test('password hashes use fresh salts and timing-safe verification',async()=>{const a=await hashPassword(password),b=await hashPassword(password);assert.notEqual(a,b);assert(!a.includes(password));assert(await verifyPassword(password,a));assert(!await verifyPassword('wrong',a));assert(!await verifyPassword(password,'bad'));});
test('login, session identity, secure cookie and server-side logout',async t=>{
  const f=await fixture(t);
  assert.equal((await f.request('/api/auth/session')).status,401);
  const response=await f.request('/api/auth/login',{username:f.user.username,password});
  assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie');
  for(const flag of ['__Host-jingfa_session=','HttpOnly','Secure','SameSite=Lax','Path=/'])assert(cookie.includes(flag));
  const identity=await response.json();assert.equal(identity.user.username,f.user.username);assert(!JSON.stringify(identity).includes('password'));
  const token=cookie.split(';')[0];assert.equal((await f.request('/api/auth/verify',undefined,token)).status,204);
  assert(![...f.store.sessions.keys()][0].includes(token.split('=')[1]));
  assert.equal((await f.request('/api/auth/logout',{},token)).status,200);
  assert.equal((await f.request('/api/auth/session',undefined,token)).status,401);
});
test('wrong credentials, CSRF protection, page redirects and expiry',async t=>{
  const f=await fixture(t);
  assert.equal((await f.request('/api/auth/login',{username:'test-admin',password:'wrong'})).status,401);
  assert.equal((await f.request('/api/auth/login',{username:'not-real',password:'wrong'})).status,401);
  assert.equal((await f.request('/api/auth/login',{username:'test-admin',password},{},{origin:'https://attacker.test'})).status,403);
  const redirect=await f.request('/api/auth/verify-page',undefined,null,{'x-forwarded-uri':'/#products'});assert.equal(redirect.status,303);assert.equal(redirect.headers.get('location'),'/login?next=%2F%23products');
  const cookie=await f.login();for(const session of f.store.sessions.values())session.expiry=new Date(0);
  assert.equal((await f.request('/api/auth/session',undefined,cookie)).status,401);
});
test('password change verifies current password and revokes every session',async t=>{
  const f=await fixture(t);const first=await f.login();const second=await f.login();
  assert.equal((await f.request('/api/auth/password',{currentPassword:'wrong',newPassword:'Changed-1029'},first)).status,400);
  assert.equal((await f.request('/api/auth/password',{currentPassword:password,newPassword:'short'},first)).status,400);
  assert.equal((await f.request('/api/auth/password',{currentPassword:password,newPassword:'Changed-1029'},first)).status,200);
  assert.equal((await f.request('/api/auth/session',undefined,second)).status,401);
  assert.equal((await f.request('/api/auth/login',{username:f.user.username,password})).status,401);
  assert.equal((await f.request('/api/auth/login',{username:f.user.username,password:'Changed-1029'})).status,200);
});
test('repeated failed logins are rate-limited and disabled users cannot sign in',async t=>{
  const f=await fixture(t);
  f.user.status='disabled';assert.equal((await f.request('/api/auth/login',{username:f.user.username,password})).status,401);f.user.status='active';
  for(let n=0;n<11;n++)assert.equal((await f.request('/api/auth/login',{username:f.user.username,password:'wrong'})).status,401);
  const limited=await f.request('/api/auth/login',{username:f.user.username,password});assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'900');
});
test('malformed and oversized requests are rejected; database errors are sanitized',async t=>{
  const f=await fixture(t);
  assert.equal((await f.request('/api/auth/login',{username:'test-admin',password:'x'.repeat(9000)})).status,413);
  f.store.findUser=async()=>{throw Object.assign(new Error('secret database text'),{code:'DB_OFFLINE'});};
  const res=await f.request('/api/auth/login',{username:'test-admin',password});assert.equal(res.status,503);assert(!(await res.text()).includes('secret'));
});
