import type { ClientProfile, MatchResult } from "./types";
import { products } from "./data";

export const REQUIRED_FIELDS: Array<{ key: keyof ClientProfile; label: string }> = [
  { key: "companyName", label: "客户/企业名称" },
  { key: "industry", label: "所属行业" },
  { key: "operatingYears", label: "经营年限" },
  { key: "monthlyFlow", label: "月均开票额或流水" },
  { key: "annualSales", label: "近12个月销售额" },
  { key: "annualRepayment", label: "近12个月回款额" },
  { key: "overdueSixMonths", label: "近6个月逾期次数" },
  { key: "debtRatio", label: "负债率" },
  { key: "assets", label: "资产状况" },
  { key: "requestedAmount", label: "融资金额" },
  { key: "requestedTerm", label: "融资期限" },
  { key: "purpose", label: "资金用途" },
];

export function getMissingFields(client: ClientProfile) {
  return REQUIRED_FIELDS.filter(({ key }) => {
    const value = client[key];
    return value === "" || value === null || value === undefined || (typeof value === "number" && Number.isNaN(value));
  }).map((item) => item.label);
}

export function runMatching(client: ClientProfile): MatchResult[] {
  const baseFit: Record<string, number> = {
    "webank-data": 92,
    "pingan-amazon": 88,
    "spdb-cross": 84,
    "fusion-overseas": 82,
    "tianyibao": 79,
    "zbank-huiying": 78,
    "paob-easy": 76,
    "hsbc-ecommerce": 72,
    fundpark: 68,
  };
  return products
    .map((product) => {
      const { passes, failures } = product.evaluate(client);
      const baseline = baseFit[product.id] ?? 75;
      const score = failures.length === 0 ? baseline : Math.max(35, baseline - failures.length * 18);
      return {
        product,
        status: failures.length === 0 ? "可做" : "不建议",
        score,
        passes,
        failures,
        estimate: product.estimate(client),
      } satisfies MatchResult;
    })
    .sort((a, b) => b.score - a.score);
}
