// Graphique à barres groupées, rendu côté serveur en SVG (aucune bibliothèque).
import { formatMoney } from "@/lib/format";
import { niceScale } from "./lib";

export interface MonthPoint {
  income: number; // cents
  expense: number; // cents
}

const W = 720;
const H = 300;
const PAD = { top: 14, right: 8, bottom: 34, left: 70 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export function MonthlyChart({
  year,
  data,
  locale,
  currency,
  labels,
}: {
  year: number;
  data: MonthPoint[];
  locale: string;
  currency: string;
  labels: { aria: string; income: string; expenses: string; showData: string; caption: string; month: string; balance: string; total: string };
}) {
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const monthLongFmt = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  const months = data.map((_, i) => new Date(Date.UTC(year, i, 15)));

  let compact: Intl.NumberFormat;
  try {
    compact = new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 });
  } catch {
    compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  }
  const money = (c: number) => formatMoney(c, currency, locale);

  const maxUnits = Math.max(0, ...data.flatMap((d) => [d.income, d.expense])) / 100;
  const scale = niceScale(maxUnits);
  const y = (units: number) => PAD.top + PLOT_H - (scale.max > 0 ? (units / scale.max) * PLOT_H : 0);

  const group = PLOT_W / data.length;
  const barW = Math.min(20, (group - 10) / 2);
  const gap = 3;

  const totals = data.reduce((s, d) => ({ income: s.income + d.income, expense: s.expense + d.expense }), { income: 0, expense: 0 });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-sm" aria-hidden="true">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-accent" />
          {labels.income}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-gold" />
          {labels.expenses}
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={labels.aria} className="h-auto w-full min-w-[520px]">
          {scale.values.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(v)} dy="0.35em" textAnchor="end" className="fill-muted tabular" fontSize={13}>
                {compact.format(v)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD.left + group * i + group / 2;
            const hi = (d.income / 100 / (scale.max || 1)) * PLOT_H;
            const he = (d.expense / 100 / (scale.max || 1)) * PLOT_H;
            const base = PAD.top + PLOT_H;
            const m = monthLongFmt.format(months[i]);
            return (
              <g key={i}>
                <rect x={cx - gap / 2 - barW} y={base - hi} width={barW} height={Math.max(0, hi)} rx={3} className="fill-accent">
                  <title>{`${m} · ${labels.income} — ${money(d.income)}`}</title>
                </rect>
                <rect x={cx + gap / 2} y={base - he} width={barW} height={Math.max(0, he)} rx={3} className="fill-gold">
                  <title>{`${m} · ${labels.expenses} — ${money(d.expense)}`}</title>
                </rect>
                <text x={cx} y={H - PAD.bottom + 20} textAnchor="middle" className="fill-muted" fontSize={13}>
                  {monthFmt.format(months[i])}
                </text>
              </g>
            );
          })}
          <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} className="stroke-muted" strokeWidth={1} />
        </svg>
      </div>

      <details className="mt-3">
        <summary className="flex min-h-10 cursor-pointer items-center text-sm font-semibold text-accent">{labels.showData}</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[24rem] text-sm">
            <caption className="sr-only">{labels.caption}</caption>
            <thead>
              <tr className="text-muted">
                <th scope="col" className="py-2 pe-3 text-start font-semibold">{labels.month}</th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">{labels.income}</th>
                <th scope="col" className="px-3 py-2 text-end font-semibold">{labels.expenses}</th>
                <th scope="col" className="py-2 ps-3 text-end font-semibold">{labels.balance}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-t border-line">
                  <th scope="row" className="py-1.5 pe-3 text-start font-normal first-letter:uppercase">{monthLongFmt.format(months[i])}</th>
                  <td className="tabular px-3 py-1.5 text-end">{money(d.income)}</td>
                  <td className="tabular px-3 py-1.5 text-end">{money(d.expense)}</td>
                  <td className="tabular py-1.5 ps-3 text-end">{money(d.income - d.expense)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line font-semibold">
                <th scope="row" className="py-2 pe-3 text-start">{labels.total}</th>
                <td className="tabular px-3 py-2 text-end">{money(totals.income)}</td>
                <td className="tabular px-3 py-2 text-end">{money(totals.expense)}</td>
                <td className="tabular py-2 ps-3 text-end">{money(totals.income - totals.expense)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </details>
    </div>
  );
}
