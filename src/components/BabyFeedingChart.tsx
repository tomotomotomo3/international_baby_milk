"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";

const BIRTH_DATE = new Date(2026, 1, 11);
const BIRTH_WEIGHT = 2260;
const CURRENT_DAY = 23;

interface WeightRow {
  day: number;
  date: string;
  whoLow: number;
  whoHigh: number;
  whoMid: number;
  actual: number | null;
  actualProjection: number | null;
}

interface FeedingRow {
  weight: string;
  weightNum: number;
  who150per: number;
  who180per: number;
  monthlyPer: number;
}

interface ScheduleRow {
  day: number;
  date: string;
  weight: number;
  mlPerKg: number;
  totalMl: number;
  perFeed8: number;
  perFeed10: number;
  monthlyGuide: number;
  monthlyTotal: number;
  monthlyMlKg: number;
  weekNum: number;
}

function generateWeightData(): WeightRow[] {
  const data: WeightRow[] = [];
  let wLow = BIRTH_WEIGHT;
  let wHigh = BIRTH_WEIGHT;
  let wMid = BIRTH_WEIGHT;
  let wActual = BIRTH_WEIGHT;

  for (let day = 0; day <= 90; day++) {
    const date = new Date(BIRTH_DATE);
    date.setDate(date.getDate() + day);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

    if (day <= 5) {
      wLow = BIRTH_WEIGHT * (1 - 0.07 * Math.min(day / 4, 1));
      wHigh = BIRTH_WEIGHT * (1 - 0.05 * Math.min(day / 3, 1));
      wMid = BIRTH_WEIGHT * (1 - 0.06 * Math.min(day / 3.5, 1));
      wActual = BIRTH_WEIGHT * (1 - 0.05 * Math.min(day / 3, 1));
    } else if (day <= 14) {
      const rp = (day - 5) / 9;
      wLow =
        BIRTH_WEIGHT * 0.93 +
        BIRTH_WEIGHT * 0.07 * rp +
        (day > 10 ? (day - 10) * (wLow / 1000) * 10 : 0);
      wHigh =
        BIRTH_WEIGHT * 0.95 +
        BIRTH_WEIGHT * 0.05 * rp +
        (day > 8 ? (day - 8) * (wHigh / 1000) * 16 : 0);
      wMid =
        BIRTH_WEIGHT * 0.94 +
        BIRTH_WEIGHT * 0.06 * rp +
        (day > 9 ? (day - 9) * (wMid / 1000) * 13 : 0);
      wActual =
        BIRTH_WEIGHT * 0.95 +
        BIRTH_WEIGHT * 0.05 * rp +
        (day > 7 ? (day - 7) * (wActual / 1000) * 26 : 0);
    } else {
      wLow = wLow + (wLow / 1000) * 10;
      wHigh = wHigh + (wHigh / 1000) * 16;
      wMid = wMid + (wMid / 1000) * 13;
      wActual = wActual + (wActual / 1000) * 26;
    }

    data.push({
      day,
      date: dateStr,
      whoLow: Math.round(wLow),
      whoHigh: Math.round(wHigh),
      whoMid: Math.round(wMid),
      actual: day <= CURRENT_DAY ? Math.round(wActual) : null,
      actualProjection: day >= CURRENT_DAY ? Math.round(wActual) : null,
    });
  }
  return data;
}

function generateFeedingData(): FeedingRow[] {
  const data: FeedingRow[] = [];
  const weights = [
    2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2, 3.3,
    3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0,
  ];
  for (const w of weights) {
    data.push({
      weight: `${w}kg`,
      weightNum: w,
      who150per: Math.round((w * 150) / 8),
      who180per: Math.round((w * 180) / 8),
      monthlyPer: w < 2.5 ? 100 : 120,
    });
  }
  return data;
}

function generateDailySchedule(): ScheduleRow[] {
  const data: ScheduleRow[] = [];
  let weight = BIRTH_WEIGHT;

  for (let day = 0; day <= 90; day++) {
    let mlPerKg: number;
    if (day === 0) mlPerKg = 60;
    else if (day <= 7) mlPerKg = 60 + day * (100 / 7);
    else if (day <= 14) mlPerKg = 160 + ((day - 7) * 20) / 7;
    else mlPerKg = 180;
    mlPerKg = Math.min(mlPerKg, 180);

    const totalMl = Math.round((weight / 1000) * mlPerKg);
    const perFeed8 = Math.round(totalMl / 8);
    const perFeed10 = Math.round(totalMl / 10);

    const date = new Date(BIRTH_DATE);
    date.setDate(date.getDate() + day);

    let monthlyGuide: number;
    if (day < 7) monthlyGuide = Math.round(10 * (day + 1) + 10);
    else if (day < 14) monthlyGuide = 80;
    else if (day < 30) monthlyGuide = 120;
    else if (day < 60) monthlyGuide = 160;
    else monthlyGuide = 200;

    let monthlyTotal: number;
    if (day < 7) monthlyTotal = monthlyGuide * 8;
    else if (day < 14) monthlyTotal = 80 * 8;
    else if (day < 30) monthlyTotal = 120 * 7;
    else if (day < 60) monthlyTotal = 160 * 6;
    else monthlyTotal = 200 * 5;

    const monthlyMlKg = Math.round(monthlyTotal / (weight / 1000));

    data.push({
      day,
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      weight: Math.round(weight),
      mlPerKg: Math.round(mlPerKg),
      totalMl,
      perFeed8,
      perFeed10,
      monthlyGuide,
      monthlyTotal,
      monthlyMlKg,
      weekNum: Math.floor(day / 7),
    });

    if (day < 5) {
      weight = weight * (1 - 0.012);
    } else if (day < 10) {
      weight = weight + 15;
    } else {
      weight = weight + (weight / 1000) * 13;
    }
  }
  return data;
}

interface TooltipPayloadItem {
  color: string;
  name: string;
  value: number | string;
  unit?: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload) return null;
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.95)",
        padding: "12px 16px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      {payload.map((p, i) => (
        <p
          key={i}
          style={{
            color: p.color,
            fontSize: 13,
            margin: "2px 0",
            fontWeight: 600,
          }}
        >
          {p.name}:{" "}
          {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          {p.unit || ""}
        </p>
      ))}
    </div>
  );
}

function Section({
  title,
  color,
  bg,
  border,
  children,
}: {
  title: string;
  color: string;
  bg: string;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3
        style={{
          fontSize: 13,
          color,
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: 0.5,
        }}
      >
        {title}
      </h3>
      <div
        style={{
          background: bg,
          borderRadius: 10,
          padding: 16,
          border: `1px solid ${border}`,
          lineHeight: 1.9,
          fontSize: 12,
          color: "#cbd5e1",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function BabyFeedingChart() {
  const [tab, setTab] = useState("weight");
  const [scheduleRange, setScheduleRange] = useState("week0");
  const weightData = generateWeightData();
  const feedingData = generateFeedingData();
  const scheduleData = generateDailySchedule();

  const tabs = [
    { id: "weight", label: "体重推移" },
    { id: "feeding", label: "授乳量比較" },
    { id: "schedule", label: "日別スケジュール" },
    { id: "summary", label: "医師相談用" },
  ];

  const weekRanges = [
    { id: "week0", label: "0~2週", start: 0, end: 14 },
    { id: "week2", label: "2~4週", start: 14, end: 28 },
    { id: "week4", label: "4~6週", start: 28, end: 42 },
    { id: "week6", label: "6~8週", start: 42, end: 56 },
    { id: "week8", label: "8~10週", start: 56, end: 70 },
    { id: "week10", label: "10~13週", start: 70, end: 91 },
  ];

  const currentRange =
    weekRanges.find((r) => r.id === scheduleRange) || weekRanges[0];
  const filteredSchedule = scheduleData.filter(
    (d) => d.day >= currentRange.start && d.day <= currentRange.end
  );

  const feedChartData = scheduleData.filter(
    (d) => d.day % 3 === 0 || d.day === CURRENT_DAY
  );

  return (
    <div
      style={{
        fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#e2e8f0",
        minHeight: "100vh",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 20,
            border: "1px solid rgba(59,130,246,0.3)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              margin: "0 0 8px",
              background: "linear-gradient(90deg, #60a5fa, #34d399)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            WHO国際基準に基づく授乳・体重管理ガイド
          </h1>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 20,
              marginTop: 12,
            }}
          >
            {(
              [
                ["生年月日", "2026年2月11日"],
                ["出生体重", "2,260g (LBW)"],
                ["現在", `生後${CURRENT_DAY}日目`],
                ["現在体重", "2,950g"],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <div
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    letterSpacing: 1,
                  }}
                >
                  {k}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#f1f5f9",
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                background:
                  tab === t.id
                    ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                    : "rgba(255,255,255,0.06)",
                color: tab === t.id ? "#fff" : "#94a3b8",
                boxShadow:
                  tab === t.id
                    ? "0 4px 12px rgba(59,130,246,0.3)"
                    : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Weight Chart */}
        {tab === "weight" && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: 16,
              padding: 24,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h2
              style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}
            >
              体重推移 (0~90日)
            </h2>
            <p
              style={{
                fontSize: 11,
                color: "#64748b",
                margin: "0 0 20px",
              }}
            >
              WHO基準の成長範囲 vs 現在のペースの予測
            </p>
            <ResponsiveContainer width="100%" height={380}>
              <AreaChart
                data={weightData}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient
                    id="whoRange"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#34d399"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="100%"
                      stopColor="#34d399"
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="day"
                  stroke="#475569"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickFormatter={(v) =>
                    v % 7 === 0 ? `${v / 7}w` : ""
                  }
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  domain={[2000, "auto"]}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}kg`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                />
                <Area
                  type="monotone"
                  dataKey="whoHigh"
                  stroke="none"
                  fill="url(#whoRange)"
                  name="WHO範囲"
                />
                <Line
                  type="monotone"
                  dataKey="whoHigh"
                  stroke="#34d399"
                  strokeWidth={1.5}
                  dot={false}
                  name="WHO上限(16g/kg/日)"
                  unit="g"
                  strokeDasharray="6 3"
                />
                <Line
                  type="monotone"
                  dataKey="whoMid"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                  name="WHO中央値(13g/kg/日)"
                  unit="g"
                />
                <Line
                  type="monotone"
                  dataKey="whoLow"
                  stroke="#34d399"
                  strokeWidth={1.5}
                  dot={false}
                  name="WHO下限(10g/kg/日)"
                  unit="g"
                  strokeDasharray="6 3"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ r: 2 }}
                  name="実績"
                  unit="g"
                />
                <Line
                  type="monotone"
                  dataKey="actualProjection"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="現ペース予測"
                  unit="g"
                  strokeDasharray="4 4"
                />
                <ReferenceLine
                  x={CURRENT_DAY}
                  stroke="#fbbf24"
                  strokeDasharray="3 3"
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Milestone table */}
            <div style={{ marginTop: 20, overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "時点",
                      "WHO下限",
                      "WHO中央値",
                      "WHO上限",
                      "現ペース予測",
                      "差",
                    ].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "8px",
                          textAlign: "center",
                          borderBottom:
                            "2px solid rgba(59,130,246,0.3)",
                          color: "#94a3b8",
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0, 7, 14, 21, 30, 45, 60, 75, 90].map((d) => {
                    const row = weightData.find((r) => r.day === d);
                    if (!row) return null;
                    const diff =
                      (row.actualProjection || row.actual || 0) -
                      row.whoMid;
                    return (
                      <tr
                        key={d}
                        style={{
                          background:
                            d === CURRENT_DAY || d === 21
                              ? "rgba(251,191,36,0.08)"
                              : d % 2 === 0
                                ? "rgba(255,255,255,0.02)"
                                : "transparent",
                        }}
                      >
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            fontWeight: 600,
                            color:
                              d <= CURRENT_DAY
                                ? "#f1f5f9"
                                : "#64748b",
                          }}
                        >
                          {d === 0
                            ? "出生"
                            : `${d}日 (${(d / 7).toFixed(0)}w)`}
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            color: "#34d399",
                          }}
                        >
                          {(row.whoLow / 1000).toFixed(2)}kg
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            color: "#22d3ee",
                            fontWeight: 600,
                          }}
                        >
                          {(row.whoMid / 1000).toFixed(2)}kg
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            color: "#34d399",
                          }}
                        >
                          {(row.whoHigh / 1000).toFixed(2)}kg
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            color: "#f97316",
                            fontWeight: 700,
                          }}
                        >
                          {(
                            (row.actualProjection || row.actual || 0) /
                            1000
                          ).toFixed(2)}
                          kg
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            color:
                              diff > 0 ? "#ef4444" : "#34d399",
                            fontWeight: 600,
                          }}
                        >
                          {diff > 0 ? "+" : ""}
                          {Math.round(diff)}g
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feeding Chart */}
        {tab === "feeding" && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: 16,
              padding: 24,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h2
              style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}
            >
              体重別 1回の授乳量 (8回/日)
            </h2>
            <p
              style={{
                fontSize: 11,
                color: "#64748b",
                margin: "0 0 20px",
              }}
            >
              WHO基準 vs 日本の月齢表
            </p>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={feedingData}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="weight"
                  stroke="#475569"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                />
                <Bar
                  dataKey="who150per"
                  fill="#22d3ee"
                  name="WHO 150ml/kg"
                  unit="ml"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="who180per"
                  fill="#34d399"
                  name="WHO 180ml/kg"
                  unit="ml"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="monthlyPer"
                  fill="#ef4444"
                  name="月齢表"
                  unit="ml"
                  radius={[3, 3, 0, 0]}
                />
                <ReferenceLine
                  y={80}
                  stroke="#fbbf24"
                  strokeDasharray="3 3"
                />
              </BarChart>
            </ResponsiveContainer>

            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                margin: "24px 0 12px",
                color: "#f1f5f9",
              }}
            >
              日齢別 WHO基準授乳量の推移 (0~90日)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={feedChartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="day"
                  stroke="#475569"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickFormatter={(v) =>
                    v % 7 === 0 ? `${v / 7}w` : ""
                  }
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="perFeed8"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  dot={false}
                  name="WHO 1回量(8回/日)"
                  unit="ml"
                />
                <Line
                  type="monotone"
                  dataKey="perFeed10"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  name="WHO 1回量(10回/日)"
                  unit="ml"
                />
                <Line
                  type="monotone"
                  dataKey="monthlyGuide"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="月齢表 1回量"
                  unit="ml"
                  strokeDasharray="5 3"
                />
                <ReferenceLine
                  x={CURRENT_DAY}
                  stroke="#fbbf24"
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Daily Schedule */}
        {tab === "schedule" && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: 16,
              padding: 24,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h2
              style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}
            >
              日別授乳スケジュール (WHO基準)
            </h2>
            <p
              style={{
                fontSize: 11,
                color: "#64748b",
                margin: "0 0 16px",
              }}
            >
              体重はWHO中央値 (13g/kg/日) で推定。ml/kg/日は日齢で60から180に漸増後180を維持
            </p>

            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              {weekRanges.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setScheduleRange(r.id)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      scheduleRange === r.id
                        ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                        : "rgba(255,255,255,0.06)",
                    color:
                      scheduleRange === r.id ? "#fff" : "#94a3b8",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "日齢",
                      "日付",
                      "推定\n体重",
                      "ml/kg\n/日",
                      "WHO\n1日総量",
                      "WHO\n1回量\n(8回)",
                      "WHO\n1回量\n(10回)",
                      "月齢表\n1回量",
                      "月齢表\nml/kg/日",
                      "超過率",
                    ].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "8px 6px",
                          textAlign: "center",
                          whiteSpace: "pre-line",
                          borderBottom:
                            "2px solid rgba(59,130,246,0.3)",
                          color: "#94a3b8",
                          fontWeight: 700,
                          fontSize: 10,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedule.map((d, i) => {
                    const isToday = d.day === CURRENT_DAY;
                    const isWeekStart = d.day % 7 === 0;
                    const overRate = Math.round(
                      (d.monthlyMlKg / d.mlPerKg - 1) * 100
                    );
                    return (
                      <tr
                        key={i}
                        style={{
                          background: isToday
                            ? "rgba(251,191,36,0.12)"
                            : isWeekStart
                              ? "rgba(59,130,246,0.06)"
                              : i % 2 === 0
                                ? "rgba(255,255,255,0.02)"
                                : "transparent",
                        }}
                      >
                        <td
                          style={{
                            padding: "7px 6px",
                            textAlign: "center",
                            fontWeight:
                              isToday || isWeekStart ? 800 : 400,
                            color: isToday
                              ? "#fbbf24"
                              : isWeekStart
                                ? "#60a5fa"
                                : "#e2e8f0",
                          }}
                        >
                          {isWeekStart && !isToday
                            ? `${d.weekNum}w `
                            : ""}
                          {d.day}日{isToday && " *"}
                        </td>
                        <td
                          style={{
                            padding: "7px 6px",
                            textAlign: "center",
                            color: "#64748b",
                          }}
                        >
                          {d.date}
                        </td>
                        <td
                          style={{
                            padding: "7px 6px",
                            textAlign: "center",
                            fontWeight: 600,
                          }}
                        >
                          {(d.weight / 1000).toFixed(2)}kg
                        </td>
                        <td
                          style={{
                            padding: "7px 6px",
                            textAlign: "center",
                            color: "#22d3ee",
                          }}
                        >
                          {d.mlPerKg}
                        </td>
                        <td
                          style={{
                            padding: "7px 6px",
                            textAlign: "center",
                            color: "#34d399",
                            fontWeight: 600,
                          }}
                        >
                          {d.totalMl}ml
                        </td>
                        <td
                          style={{
                            padding: "7px 6px",
                            textAlign: "center",
                            fontWeight: 700,
                            color: "#34d399",
                            background: "rgba(34,211,153,0.06)",
                          }}
                        >
                          {d.perFeed8}ml
                        </td>
                        <td
                          style={{
                            padding: "7px 6px",
                            textAlign: "center",
                            color: "#60a5fa",
                          }}
                        >
                          {d.perFeed10}ml
                        </td>
                        <td
                          style={{
                            padding: "7px 6px",
                            textAlign: "center",
                            fontWeight: 700,
                            color: "#ef4444",
                            background: "rgba(239,68,68,0.06)",
                          }}
                        >
                          {d.monthlyGuide}ml
                        </td>
                        <td
                          style={{
                            padding: "7px 6px",
                            textAlign: "center",
                            color: "#fca5a5",
                          }}
                        >
                          {d.monthlyMlKg}
                        </td>
                        <td
                          style={{
                            padding: "7px 6px",
                            textAlign: "center",
                            fontWeight: 700,
                            color:
                              overRate > 50
                                ? "#ef4444"
                                : overRate > 20
                                  ? "#f97316"
                                  : "#fbbf24",
                          }}
                        >
                          {overRate > 0
                            ? `+${overRate}%`
                            : `${overRate}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: "rgba(239,68,68,0.06)",
                borderRadius: 8,
                border: "1px solid rgba(239,68,68,0.15)",
                fontSize: 11,
                color: "#fca5a5",
                lineHeight: 1.8,
              }}
            >
              <strong>超過率</strong> = 月齢表のml/kg/日 / WHO基準のml/kg/日。
              赤ちゃんが小さいほど超過率が大きくなり、体への負担が増します。
            </div>
          </div>
        )}

        {/* Summary */}
        {tab === "summary" && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: 16,
              padding: 28,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h2
              style={{
                fontSize: 17,
                fontWeight: 800,
                margin: "0 0 20px",
              }}
            >
              医師相談用サマリー
            </h2>

            <Section
              title="患児情報"
              color="#60a5fa"
              bg="rgba(59,130,246,0.06)"
              border="rgba(59,130,246,0.15)"
            >
              出生日: 2026年2月11日 / 出生体重: 2,260g (低出生体重児)
              <br />
              現在: 生後{CURRENT_DAY}日目 / 現在体重: 2,950g
              <br />
              体重増加: +690g / 推定速度: 約26 g/kg/日 (68g/日) -&gt;
              WHO上限の1.6倍
            </Section>

            <Section
              title="現在の授乳 vs WHO基準"
              color="#f97316"
              bg="rgba(249,115,22,0.06)"
              border="rgba(249,115,22,0.15)"
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    borderRadius: 8,
                    padding: 14,
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#fca5a5",
                      fontWeight: 700,
                    }}
                  >
                    現在
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#f87171",
                      margin: "6px 0",
                    }}
                  >
                    80ml x 8回
                  </div>
                  <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                    640ml/日 = 217ml/kg/日
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#94a3b8",
                      marginTop: 4,
                    }}
                  >
                    ※当初は120ml x 8回と指導
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(34,211,153,0.08)",
                    borderRadius: 8,
                    padding: 14,
                    border: "1px solid rgba(34,211,153,0.2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#6ee7b7",
                      fontWeight: 700,
                    }}
                  >
                    WHO推奨
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#34d399",
                      margin: "6px 0",
                    }}
                  >
                    55~66ml x 8回
                  </div>
                  <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                    443~531ml/日 = 150~180ml/kg/日
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#94a3b8",
                      marginTop: 4,
                    }}
                  >
                    WHO 2011 / 2022 ガイドライン
                  </div>
                </div>
              </div>
            </Section>

            <Section
              title="段階的移行案 (医師の承認が必要)"
              color="#22d3ee"
              bg="rgba(34,211,238,0.06)"
              border="rgba(34,211,238,0.15)"
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    {["段階", "1回量", "回数", "1日総量", "ml/kg/日"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            borderBottom:
                              "1px solid rgba(255,255,255,0.1)",
                            color: "#94a3b8",
                            fontSize: 11,
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["現在", "80ml", "8回", "640ml", "217"],
                      ["第1段階", "70ml", "9回", "630ml", "213"],
                      ["第2段階", "65ml", "9回", "585ml", "198"],
                      [
                        "第3段階",
                        "60ml",
                        "9~10回",
                        "540~600ml",
                        "183~203",
                      ],
                      [
                        "目標",
                        "55~66ml",
                        "8~10回",
                        "440~530ml",
                        "150~180",
                      ],
                    ] as const
                  ).map(([stage, vol, freq, total, mlkg], i) => (
                    <tr
                      key={i}
                      style={{
                        background:
                          i === 4
                            ? "rgba(34,211,153,0.08)"
                            : i === 0
                              ? "rgba(239,68,68,0.06)"
                              : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "center",
                          fontWeight: 700,
                          color:
                            i === 4
                              ? "#34d399"
                              : i === 0
                                ? "#f87171"
                                : "#e2e8f0",
                        }}
                      >
                        {stage}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "center",
                        }}
                      >
                        {vol}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "center",
                        }}
                      >
                        {freq}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "center",
                        }}
                      >
                        {total}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "center",
                        }}
                      >
                        {mlkg}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section
              title="懸念事項"
              color="#fbbf24"
              bg="rgba(251,191,36,0.06)"
              border="rgba(251,191,36,0.15)"
            >
              1. 体重増加速度 26g/kg/日 -&gt; WHO上限16g/kg/日の1.6倍
              <br />
              2. 生後3週LBW児の推定胃容量60~80mlに対して80mlは上限付近
              <br />
              3. 80mlに慣れてしまい少量だと不安定になる状態
              <br />
              4. 当初120ml x 8回の指導はWHO基準の約2倍 (325ml/kg/日)
              <br />
              5. 急速なキャッチアップ成長による長期的メタボリックリスク
              (DOHaD)
            </Section>

            <Section
              title="医師にご確認いただきたいこと"
              color="#34d399"
              bg="rgba(34,211,153,0.06)"
              border="rgba(34,211,153,0.15)"
            >
              1. WHO基準 (150~180ml/kg/日)
              への段階的移行の可否と具体的スケジュール
              <br />
              2. 現在の体重増加速度26g/kg/日に対する評価
              <br />
              3. 吐き戻し・ガス・不機嫌等の消化器症状との関連
              <br />
              4. 長期フォローアップの方針
            </Section>

            <Section
              title="参考文献"
              color="#64748b"
              bg="rgba(255,255,255,0.02)"
              border="rgba(255,255,255,0.06)"
            >
              <div
                style={{
                  fontSize: 10,
                  color: "#64748b",
                  lineHeight: 2,
                }}
              >
                - WHO (2011) Guidelines on Optimal Feeding of LBW
                Infants. ISBN: 9789241548366
                <br />
                - WHO (2022) Recommendations for Care of the Preterm
                or LBW Infant. ISBN: 9789240058262
                <br />
                - WHO (2009) Infant and Young Child Feeding: Model
                Chapter. Table 7/8
                <br />
                - Bergman NJ (2013) Neonatal stomach volume and
                physiology. Acta Paediatr 102:773-777
                <br />
                - Naveed et al (2008) Anatomic stomach capacity at
                autopsy. J Hum Lact
                <br />- Pediatrics (2020) Newborn feeding
                recommendations and obesity risk. PMC7055094
              </div>
            </Section>

            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 8,
                fontSize: 11,
                color: "#94a3b8",
                textAlign: "center",
                lineHeight: 1.8,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              ※この資料はWHO公式ガイドラインに基づく参考情報です。
              <br />
              具体的な授乳量の変更は必ず担当医師の指示のもとで行ってください。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
