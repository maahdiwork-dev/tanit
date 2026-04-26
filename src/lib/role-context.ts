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

const STORAGE_KEY = "tanit_role_context";
const EVENT_NAME = "tanit_role_context_change";

const DEFAULT: RoleContext = ROLE_USERS[0];

function readStorage(): RoleContext {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as RoleContext;
    return parsed;
  } catch {
    return DEFAULT;
  }
}

export function setRoleContext(ctx: RoleContext) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
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
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setCtx(readStorage());
    }
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(hydrateTimer);
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return ctx;
}

export function homeRouteFor(role: Role): string {
  if (role === "staff") return "/staff";
  if (role === "director" || role === "dean") return "/director";
  return "/dashboard";
}
