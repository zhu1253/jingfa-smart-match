import { getMissingFields, runMatching } from "./matcher";
import type { ClientProfile, ClientRecord, LibraryDocument, Partner, Product } from "./types";

export type AgentContext = ReturnType<typeof buildAgentContext>;
export type AgentApiMessage = { role: "user" | "assistant"; content: string };

type AgentApiResponse = {
  message?: string;
  requestId?: string;
  degraded?: boolean;
  error?: { code?: string; message?: string };
};

const AGENT_PROXY_URL = (import.meta.env.VITE_AGENT_PROXY_URL || "").replace(/\/$/, "");

function serializeClientProfile(client: ClientProfile) {
  const finiteOrNull = (value: number) => Number.isFinite(value) ? value : null;
  return {
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
    hasDomesticProperty: client.hasDomesticProperty,
    platform: client.platform || null,
    amazonAhr: finiteOrNull(client.amazonAhr),
    refundRatePercent: finiteOrNull(client.refundRate),
    usSalesSharePercent: finiteOrNull(client.usSalesShare),
    fbaTurns: finiteOrNull(client.fbaTurns),
    hasHongKongCompany: client.hasHongKongCompany,
    hasHsbcAccount: client.hasHsbcAccount,
    isTradelinkWhitelist: client.isTradelinkWhitelist,
    requestedAmountWan: finiteOrNull(client.requestedAmount),
    requestedTermMonths: finiteOrNull(client.requestedTerm),
    purpose: client.purpose || null,
  };
}

export function buildAgentContext(
  selectedRecord: ClientRecord,
  records: ClientRecord[],
  catalog: Product[],
  partnerCatalog: Partner[],
  documents: LibraryDocument[],
  currentView: string,
) {
  const selectedClient = selectedRecord.profile;
  const results = runMatching(selectedClient, catalog);
  const commonMaterials = catalog.length
    ? catalog[0].materials.filter((material) => catalog.every((product) => product.materials.includes(material)))
    : [];
  const commonMaterialSet = new Set(commonMaterials);

  return {
    currentView,
    selectedClientId: selectedRecord.id,
    selectedClient: {
      id: selectedRecord.id,
      stage: selectedRecord.stage,
      completenessPercent: selectedRecord.completeness,
      owner: selectedRecord.owner,
      updatedAt: selectedRecord.updatedAt,
      missingFields: getMissingFields(selectedClient),
      ...serializeClientProfile(selectedClient),
    },
    clients: records.map((record) => ({
      id: record.id,
      stage: record.stage,
      completenessPercent: record.completeness,
      owner: record.owner,
      updatedAt: record.updatedAt,
      missingFields: getMissingFields(record.profile),
      ...serializeClientProfile(record.profile),
    })),
    products: catalog.map((product) => ({
      id: product.id,
      name: product.name,
      funder: product.funder,
      type: product.type,
      coreFeatures: product.coreFeatures,
      audience: product.audience,
      amount: product.amountLabel,
      rate: product.rateLabel,
      term: product.termLabel,
      currency: product.currency,
      source: product.source,
      materials: product.materials,
    })),
    partners: partnerCatalog.map((partner) => ({
      id: partner.id,
      name: partner.name,
      type: partner.type,
      description: partner.description,
      priority: partner.priority,
      city: partner.city,
      status: partner.status,
      services: partner.services,
    })),
    libraryDocuments: documents.map((document) => ({ ...document })),
    knowledgeSummary: {
      clients: records.length,
      products: catalog.length,
      partners: partnerCatalog.length,
      documents: documents.length,
    },
    productMatches: results.map((result, index) => ({
      productId: result.product.id,
      name: result.product.name,
      funder: result.product.funder,
      type: result.product.type,
      status: result.status,
      score: result.score,
      passes: result.passes,
      blocks: result.failures,
      estimate: result.estimate,
      rate: result.product.rateLabel,
      term: result.product.termLabel,
      audience: result.product.audience,
      extraMaterials: result.product.materials.filter((material) => !commonMaterialSet.has(material)),
      recommendationOrder: index + 1,
    })),
    commonMaterials,
    approvalNotice: "涉及产品匹配及融资审批时，以资金方最终审批为准。",
  };
}

export async function requestAgentReply(
  messages: AgentApiMessage[],
  context: AgentContext,
  matchingEnabled: boolean,
  signal: AbortSignal,
) {
  if (!AGENT_PROXY_URL) throw new Error("智能体服务地址尚未配置，请联系管理员。");

  const { productMatches, ...knowledgeContext } = context;
  const requestContext = {
    ...knowledgeContext,
    matchingMode: {
      enabled: matchingEnabled,
      selectedClientId: context.selectedClientId,
      selectedClientName: context.selectedClient.name,
    },
    ...(matchingEnabled ? { productMatches } : {}),
  };
  const requestBody = JSON.stringify({ messages, context: requestContext });
  let fallbackReply: { message: string; requestId?: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${AGENT_PROXY_URL}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: requestBody,
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      if (fallbackReply) return fallbackReply;
      throw new Error("网络连接失败，请检查网络后重试。");
    }

    let payload: AgentApiResponse = {};
    try {
      payload = await response.json() as AgentApiResponse;
    } catch {
      // A sanitized fallback is more useful than exposing a proxy response body.
    }

    if (!response.ok) {
      if (fallbackReply) return fallbackReply;
      throw new Error(payload.error?.message || (response.status === 429
        ? "当前咨询较多，请稍后再试。"
        : "智能体服务暂时不可用，请稍后重试。"));
    }
    if (!payload.message) {
      if (fallbackReply) return fallbackReply;
      throw new Error("智能体没有返回有效内容，请重试。");
    }
    if (!payload.degraded) return { message: payload.message, requestId: payload.requestId };

    fallbackReply = { message: payload.message, requestId: payload.requestId };
    if (attempt < 2) {
      await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 800 : 1_400));
      if (signal.aborted) throw new DOMException("请求已取消", "AbortError");
    }
  }

  return fallbackReply!;
}
