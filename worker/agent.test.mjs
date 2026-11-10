import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './src/index.js';

const origin = 'https://jfsmartfit.xyz';
const env = {
  AGENT_API_KEY: 'test-only-key', UPSTREAM_BASE_URL: 'https://upstream.invalid/v1', AGENT_MODEL: 'test-model', ALLOWED_ORIGINS: origin,
  CLIENT_RATE_LIMITER: { limit: async () => ({ success: true }) }, SERVICE_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const context = {
  matchingMode: { enabled: false, selectedClientId: 'other-company' }, selectedClient: { name: '工作台另一家公司' },
  products: [{ id: 'p1', name: '目录融资产品', rate: '待核实', term: '12个月', admissionRules: ['经营满2年'] }],
  productMatches: [{ productId: 'p1', status: '可做', score: 99, passes: ['另一家公司的资料'] }],
};
const request = (body) => new Request('https://proxy.invalid/chat', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('explicit recommendations keep the product catalog with automatic matching off and exclude unrelated matches', async t => {
  let upstream;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    upstream = JSON.parse(options.body);
    return Response.json({ choices: [{ message: { content: '初步推荐目录融资产品，资料待核实。' } }] });
  });
  const question = '我这家公司从事出口贸易，经营3年，请推荐产品。';
  const response = await worker.fetch(request({ context, messages: [{ role: 'user', content: question }] }), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.match(body.message, /以资金方最终审批为准/);
  assert.equal(body.degraded, undefined);
  const knowledge = JSON.parse(upstream.messages[1].content.match(/<business_context>\n([\s\S]+)\n<\/business_context>/)[1]);
  assert.equal(knowledge.matchingMode.enabled, false);
  assert.equal(knowledge.products[0].id, 'p1');
  assert.deepEqual(knowledge.productMatches, []);
  assert.equal(upstream.messages.at(-1).content, question);
  assert.equal(upstream.include_reasoning, false);
  assert.equal(upstream.thinking_token_budget, 512);
  assert(upstream.max_tokens > upstream.thinking_token_budget);
  assert.equal(upstream.chat_template_kwargs, undefined);
  assert.match(upstream.messages[0].content, /不得要求用户先开启开关/);
  assert.match(upstream.messages[0].content, /以对话中最新的公司信息为准/);
  assert(!upstream.messages[0].content.includes('为 false 时：不得针对当前客户计算匹配度'));
});

test('automatic matching retains current-client results and catalog; general questions stay general', async t => {
  let upstream;
  t.mock.method(globalThis, 'fetch', async (_url, options) => { upstream = JSON.parse(options.body); return Response.json({ choices: [{ message: { content: '您好，可以协助查询和总结。' } }] }); });
  const general = await worker.fetch(request({ context, messages: [{ role: 'user', content: '你好，有哪些能力？' }] }), env);
  assert.equal((await general.json()).message, '您好，可以协助查询和总结。');
  const enabledContext = { ...context, matchingMode: { ...context.matchingMode, enabled: true } };
  const automatic = await worker.fetch(request({ context: enabledContext, messages: [{ role: 'user', content: '解释当前客户的匹配结果' }] }), env);
  assert.equal(automatic.status, 200);
  const knowledge = JSON.parse(upstream.messages[1].content.match(/<business_context>\n([\s\S]+)\n<\/business_context>/)[1]);
  assert.equal(knowledge.products.length, 1);
  assert.equal(knowledge.productMatches[0].productId, 'p1');
});

test('upstream credential errors are sanitized and invalid requests do not call the model', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('secret-token-not-for-client', { status: 401 }); });
  const invalid = await worker.fetch(request({ context, messages: [] }), env);
  assert.equal(invalid.status, 400); assert.equal(calls, 0);
  const response = await worker.fetch(request({ context, messages: [{ role: 'user', content: '请推荐产品' }] }), env);
  assert.equal(response.status, 502);
  const body = await response.text();
  assert(!body.includes('secret-token')); assert(!body.includes(env.AGENT_API_KEY));
  assert.equal(calls, 1);
});

test('empty customer lists can still request recommendations using company descriptions', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: '可先核实目录融资产品，补充流水与融资金额后判断。' } }] }));
  const response = await worker.fetch(request({ context: { ...context, selectedClient: null, clients: [], productMatches: [] }, messages: [{ role: 'user', content: '出口公司想融资，请推荐' }] }), env);
  assert.equal(response.status, 200);
  assert.match((await response.json()).message, /目录融资产品/);
});

test('only final content is returned; copywriting without recommendations gets no financing notice', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: '我们是一家专注出口贸易的企业。', reasoning: 'private-analysis-fixture' } }] }));
  const response = await worker.fetch(request({ context, messages: [{ role: 'user', content: '不用推荐产品，请只润色一句公司介绍。' }] }), env);
  const body = await response.json();
  assert.equal(body.message, '我们是一家专注出口贸易的企业。');
  assert(!JSON.stringify(body).includes('private-analysis-fixture'));
});

test('financing conclusions carry the approval notice even without a recommendation keyword', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: '该公司暂无明确的融资方案，存货与订单资料需核实。' } }] }));
  const response = await worker.fetch(request({ context, messages: [{ role: 'user', content: '成立1个月，无房产，想借100万，帮我看看。' }] }), env);
  assert.match((await response.json()).message, /以资金方最终审批为准/);
});
