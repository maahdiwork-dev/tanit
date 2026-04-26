"use client";

import { useEffect, useState } from "react";

export type Role = "staff" | "director" | "dean" | "president";

export type RoleContext = {
  role: Role;
  user_id: string;
  institution_id: string | null;
  domain: string | null;
  name: string;
};

export const ROLE_USERS: RoleContext[] = [
  {
    role: "president",
    user_id: "nadia",
    institution_id: null,
    domain: null,
    name: "Pr. Nadia Mzoughi Aguir",
  },
  {
    role: "staff",
    user_id: "yassine_enib",
    institution_id: "ENIB",
    domain: "engineering",
    name: "Yassine Ben Salem",
  },
  {
    role: "director",
    user_id: "director_enib",
    institution_id: "ENIB",
    domain: "engineering",
    name: "Directeur ENIB",
  },
  {
    role: "dean",
    user_id: "dean_engineering",
    institution_id: null,
    domain: "engineering",
    name: "Doyen Ingénierie",
  },
];

// Role context lives in sessionStorage so each tab holds its own role
// independently. Cross-tab realtime sync (notifications, tickets) lives in
// a separate channel — see `lib/demo-mocks.ts` `subscribeToStore`.
const STORAGE_KEY = "tanit_role_context";
const LEGACY_STORAGE_KEY = "tanit_role_context";
const EVENT_NAME = "tanit_role_context_change";

const DEFAULT: RoleContext = ROLE_USERS[0];

function readStorage(): RoleContext {
  if (typeof window === "undefined") return DEFAULT;
  try {
    // Migrate any legacy localStorage value into the per-tab session on first load.
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as RoleContext;
    return parsed;
  } catch {
    return DEFAULT;
  }
}

export function setRoleContext(ctx: RoleContext) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: ctx }));
}

export function useRoleContext(): RoleContext {
  const [ctx, setCtx] = useState<RoleContext>(DEFAULT);

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      setCtx(readStorage());
    }, 0);
    function onChange(event: Event) {
      const detail = (event as CustomEvent<RoleContext>).detail;
      if (detail) setCtx(detail);
    }
    window.addEventListener(EVENT_NAME, onChange);
    return () => {
      window.clearTimeout(hydrateTimer);
      window.removeEventListener(EVENT_NAME, onChange);
    };
  }, []);

  return ctx;
}

export function homeRouteFor(role: Role): string {
  if (role === "staff") return "/staff";
  if (role === "director" || role === "dean") return "/director";
  return "/dashboard";
}
