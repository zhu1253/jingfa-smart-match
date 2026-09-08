import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { AppShell, type View } from "./components/AppShell";
import { clients as seedClients, defaultClient, partners, products } from "./data";
import type { ClientRecord, Partner, Product } from "./types";
import { DashboardPage } from "./pages/DashboardPage";
import { MatchPage } from "./pages/MatchPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PartnersPage } from "./pages/PartnersPage";
import { LibraryPage } from "./pages/LibraryPage";
import { HelpPage } from "./pages/HelpPage";
import { CompanyPage, SettingsPage } from "./pages/StaticPages";
import { buildAgentContext } from "./agent";

const CLIENT_STORAGE_KEY = "jingfa-clients:v2";
const LIBRARY_SESSION_KEY = "jingfa-library-session";
const ROUTABLE_VIEWS: View[] = ["dashboard", "match", "clients", "products", "partners", "library", "settings", "company", "help"];

function readViewFromHash(): View {
  const candidate = window.location.hash.replace(/^#/, "") as View;
  return ROUTABLE_VIEWS.includes(candidate) ? candidate : "dashboard";
}

function loadClients() {
  try {
    const stored = localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!stored) return seedClients;
    const parsed = JSON.parse(stored) as ClientRecord[];
    return Array.isArray(parsed) && parsed.length ? parsed : seedClients;
  } catch {
    return seedClients;
  }
}

export default function App() {
  const [view, setView] = useState<View>(readViewFromHash);
  const [helpReturnView, setHelpReturnView] = useState<View>("dashboard");
  const [records, setRecords] = useState<ClientRecord[]>(loadClients);
  const [productItems, setProductItems] = useState<Product[]>(products);
  const [partnerItems, setPartnerItems] = useState<Partner[]>(partners);
  const [selectedClientId, setSelectedClientId] = useState(() => records[0]?.id ?? "haituo");
  const [matchMode, setMatchMode] = useState<"intake" | "results">("results");
  const [libraryUnlocked, setLibraryUnlocked] = useState(() => sessionStorage.getItem(LIBRARY_SESSION_KEY) === "unlocked");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  useEffect(() => { try { localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(records)); } catch { /* Storage can be unavailable in private browsing. */ } }, [records]);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(null), 3200); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { const syncView = () => setView(readViewFromHash()); window.addEventListener("hashchange", syncView); window.addEventListener("popstate", syncView); return () => { window.removeEventListener("hashchange", syncView); window.removeEventListener("popstate", syncView); }; }, []);

  const selectedRecord = records.find((record) => record.id === selectedClientId) ?? records[0];
  const agentContext = useMemo(() => buildAgentContext(selectedRecord, productItems, view), [selectedRecord, productItems, view]);
  const notify = (message: string, tone: "success" | "error" = "success") => setToast({ message, tone });
  const navigate = useCallback((next: View) => {
    if (next === "help" && view !== "help") setHelpReturnView(view);
    setView(next);
    if (window.location.hash !== `#${next}`) window.history.pushState(null, "", `#${next}`);
    window.scrollTo({ top: 0 });
  }, [view]);
  const openMatch = (id: string, mode: "intake" | "results") => { setSelectedClientId(id); setMatchMode(mode); navigate("match"); };
  const updateClient = (updated: ClientRecord) => setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
  const createClient = () => {
    const id = `client-${Date.now()}`;
    const profile = { ...defaultClient, companyName: "", city: "", operatingYears: Number.NaN, monthlyFlow: Number.NaN, annualSales: Number.NaN, annualRepayment: Number.NaN, assets: "", requestedAmount: Number.NaN, requestedTerm: Number.NaN };
    setRecords((current) => [{ id, profile, completeness: 18, stage: "待补全", owner: "张顾问", updatedAt: "刚刚" }, ...current]);
    openMatch(id, "intake");
  };
  const unlockLibrary = () => { sessionStorage.setItem(LIBRARY_SESSION_KEY, "unlocked"); setLibraryUnlocked(true); };
  const lockLibrary = () => { sessionStorage.removeItem(LIBRARY_SESSION_KEY); setLibraryUnlocked(false); };

  let content;
  if (view === "dashboard") content = <DashboardPage records={records} productItems={productItems} selectedId={selectedRecord.id} onSelect={setSelectedClientId} onMatch={() => openMatch(selectedRecord.id, "results")} onEdit={() => openMatch(selectedRecord.id, "intake")} onClients={() => navigate("clients")} onProducts={() => navigate("products")} />;
  else if (view === "match") content = <MatchPage key={`${selectedRecord.id}-${matchMode}`} records={records} productItems={productItems} selectedId={selectedRecord.id} initialMode={matchMode} onSelect={setSelectedClientId} onUpdate={updateClient} onBack={() => navigate("dashboard")} notify={notify} />;
  else if (view === "clients") content = <ClientsPage records={records} productItems={productItems} onEdit={(id) => openMatch(id, "intake")} onMatch={(id) => openMatch(id, "results")} onCreate={createClient} />;
  else if (view === "products") content = <ProductsPage items={productItems} onItemsChange={setProductItems} currentClient={selectedRecord.profile} onMatch={() => openMatch(selectedRecord.id, "results")} notify={notify} />;
  else if (view === "partners") content = <PartnersPage items={partnerItems} onItemsChange={setPartnerItems} notify={notify} />;
  else if (view === "library") content = <LibraryPage unlocked={libraryUnlocked} onUnlock={unlockLibrary} onLock={lockLibrary} notify={notify} />;
  else if (view === "help") content = <HelpPage contextView={helpReturnView} onBack={() => navigate(helpReturnView)} onNavigate={navigate} />;
  else if (view === "company") content = <CompanyPage />;
  else content = <SettingsPage />;

  return <AppShell view={view} onNavigate={navigate} libraryUnlocked={libraryUnlocked} agentContext={agentContext}>{content}{toast ? <div className={`toast ${toast.tone}`} role="status">{toast.tone === "success" ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}<span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="关闭提示"><X size={15} /></button></div> : null}</AppShell>;
}
