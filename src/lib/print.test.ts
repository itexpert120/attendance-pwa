import { afterEach, describe, expect, it, vi } from "vitest";
import { printDocument } from "./print";

describe("printDocument", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads the Inter weights reports use before opening the print dialog", async () => {
    const loaded: string[] = [];
    const print = vi.fn();
    vi.stubGlobal("document", {
      fonts: {
        load: vi.fn(async (spec: string) => {
          loaded.push(spec);
          return [];
        }),
        ready: Promise.resolve(),
      },
    });
    vi.stubGlobal("window", { print });

    await printDocument();

    expect(loaded.some((spec) => spec.startsWith("700") && spec.includes("Inter"))).toBe(true);
    expect(loaded.every((spec) => spec.includes("Inter"))).toBe(true);
    expect(print).toHaveBeenCalledOnce();
  });
});
