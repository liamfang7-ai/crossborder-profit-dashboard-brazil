import Link from "next/link";

export const metadata = {
  title: "Sonic Brazil Operations Dashboard",
};

const statements = [
  "\u8fd9\u662f Sonic \u5185\u90e8\u8de8\u5883\u8fd0\u8425\u5de5\u5177\uff0c\u7528\u4e8e\u8ba2\u5355\u540c\u6b65\u3001SKU \u6210\u672c\u7ef4\u62a4\u548c\u5229\u6da6\u7edf\u8ba1\u3002",
  "\u4ec5\u6388\u6743\u5458\u5de5\u53ef\u8bbf\u95ee\u3002",
  "\u672c\u7cfb\u7edf\u4e0d\u662f\u4efb\u4f55\u7b2c\u4e09\u65b9\u5e73\u53f0\u7684\u5b98\u65b9\u7f51\u7ad9\u3002",
  "\u672c\u7cfb\u7edf\u4e0d\u4f1a\u6536\u96c6\u4efb\u4f55\u7b2c\u4e09\u65b9\u5e73\u53f0\u8d26\u53f7\u5bc6\u7801\u3002",
  "\u5e73\u53f0\u6388\u6743\u4f1a\u8df3\u8f6c\u5230\u5bf9\u5e94\u7b2c\u4e09\u65b9\u5e73\u53f0\u7684\u5b98\u65b9\u6388\u6743\u9875\u9762\u5b8c\u6210\u3002",
  "Contact: Internal operations team",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white px-5 py-6 shadow-sm shadow-slate-200/60 sm:px-6">
        <p className="text-sm font-medium text-slate-500">
          Sonic Brazil Operations
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
          Sonic Brazil Operations Dashboard
        </h1>
        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          {statements.map((statement) => (
            <p key={statement}>{statement}</p>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            {"\u5458\u5de5\u767b\u5f55"}
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {"\u8fd4\u56de\u770b\u677f"}
          </Link>
        </div>
      </section>
    </main>
  );
}
