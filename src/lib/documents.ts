import OpenAI from "openai";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";

export { DOC_TYPES, DOC_TYPE_LABELS, isDocType, type DocType } from "@/lib/doc-types";

// One-line hints that get fed to the classifier so it maps real-world docs to
// the right folder.
const CLASSIFIER_GUIDE = `- SETTLEMENT_STATEMENT: closing/settlement statements, HUD-1, ALTA, Closing Disclosure
- W9: IRS Form W-9 (Request for Taxpayer Identification Number)
- W2: IRS Form W-2 wage statements
- FORM_1099: any 1099 (1099-NEC, 1099-MISC, 1099-S, 1099-INT, etc.)
- CONTRACT: purchase agreements, listing agreements, leases, addenda, signed contracts
- RECEIPT: receipts, invoices, bills for materials/labor/services
- INSURANCE: insurance policies, declarations pages, certificates of insurance
- BANK_STATEMENT: bank or credit-card statements
- PROPERTY: inspection reports, appraisals, surveys, deeds, title docs
- TAX: tax returns, IRS notices, other tax forms not covered above
- OTHER: anything that does not clearly fit above`;

/**
 * Classify a document into one of DOC_TYPES using OpenAI. Reads the actual file
 * (PDF or image) via the Responses API. Any failure (no key, unsupported type,
 * API error) resolves to "OTHER" so uploads never block on the AI.
 */
export async function classifyDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ docType: DocType; aiClassified: boolean }> {
  if (!process.env.OPENAI_API_KEY) {
    return { docType: "OTHER", aiClassified: false };
  }

  const instructions =
    `You file real-estate business documents. Classify the document into exactly ONE ` +
    `of these categories and reply with ONLY the category key (no other text):\n` +
    `${DOC_TYPES.join(", ")}\n\nGuide:\n${CLASSIFIER_GUIDE}`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    let content: OpenAI.Responses.ResponseInputContent[];
    if (mimeType.startsWith("image/")) {
      content = [
        { type: "input_text", text: `Filename: ${filename}` },
        { type: "input_image", image_url: dataUrl, detail: "low" },
      ];
    } else if (mimeType === "application/pdf") {
      content = [
        { type: "input_text", text: `Filename: ${filename}` },
        { type: "input_file", filename, file_data: dataUrl },
      ];
    } else {
      // Unsupported for vision (e.g. docx) — classify by filename alone.
      content = [
        {
          type: "input_text",
          text: `Classify by filename only (contents unavailable): ${filename}`,
        },
      ];
    }

    const res = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions,
      input: [{ role: "user", content }],
      max_output_tokens: 20,
    });

    const raw = (res.output_text || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const match = DOC_TYPES.find((t) => raw === t || raw.startsWith(t));
    return { docType: match ?? "OTHER", aiClassified: !!match };
  } catch {
    return { docType: "OTHER", aiClassified: false };
  }
}
