import { hashPassword } from './password.mjs';
const username=process.env.BOOTSTRAP_USERNAME;
const password=process.env.BOOTSTRAP_PASSWORD;
if(!/^[a-z0-9_.-]{3,100}$/.test(username||'')||!password||password.length<8||password.length>128)throw new Error('Set BOOTSTRAP_USERNAME and BOOTSTRAP_PASSWORD securely before running');
const hash=await hashPassword(password);
const name=Buffer.from(process.env.BOOTSTRAP_DISPLAY_NAME||'系统管理员').toString('base64');
// Only the salted hash goes into the import; repeat runs preserve existing credentials.
process.stdout.write(`SET NAMES utf8mb4;\nUSE jingfa_smartfit;\nINSERT INTO app_users (workspace_id,public_id,username,display_name,password_hash,role_code,status) SELECT id,UUID(),'${username}',CONVERT(FROM_BASE64('${name}') USING utf8mb4),'${hash}','admin','active' FROM workspaces WHERE slug='jingfa-smartfit' ON DUPLICATE KEY UPDATE username=VALUES(username);\nSELECT username,display_name,role_code,status FROM app_users WHERE username='${username}';\n`);
