"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dict } from "./it";

type LangContext = { lang: Locale; common: Dict["common"] };
const Ctx = createContext<LangContext | null>(null);

/** Gives the client components of a page its language and the shared texts (menu, buttons…). */
export function LangProvider({ lang, common, children }: LangContext & { children: ReactNode }) {
  return <Ctx.Provider value={{ lang, common }}>{children}</Ctx.Provider>;
}

export function useLang(): LangContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useLang must be used inside <LangProvider>");
  return value;
}
