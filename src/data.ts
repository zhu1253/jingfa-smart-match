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

const manualReviewMatching = {
  matchingReady: false,
  estimate: () => "资料不足，待人工核额",
  evaluate: () => ({ passes: [], failures: [] }),
} satisfies Pick<Product, "matchingReady" | "estimate" | "evaluate">;

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
    sourceStatus: "已核验",
    matchingReady: true,
    verificationNote: "现有准入条件已映射到客户字段，仍需按资金方最新口径复核。",
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
    sourceStatus: "已核验",
    matchingReady: true,
    verificationNote: "现有准入条件已映射到客户字段，仍需按资金方最新口径复核。",
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
    sourceStatus: "已核验",
    matchingReady: true,
    verificationNote: "现有准入条件已映射到客户字段，仍需按资金方最新口径复核。",
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
    sourceStatus: "已核验",
    matchingReady: true,
    verificationNote: "现有准入条件已映射到客户字段，仍需按资金方最新口径复核。",
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
    sourceStatus: "已核验",
    matchingReady: true,
    verificationNote: "现有准入条件已映射到客户字段，仍需按资金方最新口径复核。",
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
    sourceStatus: "已核验",
    matchingReady: true,
    verificationNote: "现有准入条件已映射到客户字段，仍需按资金方最新口径复核。",
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
    sourceStatus: "已核验",
    matchingReady: true,
    verificationNote: "现有准入条件已映射到客户字段，仍需按资金方最新口径复核。",
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
    sourceStatus: "已核验",
    matchingReady: true,
    verificationNote: "现有准入条件已映射到客户字段，仍需按资金方最新口径复核。",
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
    sourceStatus: "已核验",
    matchingReady: true,
    verificationNote: "现有准入条件已映射到客户字段，仍需按资金方最新口径复核。",
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
  {
    ...manualReviewMatching,
    id: "olea-seller-led-factoring",
    name: "Olea 卖家主导国际保理",
    funder: "Olea",
    type: "出口保理",
    coreFeatures: ["发货后应收账款变现", "应收账款买断", "可选无追索与买方信用风险保护"],
    audience: "向海外优质买家供货并形成真实应收账款的企业",
    amountLabel: "最高发票金额90%；额度口径待确认",
    rateLabel: "按买家评级与追索性质核定",
    termLabel: "账期最长180天",
    currency: "美元/欧元/港币",
    source: "浩立-渣打集团.zip：Olea -国际保理.pdf（第7-9、12-13、16页）；跨境贸易融资产品大纲.docx（表2、表5）",
    sourceStatus: "待人工复核",
    verificationNote: "卖家成立、流水和征信红线未披露；1000万美元上限与投资级买家理论无上限口径冲突。",
    admissionRules: ["买方信用须通过评估", "须有真实贸易形成的应收账款", "合同、订单、发票及运输单据须可核验"],
    materials: ["KYC/KYB及股权结构资料", "持股超过25%股东身份证明", "10笔历史交易、回款或水单样本", "合同、订单、发票及运输文件", "必要时提供财务报表"],
  },
  {
    ...manualReviewMatching,
    id: "olea-buyer-led-factoring",
    name: "Olea 买家主导国际保理",
    funder: "Olea",
    type: "应收账款融资",
    coreFeatures: ["买方付息", "发货后融资", "最高可覆盖100%发票金额"],
    audience: "买方愿意参与签约并配合回款控制的贸易链",
    amountLabel: "最高发票金额100%",
    rateLabel: "未披露",
    termLabel: "账期最长180天",
    currency: "待确认",
    source: "浩立-渣打集团.zip：Olea -国际保理.pdf（第17页）",
    sourceStatus: "待人工复核",
    verificationNote: "币种、费率及卖家定量准入红线未单独披露，需按具体买方和交易人工评估。",
    admissionRules: ["买方须参与并签署业务文件", "应收回款须进入Olea控制账户", "基础贸易单据须真实可核验"],
    materials: ["卖方KYC及必要时财务报表", "应收账款转让合同", "买方IPU、MNOA、One-way TNOA及服务条款", "合同、订单、发票及运输文件"],
  },
  {
    ...manualReviewMatching,
    id: "olea-amazon-vc",
    name: "Olea Amazon VC 应收账款融资",
    funder: "Olea",
    type: "平台应收融资",
    coreFeatures: ["Amazon VC应收提前回款", "自动取票与对账", "按交易历史和稀释率核额"],
    audience: "Amazon Vendor Central 供应商",
    amountLabel: "按交易历史与稀释率核定",
    rateLabel: "未披露",
    termLabel: "对应60-90天账期",
    currency: "待确认",
    source: "浩立-渣打集团.zip：2026 Olea VC 融资方案.pdf（第8-12、15页）；Olea浩立-客户画像.pdf（第1页）",
    sourceStatus: "待人工复核",
    verificationNote: "未披露固定融资比例、费率和完整客户红线；投资级买家理论无上限仅为方案口径。",
    admissionRules: ["须为Amazon Vendor Central供应商", "交易及应收须真实可验证", "投资级买家参考S&P/Fitch BBB-或Moody's Baa3以上，或Olea认可同等评级"],
    materials: ["Amazon门户子账户接入", "非中国供应商的固定IP接入信息", "发票、交易及回款数据"],
  },
  {
    ...manualReviewMatching,
    id: "olea-amazon-sc",
    name: "Olea Amazon SC 快速付款融资",
    funder: "Olea",
    type: "平台流水融资",
    coreFeatures: ["销售回款提前", "店铺与收款数据接入", "方案称最快T+1回款"],
    audience: "Amazon Seller Central 卖家",
    amountLabel: "未披露",
    rateLabel: "未披露",
    termLabel: "对应14-21天销售回款周期",
    currency: "待确认",
    source: "浩立-渣打集团.zip：2026 Olea VC 融资方案.pdf（第9-10页）",
    sourceStatus: "方案资料",
    verificationNote: "额度、费率、币种及硬准入细则均未披露，只能作为方案展示。",
    admissionRules: ["须为Amazon Seller Central卖家", "须授权可核验的店铺及收款数据"],
    materials: ["Amazon店铺及收款数据授权", "平台子账户接入资料"],
  },
  {
    ...manualReviewMatching,
    id: "qupital-export-ecommerce",
    name: "Qupital 出口电商贷款",
    funder: "Qupital 桥彼道",
    type: "营运资金贷款",
    coreFeatures: ["API获取店铺销售与物流数据", "支付控流", "最高按月流水3倍核额"],
    audience: "Amazon、eBay、Shopee、Lazada、Shopify或Shopline出口商户",
    amountLabel: "最高月流水3倍，总上限1,000万美元",
    rateLabel: "日利率低至0.038%",
    termLabel: "12个月分期",
    currency: "放款币种待确认",
    source: "桥彼道-香港.zip：Qupital Product Leaflet (简体中文) v3.pdf（第1-3页）；桥彼道-产品基本介绍.pdf（第6-7、13页）",
    sourceStatus: "待人工复核",
    verificationNote: "完整征信与经营红线未披露；客户流水为人民币字段，不能直接换算美元额度。",
    admissionRules: ["须授权平台经营数据", "须使用可接入的收款平台", "最终额度按核验流水及风控结果确定"],
    materials: ["公司章程及商业登记证", "股东和董事身份证明", "店铺与收款平台授权", "近6个月经营流水", "大陆个人及企业征信资料", "建议提供财务报表"],
  },
  {
    ...manualReviewMatching,
    id: "qupital-import-ecommerce",
    name: "Qupital 进口电商贷款",
    funder: "Qupital 桥彼道",
    type: "平台流水贷款",
    coreFeatures: ["国内平台销售数据授信", "收款流水控制", "最高按月流水3倍核额"],
    audience: "天猫、淘宝、拼多多、京东、抖音或得物等国内平台商户",
    amountLabel: "最高月流水3倍，总上限1,000万美元",
    rateLabel: "日利率低至0.038%",
    termLabel: "12个月分期",
    currency: "放款币种待确认",
    source: "桥彼道-香港.zip：Qupital Product Leaflet (简体中文) v3.pdf（第2页）；桥彼道-产品基本介绍.pdf（第7、13页）",
    sourceStatus: "待人工复核",
    verificationNote: "完整征信与经营红线未披露；总额度以美元展示但实际放款币种未确认。",
    admissionRules: ["须授权国内电商平台子账户", "须接受销售回款控制", "最终额度按核验流水及风控结果确定"],
    materials: ["公司章程及商业登记证", "股东和董事身份证明", "平台子账户授权", "近6个月经营流水", "大陆个人及企业征信资料", "建议提供财务报表"],
  },
  {
    ...manualReviewMatching,
    id: "qupital-purchase-inventory",
    name: "Qupital 采购融资与存货质押",
    funder: "Qupital 桥彼道",
    type: "供应链融资",
    coreFeatures: ["采购融资", "存货质押", "认可仓与货权链路控制"],
    audience: "有采购需求或可质押存货的消费品企业",
    amountLabel: "采购最高200万美元；循环额度最高1,000万美元；质押率最高90%",
    rateLabel: "日利率低至0.038%",
    termLabel: "存货质押最长90天",
    currency: "放款币种待确认",
    source: "桥彼道-香港.zip：Qupital Product Leaflet (简体中文) v3.pdf（第1-3页）；桥彼道-产品基本介绍.pdf（第8-10、13页）",
    sourceStatus: "待人工复核",
    verificationNote: "完整主体与征信红线未披露；成立和流水门槛仅适用于资料中的信用资产栏，未套用于本产品。",
    admissionRules: ["上游须为品牌、授权经销商、免税店或经评估认可主体", "存货须进入认可仓", "货权及采购链路须可控"],
    materials: ["公司章程及商业登记证", "股东和董事身份证明", "近6个月经营流水", "大陆个人及企业征信资料", "采购合同与货品清单", "仓储及货权证明"],
  },
  {
    ...manualReviewMatching,
    id: "qupital-receivables",
    name: "Qupital 应收账融资",
    funder: "Qupital 桥彼道",
    type: "应收账款融资",
    coreFeatures: ["应收账款核证", "回款控制", "循环额度"],
    audience: "平台直营供应商、出海物流服务商及其他具有稳定应收的企业",
    amountLabel: "循环额度最高1,000万美元",
    rateLabel: "日利率低至0.038%",
    termLabel: "未披露",
    currency: "放款币种待确认",
    source: "桥彼道-香港.zip：Qupital Product Leaflet (简体中文) v3.pdf（第1-2页）；桥彼道-产品基本介绍.pdf（第11、13页）",
    sourceStatus: "待人工复核",
    verificationNote: "期限、融资比例、放款币种及完整风控红线未披露。",
    admissionRules: ["须有稳定且可核证的应收账款", "应收回款路径须可控制", "最终额度按资产与风控评估确定"],
    materials: ["公司章程及商业登记证", "股东和董事身份证明", "近6个月经营流水", "大陆个人及企业征信资料", "应收账款及回款证明", "建议提供财务报表"],
  },
  {
    ...manualReviewMatching,
    id: "unloq-amazon-sc",
    name: "联易融 Amazon SC 卖家融资贷",
    funder: "联易融国际 Unloq",
    type: "跨境电商融资",
    coreFeatures: ["单店循环额度", "后置收息", "支持随借随还"],
    audience: "Amazon Seller Central 卖家",
    amountLabel: "单店最高300万美元，可循环",
    rateLabel: "年化9%-11%",
    termLabel: "90天还本付息或随借随还",
    currency: "美元",
    source: "联易融-国际业务.zip：【联易融】亚马逊SC卖家融资贷 .docx",
    sourceStatus: "已核验",
    verificationNote: "现有客户字段缺少美元GMV、Amazon交易月数及指定回款账户状态，不能自动换算或判定。",
    admissionRules: ["申请主体可为大陆或境外公司", "Amazon年GMV须超过500万美元", "与Amazon交易历史须超过12个月", "回款账户须切换至合作支付公司或银行；已有合作账户可免切换"],
    materials: ["产品资料未列明专属材料，申请前需向联易融确认"],
  },
  {
    ...manualReviewMatching,
    id: "unloq-amazon-vc",
    name: "联易融 Amazon VC 发货后融资贷",
    funder: "联易融国际 Unloq",
    type: "发货后融资",
    coreFeatures: ["循环额度", "发送NOA无需买方回复", "合作账户回款控制"],
    audience: "Amazon Vendor Central 美国站供应商",
    amountLabel: "不设上限，可循环",
    rateLabel: "年化8%-10%",
    termLabel: "不超过120天",
    currency: "美元",
    source: "联易融-国际业务.zip：【联易融】亚马逊VC发货后融资贷 .docx",
    sourceStatus: "已核验",
    verificationNote: "现有客户字段无法识别VC身份、美元GMV、交易月数及回款账户状态，暂不自动匹配。",
    admissionRules: ["主体须为Amazon VC大陆、香港或美国公司", "经营站点须为美国站", "Amazon年GMV须超过100万美元", "与Amazon交易历史须超过6个月", "回款须切换至联易融合作支付公司或银行"],
    materials: ["产品资料未列明专属材料，申请前需向联易融确认"],
  },
  {
    ...manualReviewMatching,
    id: "unloq-first-mile-logistics",
    name: "联易融 Temu/Shein/TK 头程物流商融资贷",
    funder: "联易融国际 Unloq",
    type: "跨境物流融资",
    coreFeatures: ["多币种循环额度", "发送NOA无需买方回复", "头程物流应收周转"],
    audience: "为Temu、Shein或TikTok Shop提供头程物流服务的企业",
    amountLabel: "不设上限，可循环",
    rateLabel: "CNY/CNH年化7%-9%；USD年化8%-10%",
    termLabel: "不超过90天",
    currency: "人民币/离岸人民币/美元",
    source: "联易融-国际业务.zip：【联易融】TemuSheinTK 头程物流商融资贷 .docx",
    sourceStatus: "已核验",
    verificationNote: "现有客户字段缺少指定买方合作月数、各航线回款记录、物流月业务量及回款账户状态，暂不自动匹配。",
    admissionRules: ["境内或境外公司须与买方签约并提供头程物流服务", "与买方合作须满6个月", "月均业务量须超过100万元人民币", "各航线至少有1次交易回款记录", "物流行业经营须超过3年", "回款须切换至联易融合作支付公司或银行"],
    materials: ["产品资料未列明专属材料，申请前需向联易融确认"],
  },
  {
    ...manualReviewMatching,
    id: "jdh-cross-border-jindan-import",
    name: "简单汇 跨境金单进口保理",
    funder: "简单汇",
    type: "跨境反向保理",
    coreFeatures: ["占用境内核心企业授信", "为境外供应商提供买断式融资", "全线上贸易单据流转"],
    audience: "境内核心企业进口场景下的境外供应商",
    amountLabel: "按境内核心企业银行授信核定",
    rateLabel: "未披露",
    termLabel: "180天 / 1年内，版本口径待确认",
    currency: "人民币/美元/港币等",
    source: "简单汇（TCL）.zip：简单汇国际供应链金融科技解决方案介绍2025.8.pdf（第8-10、19、24页）；简单汇介绍(202607版）.pdf（第14页）",
    sourceStatus: "待人工复核",
    verificationNote: "2025资料写期限180天内，2026资料写期限1年内；须由产品方确认当前口径后才能自动匹配。",
    admissionRules: ["核心企业须在境内并取得银行产品授信", "供应商须在境外并完成平台注册", "境外供应商须提供NRA、OSA、FTN或海外账户", "须有真实进口贸易背景"],
    materials: ["境内核心企业授信与融资协议", "境外供应商账户及平台注册资料", "购销合同", "发票或形式发票", "报关单或报关单清单", "按场景提供货运单据"],
  },
  {
    ...manualReviewMatching,
    id: "jdh-cross-border-jindan-export",
    name: "简单汇 跨境金单出口保理",
    funder: "简单汇",
    type: "出口保理",
    coreFeatures: ["境外买方线上确权", "境内出口应收账款融资", "银行或保理公司资金渠道"],
    audience: "向境外买方赊销并形成应收账款的境内出口企业",
    amountLabel: "按出口应收账款及资金方核定",
    rateLabel: "未披露",
    termLabel: "未披露",
    currency: "待确认",
    source: "简单汇（TCL）.zip：简单汇国际供应链金融科技解决方案介绍2025.8.pdf（第11、14、24页）；简单汇介绍(202607版）.pdf（第14页）",
    sourceStatus: "方案资料",
    verificationNote: "资料未披露统一额度、费率、期限及完整准入红线，具体取决于买方确权和承做资金方。",
    admissionRules: ["须有境外买方确权", "境内出口商须形成真实可转让的跨境应收账款", "须由银行或保理机构完成资产审核"],
    materials: ["出口合同", "发票", "报关单或报关单清单", "应收账款及买方确权资料"],
  },
  {
    ...manualReviewMatching,
    id: "jdh-overseas-jindan-vietnam",
    name: "简单汇 海外金单（越南模式）",
    funder: "简单汇",
    type: "海外供应链金融方案",
    coreFeatures: ["技术输出与本地银行合作", "境外本币融资", "本地供应链线上协同"],
    audience: "在越南经营的中资核心企业及其当地供应商",
    amountLabel: "按境外核心企业当地银行授信核定",
    rateLabel: "未披露",
    termLabel: "未披露",
    currency: "境外本币",
    source: "简单汇（TCL）.zip：简单汇国际供应链金融科技解决方案介绍2025.8.pdf（第12-15、18页）；简单汇介绍(202607版）.pdf（第14页）",
    sourceStatus: "方案资料",
    verificationNote: "该资料为越南落地模式介绍，未披露统一资金价格、期限与定量准入条件。",
    admissionRules: ["境外中资核心企业须取得当地银行授信", "当地供应商须完成平台注册及身份核验", "贸易背景须经当地银行审核"],
    materials: ["当地银行开户与企业注册资料", "合同", "发票", "货运单据", "金单签收及融资申请资料"],
  },
  {
    ...manualReviewMatching,
    id: "jdh-cross-border-dynamic-discount",
    name: "简单汇 跨境与海外动态折扣",
    funder: "简单汇",
    type: "应付账款提前支付方案",
    coreFeatures: ["进口商提前付款", "出口商加速回款", "按账期协商折扣收益"],
    audience: "存在跨境应付或应收账款、愿意协商提前付款的进出口企业",
    amountLabel: "按应付账款及提前付款金额",
    rateLabel: "折扣收益口径未披露",
    termLabel: "按贸易账期",
    currency: "待确认",
    source: "简单汇（TCL）.zip：简单汇国际供应链金融科技解决方案介绍2025.8.pdf（第24页）",
    sourceStatus: "方案资料",
    verificationNote: "该方案不是标准贷款产品，未披露折扣率、额度或统一准入条件，应由交易双方人工确认。",
    admissionRules: ["须存在真实跨境应付与应收账款", "进口商与出口商须就提前付款和折扣达成一致"],
    materials: ["销售合同", "应付或应收账款证明", "提前付款与折扣约定资料"],
  },
];

const fundingPartner = (
  id: string,
  name: string,
  city: string,
  type = "银行资金方",
  status: Partner["status"] = "待接洽",
  description = "本批跨境金融总表已收录，具体产品、地区和审批口径需按最新资料复核。",
): Partner => ({
  id,
  name,
  type,
  description,
  priority: "中",
  city,
  status,
  services: type.includes("保理") ? ["应收账款融资", "贸易背景审核", "产品口径复核"] : ["跨境融资", "授信审批", "产品口径复核"],
});

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
  fundingPartner("huaxing", "广东华兴银行", "广东"),
  fundingPartner("ceb", "中国光大银行", "中国"),
  fundingPartner("webank", "微众银行", "中国"),
  fundingPartner("abc", "中国农业银行", "中国"),
  fundingPartner("paob", "平安壹账通银行（香港）", "中国香港", "数字银行"),
  fundingPartner("za-bank", "众安银行（ZA Bank）", "中国香港", "数字银行"),
  fundingPartner("fusion-bank", "富融银行（Fusion Bank）", "中国香港", "数字银行"),
  fundingPartner("huzhou-bank", "湖州银行", "中国"),
  fundingPartner("pingan-bank", "平安银行", "中国"),
  fundingPartner("icbc", "中国工商银行", "中国"),
  fundingPartner("zbank", "中关村银行", "中国"),
  fundingPartner("luan-credit", "陆安信贷", "中国香港", "非银信贷机构"),
  fundingPartner("hsbc", "汇丰银行", "全球"),
  fundingPartner("spdb", "浦发银行", "中国"),
  fundingPartner("qupital", "Qupital 桥彼道", "中国香港", "金融科技与离岸融资", "合作中", "已收录离岸电商、采购、存货质押及应收账融资方案；合作协议正文按受限资料管理。"),
  fundingPartner("unloq", "联易融国际 Unloq", "全球", "跨境供应链金融", "待接洽", "已收录Amazon SC、Amazon VC及跨境头程物流融资产品资料。"),
  fundingPartner("tianyibao-partner", "天逸保理", "中国", "商业保理"),
  fundingPartner("ccb", "中国建设银行", "中国"),
  fundingPartner("standard-chartered", "渣打银行", "全球"),
  fundingPartner("dbs", "星展银行", "亚洲"),
  fundingPartner("bea", "东亚银行", "中国香港"),
  fundingPartner("citi", "花旗银行", "全球"),
  fundingPartner("uob", "大华银行", "亚洲"),
  fundingPartner("ocbc", "华侨银行（OCBC）", "亚洲"),
  fundingPartner("lib", "澳门国际银行", "中国澳门"),
  fundingPartner("fubon", "富邦银行", "中国台湾/香港"),
  fundingPartner("ncb", "南洋商业银行", "中国香港"),
  fundingPartner("hang-seng", "恒生银行", "中国香港"),
  fundingPartner("kasikorn", "开泰银行", "泰国/中国"),
  fundingPartner("boc", "中国银行", "中国"),
  fundingPartner("bocom", "交通银行", "中国"),
  fundingPartner("cmb", "招商银行", "中国"),
  fundingPartner("cib", "兴业银行", "中国"),
  fundingPartner("nbcb", "宁波银行", "中国"),
  fundingPartner("eximbank", "中国进出口银行", "中国", "政策性银行"),
  fundingPartner("bob", "北京银行", "中国"),
  fundingPartner("cgb", "广发银行", "中国"),
  fundingPartner("olea", "Olea 浩立", "新加坡", "跨境贸易融资与国际保理", "待接洽", "已收录国际保理、Amazon VC应收融资及Amazon SC快速付款方案；合作状态待确认。"),
  fundingPartner("jdh", "简单汇", "广东·广州", "供应链金融科技", "待接洽", "已收录跨境金单、海外金单及动态折扣解决方案，当前以方案资料为主。"),
];

export const libraryDocuments: LibraryDocument[] = [
  { id: "ecosystem", name: "跨境金融—资金方与资产端合作清单", type: "生态清单", rules: 16, updated: "2026-08-28", summary: "资金方、资产端、支付、ERP、物流与产业园的合作优先级及建议路径。" },
  { id: "webank", name: "微众跨境电商贷产品要素与亮点", type: "产品资料", rules: 12, updated: "2026-08-26", summary: "亚马逊卖家经营、回款、征信与店铺健康度等核心准入条件。" },
  { id: "fusion", name: "富融出海贷与 PAOB 采购贷产品大纲对比", type: "产品对比", rules: 9, updated: "2026-08-25", summary: "香港关联主体、贸易通白名单、币种、额度和期限条件对比。" },
  { id: "products", name: "跨境金融—产品方清单", type: "产品清单", rules: 18, updated: "2026-08-24", summary: "银行、保理和金融科技产品的额度、利率、期限与适用客群。" },
  { id: "banks", name: "外资银行与中资银行产品清单", type: "机构清单", rules: 14, updated: "2026-08-22", summary: "汇丰、浦发、平安和中关村银行等产品信息汇总。" },
  { id: "catalog-0903", name: "跨境金融产品方合并总表（0903）", type: "产品与机构总表", rules: 49, updated: "2026-09-03", summary: "汇总38家规范化资金机构候选及49条明细源记录；冲突口径已保留为待复核版本。", accessLevel: "内部资料", verificationStatus: "待人工复核", sourceCount: 1 },
  { id: "olea-202609", name: "Olea 浩立跨境贸易融资资料集", type: "产品资料", rules: 18, updated: "2026-09-14", summary: "覆盖卖家/买家主导国际保理、Amazon VC应收融资和Amazon SC快速付款方案。", accessLevel: "内部资料", verificationStatus: "已结构化", sourceCount: 5 },
  { id: "qupital-202609", name: "Qupital 桥彼道产品资料集", type: "产品资料", rules: 16, updated: "2026-09-14", summary: "覆盖出口与进口电商贷款、采购与存货质押、应收账融资；协议和签署证书不进入通用检索。", accessLevel: "内部资料", verificationStatus: "已结构化", sourceCount: 3 },
  { id: "unloq-202609", name: "联易融国际 Unloq 产品资料集", type: "产品资料", rules: 17, updated: "2026-09-14", summary: "覆盖Amazon SC、Amazon VC以及Temu/Shein/TikTok Shop头程物流融资产品。", accessLevel: "内部资料", verificationStatus: "已结构化", sourceCount: 4 },
  { id: "jdh-202609", name: "简单汇跨境供应链金融方案资料集", type: "解决方案", rules: 12, updated: "2026-09-14", summary: "覆盖跨境金单进口/出口、海外金单与跨境动态折扣等供应链金融科技方案。", accessLevel: "内部资料", verificationStatus: "待人工复核", sourceCount: 2 },
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
