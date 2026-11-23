"use client";

import { createContext, useContext, type ReactNode } from "react";
import { copyFrom, type CopyBundle } from "./copy";

const CmsContext = createContext<CopyBundle>({});
export function CmsCopyProvider({ bundle, children }: { bundle: CopyBundle; children: ReactNode }) {
  return <CmsContext.Provider value={bundle}>{children}</CmsContext.Provider>;
}

export function useCmsCopy(scope: string) {
  return copyFrom(useContext(CmsContext)[scope]);
}
