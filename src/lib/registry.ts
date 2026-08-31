import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import type { RegistryInitiative } from "./types";

const SHEET_NAME = "Инициативы";
const DATA_DIR = path.join(process.cwd(), "data");
/** Активный загруженный через UI реестр (имеет приоритет над seed-файлом) */
export const REGISTRY_UPLOAD_PATH = path.join(DATA_DIR, "registry-current.xlsx");
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

let cache: RegistryInitiative[] | null = null;
let cacheMtimeMs: number | null = null;
let cachePath: string | null = null;

function cell(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function resolveSeedPath(): string {
  const configured = process.env.REGISTRY_PATH || "ai-initiatives-2026-08-21.xlsx";
  if (path.isAbsolute(configured)) return configured;
  return path.join(process.cwd(), configured);
}

/** Путь к текущему файлу реестра: upload, если есть, иначе seed / REGISTRY_PATH */
export function resolveRegistryPath(): string {
  if (fs.existsSync(REGISTRY_UPLOAD_PATH)) return REGISTRY_UPLOAD_PATH;
  return resolveSeedPath();
}

function mapRow(
  row: Record<string, unknown>,
  index: number,
): RegistryInitiative | null {
  const title = cell(row, "Название");
  if (!title) return null;

  return {
    id: `reg-${index + 1}`,
    title,
    description: cell(row, "Описание"),
    status: cell(row, "Статус"),
    department: cell(row, "Подразделение"),
    executor: cell(row, "Исполнитель"),
    owner: cell(row, "Владелец"),
    ownerEmail: cell(row, "E-mail владельца"),
    contactPerson: cell(row, "Контактное лицо"),
    contactEmail: cell(row, "E-mail контактного лица"),
    technologies: cell(row, "Технологии"),
    businessEffect: cell(row, "Бизнес-эффект"),
    budgetMln: cell(row, "Бюджет (млн. руб)"),
    projectLead: cell(row, "Руководитель проекта"),
    serviceUrl: cell(row, "Ссылка на сервис"),
    accessInstructions: cell(row, "Инструкция по получению доступа"),
    startDate: cell(row, "Дата начала"),
  };
}

function parseWorkbook(workbook: XLSX.WorkBook): RegistryInitiative[] {
  const sheet =
    workbook.Sheets[SHEET_NAME] ?? workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    throw new Error("В Excel не найден лист с инициативами");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const initiatives = rows
    .map((row, index) => mapRow(row, index))
    .filter((item): item is RegistryInitiative => item !== null);

  if (initiatives.length === 0) {
    throw new Error(
      'В файле нет строк с колонкой «Название». Ожидается лист «Инициативы» или первый лист с этой колонкой.',
    );
  }

  return initiatives;
}

export function clearRegistryCache(): void {
  cache = null;
  cacheMtimeMs = null;
  cachePath = null;
}

export function loadRegistry(force = false): RegistryInitiative[] {
  const filePath = resolveRegistryPath();
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Файл реестра не найден: ${path.basename(filePath)}. Загрузите Excel через интерфейс.`,
    );
  }
  const stat = fs.statSync(filePath);

  if (
    !force &&
    cache &&
    cacheMtimeMs === stat.mtimeMs &&
    cachePath === filePath
  ) {
    return cache;
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const initiatives = parseWorkbook(workbook);

  cache = initiatives;
  cacheMtimeMs = stat.mtimeMs;
  cachePath = filePath;
  return initiatives;
}

export interface RegistryMeta {
  departments: string[];
  technologies: string[];
  statuses: string[];
  count: number;
  source: "upload" | "seed";
  fileName: string;
  updatedAt: string | null;
  uploadAvailable: boolean;
}

export function getRegistryMeta(): RegistryMeta {
  const filePath = resolveRegistryPath();
  const fromUpload = filePath === REGISTRY_UPLOAD_PATH;
  let updatedAt: string | null = null;
  let fileName = path.basename(filePath);

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    updatedAt = stat.mtime.toISOString();
  }

  const items = loadRegistry();
  const uniq = (values: string[]) =>
    [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ru"),
    );

  return {
    count: items.length,
    departments: uniq(items.map((i) => i.department)),
    technologies: uniq(items.map((i) => i.technologies)),
    statuses: uniq(items.map((i) => i.status)),
    source: fromUpload ? "upload" : "seed",
    fileName,
    updatedAt,
    uploadAvailable: true,
  };
}

export interface RegistryUploadResult {
  count: number;
  fileName: string;
  updatedAt: string;
  source: "upload";
  departments: string[];
}

/** Сохранить загруженный Excel как активный реестр */
export function saveRegistryUpload(
  buffer: Buffer,
  originalName?: string,
): RegistryUploadResult {
  if (!buffer.length) {
    throw new Error("Пустой файл");
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("Файл больше 25 МБ");
  }

  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const initiatives = parseWorkbook(workbook);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // атомарная запись: temp → rename
  const tmpPath = `${REGISTRY_UPLOAD_PATH}.tmp`;
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, REGISTRY_UPLOAD_PATH);

  clearRegistryCache();
  const meta = getRegistryMeta();

  return {
    count: initiatives.length,
    fileName: originalName?.trim() || meta.fileName,
    updatedAt: meta.updatedAt ?? new Date().toISOString(),
    source: "upload",
    departments: meta.departments,
  };
}

/** Удалить загруженный файл и вернуться к seed REGISTRY_PATH */
export function resetRegistryToSeed(): RegistryMeta {
  if (fs.existsSync(REGISTRY_UPLOAD_PATH)) {
    fs.unlinkSync(REGISTRY_UPLOAD_PATH);
  }
  clearRegistryCache();
  return getRegistryMeta();
}

export const REGISTRY_MAX_UPLOAD_BYTES = MAX_UPLOAD_BYTES;
