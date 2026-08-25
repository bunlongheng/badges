import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// jsdom lacks these; components/hooks touch them.
if (!("createObjectURL" in URL)) {
  // @ts-expect-error test shim
  URL.createObjectURL = vi.fn(() => "blob:mock");
}
if (!("revokeObjectURL" in URL)) {
  // @ts-expect-error test shim
  URL.revokeObjectURL = vi.fn();
}

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
