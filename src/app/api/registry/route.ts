import { NextResponse } from "next/server";
import {
  getRegistryMeta,
  REGISTRY_MAX_UPLOAD_BYTES,
  resetRegistryToSeed,
  saveRegistryUpload,
} from "@/lib/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const meta = getRegistryMeta();
    return NextResponse.json(meta);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось загрузить реестр";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Ожидается multipart/form-data с полем file" },
        { status: 400 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Выберите файл Excel (.xlsx)" },
        { status: 400 },
      );
    }

    const name = file.name || "registry.xlsx";
    if (!/\.xlsx?$/i.test(name)) {
      return NextResponse.json(
        { error: "Поддерживаются только файлы .xlsx / .xls" },
        { status: 400 },
      );
    }

    if (file.size > REGISTRY_MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Файл больше 25 МБ" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = saveRegistryUpload(buffer, name);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось обновить реестр";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Сброс к исходному seed-файлу из REGISTRY_PATH */
export async function DELETE() {
  try {
    const meta = resetRegistryToSeed();
    return NextResponse.json(meta);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось сбросить реестр";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
