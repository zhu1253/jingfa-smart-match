import { Bot, Building2, Database, ShieldCheck, Workflow } from "lucide-react";
import { PageHeader, StatusTag } from "../components/ui";

export function CompanyPage() {
  return <div className="page content-page"><PageHeader title="关于京发智配" description="面向跨境企业与渠道伙伴的融资产品匹配基础设施。" /><section className="company-intro"><div><h2>把复杂准入规则，变成可解释的匹配结果</h2><p>京发智配连接资金方、资产方与渠道伙伴，围绕跨境电商、进出口贸易和供应链等经营场景，统一沉淀产品要素与准入规则。渠道方只需一次录入客户关键信息，即可获得逐条判断、清晰排序和可直接转发的建议方案。</p></div><span className="company-symbol"><Building2 size={42} /></span></section><section className="principle-list"><article><span>01</span><div><h2>结果可解释</h2><p>每个产品都展示符合条件和明确卡点，方便顾问判断与客户沟通。</p></div></article><article><span>02</span><div><h2>资料可协同</h2><p>资金方、产品、伙伴和客户资料在同一套信息结构中维护。</p></div></article><article><span>03</span><div><h2>决策有边界</h2><p>不承诺放款结果，不收集无关敏感信息，所有审批以资金方最终结论为准。</p></div></article></section></div>;
}

export function SettingsPage() {
  return <div className="page list-page"><PageHeader title="系统设置" description="查看匹配规则、数据存储和智能体连接状态。" /><section className="settings-list"><article><span><Bot size={20} /></span><div><h2>智能体连接</h2><p>接口窗口已预留。收到调用地址、认证方式和输入输出字段后即可接入。</p></div><StatusTag status="待接洽" /></article><article><span><Database size={20} /></span><div><h2>数据存储</h2><p>演示客户数据保存在当前浏览器；生产环境应迁移到具备权限隔离的业务数据库。</p></div><StatusTag status="合作中" /></article><article><span><ShieldCheck size={20} /></span><div><h2>资料库访问</h2><p>管理员密码通过 PBKDF2 派生值验证，解锁状态只在当前会话有效。</p></div><StatusTag status="合作中" /></article><article><span><Workflow size={20} /></span><div><h2>审批声明</h2><p>额度、利率和准入判断统一注明“以资金方最终审批为准”。</p></div><StatusTag status="合作中" /></article></section></div>;
}
