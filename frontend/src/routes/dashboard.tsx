import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { useDashboardSummary, useRiskProfile } from "../lib/hooks";
import { useAuthStore } from "../lib/auth";
import type { CohortRiskRow, CourseDifficultyRow } from "../lib/api";
import {
  AlertTriangle,
  Users,
  HeartPulse,
  BookOpen,
  ArrowUpDown,
  Search,
  TrendingUp,
  Brain,
  Activity,
  Star,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Gauge,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

/* ── Helpers ──────────────────────────────────────────────────────────── */

function riskColor(risk: number) {
  if (risk >= 0.6) return "text-red-600 dark:text-red-400";
  if (risk >= 0.4) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function riskBadge(risk: number) {
  if (risk >= 0.6)
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  if (risk >= 0.4)
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
}

function healthBar(score: number) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 70
      ? "bg-emerald-500"
      : pct >= 50
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-[var(--progress-track)]">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium">{score}</span>
    </div>
  );
}

function burnoutLabel(cat: string) {
  const map: Record<string, { label: string; cls: string }> = {
    none: {
      label: "Healthy",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    disengagement: {
      label: "Disengaged",
      cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    },
    conceptual_confusion: {
      label: "Confused",
      cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    },
    cognitive_overload: {
      label: "Overloaded",
      cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    },
  };
  const m = map[cat] ?? { label: cat, cls: "bg-[rgba(79,184,178,0.1)] text-[var(--sea-ink-soft)]" };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function difficultyHeat(rating: number) {
  if (rating >= 0.75) return "bg-red-500";
  if (rating >= 0.55) return "bg-amber-500";
  return "bg-emerald-500";
}

const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
  },
});

/* ── Student Risk Table Columns ───────────────────────────────────── */

const cohortColumns: ColumnDef<typeof dataTableFeatures, CohortRiskRow>[] = [
  {
    accessorKey: "student_name",
    header: "Student",
    cell: (info) => (
      <span className="font-medium">{info.getValue<string>()}</span>
    ),
  },
  { accessorKey: "department", header: "Department" },
  { accessorKey: "section", header: "Section" },
  { accessorKey: "batch", header: "Batch" },
  {
    accessorKey: "at_risk_probability",
    header: "Risk",
    cell: (info) => {
      const v = info.getValue<number>();
      return (
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${riskBadge(v)}`}
        >
          {(v * 100).toFixed(0)}%
        </span>
      );
    },
  },
  {
    accessorKey: "academic_health_score",
    header: "Health Score",
    cell: (info) => healthBar(info.getValue<number>()),
  },
  {
    accessorKey: "cis_score",
    header: "CIS Score",
    cell: (info) => {
      const v = info.getValue<number | null>();
      return v != null ? (
        <span className="font-bold text-[var(--sea-ink)]">{v.toFixed(1)}</span>
      ) : (
        <span className="text-sm text-[var(--sea-ink-soft)]">—</span>
      );
    },
  },
  {
    accessorKey: "burnout_category",
    header: "Burnout Filter",
    cell: (info) => burnoutLabel(info.getValue<string>()),
  },
  { accessorKey: "top_risk_factor", header: "Top Factor" },
];

/* ── Course Heatmap Table Columns ─────────────────────────────────── */

const courseColumns: ColumnDef<typeof dataTableFeatures, CourseDifficultyRow>[] = [
  {
    accessorKey: "course_code",
    header: "Code",
    cell: (info) => (
      <span className="font-mono font-semibold">{info.getValue<string>()}</span>
    ),
  },
  { accessorKey: "course_title", header: "Course" },
  { accessorKey: "department", header: "Dept" },
  {
    accessorKey: "difficulty_rating",
    header: "Difficulty",
    cell: (info) => {
      const v = info.getValue<number>();
      return (
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${difficultyHeat(v)}`}
          />
          <span className="text-sm">{(v * 100).toFixed(0)}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: "avg_student_risk",
    header: "Avg Student Risk",
    cell: (info) => {
      const v = info.getValue<number>();
      return (
        <span className={`font-semibold ${riskColor(v)}`}>
          {(v * 100).toFixed(0)}%
        </span>
      );
    },
  },
  { accessorKey: "enrollment_count", header: "Enrolled" },
];

/* ── Reusable DataTable ───────────────────────────────────────────── */

function DataTable<T extends RowData>({
  data,
  columns,
  searchPlaceholder,
}: {
  data: T[];
  columns: ColumnDef<typeof dataTableFeatures, T>[];
  searchPlaceholder: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sea-ink-soft)]" />
        <input
          value={globalFilter}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--island-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
        <table className="w-full text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-[var(--line)] bg-[var(--island-bg)]"
              >
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none px-4 py-3 font-semibold text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
                  >
                    <div className="flex items-center gap-1">
                      <table.FlexRender header={header} />
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--line)] transition hover:bg-[var(--island-bg)]"
              >
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-[var(--sea-ink-soft)]"
                >
                  No data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Dashboard Page ───────────────────────────────────────────────── */

function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, error } = useDashboardSummary();
  const isAdvisor = user?.role === "advisor";
  const [batchFilter, setBatchFilter] = useState("");

  if (user?.role === "student") {
    return <StudentPersonalDashboard />;
  }

  if (isLoading) {
    return (
      <main className="page-wrap px-4 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(79,184,178,0.3)] border-t-[rgba(79,184,178,1)]" />
          <span className="ml-3 text-[var(--sea-ink-soft)]">
            Loading dashboard…
          </span>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="page-wrap px-4 py-12">
        <div className="bg-surface-container-lowest rounded-xl ghost-border ambient-shadow rounded-2xl p-6 text-center text-red-600">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
          <p>Failed to load dashboard. Is the backend running?</p>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            {(error as Error)?.message}
          </p>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const batchOptions = isAdvisor
    ? [...new Set(data.cohort_risks.map((r) => r.batch).filter(Boolean))] as string[]
    : [];

  const filteredCohortRisks = isAdvisor && batchFilter
    ? data.cohort_risks.filter((r) => r.batch === batchFilter)
    : data.cohort_risks;
  return (
    <main className="page-wrap px-4 pb-8 pt-8 flex-1">
      {/* Hero Header */}
      <section className="mb-10 overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 shadow-sm relative">
        <div className="absolute top-0 right-0 -m-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -m-16 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl"></div>
        <div className="relative px-8 py-10 z-10 backdrop-blur-sm">
          <p className="island-kicker mb-2 text-emerald-600 dark:text-emerald-400">AI-OS Admin</p>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
            Institutional Intelligence
          </h1>
          <p className="mt-3 text-lg font-medium text-[var(--sea-ink-soft)] max-w-2xl">
            Real-time cohort risk clusters, burnout analysis & course difficulty heatmap.
          </p>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={<Users className="h-5 w-5" />}
          label="Total Students"
          value={data.total_students}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/30"
        />
        <KPICard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="At-Risk Students"
          value={data.at_risk_count}
          color="text-red-600 dark:text-red-400"
          bg="bg-red-50 dark:bg-red-900/30"
        />
        <KPICard
          icon={<HeartPulse className="h-5 w-5" />}
          label="Avg Health Score"
          value={data.avg_health_score}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <KPICard
          icon={<BookOpen className="h-5 w-5" />}
          label="Courses Tracked"
          value={data.course_heatmap.length}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/30"
        />
      </section>

      {/* Cohort Risk Table */}
      <section className="bg-surface-container-lowest rounded-xl ghost-border ambient-shadow mb-8 rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--sea-ink)]">
            Cohort Risk Clusters
          </h2>
          {isAdvisor && batchOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="batch-filter"
                className="text-sm font-medium text-[var(--sea-ink-soft)]"
              >
                Batch
              </label>
              <select
                id="batch-filter"
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
              >
                <option value="">All batches</option>
                {batchOptions.sort().map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <DataTable
          data={filteredCohortRisks}
          columns={cohortColumns}
          searchPlaceholder="Search students, department…"
        />
      </section>

      {/* Course Heatmap Table */}
      <section className="bg-surface-container-lowest rounded-xl ghost-border ambient-shadow rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-bold text-[var(--sea-ink)]">
          Course Difficulty Heatmap
        </h2>
        <DataTable
          data={data.course_heatmap}
          columns={courseColumns}
          searchPlaceholder="Search courses, departments…"
        />
      </section>
    </main>
  );
}

/* ── Student Personal Dashboard ───────────────────────────────────── */

function StudentPersonalDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, error } = useRiskProfile(user?.id ?? null);

  if (isLoading) {
    return (
      <main className="page-wrap px-4 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(79,184,178,0.3)] border-t-[rgba(79,184,178,1)]" />
          <span className="ml-3 text-[var(--sea-ink-soft)]">Loading your profile…</span>
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="page-wrap px-4 py-12">
        <div className="bg-surface-container-lowest rounded-xl ghost-border ambient-shadow rounded-2xl p-6 text-center text-red-600">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
          <p>Failed to load your profile.</p>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">{(error as Error)?.message}</p>
        </div>
      </main>
    );
  }

  const riskPct = Math.round(data.at_risk_probability * 100);
  const healthPct = data.academic_health_score;
  const healthState = getHealthState(healthPct, riskPct);
  const primaryAction = getPrimaryAction(riskPct, data.recommended_interventions.length);
  const maxImpact = Math.max(...data.shap_explanation.map((feature) => Math.abs(feature.impact)), 1);

  return (
    <main className="page-wrap w-full px-4 pb-10 pt-8 sm:px-6 sm:pt-10 lg:px-8">
      <header className="mb-8 max-w-3xl sm:mb-10">
        <p className="dashboard-overline">Your learning space</p>
        <h1 className="dashboard-title mt-2">Good to see you, {firstName(user?.name)}.</h1>
        <p className="mt-3 text-base leading-7 text-[var(--ink-muted)] sm:text-lg">
          A clear view of what is going well and where a little attention can make the biggest difference.
        </p>
      </header>

      <section className="dashboard-hero mb-6 grid overflow-hidden lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)]" aria-labelledby="health-summary-title">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className={`dashboard-status ${healthState.badgeClass}`}>
            <healthState.Icon className="h-4 w-4" aria-hidden="true" />
            {healthState.label}
          </div>
          <h2 id="health-summary-title" className="dashboard-section-title mt-5 max-w-xl">
            {healthState.heading}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-muted)] sm:text-base">
            {healthState.description}
          </p>
          <Link to={primaryAction.to} className="button-primary mt-7">
            {primaryAction.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="border-t border-[var(--border-subtle)] bg-[var(--canvas-tint)] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
          <p className="text-sm font-semibold text-[var(--ink-muted)]">Academic health</p>
          <div className="mt-5 flex items-center gap-5">
            <div
              className="health-ring"
              style={{ "--health-progress": `${Math.max(0, Math.min(100, healthPct)) * 3.6}deg`, "--health-color": healthState.color } as React.CSSProperties}
              role="progressbar"
              aria-label="Academic health score"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={healthPct}
            >
              <span>{healthPct}</span>
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-[var(--ink-strong)]">out of 100</p>
              <p className="mt-1 text-sm leading-5 text-[var(--ink-muted)]">A combined signal from your activity, assessments, and engagement.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-3" aria-label="Academic health metrics">
        <StudentMetric icon={<Gauge />} label="Risk exposure" value={`${riskPct}%`} detail={riskLabel(riskPct)} tone={riskPct >= 60 ? "alert" : riskPct >= 40 ? "watch" : "positive"} />
        <StudentMetric icon={<Star />} label="CIS score" value={data.cis_score != null ? data.cis_score.toFixed(1) : "—"} detail="Your current intelligence score" tone="accent" />
        <StudentMetric icon={<Brain />} label="Burnout check" value={formatBurnout(data.burnout_category)} detail={burnoutDetail(data.burnout_category)} tone={data.burnout_category === "none" ? "positive" : "watch"} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.92fr)]">
        <section className="app-panel p-6 sm:p-7" aria-labelledby="signals-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="signals-title" className="dashboard-panel-title">Your learning signals</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">The factors currently having the strongest effect on your risk estimate.</p>
            </div>
            <span className="dashboard-key"><span className="bg-[var(--risk-high)]" />Needs attention <span className="ml-2 bg-[var(--success)]" />Supporting you</span>
          </div>

          {data.shap_explanation.length > 0 ? (
            <ul className="mt-6 space-y-5">
              {data.shap_explanation.map((feature) => {
                const isRiskFactor = feature.impact > 0;
                const percentage = (Math.abs(feature.impact) / maxImpact) * 100;
                return (
                  <li key={feature.feature}>
                    <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                      <span className="font-semibold capitalize text-[var(--ink-strong)]">{feature.feature.replace(/_/g, " ")}</span>
                      <span className={isRiskFactor ? "signal-risk" : "signal-positive"}>{isRiskFactor ? "Needs attention" : "Supporting you"}</span>
                    </div>
                    <div className="signal-track" role="progressbar" aria-label={`${feature.feature.replace(/_/g, " ")} impact`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}>
                      <div className={isRiskFactor ? "signal-fill-risk" : "signal-fill-positive"} style={{ width: `${percentage}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty-note mt-6">We need a little more recent learning activity before we can show your strongest signals.</div>
          )}
        </section>

        <section className="app-panel p-6 sm:p-7" aria-labelledby="actions-title">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 id="actions-title" className="dashboard-panel-title mt-5">Suggested next steps</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">Small, practical actions based on your latest learning signals.</p>
          {data.recommended_interventions.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {data.recommended_interventions.map((message, index) => (
                <li key={`${message}-${index}`} className="flex gap-3 text-sm leading-6 text-[var(--ink-muted)]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" aria-hidden="true" />
                  <span>{message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-note mt-5">No actions are needed right now. Keep following your course plan and check back after your next activity.</div>
          )}
        </section>
      </section>
    </main>
  );
}

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || "there";
}

function riskLabel(risk: number) {
  if (risk >= 60) return "Worth acting on this week";
  if (risk >= 40) return "Keep an eye on this";
  return "Currently low";
}

function formatBurnout(category: string) {
  return category === "none" ? "Clear" : category.replace(/_/g, " ");
}

function burnoutDetail(category: string) {
  return category === "none" ? "No current burnout pattern detected" : "A pattern worth checking in on";
}

function getPrimaryAction(risk: number, recommendationCount: number) {
  if (risk >= 40 || recommendationCount > 0) return { to: "/tasks" as const, label: "Review your tasks" };
  return { to: "/resources" as const, label: "Explore study resources" };
}

function getHealthState(health: number, risk: number) {
  if (risk >= 60 || health < 50) {
    return {
      label: "Needs attention",
      heading: "A few focused changes can improve your trajectory.",
      description: "Your latest learning signals suggest it is worth making space for your highest-priority coursework this week.",
      badgeClass: "dashboard-status-alert",
      color: "var(--risk-high)",
      Icon: CircleAlert,
    };
  }
  if (risk >= 40 || health < 70) {
    return {
      label: "Worth watching",
      heading: "You are on track, with a few signals to keep close.",
      description: "A consistent routine and attention to the signals below can help protect your momentum.",
      badgeClass: "dashboard-status-watch",
      color: "var(--risk-watch)",
      Icon: Activity,
    };
  }
  return {
    label: "Looking steady",
    heading: "Your learning rhythm is in a healthy place.",
    description: "Keep the routines that are working. Your latest activity points to a stable academic trajectory.",
    badgeClass: "dashboard-status-positive",
    color: "var(--success)",
    Icon: ShieldCheck,
  };
}

function StudentMetric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "alert" | "watch" | "positive" | "accent" }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-icon-${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--ink-muted)]">{label}</p>
        <p className="mt-1 text-xl font-bold tracking-tight text-[var(--ink-strong)] capitalize">{value}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{detail}</p>
      </div>
    </article>
  );
}

/* ── KPI Card ─────────────────────────────────────────────────────── */

function KPICard({
  icon,
  label,
  value,
  color,
  bg,
  suffix = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
  suffix?: string;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl ghost-border ambient-shadow flex items-center gap-5 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 opacity-10 blur-xl transform scale-150 transition-transform group-hover:scale-110">
        <div className={`h-24 w-24 rounded-full ${bg} ${color}`}></div>
      </div>
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <span className={`${color} [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[2.3]`}>
          {icon}
        </span>
      </div>
      <div className="relative z-10 w-full min-w-0">
        <p className="text-xs font-bold text-[var(--sea-ink-soft)] uppercase tracking-wide truncate">{label}</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--sea-ink)] drop-shadow-sm">
          {value}{suffix}
        </p>
      </div>
    </div>
  );
}
