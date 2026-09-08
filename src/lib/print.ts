const PRINT_FONT_SPECS = [
  "400 12px Inter",
  "500 12px Inter",
  "600 12px Inter",
  "700 12px Inter",
  "700 24px Merriweather",
] as const;

export async function printDocument() {
  if (document.fonts) {
    try {
      await Promise.all(PRINT_FONT_SPECS.map((spec) => document.fonts.load(spec)));
      await document.fonts.ready;
    } catch {
      // Fall back to the next font in the print stack if a face fails to load.
    }
  }
  window.print();
}
