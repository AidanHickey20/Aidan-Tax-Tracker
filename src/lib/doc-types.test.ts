import { describe, it, expect } from "vitest";
import { DOC_TYPES, DOC_TYPE_LABELS, isDocType } from "@/lib/doc-types";

describe("doc-types", () => {
  it("recognizes valid document type keys", () => {
    expect(isDocType("W9")).toBe(true);
    expect(isDocType("SETTLEMENT_STATEMENT")).toBe(true);
    expect(isDocType("OTHER")).toBe(true);
  });

  it("rejects unknown keys", () => {
    expect(isDocType("w9")).toBe(false);
    expect(isDocType("RANDOM")).toBe(false);
    expect(isDocType("")).toBe(false);
  });

  it("has a human label for every type", () => {
    for (const t of DOC_TYPES) {
      expect(DOC_TYPE_LABELS[t]).toBeTruthy();
    }
  });

  it("ends the list with OTHER as the fallback bucket", () => {
    expect(DOC_TYPES[DOC_TYPES.length - 1]).toBe("OTHER");
  });
});
