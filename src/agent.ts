import { getMissingFields, runMatching } from "./matcher";
import type { ClientRecord, Product } from "./types";

export type AgentContext = ReturnType<typeof buildAgentContext>;
export type AgentApiMessage = { role: "user" | "assistant"; content: string };

type AgentApiResponse = {
  message?: string;
  requestId?: string;
  error?: { code?: string; message?: string };
};

const AGENT_PROXY_URL = (import.meta.env.VITE_AGENT_PROXY_URL || "").replace(/\/$/, "");

export function buildAgentContext(record: ClientRecord, catalog: Product[], currentView: string) {
  const client = record.profile;
  const results = runMatching(client, catalog);
  const commonMaterials = catalog.length
    ? catalog[0].materials.filter((material) => catalog.every((product) => product.materials.includes(material)))
    : [];
  const commonMaterialSet = new Set(commonMaterials);
  const finiteOrNull = (value: number) => Number.isFinite(value) ? value : null;
  return {
    currentView,
    client: {
      name: client.companyName || null,
      industry: client.industry || null,
      city: client.city || null,
      operatingYears: finiteOrNull(client.operatingYears),
      monthlyFlowWan: finiteOrNull(client.monthlyFlow),
      annualSalesWan: finiteOrNull(client.annualSales),
      annualRepaymentWan: finiteOrNull(client.annualRepayment),
      overdueSixMonths: finiteOrNull(client.overdueSixMonths),
      hasCurrentOverdue: client.hasCurrentOverdue,
      hasM3Overdue: client.hasM3Overdue,
      inquiryTwoMonths: finiteOrNull(client.inquiryTwoMonths),
      debtRatioPercent: finiteOrNull(client.debtRatio),
      assets: client.assets || null,
      platform: client.platform || null,
      requestedAmountWan: finiteOrNull(client.requestedAmount),
      requestedTermMonths: finiteOrNull(client.requestedTerm),
      purpose: client.purpose || null,
    },
    missingFields: getMissingFields(client),
    commonMaterials,
    productMatches: results.map((result, index) => ({
      name: result.product.name,
      funder: result.product.funder,
      type: result.product.type,
      status: result.status,
      score: result.score,
      passes: result.passes.slice(0, index < 5 ? 4 : 2),
      blocks: result.failures,
      estimate: result.estimate,
      rate: result.product.rateLabel,
      term: result.product.termLabel,
      audience: result.product.audience,
      extraMaterials: result.product.materials.filter((material) => !commonMaterialSet.has(material)),
    })),
    approvalNotice: "所有产品均以资金方最终审批为准。",
  };
}

export async function requestAgentReply(messages: AgentApiMessage[], context: AgentContext, signal: AbortSignal) {
  if (!AGENT_PROXY_URL) throw new Error("智能体服务地址尚未配置，请联系管理员。");

  let response: Response;
  try {
    response = await fetch(`${AGENT_PROXY_URL}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, context }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("网络连接失败，请检查网络后重试。");
  }

  let payload: AgentApiResponse = {};
  try {
    payload = await response.json() as AgentApiResponse;
  } catch {
    // A sanitized fallback is more useful than exposing a proxy response body.
  }

  if (!response.ok) {
    throw new Error(payload.error?.message || (response.status === 429
      ? "当前咨询较多，请稍后再试。"
      : "智能体服务暂时不可用，请稍后重试。"));
  }
  if (!payload.message) throw new Error("智能体没有返回有效内容，请重试。");

  return { message: payload.message, requestId: payload.requestId };
}
