"use client";

import { useMemo, useRef, useState } from "react";
import { calculateProfit } from "@/lib/profit";

type ImportOrder = {
  orderNo: string;
  platform: string;
  country: string;
  currency: string;
  revenue: number;
  productCost: number;
  shippingCost: number;
  lastMileFee: number;
  platformFee: number;
  platformTax: number;
  adCost: number;
  refundAmount: number;
  otherFee: number;
  exchangeRateToUsd: number;
  exchangeRateMxnToCny: number;
  orderedAt: string;
};

type Failure = {
  row: number;
  orderNo?: string;
  reason: string;
};

type ImportResult = {
  successCount: number;
  failureCount: number;
  failures: Failure[];
};

type CsvDataRow = {
  cells: string[];
  rowNumber: number;
};

type SystemField =
  | "orderNo"
  | "revenue"
  | "orderedAt"
  | "productCost"
  | "shippingCost"
  | "lastMileFee"
  | "platformFee"
  | "platformTax"
  | "adCost"
  | "refundAmount"
  | "otherFee"
  | "currency"
  | "country"
  | "platform"
  | "exchangeRateToUsd"
  | "exchangeRateMxnToCny";

type Mapping = Record<SystemField, string>;

const mappingStorageKey = "Mercado Libre MX CSV Mapping";

const fieldConfigs: Array<{
  field: SystemField;
  label: string;
  required: boolean;
  defaultText: string;
}> = [
  { field: "orderNo", label: "订单号", required: true, defaultText: "必选" },
  {
    field: "revenue",
    label: "销售额（墨西哥比索）",
    required: true,
    defaultText: "必选",
  },
  {
    field: "orderedAt",
    label: "下单时间",
    required: false,
    defaultText: "当前时间",
  },
  {
    field: "productCost",
    label: "商品成本（人民币）",
    required: false,
    defaultText: "0",
  },
  {
    field: "shippingCost",
    label: "物流成本（人民币）",
    required: false,
    defaultText: "0",
  },
  {
    field: "lastMileFee",
    label: "尾程派送费（MXN）",
    required: false,
    defaultText: "0",
  },
  {
    field: "platformFee",
    label: "平台手续费（MXN）",
    required: false,
    defaultText: "0",
  },
  {
    field: "platformTax",
    label: "平台税费（MXN）",
    required: false,
    defaultText: "0",
  },
  { field: "adCost", label: "广告费（MXN）", required: false, defaultText: "0" },
  { field: "otherFee", label: "其他费用（MXN）", required: false, defaultText: "0" },
  { field: "currency", label: "币种", required: false, defaultText: "MXN" },
  { field: "country", label: "国家", required: false, defaultText: "MX" },
  {
    field: "platform",
    label: "平台",
    required: false,
    defaultText: "Mercado Libre MX",
  },
  {
    field: "exchangeRateToUsd",
    label: "汇率",
    required: false,
    defaultText: "1",
  },
  {
    field: "exchangeRateMxnToCny",
    label: "MXN 转 CNY 汇率",
    required: false,
    defaultText: "0.42",
  },
];

const csvColumns = [
  "orderNo",
  "platform",
  "country",
  "currency",
  "revenue",
  "productCost",
  "shippingCost",
  "lastMileFee",
  "platformFee",
  "platformTax",
  "adCost",
  "otherFee",
  "exchangeRateToUsd",
  "exchangeRateMxnToCny",
  "orderedAt",
];

function createEmptyMapping(): Mapping {
  return fieldConfigs.reduce((mapping, config) => {
    mapping[config.field] = "";
    return mapping;
  }, {} as Mapping);
}

function readSavedMapping(): Mapping {
  if (typeof window === "undefined") {
    return createEmptyMapping();
  }

  const raw = window.localStorage.getItem(mappingStorageKey);

  if (!raw) {
    return createEmptyMapping();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Mapping>;
    const mapping = createEmptyMapping();

    fieldConfigs.forEach((config) => {
      mapping[config.field] = parsed[config.field] ?? "";
    });

    return mapping;
  } catch {
    return createEmptyMapping();
  }
}

function parseCsv(text: string): { rows: CsvDataRow[]; failures: Failure[] } {
  const rows: CsvDataRow[] = [];
  const failures: Failure[] = [];
  let current = "";
  let cells: string[] = [];
  let inQuotes = false;
  let fieldStarted = false;
  let lineNumber = 1;
  let rowNumber = 1;

  function pushCell() {
    cells.push(current);
    current = "";
    fieldStarted = false;
  }

  function pushRow() {
    pushCell();

    if (cells.some((cell) => cell.trim())) {
      rows.push({ cells, rowNumber });
    }

    cells = [];
    rowNumber = lineNumber;
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      fieldStarted = true;
      continue;
    }

    if (char === '"' && !fieldStarted) {
      inQuotes = !inQuotes;
      fieldStarted = true;
      continue;
    }

    if (char === '"' && inQuotes) {
      inQuotes = false;
      fieldStarted = true;
      continue;
    }

    if (char === "," && !inQuotes) {
      pushCell();
      continue;
    }

    if (char === "\n" || char === "\r") {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      if (inQuotes) {
        current += "\n";
        lineNumber += 1;
        continue;
      }

      lineNumber += 1;
      pushRow();
      rowNumber = lineNumber;
      continue;
    }

    current += char;
    fieldStarted = true;
  }

  if (inQuotes) {
    failures.push({
      row: rowNumber,
      reason: "CSV 引号未闭合",
    });
  }

  if (!inQuotes && (current || cells.length > 0)) {
    pushRow();
  }

  return { rows, failures };
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim();
}

function normalizeMappingForHeaders(headers: string[], savedMapping: Mapping) {
  const nextMapping = createEmptyMapping();

  fieldConfigs.forEach((config) => {
    const savedColumn = savedMapping[config.field];

    if (savedColumn && headers.includes(savedColumn)) {
      nextMapping[config.field] = savedColumn;
      return;
    }

    if (headers.includes(config.field)) {
      nextMapping[config.field] = config.field;
    }
  });

  return nextMapping;
}

function getMappedCell(
  headers: string[],
  cells: string[],
  mapping: Mapping,
  field: SystemField,
) {
  const column = mapping[field];

  if (!column) {
    return undefined;
  }

  const index = headers.indexOf(column);

  return index >= 0 ? cells[index] : undefined;
}

type MoneyParseResult =
  | {
      ok: true;
      value: number;
    }
  | {
      ok: false;
      rawValue: string;
    };

function parseMoney(value: string | undefined, fallback: number): MoneyParseResult {
  const raw = value?.trim();

  if (!raw) {
    return {
      ok: true,
      value: fallback,
    };
  }

  let cleaned = raw.replace(/\s/g, "").replace(/[^\d,.-]/g, "");

  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    const commaParts = cleaned.split(",");
    const lastPart = commaParts[commaParts.length - 1];
    cleaned =
      commaParts.length === 2 && lastPart.length <= 2
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "");
  }

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    return {
      ok: false,
      rawValue: raw,
    };
  }

  return {
    ok: true,
    value: parsed,
  };
}

function formatRawValue(value: string) {
  return value ? `，当前值为 ${JSON.stringify(value)}` : "";
}

function getMoneyFailure(
  field: SystemField,
  result: MoneyParseResult,
  rowNumber: number,
  orderNo: string,
): Failure | null {
  if (result.ok) {
    return null;
  }

  return {
    row: rowNumber,
    orderNo,
    reason: `${field} 必须是数字${formatRawValue(result.rawValue)}`,
  };
}

function toText(value: string | undefined, fallback: string) {
  const normalized = value?.trim();

  return normalized || fallback;
}

function validateRequiredMapping(mapping: Mapping) {
  if (!mapping.orderNo) {
    return "请先映射必选字段：orderNo";
  }

  if (!mapping.revenue) {
    return "请先映射必选字段：revenue";
  }

  return null;
}

function buildOrder(
  headers: string[],
  cells: string[],
  mapping: Mapping,
  rowNumber: number,
): { order?: ImportOrder; failure?: Failure } {
  const orderNo = getMappedCell(headers, cells, mapping, "orderNo")?.trim();
  const revenue = parseMoney(
    getMappedCell(headers, cells, mapping, "revenue"),
    Number.NaN,
  );

  if (!orderNo) {
    return {
      failure: {
        row: rowNumber,
        reason: "orderNo 必填",
      },
    };
  }

  if (!revenue.ok || Number.isNaN(revenue.value)) {
    return {
      failure: {
        row: rowNumber,
        orderNo,
        reason: revenue.ok
          ? "revenue 必须是数字"
          : `revenue 必须是数字${formatRawValue(revenue.rawValue)}`,
      },
    };
  }

  const productCost = parseMoney(
    getMappedCell(headers, cells, mapping, "productCost"),
    0,
  );
  const shippingCost = parseMoney(
    getMappedCell(headers, cells, mapping, "shippingCost"),
    0,
  );
  const platformFee = parseMoney(
    getMappedCell(headers, cells, mapping, "platformFee"),
    0,
  );
  const lastMileFee = parseMoney(
    getMappedCell(headers, cells, mapping, "lastMileFee"),
    0,
  );
  const platformTax = parseMoney(
    getMappedCell(headers, cells, mapping, "platformTax"),
    0,
  );
  const adCost = parseMoney(
    getMappedCell(headers, cells, mapping, "adCost"),
    0,
  );
  const refundAmount = parseMoney(
    getMappedCell(headers, cells, mapping, "refundAmount"),
    0,
  );
  const otherFee = parseMoney(
    getMappedCell(headers, cells, mapping, "otherFee"),
    0,
  );
  const exchangeRateToUsd = parseMoney(
    getMappedCell(headers, cells, mapping, "exchangeRateToUsd"),
    1,
  );
  const exchangeRateMxnToCny = parseMoney(
    getMappedCell(headers, cells, mapping, "exchangeRateMxnToCny"),
    0.42,
  );

  const moneyFailure =
    getMoneyFailure("productCost", productCost, rowNumber, orderNo) ??
    getMoneyFailure("shippingCost", shippingCost, rowNumber, orderNo) ??
    getMoneyFailure("lastMileFee", lastMileFee, rowNumber, orderNo) ??
    getMoneyFailure("platformFee", platformFee, rowNumber, orderNo) ??
    getMoneyFailure("platformTax", platformTax, rowNumber, orderNo) ??
    getMoneyFailure("adCost", adCost, rowNumber, orderNo) ??
    getMoneyFailure("refundAmount", refundAmount, rowNumber, orderNo) ??
    getMoneyFailure("otherFee", otherFee, rowNumber, orderNo) ??
    getMoneyFailure(
      "exchangeRateToUsd",
      exchangeRateToUsd,
      rowNumber,
      orderNo,
    ) ??
    getMoneyFailure(
      "exchangeRateMxnToCny",
      exchangeRateMxnToCny,
      rowNumber,
      orderNo,
    );

  if (moneyFailure) {
    return {
      failure: moneyFailure,
    };
  }

  if (
    !productCost.ok ||
    !shippingCost.ok ||
    !lastMileFee.ok ||
    !platformFee.ok ||
    !platformTax.ok ||
    !adCost.ok ||
    !refundAmount.ok ||
    !otherFee.ok ||
    !exchangeRateToUsd.ok ||
    !exchangeRateMxnToCny.ok
  ) {
    return {
      failure: {
        row: rowNumber,
        orderNo,
        reason: "金额字段解析失败",
      },
    };
  }

  return {
    order: {
      orderNo,
      platform: toText(
        getMappedCell(headers, cells, mapping, "platform"),
        "Mercado Libre MX",
      ),
      country: toText(getMappedCell(headers, cells, mapping, "country"), "MX"),
      currency: toText(
        getMappedCell(headers, cells, mapping, "currency"),
        "MXN",
      ),
      revenue: revenue.value,
      productCost: productCost.value,
      shippingCost: shippingCost.value,
      lastMileFee: lastMileFee.value,
      platformFee: platformFee.value,
      platformTax: platformTax.value,
      adCost: adCost.value,
      refundAmount: refundAmount.value,
      otherFee: otherFee.value,
      exchangeRateToUsd: exchangeRateToUsd.value,
      exchangeRateMxnToCny: exchangeRateMxnToCny.value,
      orderedAt: toText(
        getMappedCell(headers, cells, mapping, "orderedAt"),
        new Date().toISOString(),
      ),
    },
  };
}

export function OrderImportClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<CsvDataRow[]>([]);
  const [parseFailures, setParseFailures] = useState<Failure[]>([]);
  const [mapping, setMapping] = useState<Mapping>(() => readSavedMapping());
  const [isImporting, setIsImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const templateText = useMemo(() => csvColumns.join(","), []);
  const previewRows = useMemo(
    () =>
      dataRows.slice(0, 5).map((row) => {
        const { order, failure } = buildOrder(
          headers,
          row.cells,
          mapping,
          row.rowNumber,
        );

        return {
          rowNumber: row.rowNumber,
          cells: row.cells,
          order,
          failure,
        };
      }),
    [dataRows, headers, mapping],
  );
  const requiredMappingNotice = validateRequiredMapping(mapping);

  async function readFile(file: File) {
    setFileName(file.name);
    setResult(null);
    setNotice("");

    try {
      const text = await file.text();
      const parsedCsv = parseCsv(text);
      const rows = parsedCsv.rows;

      if (rows.length < 2) {
        setHeaders([]);
        setDataRows([]);
        setParseFailures(parsedCsv.failures);
        setNotice(
          parsedCsv.failures[0]?.reason ?? "CSV 至少需要表头和一行订单数据",
        );
        return;
      }

      const nextHeaders = rows[0].cells.map(normalizeHeader);
      const savedMapping = readSavedMapping();

      setHeaders(nextHeaders);
      setDataRows(rows.slice(1));
      setParseFailures(parsedCsv.failures);
      setMapping(normalizeMappingForHeaders(nextHeaders, savedMapping));
    } catch (error) {
      setHeaders([]);
      setDataRows([]);
      setParseFailures([]);
      setNotice(error instanceof Error ? error.message : "CSV 读取失败");
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function updateMapping(field: SystemField, column: string) {
    setMapping((current) => ({
      ...current,
      [field]: column,
    }));
    setResult(null);
    setNotice("");
  }

  function saveMapping() {
    window.localStorage.setItem(mappingStorageKey, JSON.stringify(mapping));
    setNotice("字段映射已保存。后续同格式 CSV 可以直接导入。");
  }

  async function startImport() {
    const mappingError = validateRequiredMapping(mapping);

    if (mappingError) {
      setNotice(mappingError);
      return;
    }

    setIsImporting(true);
    setResult(null);
    setNotice("");

    let successCount = 0;
    const failures: Failure[] = [...parseFailures];

    for (const row of dataRows) {
      const { order, failure } = buildOrder(
        headers,
        row.cells,
        mapping,
        row.rowNumber,
      );

      if (failure || !order) {
        failures.push(
          failure ?? { row: row.rowNumber, reason: "订单解析失败" },
        );
        continue;
      }

      try {
        const response = await fetch("/api/orders/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(order),
        });
        const payload = (await response.json()) as {
          success?: boolean;
          error?: string;
        };

        if (!response.ok || !payload.success) {
          failures.push({
            row: row.rowNumber,
            orderNo: order.orderNo,
            reason: payload.error ?? "接口写入失败",
          });
          continue;
        }

        successCount += 1;
      } catch (error) {
        failures.push({
          row: row.rowNumber,
          orderNo: order.orderNo,
          reason: error instanceof Error ? error.message : "接口请求失败",
        });
      }
    }

    setResult({
      successCount,
      failureCount: failures.length,
      failures,
    });
    setIsImporting(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              上传订单 CSV
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              第一次导入真实美客多 CSV 时，请先映射字段。映射保存后，后续同格式 CSV 可以直接导入。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {fileName ? (
              <span className="text-sm text-slate-500">{fileName}</span>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void readFile(file);
                }
              }}
            />
            <button
              type="button"
              disabled={isImporting}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              onClick={() => inputRef.current?.click()}
            >
              选择 CSV 文件
            </button>
          </div>
        </div>
        {notice ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {notice}
          </p>
        ) : null}
      </section>

      {headers.length > 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                字段映射
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                每个系统字段选择 CSV 中对应的一列，未映射的可选字段会使用默认值。
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={saveMapping}
            >
              保存字段映射
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {fieldConfigs.map((config) => (
              <label
                key={config.field}
                className="grid gap-2 rounded-lg border border-slate-200 p-3"
              >
                <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                  <span>
                    {config.field}
                    <span className="ml-2 text-slate-400">{config.label}</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {config.required ? "必选" : `默认 ${config.defaultText}`}
                  </span>
                </span>
                <select
                  value={mapping[config.field]}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  onChange={(event) =>
                    updateMapping(config.field, event.target.value)
                  }
                >
                  <option value="">不映射</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {requiredMappingNotice ? (
            <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {requiredMappingNotice}
            </p>
          ) : null}
        </section>
      ) : null}

      {previewRows.length > 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                导入预览
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                显示前 5 行原始 CSV 与转换后的系统字段。
              </p>
            </div>
            <button
              type="button"
              disabled={isImporting || Boolean(requiredMappingNotice)}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              onClick={() => void startImport()}
            >
              {isImporting ? "导入中..." : "开始导入"}
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">原始行号</th>
                  <th className="px-4 py-3">原始 CSV 行</th>
                  <th className="px-4 py-3">转换后预览</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {previewRows.map((preview) => (
                  <tr key={preview.rowNumber}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {preview.rowNumber}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs">
                        {preview.cells.map((cell) => cell.trim()).join(" | ")}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs">
                        {preview.order
                          ? JSON.stringify({
                              ...preview.order,
                              profitCny: calculateProfit(preview.order).profit,
                            })
                          : preview.failure?.reason}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
        <h2 className="text-base font-semibold text-slate-950">统一字段模板</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
          {templateText}
        </pre>
      </section>

      {result ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
          <h2 className="text-base font-semibold text-slate-950">导入结果</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-emerald-50 px-4 py-3">
              <p className="text-sm text-emerald-700">成功导入</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-950">
                {result.successCount} 条
              </p>
            </div>
            <div className="rounded-lg bg-rose-50 px-4 py-3">
              <p className="text-sm text-rose-700">失败</p>
              <p className="mt-1 text-2xl font-semibold text-rose-950">
                {result.failureCount} 条
              </p>
            </div>
          </div>
          {result.failures.length > 0 ? (
            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">原始行号</th>
                    <th className="px-4 py-3">订单号</th>
                    <th className="px-4 py-3">失败原因</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {result.failures.map((failure) => (
                    <tr key={`${failure.row}-${failure.orderNo ?? ""}`}>
                      <td className="px-4 py-3">{failure.row || "--"}</td>
                      <td className="px-4 py-3">{failure.orderNo ?? "--"}</td>
                      <td className="px-4 py-3">{failure.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
