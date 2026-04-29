import { createContext, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "gate-prep-auth";

const AuthContext = createContext(null);

function getInitialAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { role: null, name: "", id: "" };
    const parsed = JSON.parse(raw);
    if (parsed.id === "student-demo-1" || parsed.id === "evaluator-demo-1") {
      localStorage.removeItem(STORAGE_KEY);
      return { role: null, name: "", id: "" };
    }
    return {
      role: parsed.role === "student" || parsed.role === "evaluator" ? parsed.role : null,
      name: typeof parsed.name === "string" ? parsed.name : "",
      id: typeof parsed.id === "string" ? parsed.id : ""
    };
  } catch {
    return { role: null, name: "", id: "" };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getInitialAuth);

  const login = ({ role, name, id }) => {
    const next = { role, name: name?.trim() || "", id: id || "" };
    setAuth(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const logout = () => {
    const next = { role: null, name: "", id: "" };
    setAuth(next);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({ auth, login, logout }), [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
