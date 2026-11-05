import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAccount } from "./auth-context";
import { defaultPreferences, parsePreferences, type UserPreferences } from "./preferences";

type PreferencesState = { preferences: UserPreferences; warning: string };
const PreferencesContext = createContext<(PreferencesState & { save: (next: UserPreferences) => void }) | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const user = useAccount();
  const storageKey = `jingfa-preferences:v1:${user.id}`;
  const [state, setState] = useState<PreferencesState>(() => {
    try { return { preferences: parsePreferences(localStorage.getItem(storageKey)), warning: "" }; }
    catch { return { preferences: { ...defaultPreferences }, warning: "无法读取已保存的偏好，当前使用默认设置。请允许浏览器存储后重新保存。" }; }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = state.preferences.density;
    root.dataset.reduceMotion = String(state.preferences.reduceMotion);
    return () => { delete root.dataset.density; delete root.dataset.reduceMotion; };
  }, [state.preferences.density, state.preferences.reduceMotion]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || (event.key !== storageKey && event.key !== null)) return;
      try { setState({ preferences: parsePreferences(event.key === null ? null : event.newValue), warning: "" }); }
      catch { setState(current => ({ ...current, warning: "其他页面保存的偏好无法读取，请在此页重新保存。" })); }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);

  const save = (next: UserPreferences) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...next })); }
    catch { throw new Error("保存失败：浏览器未允许存储或存储空间不足。请检查浏览器设置后重试，当前设置未更改。拦截扩展也可能影响保存。"); }
    setState({ preferences: { ...next }, warning: "" });
  };

  return <PreferencesContext.Provider value={{ ...state, save }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("Preferences provider missing");
  return context;
}
