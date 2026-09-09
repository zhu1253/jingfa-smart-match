import type { ClientProfile, ClientRecord, LibraryDocument, Partner, Product } from "./types";

const baseMaterials = [
  "营业执照",
  "法人身份证明",
  "企业及法人征信授权",
  "近12个月经营流水或平台销售与回款数据",
  "融资用途合同、订单或采购凭证",
];

const estimateByFlow = (client: ClientProfile, minMultiple: number, maxMultiple: number, cap: number) => {
  const lower = Math.min(cap, Math.max(20, Math.round(client.monthlyFlow * minMultiple)));
  const upper = Math.min(cap, Math.max(lower, Math.round(client.monthlyFlow * maxMultiple)));
  return `${lower}–${upper}万`;
};

export const defaultClient: ClientProfile = {
  companyName: "深圳海拓科技",
  industry: "跨境电商",
  city: "广东·深圳",
  operatingYears: 4,
  monthlyFlow: 320,
  annualSales: 3800,
  annualRepayment: 1680,
  overdueSixMonths: 0,
  hasCurrentOverdue: false,
  hasM3Overdue: false,
  inquiryTwoMonths: 2,
  debtRatio: 42,
  assets: "亚马逊店铺、FBA库存、国内房产",
  hasDomesticProperty: true,
  platform: "亚马逊美国站",
  amazonAhr: 315,
  refundRate: 8,
  usSalesShare: 68,
  fbaTurns: 5,
  hasHongKongCompany: true,
  hasHsbcAccount: false,
  isTradelinkWhitelist: false,
  requestedAmount: 500,
  requestedTerm: 12,
  purpose: "采购备货",
};

export const products: Product[] = [
  {
    id: "webank-data",
    name: "微众跨境电商贷",
    funder: "微众银行",
    type: "信用贷款",
    coreFeatures: ["平台经营数据授信", "循环额度", "线上申请"],
    audience: "亚马逊跨境卖家",
    amountLabel: "最高2,000万",
    rateLabel: "约5.8%–9.6%",
    termLabel: "额度1年",
    currency: "人民币",
    source: "附件：微众跨境电商贷产品要素与亮点、资金方合作清单",
    materials: [...baseMaterials, "亚马逊美国站授权及AHR账户状态", "FBA库存与退款数据"],
    estimate: (c) => estimateByFlow(c, 1, 2.5, 2000),
    evaluate: (c) => {
      const passes: string[] = [];
      const failures: string[] = [];
      c.operatingYears >= 1 ? passes.push(`店铺稳定经营${c.operatingYears}年`) : failures.push("至少一家店铺需经营满1年");
      c.annualSales >= 200 ? passes.push(`近12个月销售额${c.annualSales}万，达到200万门槛`) : failures.push("近12个月销售额低于200万");
      c.annualRepayment >= 50 ? passes.push(`近12个月回款${c.annualRepayment}万，达到50万门槛`) : failures.push("近12个月回款低于50万");
      !c.hasCurrentOverdue ? passes.push("当前无逾期") : failures.push("个人贷款或贷记卡存在当前逾期");
      c.overdueSixMonths <= 2 ? passes.push(`近6个月逾期${c.overdueSixMonths}次`) : failures.push(`近6个月逾期${c.overdueSixMonths}次，超出≤2次要求`);
      !c.hasM3Overdue ? passes.push("历史无M3逾期") : failures.push("历史存在M3逾期");
      c.amazonAhr > 200 ? passes.push(`AHR ${c.amazonAhr}分，超过200分`) : failures.push(`AHR ${c.amazonAhr}分，未超过200分`);
      c.usSalesShare > 50 ? passes.push(`美国站销售占比${c.usSalesShare}%`) : failures.push("美国站销售额占比未超过50%");
      c.refundRate <= 30 ? passes.push(`退款率${c.refundRate}%`) : failures.push("近3个月退款率超过30%");
      return { passes, failures };
    },
  },
  {
    id: "spdb-cross",
    name: "浦发人民币跨商贷",
    funder: "浦发银行",
    type: "信用贷款",
    coreFeatures: ["亚马逊回款授信", "人民币流动资金", "线上初筛"],
    audience: "亚马逊卖家",
    amountLabel: "无锁100万 / 有锁300万",
    rateLabel: "约6.2%–9.8%",
    termLabel: "授信1年",
    currency: "人民币",
    source: "附件：跨境金融-产品方.xlsx、外资&国资银行.xlsx",
    materials: baseMaterials,
    estimate: (c) => estimateByFlow(c, 1, 3, 300),
    evaluate: (c) => {
      const failures: string[] = [];
      const passes: string[] = [];
      c.operatingYears >= 1 ? passes.push(`店铺经营${c.operatingYears}年，满足1年以上`) : failures.push("店铺经营未满1年");
      c.inquiryTwoMonths <= 4 ? passes.push(`近2个月机构查询${c.inquiryTwoMonths}次`) : failures.push(`近2个月机构查询${c.inquiryTwoMonths}次，建议不超过4次`);
      c.monthlyFlow > 0 ? passes.push(`月均流水${c.monthlyFlow}万，可按回款倍数测算`) : failures.push("缺少可核验的店铺回款流水");
      return { passes, failures };
    },
  },
  {
    id: "zbank-huiying",
    name: "中关村惠营贷",
    funder: "中关村银行",
    type: "信用贷款",
    coreFeatures: ["经营流水授信", "短期周转", "线上还款"],
    audience: "亚马逊卖家",
    amountLabel: "最高300万",
    rateLabel: "约11%–15%",
    termLabel: "6个月",
    currency: "人民币",
    source: "附件：跨境金融-产品方.xlsx、外资&国资银行.xlsx",
    materials: baseMaterials,
    estimate: (c) => estimateByFlow(c, 1, 2, 300),
    evaluate: (c) => {
      const passes: string[] = [];
      const failures: string[] = [];
      c.annualSales >= 1000 ? passes.push(`年销售额${c.annualSales}万，达到1000万门槛`) : failures.push(`年销售额${c.annualSales}万，低于1000万门槛`);
      !c.hasCurrentOverdue ? passes.push("当前无逾期") : failures.push("存在当前逾期");
      c.requestedTerm <= 6 ? passes.push("融资期限与产品单笔期限匹配") : failures.push(`需求期限${c.requestedTerm}个月，超过产品6个月期限`);
      return { passes, failures };
    },
  },
  {
    id: "pingan-amazon",
    name: "平安跨境电商贷",
    funder: "平安银行",
    type: "信用贷款",
    coreFeatures: ["深圳本地客群", "经营数据授信", "企业周转"],
    audience: "深圳亚马逊卖家",
    amountLabel: "最高300万",
    rateLabel: "约7.2%",
    termLabel: "以审批为准",
    currency: "人民币",
    source: "附件：跨境金融-产品方.xlsx",
    materials: [...baseMaterials, "申请人持股证明", "本人或配偶国内房产证明"],
    estimate: (c) => `${Math.min(300, Math.max(50, Math.round(c.annualSales * 0.1)))}–${Math.min(300, Math.max(80, Math.round(c.annualSales * 0.15)))}万`,
    evaluate: (c) => {
      const passes: string[] = [];
      const failures: string[] = [];
      c.city.includes("深圳") ? passes.push("企业位于深圳准入区域") : failures.push("当前产品资料限定深圳亚马逊客群");
      c.operatingYears >= 2 ? passes.push("公司成立满2年") : failures.push("公司成立未满2年");
      c.annualSales >= 1000 ? passes.push(`年销售额${c.annualSales}万`) : failures.push(`年销售额${c.annualSales}万，低于1000万门槛`);
      c.amazonAhr >= 250 ? passes.push(`店铺评分${c.amazonAhr}分`) : failures.push("亚马逊店铺评分低于250分");
      c.debtRatio <= 75 ? passes.push(`资产负债率${c.debtRatio}%`) : failures.push(`资产负债率${c.debtRatio}%，超过75%`);
      c.hasDomesticProperty ? passes.push("具备国内房产佐证") : failures.push("缺少本人或配偶国内房产佐证");
      return { passes, failures };
    },
  },
  {
    id: "hsbc-ecommerce",
    name: "汇丰电商融资",
    funder: "汇丰银行",
    type: "跨境信用融资",
    coreFeatures: ["美元融资", "跨境结算协同", "短期周转"],
    audience: "亚马逊卖家",
    amountLabel: "最高300万美元",
    rateLabel: "约8%",
    termLabel: "单笔6个月",
    currency: "美元",
    source: "附件：跨境金融-产品方.xlsx",
    materials: [...baseMaterials, "汇丰结算账户资料"],
    estimate: (c) => estimateByFlow(c, 2, 3, 2100),
    evaluate: (c) => {
      const passes: string[] = [];
      const failures: string[] = [];
      c.operatingYears >= 1.25 ? passes.push(`运营${c.operatingYears}年，超过15个月`) : failures.push("运营未满15个月");
      c.refundRate <= 20 ? passes.push(`退货率${c.refundRate}%`) : failures.push("退货率超过20%");
      c.annualSales >= 350 ? passes.push(`年销售额${c.annualSales}万，超过50万美元参考门槛`) : failures.push("年销售额未达到50万美元参考门槛");
      c.hasHsbcAccount ? passes.push("已开立汇丰账户") : failures.push("未开立汇丰账户，当前不满足");
      return { passes, failures };
    },
  },
  {
    id: "fusion-overseas",
    name: "富融出海贷",
    funder: "富融银行",
    type: "跨境信用贷款",
    coreFeatures: ["香港关联主体融资", "多币种授信", "中长期周转"],
    audience: "内地企业香港关联主体",
    amountLabel: "最高1,800万港币",
    rateLabel: "约5%–10%",
    termLabel: "1–5年",
    currency: "港币/人民币/美元",
    source: "附件：富融出海贷与PAOB采购贷产品大纲对比",
    materials: [...baseMaterials, "香港关联公司注册资料", "境内经营信用授权"],
    estimate: (c) => estimateByFlow(c, 1, 3, 1800),
    evaluate: (c) => {
      const passes: string[] = [];
      const failures: string[] = [];
      c.hasHongKongCompany ? passes.push("境内与香港关联公司结构符合产品定位") : failures.push("缺少香港分支或关联公司");
      !c.hasCurrentOverdue ? passes.push("境内信用情况无当前逾期") : failures.push("存在当前逾期，不建议申请跨境信用融资");
      c.requestedTerm >= 12 && c.requestedTerm <= 60 ? passes.push(`需求期限${c.requestedTerm}个月在1–5年范围内`) : failures.push("需求期限不在1–5年产品范围内");
      return { passes, failures };
    },
  },
  {
    id: "paob-easy",
    name: "PAOB 壹易贷",
    funder: "平安壹账通银行（香港）",
    type: "贸易融资",
    coreFeatures: ["香港企业融资", "贸易通数据核验", "采购周转"],
    audience: "香港贸易中小企业",
    amountLabel: "10万–1,500万港币",
    rateLabel: "约8%–12%",
    termLabel: "6–24个月",
    currency: "港币",
    source: "附件：富融出海贷与PAOB采购贷产品大纲对比",
    materials: [...baseMaterials, "贸易通白名单或报关运营数据"],
    estimate: (c) => estimateByFlow(c, 1, 2.5, 1500),
    evaluate: (c) => {
      const passes: string[] = [];
      const failures: string[] = [];
      c.hasHongKongCompany ? passes.push("具备香港经营主体") : failures.push("缺少香港经营主体");
      c.isTradelinkWhitelist ? passes.push("属于贸易通特选白名单") : failures.push("暂未确认贸易通特选白名单资格");
      c.requestedTerm >= 6 && c.requestedTerm <= 24 ? passes.push(`需求期限${c.requestedTerm}个月`) : failures.push("需求期限不在6–24个月范围内");
      return { passes, failures };
    },
  },
  {
    id: "fundpark",
    name: "丰泊跨境融资",
    funder: "丰泊国际 FundPark",
    type: "供应链融资",
    coreFeatures: ["订单融资", "库存融资", "平台回款锁定"],
    audience: "Amazon / 独立站卖家",
    amountLabel: "最高2,000万美元",
    rateLabel: "约12%–15%",
    termLabel: "授信1年",
    currency: "美元",
    source: "附件：跨境金融-产品方.xlsx",
    materials: [...baseMaterials, "平台回款锁定资料"],
    estimate: (c) => estimateByFlow(c, 3, 4, 14000),
    evaluate: (c) => {
      const passes: string[] = [];
      const failures: string[] = [];
      c.monthlyFlow >= 500 ? passes.push(`月GMV${c.monthlyFlow}万，达到500万门槛`) : failures.push(`月GMV${c.monthlyFlow}万，低于500万门槛`);
      ["采购备货", "订单履约", "物流周转"].includes(c.purpose) ? passes.push(`资金用途为${c.purpose}`) : failures.push("资金用途与采购/订单/物流融资场景不完全匹配");
      return { passes, failures };
    },
  },
  {
    id: "tianyibao",
    name: "天逸出口保理",
    funder: "天逸保理",
    type: "出口保理",
    coreFeatures: ["应收账款融资", "买方交易核验", "账期周转"],
    audience: "B2B出口卖家",
    amountLabel: "按应收账款核定",
    rateLabel: "约12%",
    termLabel: "以账期为准",
    currency: "人民币/美元",
    source: "附件：跨境金融-产品方.xlsx",
    materials: [...baseMaterials, "真实应收账款及买方交易记录"],
    estimate: (c) => `${Math.round(c.annualSales * 0.05)}–${Math.round(c.annualSales * 0.12)}万`,
    evaluate: (c) => {
      const passes: string[] = [];
      const failures: string[] = [];
      c.operatingYears >= 1 ? passes.push("公司成立满1年") : failures.push("公司成立未满1年");
      c.annualSales >= 400 ? passes.push(`年营收${c.annualSales}万，达到400万门槛`) : failures.push("年营收低于400万");
      c.industry.includes("贸易") || c.industry.includes("跨境") ? passes.push("行业属于跨境贸易相关") : failures.push("需核验B2B出口交易与应收账款");
      return { passes, failures };
    },
  },
];

export const partners: Partner[] = [
  { id: "fundpark", name: "丰泊国际 FundPark", type: "供应链金融科技", description: "成熟跨境供应链融资与资产输出平台", priority: "最高", city: "中国香港", status: "合作中", services: ["订单融资", "库存融资", "平台回款数据"] },
  { id: "dowsure", name: "Dowsure 豆沙包", type: "供应链金融科技", description: "出口跨境电商金融科技服务商", priority: "最高", city: "浙江·杭州", status: "优先合作", services: ["跨境电商保险", "供应链金融", "风险数据"] },
  { id: "pingpong", name: "PingPong", type: "跨境支付", description: "跨境收款与交易数据合作入口", priority: "高", city: "浙江·杭州", status: "合作中", services: ["跨境收款", "交易数据", "结售汇"] },
  { id: "lianlian", name: "连连国际", type: "跨境支付", description: "跨境收结汇与资金流转数据", priority: "高", city: "浙江·杭州", status: "待接洽", services: ["跨境支付", "全球收单", "资金流数据"] },
  { id: "dianxiaomi", name: "店小秘", type: "ERP / SaaS", description: "沉淀订单、库存与店铺经营数据", priority: "高", city: "广东·深圳", status: "优先合作", services: ["订单数据", "库存管理", "多平台运营"] },
  { id: "mabang", name: "马帮 ERP", type: "ERP / SaaS", description: "出口跨境电商经营管理平台", priority: "高", city: "广东·深圳", status: "待接洽", services: ["ERP 数据", "供应链管理", "店铺经营分析"] },
  { id: "zongteng", name: "纵腾网络", type: "物流与海外仓", description: "海外仓库存、货权与物流数据", priority: "中", city: "广东·深圳", status: "合作中", services: ["海外仓", "国际物流", "货权数据"] },
  { id: "winit", name: "万邑通 WINIT", type: "物流与海外仓", description: "欧美海外仓及跨境物流服务", priority: "中", city: "上海", status: "待接洽", services: ["海外仓", "跨境物流", "库存数据"] },
  { id: "szcea", name: "深圳市跨境电子商务协会", type: "协会与产业园", description: "跨境卖家批量触达与行业协同", priority: "中长期", city: "广东·深圳", status: "合作中", services: ["企业触达", "行业活动", "政策协同"] },
  { id: "amazon", name: "Amazon", type: "平台官方", description: "平台生态经营数据与融资入口", priority: "中长期", city: "全球", status: "待接洽", services: ["平台经营数据", "卖家生态", "回款入口"] },
];

export const libraryDocuments: LibraryDocument[] = [
  { id: "ecosystem", name: "跨境金融—资金方与资产端合作清单", type: "生态清单", rules: 16, updated: "2026-08-28", summary: "资金方、资产端、支付、ERP、物流与产业园的合作优先级及建议路径。" },
  { id: "webank", name: "微众跨境电商贷产品要素与亮点", type: "产品资料", rules: 12, updated: "2026-08-26", summary: "亚马逊卖家经营、回款、征信与店铺健康度等核心准入条件。" },
  { id: "fusion", name: "富融出海贷与 PAOB 采购贷产品大纲对比", type: "产品对比", rules: 9, updated: "2026-08-25", summary: "香港关联主体、贸易通白名单、币种、额度和期限条件对比。" },
  { id: "products", name: "跨境金融—产品方清单", type: "产品清单", rules: 18, updated: "2026-08-24", summary: "银行、保理和金融科技产品的额度、利率、期限与适用客群。" },
  { id: "banks", name: "外资银行与中资银行产品清单", type: "机构清单", rules: 14, updated: "2026-08-22", summary: "汇丰、浦发、平安和中关村银行等产品信息汇总。" },
];

export const clients: ClientRecord[] = [
  { id: "haituo", profile: defaultClient, completeness: 100, stage: "可匹配", owner: "张顾问", updatedAt: "今天 09:42" },
  {
    id: "youpin", completeness: 92, stage: "可匹配", owner: "张顾问", updatedAt: "昨天 16:18",
    profile: { ...defaultClient, companyName: "广州优品贸易", industry: "进出口贸易", city: "广东·广州", operatingYears: 3, monthlyFlow: 180, annualSales: 2250, annualRepayment: 960, overdueSixMonths: 1, inquiryTwoMonths: 3, debtRatio: 58, assets: "出口应收账款、库存、商标", hasDomesticProperty: false, platform: "B2B出口", amazonAhr: 0, refundRate: 4, usSalesShare: 25, fbaTurns: 4, hasHongKongCompany: true, hasHsbcAccount: false, isTradelinkWhitelist: true, requestedAmount: 300, requestedTerm: 12, purpose: "订单履约" },
  },
  {
    id: "xinghai", completeness: 86, stage: "跟进中", owner: "李顾问", updatedAt: "09月02日 11:06",
    profile: { ...defaultClient, companyName: "杭州星海科技", industry: "SaaS服务", city: "浙江·杭州", operatingYears: 5, monthlyFlow: 95, annualSales: 1100, annualRepayment: 540, overdueSixMonths: 0, inquiryTwoMonths: 1, debtRatio: 34, assets: "软件著作权、应收账款、办公设备", hasDomesticProperty: true, platform: "独立站", amazonAhr: 0, refundRate: 0, usSalesShare: 0, fbaTurns: 0, hasHongKongCompany: false, hasHsbcAccount: false, isTradelinkWhitelist: false, requestedAmount: 200, requestedTerm: 24, purpose: "日常经营周转" },
  },
  {
    id: "tuoying", completeness: 78, stage: "待补全", owner: "王顾问", updatedAt: "08月30日 14:25",
    profile: { ...defaultClient, companyName: "义乌拓盈进出口", industry: "进出口贸易", city: "浙江·义乌", operatingYears: 2, monthlyFlow: 260, annualSales: 3120, annualRepayment: 1500, overdueSixMonths: 4, inquiryTwoMonths: 5, debtRatio: 71, assets: "出口库存、应收账款", hasDomesticProperty: false, platform: "B2B出口", amazonAhr: 0, refundRate: 7, usSalesShare: 10, fbaTurns: 3, hasHongKongCompany: true, hasHsbcAccount: false, isTradelinkWhitelist: false, requestedAmount: 450, requestedTerm: 6, purpose: "物流周转" },
  },
];

export const recentClients = clients.map(({ profile, completeness }) => ({
  name: profile.companyName,
  city: profile.city,
  industry: profile.industry,
  completeness,
}));
