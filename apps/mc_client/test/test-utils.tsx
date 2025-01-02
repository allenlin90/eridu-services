import type { RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

import { render } from "@testing-library/react";
import React from "react";

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">): ReturnType<typeof render> {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from "@testing-library/react";
export { customRender as render };
