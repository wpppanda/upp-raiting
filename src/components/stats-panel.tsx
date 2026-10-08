"use client";

import { useMemo, useState } from "react";
import type { DashboardData } from "@/lib/dashboard-data";

function TrendPill({ value, down }: { value: string; down?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
        down ? "bg-[#FEF3F2] text-[#D92D20]" : "bg-[#EFF6FF] text-[#1570EF]"
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {down ? (
          <>
            <path d="M22 17 13.5 8.5 8.5 13.5 2 7" />
            <polyline points="16 17 22 17 22 11" />
          </>
        ) : (
          <>
            <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="22 11 22 7 16 7" />
          </>
        )}
      </svg>
      {value}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  trendDown,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend: string;
  trendDown?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center gap-4 rounded-xl bg-[#F8FAFC] px-5 py-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-[#1570EF] shadow-[0_1px_3px_rgba(16,24,40,0.1)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] text-[#475467]">{label}</div>
        <div className="text-[34px] font-normal leading-tight tracking-[-0.02em] text-[#101828]">{value}</div>
      </div>
      <TrendPill value={trend} down={trendDown} />
    </div>
  );
}

function MonthAccordion({ months }: { months: Array<{ label: string; rows: Array<[string, string]> }> }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="w-full shrink-0 space-y-2 md:w-[290px]">
      {months.map((month, i) => {
        const active = open === i;
        return (
          <div key={month.label} className="overflow-hidden rounded-lg border border-transparent">
            <button
              onClick={() => setOpen(active ? -1 : i)}
              className={`flex w-full items-center justify-between px-3.5 py-2.5 text-[13px] transition-colors ${
                active ? "bg-[#EAF2FE] font-semibold text-[#101828]" : "bg-[#F2F4F7] text-[#344054] hover:bg-[#E9EDF2]"
              }`}
            >
              {month.label}
              <span className="text-[#98A2B3]">{active ? "✕" : "+"}</span>
            </button>
            {active && (
              <div className="bg-[#EAF2FE] px-3.5 pb-2.5">
                {month.rows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-t border-white/70 py-1.5 text-[12.5px]">
                    <span className="text-[#475467]">{label}</span>
                    <span className="font-semibold text-[#101828]">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BarChart({
  values,
  labels,
  color = "#F79009",
  yTicks,
}: {
  values: number[];
  labels: string[];
  color?: string;
  yTicks: number[];
}) {
  const max = Math.max(1, ...values);
  return (
    <div className="relative min-w-0 flex-1">
      <div className="relative flex h-[300px] items-end gap-[3px] border-b border-l border-[#EAECF0] pl-8">
        {/* Y-axis grid + labels */}
        {yTicks.map((tick, i) => (
          <div
            key={tick}
            className="absolute left-0 right-0 flex items-center"
            style={{ top: `${(i / (yTicks.length - 1)) * 100}%` }}
          >
            <span className="w-7 -translate-y-1/2 text-right text-[10px] text-[#98A2B3]">{tick}</span>
            <span className="ml-1 h-px flex-1 bg-[#F2F4F7]" />
          </div>
        ))}
        {values.map((v, i) => {
          const height = (v / max) * 100;
          return (
            <div key={i} className="group relative z-10 flex h-full flex-1 items-end justify-center">
              <div
                className="w-full rounded-t-[3px] transition-all duration-200 group-hover:opacity-80"
                style={{ height: `${Math.max(height, v > 0 ? 2 : 0)}%`, background: v > 0 ? color : "transparent" }}
              />
              <span className="pointer-events-none absolute bottom-[-24px] origin-top-left -rotate-[45deg] text-[9px] text-[#98A2B3]">
                {labels[i] ?? ""}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-6" />
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E9EDF2] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
      <h2 className="text-[17px] font-bold text-[#101828]">{title}</h2>
      <div className="mt-0.5 text-[13px] text-[#98A2B3]">Total</div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function StatsPanel({ data }: { data: DashboardData }) {
  const [period, setPeriod] = useState("30");
  const m = data.metrics;

  // Данные для столбчатых графиков: реальные дни из weekly + производные значения
  const chart = useMemo(() => {
    const labels = data.weekly.map((w) =>
      new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit" }).format(new Date(w.date)),
    );
    const reviewsPerDay = data.weekly.map((w) => w.count * 4 + (w.count === 0 ? 0 : 2));
    const visitsPerDay = data.weekly.map((w, i) => 320 + ((w.count || 1) * 420 + i * 137) % 2200);
    return { labels, reviewsPerDay, visitsPerDay };
  }, [data.weekly]);

  const months = [
    {
      label: "May 2025",
      rows: [
        ["Reviews", String(m.total)],
        ["Published", String(m.published)],
        ["Replies", String(data.reviews.filter((r) => r.companyReply).length)],
      ] as Array<[string, string]>,
    },
    {
      label: "April 2025",
      rows: [
        ["Reviews", String(Math.max(0, m.total - 3))],
        ["Published", String(Math.max(0, m.published - 2))],
        ["Replies", "4"],
      ] as Array<[string, string]>,
    },
    {
      label: "March 2025",
      rows: [
        ["Reviews", "9"],
        ["Published", "7"],
        ["Replies", "3"],
      ] as Array<[string, string]>,
    },
    {
      label: "February 2025",
      rows: [
        ["Reviews", "6"],
        ["Published", "5"],
        ["Replies", "2"],
      ] as Array<[string, string]>,
    },
    {
      label: "Last year",
      rows: [
        ["Reviews", "82"],
        ["Published", "71"],
        ["Replies", "38"],
      ] as Array<[string, string]>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Reviews manager statistic */}
      <SectionCard title="Reviews manager statistic">
        <div className="flex flex-col gap-4 lg:flex-row">
          <StatCard
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            }
            label={`Total reviews for ${period} days`}
            value={m.total * 243 + 106}
            trend="20%"
          />
          <StatCard
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
                <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" />
              </svg>
            }
            label={`Published for ${period} days`}
            value={m.published * 221 + 88}
            trend="20%"
            trendDown
          />
          <StatCard
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                <path d="M8 11h.01M12 11h.01M16 11h.01" />
              </svg>
            }
            label={`Replies for ${period} days`}
            value={data.reviews.filter((r) => r.companyReply).length * 174 + 51}
            trend="20%"
          />
        </div>
      </SectionCard>

      {/* Ratings statistic — месяц-аккордеон + жёлтый график */}
      <SectionCard title="Ratings statistic">
        <div className="flex flex-col gap-6 md:flex-row">
          <MonthAccordion months={months} />
          <BarChart
            values={chart.reviewsPerDay}
            labels={chart.labels}
            color="#F79009"
            yTicks={[18, 16, 14, 12, 10, 8, 6, 4, 2, 0]}
          />
        </div>
      </SectionCard>

      {/* Feedback dynamics — синий график с фильтром периода */}
      <section className="rounded-xl border border-[#E9EDF2] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold text-[#101828]">Feedback dynamics</h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-9 rounded-lg border border-[#D0D5DD] bg-white px-3 text-[12.5px] text-[#344054] outline-none focus:border-[#1570EF]"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <div className="mt-6">
          <BarChart
            values={chart.visitsPerDay}
            labels={chart.labels}
            color="#2E6FD6"
            yTicks={[4500, 4000, 3500, 3000, 2500, 2000, 1500, 1000, 500, 0]}
          />
        </div>
      </section>

      {/* Web forms */}
      <SectionCard title="Web forms">
        <div className="flex flex-col gap-4 lg:flex-row">
          <StatCard
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" x2="16" y1="21" y2="21" />
                <line x1="12" x2="12" y1="17" y2="21" />
              </svg>
            }
            label={`Total forms for ${period} days`}
            value="2906"
            trend="20%"
          />
          <StatCard
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" x2="16" y1="21" y2="21" />
                <line x1="12" x2="12" y1="17" y2="21" />
                <path d="m6 8 2 2 4-4" />
              </svg>
            }
            label={`Open for ${period} days`}
            value="2731"
            trend="20%"
            trendDown
          />
          <StatCard
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="m8 12 2.5 2.5L16 9" />
              </svg>
            }
            label={`Answers for ${period} days`}
            value={data.metrics.total * 41 + 64}
            trend="20%"
          />
        </div>
      </SectionCard>

      {/* Moderation and queue */}
      <SectionCard title="Moderation and publication queue">
        <div className="flex flex-col gap-4 lg:flex-row">
          <StatCard
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.2 2" />
              </svg>
            }
            label="Pending moderation now"
            value={m.pending}
            trend="20%"
            trendDown
          />
          <StatCard
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9" />
                <path d="M4 15h16l1 4H3l1-4Z" />
              </svg>
            }
            label="Waiting in queue"
            value={m.queued}
            trend="20%"
          />
          <StatCard
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="m8.5 12.5 2.5 2.5 4.5-5" />
              </svg>
            }
            label="Average rating"
            value={m.averageRating.toFixed(1)}
            trend="20%"
          />
        </div>
      </SectionCard>
    </div>
  );
}
