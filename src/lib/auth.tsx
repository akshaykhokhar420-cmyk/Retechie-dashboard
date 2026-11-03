'use client';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { get, post, setCsrf } from './api';

export type Me = { id: number; name: string; email: string; roles: string[]; permissions: string[]; csrf: string; mustSetup2fa?: boolean };
type Ctx = { me: Me | null; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void>; can: (...p: string[]) => boolean };
const C = createContext<Ctx>({} as Ctx);
export const useAuth = () => useContext(C);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null); const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { const m = await get<Me>('/auth/me'); setCsrf(m.csrf); setMe(m); } catch { setMe(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const logout = async () => { try { await post('/auth/logout'); } catch {} setMe(null); location.href = '/login'; };
  const can = (...p: string[]) => !!me && (me.roles.includes('super_admin') || p.length === 0 || p.some((x) => me.permissions.includes(x)));
  return <C.Provider value={{ me, loading, refresh, logout, can }}>{children}</C.Provider>;
}
