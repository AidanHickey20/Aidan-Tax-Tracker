import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireUserId } from "@/lib/get-user";

interface ParsedRow {
  [key: string]: string | number | null;
}

export async function POST(request: NextRequest) {
  await requireUserId();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const sheets: { name: string; headers: string[]; rows: ParsedRow[] }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: null });

    if (jsonData.length === 0) continue;

    const headers = Object.keys(jsonData[0]);
    sheets.push({
      name: sheetName,
      headers,
      rows: jsonData,
    });
  }

  return NextResponse.json({ sheets });
}
