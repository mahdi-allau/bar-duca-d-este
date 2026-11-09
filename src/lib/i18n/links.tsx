import Link from "next/link";
import type { ReactNode } from "react";
import { localePath, type Locale } from "./config";

/** An in-sentence link for rich(): `{ cake: inlineLink(lang, "/crea-la-tua-torta") }`. */
export const inlineLink = (lang: Locale, path: string) =>
  function InlineLink(children: ReactNode) {
    return (
      <Link href={localePath(lang, path)} className="underline underline-offset-4">
        {children}
      </Link>
    );
  };
