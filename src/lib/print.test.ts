import { afterEach, describe, expect, it, vi } from "vitest";
import { toPng } from "html-to-image";
import {
  downloadDataUrl,
  downloadPrintDocumentAsImage,
  homeworkImageFilename,
  printDocument,
  waitForPrintImages,
} from "./print";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));

describe("printDocument", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads Inter and Merriweather and waits for print images before opening the print dialog", async () => {
    const loaded: string[] = [];
    const print = vi.fn();
    const decode = vi.fn().mockResolvedValue(undefined);
    const printRoot = {
      querySelectorAll: vi.fn().mockReturnValue([{ decode }]),
    };
    vi.stubGlobal("document", {
      fonts: {
        load: vi.fn(async (spec: string) => {
          loaded.push(spec);
          return [];
        }),
        ready: Promise.resolve(),
      },
      querySelector: vi.fn((selector: string) =>
        selector === "[data-print-root]" ? printRoot : null,
      ),
    });
    vi.stubGlobal("window", { print });

    await printDocument();

    expect(loaded.some((spec) => spec.includes("Inter"))).toBe(true);
    expect(loaded.some((spec) => spec.includes("Merriweather"))).toBe(true);
    expect(decode).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();
  });
});

describe("waitForPrintImages", () => {
  it("still finishes when an image cannot be decoded", async () => {
    await expect(
      waitForPrintImages({
        querySelectorAll: () => [
          {
            decode: vi.fn().mockRejectedValue(new Error("broken image")),
          },
        ],
      } as unknown as ParentNode),
    ).resolves.toBeUndefined();
  });
});

describe("homeworkImageFilename", () => {
  it("names the file from class, section, and date", () => {
    expect(
      homeworkImageFilename({
        date: "2026-09-08",
        className: "4",
        section: "A",
      }),
    ).toBe("homework-4-A-2026-09-08.png");
  });

  it("strips characters that are unsafe in filenames", () => {
    expect(
      homeworkImageFilename({
        date: "2026-09-08",
        className: "Class 5/B",
        section: "A & B",
      }),
    ).toBe("homework-Class-5-B-A-B-2026-09-08.png");
  });
});

describe("downloadDataUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts a download with the given filename", () => {
    const link = {
      href: "",
      download: "",
      rel: "",
      click: vi.fn(),
      remove: vi.fn(),
    };
    const body = { append: vi.fn() };
    vi.stubGlobal("document", {
      createElement: vi.fn(() => link),
      body,
    });

    downloadDataUrl("data:image/png;base64,AAA", "homework-4-A-2026-09-08.png");

    expect(link.href).toBe("data:image/png;base64,AAA");
    expect(link.download).toBe("homework-4-A-2026-09-08.png");
    expect(link.click).toHaveBeenCalledOnce();
    expect(body.append).toHaveBeenCalledWith(link);
    expect(link.remove).toHaveBeenCalledOnce();
  });
});

describe("downloadPrintDocumentAsImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("captures the print document and downloads it as a PNG", async () => {
    const decode = vi.fn().mockResolvedValue(undefined);
    const printRoot = {
      querySelectorAll: vi.fn().mockReturnValue([{ decode }]),
      cloneNode: vi.fn(() => ({
        classList: { remove: vi.fn() },
        style: { display: "" },
        querySelectorAll: vi.fn().mockReturnValue([{ decode }]),
      })),
    };
    const host = {
      style: { cssText: "" },
      append: vi.fn(),
      remove: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([{ decode }]),
    };
    const link = {
      href: "",
      download: "",
      rel: "",
      click: vi.fn(),
      remove: vi.fn(),
    };
    const body = { append: vi.fn() };
    vi.mocked(toPng).mockResolvedValue("data:image/png;base64,PNGDATA");
    vi.stubGlobal("document", {
      fonts: {
        load: vi.fn(async () => []),
        ready: Promise.resolve(),
      },
      querySelector: vi.fn((selector: string) =>
        selector === "[data-print-root]" ? printRoot : null,
      ),
      createElement: vi.fn((tag: string) => (tag === "a" ? link : host)),
      body,
    });

    await downloadPrintDocumentAsImage("homework-4-A-2026-09-08.png");

    expect(toPng).toHaveBeenCalledOnce();
    expect(link.href).toBe("data:image/png;base64,PNGDATA");
    expect(link.download).toBe("homework-4-A-2026-09-08.png");
    expect(link.click).toHaveBeenCalledOnce();
    expect(host.remove).toHaveBeenCalledOnce();
  });
});
