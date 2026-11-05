export const startPages = [
  { value: "dashboard", label: "客户匹配工作台" },
  { value: "clients", label: "客户管理" },
  { value: "products", label: "产品中心" },
  { value: "partners", label: "生态伙伴" },
] as const;

export type StartPage = typeof startPages[number]["value"];
export type UserPreferences = {
  startPage: StartPage;
  sidebarCollapsed: boolean;
  density: "comfortable" | "compact";
  reduceMotion: boolean;
};

export const defaultPreferences: UserPreferences = {
  startPage: "dashboard",
  sidebarCollapsed: false,
  density: "comfortable",
  reduceMotion: false,
};

export function parsePreferences(raw: string | null): UserPreferences {
  if (!raw) return { ...defaultPreferences };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1) return { ...defaultPreferences };
  const stored = value as Record<string, unknown>;
  return {
    startPage: startPages.some(page => page.value === stored.startPage) ? stored.startPage as StartPage : defaultPreferences.startPage,
    sidebarCollapsed: typeof stored.sidebarCollapsed === "boolean" ? stored.sidebarCollapsed : defaultPreferences.sidebarCollapsed,
    density: stored.density === "compact" ? "compact" : "comfortable",
    reduceMotion: typeof stored.reduceMotion === "boolean" ? stored.reduceMotion : defaultPreferences.reduceMotion,
  };
}

export function motionBehavior(): ScrollBehavior {
  return document.documentElement.dataset.reduceMotion === "true" || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
}
