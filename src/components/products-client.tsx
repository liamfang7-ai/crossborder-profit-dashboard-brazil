"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/profit";
import { safeFormula } from "@/lib/safe-formula";
import { supabase, type ProductRow } from "@/lib/supabase";

type ProductForm = {
  sku: string;
  productName: string;
  imageUrl: string;
  unitCostCny: string;
  unitShippingCostCny: string;
  platformFeeFormulaMxn: string;
  platformTaxFormulaMxn: string;
  lastMileFeeFormulaMxn: string;
  adCostFormulaMxn: string;
  otherFeeFormulaMxn: string;
  isActive: boolean;
};

const emptyForm: ProductForm = {
  sku: "",
  productName: "",
  imageUrl: "",
  unitCostCny: "0",
  unitShippingCostCny: "0",
  platformFeeFormulaMxn: "sales_mxn * 0.13",
  platformTaxFormulaMxn: "sales_mxn * 0.04",
  lastMileFeeFormulaMxn: "quantity * 45",
  adCostFormulaMxn: "sales_mxn * 0.05",
  otherFeeFormulaMxn: "0",
  isActive: true,
};

const formulaFields: Array<{
  key: keyof Pick<
    ProductForm,
    | "platformFeeFormulaMxn"
    | "platformTaxFormulaMxn"
    | "lastMileFeeFormulaMxn"
    | "adCostFormulaMxn"
    | "otherFeeFormulaMxn"
  >;
  label: string;
}> = [
  { key: "platformFeeFormulaMxn", label: "平台佣金公式（MXN）" },
  { key: "platformTaxFormulaMxn", label: "平台税费公式（MXN）" },
  { key: "lastMileFeeFormulaMxn", label: "尾端派送费公式（MXN）" },
  { key: "adCostFormulaMxn", label: "广告费公式（MXN）" },
  { key: "otherFeeFormulaMxn", label: "其他费用公式（MXN）" },
];

function toMoney(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  const parsed = Number(trimmed.replace(/[,\s¥￥]/g, ""));

  return Number.isFinite(parsed) ? parsed : null;
}

function productToForm(product: ProductRow): ProductForm {
  return {
    sku: product.sku,
    productName: product.product_name ?? "",
    imageUrl: product.image_url ?? "",
    unitCostCny: String(product.unit_cost_cny ?? 0),
    unitShippingCostCny: String(product.unit_shipping_cost_cny ?? 0),
    platformFeeFormulaMxn: product.platform_fee_formula_mxn ?? "0",
    platformTaxFormulaMxn: product.platform_tax_formula_mxn ?? "0",
    lastMileFeeFormulaMxn: product.last_mile_fee_formula_mxn ?? "0",
    adCostFormulaMxn: product.ad_cost_formula_mxn ?? "0",
    otherFeeFormulaMxn: product.other_fee_formula_mxn ?? "0",
    isActive: product.is_active ?? true,
  };
}

function validateFormulas(form: ProductForm) {
  const errors: string[] = [];
  const variables = {
    sales_mxn: 1000,
    quantity: 3,
    order_count: 2,
    unit_price_mxn: 333.33,
    exchange_rate: 0.42,
  };

  formulaFields.forEach((field) => {
    const result = safeFormula(form[field.key], variables);

    if (result.error) {
      errors.push(`${field.label}：${result.error}`);
    }
  });

  return errors;
}

export function ProductsClient() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingSku, setEditingSku] = useState("");
  const [exchangeRate, setExchangeRate] = useState("0.42");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.sku.localeCompare(b.sku)),
    [products],
  );

  async function loadData() {
    setIsLoading(true);
    setError("");

    const [productsResult, settingsResult] = await Promise.all([
      supabase
        .from("products")
        .select(
          [
            "sku",
            "product_name",
            "image_url",
            "unit_cost_cny",
            "unit_shipping_cost_cny",
            "is_active",
            "platform_fee_formula_mxn",
            "platform_tax_formula_mxn",
            "last_mile_fee_formula_mxn",
            "ad_cost_formula_mxn",
            "other_fee_formula_mxn",
            "created_at",
            "updated_at",
          ].join(","),
        )
        .order("sku", { ascending: true }),
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "exchange_rate_mxn_to_cny")
        .maybeSingle(),
    ]);

    if (productsResult.error) {
      setError(productsResult.error.message);
      setProducts([]);
    } else {
      setProducts((productsResult.data ?? []) as unknown as ProductRow[]);
    }

    if (!settingsResult.error && settingsResult.data?.value) {
      setExchangeRate(String(settingsResult.data.value));
    }

    setIsLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function saveExchangeRate() {
    setMessage("");
    setError("");
    const value = toMoney(exchangeRate);

    if (value === null || value <= 0) {
      setError("MXN → CNY 汇率必须是大于 0 的数字。");
      return;
    }

    setIsSavingRate(true);
    const { error: saveError } = await supabase.from("app_settings").upsert(
      {
        key: "exchange_rate_mxn_to_cny",
        value: String(value),
      },
      { onConflict: "key" },
    );

    setIsSavingRate(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setExchangeRate(String(value));
    setMessage("汇率已保存，Dashboard 会按新汇率重新计算最近 90 天利润。");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const sku = form.sku.trim();
    const unitCostCny = toMoney(form.unitCostCny);
    const unitShippingCostCny = toMoney(form.unitShippingCostCny);
    const formulaErrors = validateFormulas(form);

    if (!sku) {
      setError("SKU 必填。");
      return;
    }

    if (unitCostCny === null || unitShippingCostCny === null) {
      setError("单件商品成本和单件头程物流成本必须是数字。");
      return;
    }

    if (formulaErrors.length > 0) {
      setError(formulaErrors.join("；"));
      return;
    }

    setIsSaving(true);

    const { error: saveError } = await supabase.from("products").upsert(
      {
        sku,
        product_name: form.productName.trim() || sku,
        image_url: form.imageUrl.trim() || null,
        unit_cost_cny: unitCostCny,
        unit_shipping_cost_cny: unitShippingCostCny,
        platform_fee_formula_mxn: form.platformFeeFormulaMxn.trim() || "0",
        platform_tax_formula_mxn: form.platformTaxFormulaMxn.trim() || "0",
        last_mile_fee_formula_mxn: form.lastMileFeeFormulaMxn.trim() || "0",
        ad_cost_formula_mxn: form.adCostFormulaMxn.trim() || "0",
        other_fee_formula_mxn: form.otherFeeFormulaMxn.trim() || "0",
        is_active: form.isActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "sku" },
    );

    setIsSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMessage(editingSku ? "产品资料已更新。" : "产品资料已新增。");
    setForm(emptyForm);
    setEditingSku("");
    await loadData();
  }

  function startEdit(product: ProductRow) {
    setForm(productToForm(product));
    setEditingSku(product.sku);
    setMessage("");
    setError("");
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingSku("");
    setMessage("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
                SKU 产品管理
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                成本和费用集中在这里维护。商品成本、头程物流成本按 CNY 填写；佣金、税费、尾端派送、广告和其他费用按 MXN 公式计算。
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              返回 Dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/60">
          <h2 className="text-base font-semibold text-slate-950">汇率设置</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="grid gap-2 text-sm sm:w-64">
              <span className="font-medium text-slate-700">MXN → CNY 汇率</span>
              <input
                value={exchangeRate}
                inputMode="decimal"
                className="h-10 rounded-lg border border-slate-200 px-3"
                onChange={(event) => setExchangeRate(event.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={isSavingRate}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white disabled:bg-slate-300"
              onClick={() => void saveExchangeRate()}
            >
              {isSavingRate ? "保存中..." : "保存汇率"}
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[430px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/60"
          >
            <h2 className="text-base font-semibold text-slate-950">
              {editingSku ? "编辑 SKU 产品资料" : "新增 SKU 产品资料"}
            </h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">SKU</span>
                <input
                  value={form.sku}
                  disabled={Boolean(editingSku)}
                  className="h-10 rounded-lg border border-slate-200 px-3 disabled:bg-slate-50 disabled:text-slate-400"
                  onChange={(event) =>
                    setForm((value) => ({ ...value, sku: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">产品名称</span>
                <input
                  value={form.productName}
                  className="h-10 rounded-lg border border-slate-200 px-3"
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      productName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">图片 URL</span>
                <input
                  value={form.imageUrl}
                  className="h-10 rounded-lg border border-slate-200 px-3"
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      imageUrl: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">
                  单件商品成本（CNY）
                </span>
                <input
                  value={form.unitCostCny}
                  inputMode="decimal"
                  className="h-10 rounded-lg border border-slate-200 px-3"
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      unitCostCny: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-700">
                  单件头程物流成本（CNY）
                </span>
                <input
                  value={form.unitShippingCostCny}
                  inputMode="decimal"
                  className="h-10 rounded-lg border border-slate-200 px-3"
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      unitShippingCostCny: event.target.value,
                    }))
                  }
                />
              </label>
              {formulaFields.map((field) => (
                <label key={field.key} className="grid gap-2 text-sm">
                  <span className="font-medium text-slate-700">
                    {field.label}
                  </span>
                  <input
                    value={form[field.key]}
                    className="h-10 rounded-lg border border-slate-200 px-3 font-mono text-xs"
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                公式变量：sales_mxn、quantity、order_count、unit_price_mxn、exchange_rate。允许数字、+ - * /、括号和空格。
              </p>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  className="h-4 w-4 rounded border-slate-300"
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      isActive: event.target.checked,
                    }))
                  }
                />
                启用
              </label>
              {error ? (
                <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white disabled:bg-slate-300"
                >
                  {isSaving ? "保存中..." : "保存 SKU 配置"}
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={resetForm}
                >
                  清空
                </button>
              </div>
            </div>
          </form>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">
                SKU 配置列表
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">图片</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">产品名称</th>
                    <th className="px-4 py-3">商品成本</th>
                    <th className="px-4 py-3">头程物流</th>
                    <th className="px-4 py-3">平台佣金公式</th>
                    <th className="px-4 py-3">平台税费公式</th>
                    <th className="px-4 py-3">尾端派送公式</th>
                    <th className="px-4 py-3">广告费公式</th>
                    <th className="px-4 py-3">其他费用公式</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                        正在加载 SKU 配置...
                      </td>
                    </tr>
                  ) : sortedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                        暂无 SKU 配置
                      </td>
                    </tr>
                  ) : (
                    sortedProducts.map((product) => (
                      <tr key={product.sku} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image_url}
                              alt={product.product_name ?? product.sku}
                              className="h-12 w-12 rounded object-cover"
                            />
                          ) : (
                            <span className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                              无图
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                          {product.sku}
                        </td>
                        <td className="min-w-[180px] px-4 py-3">
                          {product.product_name || product.sku}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatCurrency(product.unit_cost_cny ?? 0, "CNY")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatCurrency(
                            product.unit_shipping_cost_cny ?? 0,
                            "CNY",
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {product.platform_fee_formula_mxn ?? "0"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {product.platform_tax_formula_mxn ?? "0"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {product.last_mile_fee_formula_mxn ?? "0"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {product.ad_cost_formula_mxn ?? "0"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {product.other_fee_formula_mxn ?? "0"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${product.is_active === false ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
                            {product.is_active === false ? "停用" : "启用"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            onClick={() => startEdit(product)}
                          >
                            编辑
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
