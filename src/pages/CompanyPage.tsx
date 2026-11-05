import { MapPin } from "lucide-react";
import { PageHeader } from "../components/ui";
import { companyProfile as company } from "../company-profile";

export function CompanyPage() {
  return <div className="page company-page">
    <PageHeader title="公司介绍" description={company.name} />
    <nav className="company-directory" aria-label="公司介绍目录">
      <a href="#company-overview" onClick={event => { event.preventDefault(); document.getElementById("company-overview")?.scrollIntoView({ block: "start" }); }}>公司概况</a>
      <a href="#company-services" onClick={event => { event.preventDefault(); document.getElementById("company-services")?.scrollIntoView({ block: "start" }); }}>产品与服务</a>
      <a href="#company-team" onClick={event => { event.preventDefault(); document.getElementById("company-team")?.scrollIntoView({ block: "start" }); }}>核心优势</a>
      <a href="#company-cases" onClick={event => { event.preventDefault(); document.getElementById("company-cases")?.scrollIntoView({ block: "start" }); }}>合作案例</a>
      <a href="#company-contact" onClick={event => { event.preventDefault(); document.getElementById("company-contact")?.scrollIntoView({ block: "start" }); }}>办公地址</a>
    </nav>

    <section className="company-overview" id="company-overview" aria-labelledby="company-positioning">
      <div className="company-lead"><h2 id="company-positioning">{company.positioning}</h2><p>{company.introduction}</p><strong>{company.principle}</strong></div>
      <dl className="company-facts">{company.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>

    <section className="company-section" id="company-services" aria-labelledby="company-services-title">
      <header><h2 id="company-services-title">“一数两云”与AI智能体</h2><p>从数据服务到业务分析，覆盖营销、尽调与风险管理场景。</p></header>
      <dl className="company-services">{company.products.map(product => <div key={product.name}><dt><strong>{product.name}</strong><span>{product.category}</span></dt><dd>{product.description}</dd></div>)}</dl>
      <p className="company-scope-note">以上为公司的产品与服务介绍。京发智配当前功能以平台实际开放的模块为准。</p>
    </section>

    <section className="company-section" id="company-team" aria-labelledby="company-team-title">
      <header><h2 id="company-team-title">核心优势与团队</h2><p>结合金融行业经验、数据能力和自研平台，支持业务场景落地。</p></header>
      <div className="company-strengths">{company.strengths.map(strength => <article key={strength.title}><h3>{strength.title}</h3><p>{strength.description}</p></article>)}</div>
      <dl className="company-team">{company.team.map(member => <div key={member.name}><dt>{member.name}<span>{member.role}</span></dt><dd>{member.description}</dd></div>)}</dl>
    </section>

    <section className="company-section" id="company-cases" aria-labelledby="company-cases-title">
      <header><h2 id="company-cases-title">合作案例</h2><p>选取2026版资料中的典型场景，合作机构名称沿用资料中的披露范围。</p></header>
      <div className="company-cases">{company.cases.map(item => <article key={item.title}><div><h3>{item.title}</h3><span>{item.partner}</span></div><p>{item.description}</p></article>)}</div>
    </section>

    <section className="company-section" id="company-contact" aria-labelledby="company-contact-title">
      <header><h2 id="company-contact-title">办公地址</h2></header>
      <dl className="company-addresses">{company.addresses.map(([city, address]) => <div key={city}><dt><MapPin size={17} aria-hidden="true" />{city}</dt><dd>{address}</dd></div>)}</dl>
    </section>
    <footer className="company-source"><p>资料来源：{company.source}</p><p>{company.sourceNote}</p></footer>
  </div>;
}
