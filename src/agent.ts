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
  return {
    currentView,
    client: {
      客户名称: client.companyName || "未填写",
      行业: client.industry || "未填写",
      所在地: client.city || "未填写",
      经营年限: Number.isFinite(client.operatingYears) ? `${client.operatingYears}年` : "未填写",
      月均开票额或流水: Number.isFinite(client.monthlyFlow) ? `${client.monthlyFlow}万元` : "未填写",
      近12个月销售额: Number.isFinite(client.annualSales) ? `${client.annualSales}万元` : "未填写",
      近12个月回款额: Number.isFinite(client.annualRepayment) ? `${client.annualRepayment}万元` : "未填写",
      近6个月逾期次数: Number.isFinite(client.overdueSixMonths) ? `${client.overdueSixMonths}次` : "未填写",
      当前逾期: client.hasCurrentOverdue ? "有" : "无",
      历史M3逾期: client.hasM3Overdue ? "有" : "无",
      近2个月机构查询: Number.isFinite(client.inquiryTwoMonths) ? `${client.inquiryTwoMonths}次` : "未填写",
      负债率: Number.isFinite(client.debtRatio) ? `${client.debtRatio}%` : "未填写",
      资产状况: client.assets || "未填写",
      经营平台: client.platform || "未填写",
      融资金额: Number.isFinite(client.requestedAmount) ? `${client.requestedAmount}万元` : "未填写",
      融资期限: Number.isFinite(client.requestedTerm) ? `${client.requestedTerm}个月` : "未填写",
      资金用途: client.purpose || "未填写",
    },
    missingFields: getMissingFields(client),
    productMatches: runMatching(client, catalog).map((result, index) => ({
      rank: index + 1,
      productId: result.product.id,
      产品名称: result.product.name,
      资金方: result.product.funder,
      产品类型: result.product.type,
      状态: result.status,
      匹配度: `${result.score}%`,
      符合条件: result.passes,
      卡点: result.failures,
      预估额度: result.estimate,
      利率区间: result.product.rateLabel,
      产品期限: result.product.termLabel,
      适用客户: result.product.audience,
      材料清单: result.product.materials,
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
