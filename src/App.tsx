import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { AppShell, type View } from "./components/AppShell";
import { clients as seedClients, defaultClient, libraryDocuments, partners, products } from "./data";
import type { ClientRecord, Partner, Product } from "./types";
import { DashboardPage } from "./pages/DashboardPage";
import { MatchPage } from "./pages/MatchPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PartnersPage } from "./pages/PartnersPage";
import { LibraryPage } from "./pages/LibraryPage";
import { HelpPage } from "./pages/HelpPage";
import { CompanyPage } from "./pages/CompanyPage";
import { SettingsPage } from "./pages/SettingsPage";
import { usePreferences } from "./preferences-context";
import { buildAgentContext } from "./agent";
import { useAccount } from "./auth-context";
import { AccountPage } from "./pages/AccountPage";
import { EmptyState } from "./components/ui";

const CLIENT_STORAGE_KEY = "jingfa-clients:v2";
const LIBRARY_SESSION_KEY = "jingfa-library-session";
const ROUTABLE_VIEWS: View[] = ["dashboard", "match", "clients", "products", "partners", "library", "settings", "company", "help", "account"];

function readViewFromHash(fallback: View): View {
  const candidate = window.location.hash.replace(/^#/, "") as View;
  return ROUTABLE_VIEWS.includes(candidate) ? candidate : fallback;
}

function loadClients(storageKey: string, isAdmin: boolean) {
  try {
    const stored = localStorage.getItem(storageKey) || (isAdmin ? localStorage.getItem(CLIENT_STORAGE_KEY) : null);
    if (!stored) return seedClients;
    const parsed = JSON.parse(stored) as ClientRecord[];
    return Array.isArray(parsed) ? parsed : seedClients;
  } catch {
    return seedClients;
  }
}

export default function App() {
  const user = useAccount();
  const { preferences } = usePreferences();
  const clientStorageKey = `jingfa-clients:v3:${user.id}`;
  const [view, setView] = useState<View>(() => readViewFromHash(preferences.startPage));
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [helpReturnView, setHelpReturnView] = useState<View>("dashboard");
  const [records, setRecords] = useState<ClientRecord[]>(() => loadClients(clientStorageKey, user.role === "admin"));
  const [productItems, setProductItems] = useState<Product[]>(products);
  const [partnerItems, setPartnerItems] = useState<Partner[]>(partners);
  const [selectedClientId, setSelectedClientId] = useState(() => records[0]?.id ?? "haituo");
  const [matchMode, setMatchMode] = useState<"intake" | "results">("results");
  const [libraryUnlocked, setLibraryUnlocked] = useState(() => sessionStorage.getItem(LIBRARY_SESSION_KEY) === "unlocked");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  useEffect(() => { try { localStorage.setItem(clientStorageKey, JSON.stringify(records)); } catch { /* Storage can be unavailable in private browsing. */ } }, [records, clientStorageKey]);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(null), 3200); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { const syncView = () => {
    const next = readViewFromHash(preferences.startPage);
    if (view === "settings" && next !== view && settingsDirty && !window.confirm("还有未保存的设置，确定离开并放弃这些更改吗？")) { window.history.pushState(null, "", "#settings"); return; }
    setView(next);
  }; window.addEventListener("hashchange", syncView); return () => { window.removeEventListener("hashchange", syncView); }; }, [preferences.startPage, settingsDirty, view]);

  const selectedRecord = records.find((record) => record.id === selectedClientId) ?? records[0];
  const agentContext = useMemo(
    () => buildAgentContext(selectedRecord, records, productItems, partnerItems, libraryDocuments, view),
    [selectedRecord, records, productItems, partnerItems, view],
  );
  const notify = (message: string, tone: "success" | "error" = "success") => setToast({ message, tone });
  const navigate = useCallback((next: View) => {
    if (next !== view && view === "settings" && settingsDirty && !window.confirm("还有未保存的设置，确定离开并放弃这些更改吗？")) return;
    if (next === "help" && view !== "help") setHelpReturnView(view);
    setView(next);
    if (window.location.hash !== `#${next}`) window.history.pushState(null, "", `#${next}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, settingsDirty]);
  const openMatch = (id: string, mode: "intake" | "results") => { setSelectedClientId(id); setMatchMode(mode); navigate("match"); };
  const updateClient = (updated: ClientRecord) => setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
  const deleteClient = (id: string) => {
    const deleted = records.find((record) => record.id === id);
    if (!deleted) { notify("该客户已不存在，请刷新列表后重试。", "error"); return false; }
    const remaining = records.filter((record) => record.id !== id);
    try { localStorage.setItem(clientStorageKey, JSON.stringify(remaining)); }
    catch { notify("删除未保存，请检查浏览器存储空间后重试。", "error"); return false; }
    setRecords(remaining);
    if (selectedClientId === id) { setSelectedClientId(remaining[0]?.id ?? ""); setMatchMode("results"); }
    notify(`已删除客户“${deleted.profile.companyName || "未命名客户"}”`);
    return true;
  };
  const createClient = () => {
    const id = `client-${Date.now()}`;
    const profile = { ...defaultClient, companyName: "", city: "", operatingYears: Number.NaN, monthlyFlow: Number.NaN, annualSales: Number.NaN, annualRepayment: Number.NaN, assets: "", requestedAmount: Number.NaN, requestedTerm: Number.NaN };
    setRecords((current) => [{ id, profile, completeness: 18, stage: "待补全", owner: user.displayName, updatedAt: "刚刚" }, ...current]);
    openMatch(id, "intake");
  };
  const unlockLibrary = () => { sessionStorage.setItem(LIBRARY_SESSION_KEY, "unlocked"); setLibraryUnlocked(true); };
  const lockLibrary = () => { sessionStorage.removeItem(LIBRARY_SESSION_KEY); setLibraryUnlocked(false); };

  let content;
  if (!selectedRecord && (view === "dashboard" || view === "match")) content = <div className="page"><EmptyState title="暂无客户档案" description="录入客户后，即可查看经营信息和产品匹配结果；也可以直接向智能体描述公司情况。" action="录入客户" onAction={createClient} /></div>;
  else if (view === "dashboard" && selectedRecord) content = <DashboardPage records={records} productItems={productItems} selectedId={selectedRecord.id} onSelect={setSelectedClientId} onMatch={() => openMatch(selectedRecord.id, "results")} onEdit={() => openMatch(selectedRecord.id, "intake")} onClients={() => navigate("clients")} onProducts={() => navigate("products")} />;
  else if (view === "match" && selectedRecord) content = <MatchPage key={`${selectedRecord.id}-${matchMode}`} records={records} productItems={productItems} selectedId={selectedRecord.id} initialMode={matchMode} onSelect={setSelectedClientId} onUpdate={updateClient} onBack={() => navigate("dashboard")} notify={notify} />;
  else if (view === "clients") content = <ClientsPage records={records} productItems={productItems} onDelete={deleteClient} onEdit={(id) => openMatch(id, "intake")} onMatch={(id) => openMatch(id, "results")} onCreate={createClient} />;
  else if (view === "products") content = <ProductsPage items={productItems} onItemsChange={setProductItems} currentClient={selectedRecord?.profile} onMatch={() => selectedRecord ? openMatch(selectedRecord.id, "results") : navigate("clients")} notify={notify} />;
  else if (view === "partners") content = <PartnersPage items={partnerItems} onItemsChange={setPartnerItems} notify={notify} />;
  else if (view === "library") content = <LibraryPage unlocked={libraryUnlocked} onUnlock={unlockLibrary} onLock={lockLibrary} notify={notify} />;
  else if (view === "help") content = <HelpPage contextView={helpReturnView} onBack={() => navigate(helpReturnView)} onNavigate={navigate} />;
  else if (view === "company") content = <CompanyPage />;
  else if (view === "account") content = <AccountPage />;
  else content = <SettingsPage onNavigate={navigate} libraryUnlocked={libraryUnlocked} onLockLibrary={lockLibrary} onDirtyChange={setSettingsDirty} notify={notify} />;

  return <AppShell view={view} onNavigate={navigate} libraryUnlocked={libraryUnlocked} agentContext={agentContext}>{content}{toast ? <div className={`toast ${toast.tone}`} role="status">{toast.tone === "success" ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}<span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="关闭提示"><X size={15} /></button></div> : null}</AppShell>;
}
