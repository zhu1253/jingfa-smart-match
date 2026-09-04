export type ProductStatus = "可做" | "不建议";

export type ClientProfile = {
  companyName: string;
  industry: string;
  city: string;
  operatingYears: number;
  monthlyFlow: number;
  annualSales: number;
  annualRepayment: number;
  overdueSixMonths: number;
  hasCurrentOverdue: boolean;
  hasM3Overdue: boolean;
  inquiryTwoMonths: number;
  debtRatio: number;
  assets: string;
  hasDomesticProperty: boolean;
  platform: string;
  amazonAhr: number;
  refundRate: number;
  usSalesShare: number;
  fbaTurns: number;
  hasHongKongCompany: boolean;
  hasHsbcAccount: boolean;
  isTradelinkWhitelist: boolean;
  requestedAmount: number;
  requestedTerm: number;
  purpose: string;
};

export type Product = {
  id: string;
  name: string;
  funder: string;
  audience: string;
  amountLabel: string;
  rateLabel: string;
  termLabel: string;
  currency: string;
  source: string;
  materials: string[];
  estimate: (client: ClientProfile) => string;
  evaluate: (client: ClientProfile) => { passes: string[]; failures: string[] };
};

export type MatchResult = {
  product: Product;
  status: ProductStatus;
  score: number;
  passes: string[];
  failures: string[];
  estimate: string;
};

export type Partner = {
  name: string;
  type: string;
  description: string;
  priority: "最高" | "高" | "中" | "中长期";
};
