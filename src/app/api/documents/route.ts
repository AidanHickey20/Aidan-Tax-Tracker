import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { isProUser } from "@/lib/subscription";
import { getSupabase, DOCUMENTS_BUCKET } from "@/lib/supabase";
import { classifyDocument } from "@/lib/documents";
import { isDocType } from "@/lib/doc-types";
import { rateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

// GET — list the user's documents (newest first) with short-lived signed URLs.
export async function GET() {
  try {
    const userId = await requireUserId();
    if (!(await isProUser(userId))) {
      return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
    }

    const docs = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const supabase = getSupabase();
    const withUrls = await Promise.all(
      docs.map(async (d) => {
        const { data } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .createSignedUrl(d.storagePath, 60 * 60);
        return {
          id: d.id,
          name: d.name,
          docType: d.docType,
          mimeType: d.mimeType,
          size: d.size,
          aiClassified: d.aiClassified,
          createdAt: d.createdAt,
          url: data?.signedUrl ?? null,
        };
      })
    );

    return NextResponse.json(withUrls);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load documents";
    const status = message === "Unauthorized" ? 401 : 500;
    if (status === 500) logError("documents.list_failed", e);
    return NextResponse.json({ error: message }, { status });
  }
}

// POST — upload a file (multipart/form-data, field "file"), classify it with AI,
// store it in Supabase Storage, and record it.
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    if (!(await isProUser(userId))) {
      return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
    }
    // Cap uploads per user — each one costs an AI classification + storage write.
    const { ok } = rateLimit(`doc-upload:${userId}`, { limit: 40, windowMs: 10 * 60 * 1000 });
    if (!ok) {
      return NextResponse.json(
        { error: "Too many uploads at once. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 15 MB limit" }, { status: 400 });
    }
    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED.includes(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, image, or Word document." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = sanitizeName(file.name);

    // Classify (never blocks the upload — falls back to OTHER on any failure).
    const { docType, aiClassified } = await classifyDocument(buffer, file.name, mimeType);

    // Store in Supabase. Path is stable & opaque; the logical "folder" is docType.
    const storagePath = `${userId}/${randomUUID()}-${safeName}`;
    const supabase = getSupabase();
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
    if (uploadError) {
      logError("documents.storage_upload_failed", uploadError, { mimeType, size: file.size });
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const doc = await prisma.document.create({
      data: {
        userId,
        name: file.name.slice(0, 200),
        docType,
        storagePath,
        mimeType,
        size: file.size,
        aiClassified,
      },
    });

    const { data: signed } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, 60 * 60);

    return NextResponse.json({
      id: doc.id,
      name: doc.name,
      docType: doc.docType,
      mimeType: doc.mimeType,
      size: doc.size,
      aiClassified: doc.aiClassified,
      createdAt: doc.createdAt,
      url: signed?.signedUrl ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed";
    const status = message === "Unauthorized" ? 401 : 500;
    if (status === 500) logError("documents.upload_failed", e);
    return NextResponse.json({ error: message }, { status });
  }
}

// PATCH — re-file a document into a different folder (change its docType).
export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { id, docType } = await request.json();
    if (typeof id !== "string" || typeof docType !== "string" || !isDocType(docType)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.document.update({
      where: { id },
      data: { docType, aiClassified: false },
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed";
    const status = message === "Unauthorized" ? 401 : 500;
    if (status === 500) logError("documents.refile_failed", e);
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE — remove a document from storage and the database.
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { id } = await request.json();
    if (typeof id !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await getSupabase().storage.from(DOCUMENTS_BUCKET).remove([existing.storagePath]);
    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Delete failed";
    const status = message === "Unauthorized" ? 401 : 500;
    if (status === 500) logError("documents.delete_failed", e);
    return NextResponse.json({ error: message }, { status });
  }
}
