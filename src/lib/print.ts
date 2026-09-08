import { toPng } from "html-to-image";

const PRINT_FONT_SPECS = [
  "400 12px Inter",
  "500 12px Inter",
  "600 12px Inter",
  "700 12px Inter",
  "700 24px Merriweather",
] as const;

export async function loadPrintFonts() {
  if (!document.fonts) return;
  try {
    await Promise.all(PRINT_FONT_SPECS.map((spec) => document.fonts.load(spec)));
    await document.fonts.ready;
  } catch {
    // Fall back to the next font in the print stack if a face fails to load.
  }
}

export async function waitForPrintImages(root: ParentNode) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (typeof image.decode === "function") {
        return image.decode().catch(() => undefined);
      }
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

export async function printDocument() {
  await loadPrintFonts();
  const root = document.querySelector("[data-print-root]");
  if (root) await waitForPrintImages(root);
  window.print();
}

function sanitizeFilenamePart(value: string) {
  return value.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function homeworkImageFilename(input: {
  date: string;
  className?: string;
  section?: string;
}) {
  const classPart = [input.className, input.section]
    .filter((part): part is string => Boolean(part))
    .map(sanitizeFilenamePart)
    .filter(Boolean)
    .join("-");
  return `homework${classPart ? `-${classPart}` : ""}-${input.date}.png`;
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

function findPrintRoot() {
  const root = document.querySelector("[data-print-root]");
  if (!root) {
    throw new Error("Print document is not ready.");
  }
  return root as HTMLElement;
}

export async function capturePrintDocumentPng() {
  const source = findPrintRoot();
  await loadPrintFonts();
  await waitForPrintImages(source);

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;padding:14mm 12mm;background:#ffffff;box-sizing:border-box;";
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.remove("hidden");
  clone.style.display = "block";
  host.append(clone);
  document.body.append(host);

  try {
    await waitForPrintImages(host);
    return await toPng(host, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
  } catch {
    throw new Error("Could not create an image of this report.");
  } finally {
    host.remove();
  }
}

export async function downloadPrintDocumentAsImage(filename: string) {
  const dataUrl = await capturePrintDocumentPng();
  downloadDataUrl(dataUrl, filename);
}
