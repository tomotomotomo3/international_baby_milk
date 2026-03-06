"use client";

import { useState, useMemo } from "react";
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

interface BabyInput {
  birthDate: Date;
  birthWeight: number;
  currentWeight: number;
  currentDay: number;
  actualGrowthRate: number;
}

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
  who180perDiff: number;
}

interface ScheduleRow {
  day: number;
  date: string;
  weight: number;
  mlPerKg: number;
  totalMl: number;
  perFeed8: number;
  perFeed10: number;
  weekNum: number;
}

function generateWeightData(input: BabyInput): WeightRow[] {
  const data: WeightRow[] = [];
  let wLow = input.birthWeight;
  let wHigh = input.birthWeight;
  let wMid = input.birthWeight;
  let wActual = input.birthWeight;

  for (let day = 0; day <= 90; day++) {
    const date = new Date(input.birthDate);
    date.setDate(date.getDate() + day);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

    if (day <= 5) {
      wLow = input.birthWeight * (1 - 0.07 * Math.min(day / 4, 1));
      wHigh = input.birthWeight * (1 - 0.05 * Math.min(day / 3, 1));
      wMid = input.birthWeight * (1 - 0.06 * Math.min(day / 3.5, 1));
      wActual = input.birthWeight * (1 - 0.05 * Math.min(day / 3, 1));
    } else if (day <= 14) {
      const rp = (day - 5) / 9;
      wLow =
        input.birthWeight * 0.93 +
        input.birthWeight * 0.07 * rp +
        (day > 10 ? (day - 10) * (wLow / 1000) * 10 : 0);
      wHigh =
        input.birthWeight * 0.95 +
        input.birthWeight * 0.05 * rp +
        (day > 8 ? (day - 8) * (wHigh / 1000) * 16 : 0);
      wMid =
        input.birthWeight * 0.94 +
        input.birthWeight * 0.06 * rp +
        (day > 9 ? (day - 9) * (wMid / 1000) * 13 : 0);
      wActual =
        input.birthWeight * 0.95 +
        input.birthWeight * 0.05 * rp +
        (day > 7
          ? (day - 7) * (wActual / 1000) * input.actualGrowthRate
          : 0);
    } else {
      wLow = wLow + (wLow / 1000) * 10;
      wHigh = wHigh + (wHigh / 1000) * 16;
      wMid = wMid + (wMid / 1000) * 13;
      wActual = wActual + (wActual / 1000) * input.actualGrowthRate;
    }

    data.push({
      day,
      date: dateStr,
      whoLow: Math.round(wLow),
      whoHigh: Math.round(wHigh),
      whoMid: Math.round(wMid),
      actual: day <= input.currentDay ? Math.round(wActual) : null,
      actualProjection:
        day >= input.currentDay ? Math.round(wActual) : null,
    });
  }
  return data;
}

function generateFeedingData(count: number): FeedingRow[] {
  const data: FeedingRow[] = [];
  const weights = [
    2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1, 3.2,
    3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0,
  ];
  for (const w of weights) {
    const low = Math.round((w * 150) / count);
    const high = Math.round((w * 180) / count);
    data.push({
      weight: `${w}kg`,
      weightNum: w,
      who150per: low,
      who180perDiff: high - low,
    });
  }
  return data;
}

function generateDailySchedule(input: BabyInput): ScheduleRow[] {
  const data: ScheduleRow[] = [];
  let weight = input.birthWeight;

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

    const date = new Date(input.birthDate);
    date.setDate(date.getDate() + day);

    data.push({
      day,
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      weight: Math.round(weight),
      mlPerKg: Math.round(mlPerKg),
      totalMl,
      perFeed8,
      perFeed10,
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
        background: "#fff",
        padding: "14px 18px",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      }}
    >
      {payload.map((p, i) => (
        <p
          key={i}
          style={{
            color: p.color,
            fontSize: 15,
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
          fontSize: 15,
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
          fontSize: 14,
          color: "#334155",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function calcDaysBetween(from: Date, to: Date): number {
  const msPerDay = 86400000;
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((utcTo - utcFrom) / msPerDay);
}

export default function BabyFeedingChart() {
  const [birthDateStr, setBirthDateStr] = useState("");
  const [birthWeightStr, setBirthWeightStr] = useState("");
  const [currentWeightStr, setCurrentWeightStr] = useState("");
  const [feedCountStr, setFeedCountStr] = useState("8");
  const feedCount = parseInt(feedCountStr, 10) || 8;
  const [submitted, setSubmitted] = useState(false);

  const babyInput = useMemo<BabyInput | null>(() => {
    if (!submitted) return null;
    const birthDate = new Date(birthDateStr + "T00:00:00");
    const birthWeight = parseInt(birthWeightStr, 10);
    const currentWeight = parseInt(currentWeightStr, 10);
    if (isNaN(birthDate.getTime()) || isNaN(birthWeight) || isNaN(currentWeight))
      return null;
    if (birthWeight <= 0 || currentWeight <= 0) return null;

    const today = new Date();
    const currentDay = calcDaysBetween(birthDate, today);
    if (currentDay <= 0) return null;

    const dailyGain = (currentWeight - birthWeight) / currentDay;
    const avgWeight = (birthWeight + currentWeight) / 2;
    const actualGrowthRate = (dailyGain / avgWeight) * 1000;

    return {
      birthDate,
      birthWeight,
      currentWeight,
      currentDay,
      actualGrowthRate: Math.max(actualGrowthRate, 0),
    };
  }, [submitted, birthDateStr, birthWeightStr, currentWeightStr]);

  const [tab, setTab] = useState("weight");
  const [scheduleRange, setScheduleRange] = useState("week0");

  const weightData = useMemo(
    () => (babyInput ? generateWeightData(babyInput) : []),
    [babyInput]
  );
  const feedingData = useMemo(() => generateFeedingData(feedCount), [feedCount]);
  const scheduleData = useMemo(
    () => (babyInput ? generateDailySchedule(babyInput) : []),
    [babyInput]
  );

  const tabs = [
    { id: "weight", label: "体重推移" },
    { id: "feeding", label: "授乳量目安" },
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
    (d) => d.day % 3 === 0 || (babyInput && d.day === babyInput.currentDay)
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (!birthDateStr) {
      errs.birthDate = "生年月日を入力してください";
    } else {
      const d = new Date(birthDateStr + "T00:00:00");
      if (isNaN(d.getTime())) {
        errs.birthDate = "有効な日付を入力してください";
      } else if (d > new Date()) {
        errs.birthDate = "未来の日付は入力できません";
      }
    }

    const bw = parseInt(birthWeightStr, 10);
    if (!birthWeightStr) {
      errs.birthWeight = "出生体重を入力してください";
    } else if (isNaN(bw) || bw < 300 || bw > 6000) {
      errs.birthWeight = "300~6000gの範囲で入力してください";
    }

    const cw = parseInt(currentWeightStr, 10);
    if (!currentWeightStr) {
      errs.currentWeight = "現在の体重を入力してください";
    } else if (isNaN(cw) || cw < 300 || cw > 15000) {
      errs.currentWeight = "300~15000gの範囲で入力してください";
    } else if (!isNaN(bw) && cw < bw * 0.85) {
      errs.currentWeight = "出生体重の85%未満です。確認してください";
    }

    const fc = parseInt(feedCountStr, 10);
    if (!feedCountStr) {
      errs.feedCount = "回数を入力してください";
    } else if (isNaN(fc) || fc < 1 || fc > 20) {
      errs.feedCount = "1~20の範囲で入力してください";
    }

    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitted(true);
  };

  const weightGain = babyInput
    ? babyInput.currentWeight - babyInput.birthWeight
    : 0;
  const dailyGain = babyInput
    ? Math.round(weightGain / babyInput.currentDay)
    : 0;
  const whoPerFeed = babyInput
    ? {
        low: Math.round(((babyInput.currentWeight / 1000) * 150) / feedCount),
        high: Math.round(((babyInput.currentWeight / 1000) * 180) / feedCount),
        totalLow: Math.round((babyInput.currentWeight / 1000) * 150),
        totalHigh: Math.round((babyInput.currentWeight / 1000) * 180),
      }
    : null;

  const inputStyle = {
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#1e293b",
    fontSize: 16,
    fontWeight: 600,
    width: "100%",
    outline: "none",
  } as const;

  const labelStyle = {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 700,
    marginBottom: 6,
    display: "block",
    letterSpacing: 0.5,
  } as const;

  const errStyle = {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 4,
    fontWeight: 600,
  } as const;

  return (
    <div
      style={{
        fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
        background: "#f8fafc",
        color: "#1e293b",
        minHeight: "100vh",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 20,
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              margin: "0 0 16px",
              color: "#1e293b",
            }}
          >
            WHO国際基準に基づく授乳・体重管理ガイド
          </h1>

          {/* Input Form */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 0.6fr auto",
              gap: 16,
              alignItems: "end",
            }}
          >
            <div>
              <label style={labelStyle}>生年月日</label>
              <input
                type="date"
                value={birthDateStr}
                onChange={(e) => {
                  setBirthDateStr(e.target.value);
                  setSubmitted(false);
                  setErrors((prev) => { const { birthDate: _, ...rest } = prev; return rest; });
                }}
                max={toDateInputValue(new Date())}
                style={{ ...inputStyle, borderColor: errors.birthDate ? "#dc2626" : "#cbd5e1" }}
              />
              {errors.birthDate && <div style={errStyle}>{errors.birthDate}</div>}
            </div>
            <div>
              <label style={labelStyle}>出生体重 (g)</label>
              <input
                type="number"
                value={birthWeightStr}
                onChange={(e) => {
                  setBirthWeightStr(e.target.value);
                  setSubmitted(false);
                  setErrors((prev) => { const { birthWeight: _, ...rest } = prev; return rest; });
                }}
                placeholder="例: 2260"
                style={{ ...inputStyle, borderColor: errors.birthWeight ? "#dc2626" : "#cbd5e1" }}
              />
              {errors.birthWeight && <div style={errStyle}>{errors.birthWeight}</div>}
            </div>
            <div>
              <label style={labelStyle}>現在の体重 (g)</label>
              <input
                type="number"
                value={currentWeightStr}
                onChange={(e) => {
                  setCurrentWeightStr(e.target.value);
                  setSubmitted(false);
                  setErrors((prev) => { const { currentWeight: _, ...rest } = prev; return rest; });
                }}
                placeholder="例: 2950"
                style={{ ...inputStyle, borderColor: errors.currentWeight ? "#dc2626" : "#cbd5e1" }}
              />
              {errors.currentWeight && <div style={errStyle}>{errors.currentWeight}</div>}
            </div>
            <div>
              <label style={labelStyle}>授乳回数/日</label>
              <input
                type="number"
                value={feedCountStr}
                onChange={(e) => {
                  setFeedCountStr(e.target.value);
                  setSubmitted(false);
                  setErrors((prev) => { const { feedCount: _, ...rest } = prev; return rest; });
                }}
                placeholder="8"
                style={{ ...inputStyle, borderColor: errors.feedCount ? "#dc2626" : "#cbd5e1" }}
              />
              {errors.feedCount && <div style={errStyle}>{errors.feedCount}</div>}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                padding: "12px 28px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 700,
                background: "#2563eb",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(37,99,235,0.2)",
                height: 46,
              }}
            >
              表示
            </button>
          </div>

          {/* Baby Info Summary */}
          {babyInput && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 20,
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              {(
                [
                  ["生年月日", formatDate(babyInput.birthDate)],
                  [
                    "出生体重",
                    `${babyInput.birthWeight.toLocaleString()}g${babyInput.birthWeight < 2500 ? " (LBW)" : ""}`,
                  ],
                  ["現在", `生後${babyInput.currentDay}日目`],
                  [
                    "現在体重",
                    `${babyInput.currentWeight.toLocaleString()}g`,
                  ],
                  [
                    "増加速度",
                    `${babyInput.actualGrowthRate.toFixed(1)} g/kg/日`,
                  ],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      letterSpacing: 1,
                    }}
                  >
                    {k}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Today's Milk Guide */}
          {babyInput && whoPerFeed && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  background: "#f0fdf4",
                  borderRadius: 10,
                  padding: "14px 18px",
                  border: "1px solid #bbf7d0",
                }}
              >
                <div
                  style={{ fontSize: 13, color: "#16a34a", fontWeight: 700 }}
                >
                  今日のミルク目安 (最低)
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#15803d",
                    margin: "4px 0",
                  }}
                >
                  {whoPerFeed.low}ml x {feedCount}回
                </div>
                <div style={{ fontSize: 14, color: "#64748b" }}>
                  1日合計 {whoPerFeed.totalLow}ml (150ml/kg/日)
                </div>
              </div>
              <div
                style={{
                  background: "#eff6ff",
                  borderRadius: 10,
                  padding: "14px 18px",
                  border: "1px solid #bfdbfe",
                }}
              >
                <div
                  style={{ fontSize: 13, color: "#2563eb", fontWeight: 700 }}
                >
                  今日のミルク目安 (最高)
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#1d4ed8",
                    margin: "4px 0",
                  }}
                >
                  {whoPerFeed.high}ml x {feedCount}回
                </div>
                <div style={{ fontSize: 14, color: "#64748b" }}>
                  1日合計 {whoPerFeed.totalHigh}ml (180ml/kg/日)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Show content only after submission */}
        {babyInput && (
          <>
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
                    padding: "12px 20px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 15,
                    fontWeight: 700,
                    background:
                      tab === t.id ? "#2563eb" : "#e2e8f0",
                    color: tab === t.id ? "#fff" : "#64748b",
                    boxShadow:
                      tab === t.id
                        ? "0 2px 8px rgba(37,99,235,0.2)"
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
                  background: "#fff",
                  borderRadius: 16,
                  padding: 24,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <h2
                  style={{
                    fontSize: 19,
                    fontWeight: 700,
                    margin: "0 0 6px",
                  }}
                >
                  体重推移 (0~90日)
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
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
                          stopColor="#22c55e"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="100%"
                          stopColor="#22c55e"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="day"
                      stroke="#cbd5e1"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) =>
                        v % 7 === 0 ? `${v / 7}w` : ""
                      }
                    />
                    <YAxis
                      stroke="#cbd5e1"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      domain={[
                        (dataMin: number) =>
                          Math.floor(dataMin / 100) * 100 - 100,
                        "auto",
                      ]}
                      tickFormatter={(v) => `${(v / 1000).toFixed(1)}kg`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 13, paddingTop: 10 }}
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
                      stroke="#22c55e"
                      strokeWidth={1.5}
                      dot={false}
                      name="WHO上限(16g/kg/日)"
                      unit="g"
                      strokeDasharray="6 3"
                    />
                    <Line
                      type="monotone"
                      dataKey="whoMid"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={false}
                      name="WHO中央値(13g/kg/日)"
                      unit="g"
                    />
                    <Line
                      type="monotone"
                      dataKey="whoLow"
                      stroke="#22c55e"
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
                      x={babyInput.currentDay}
                      stroke="#eab308"
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
                      fontSize: 14,
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
                              borderBottom: "2px solid #e2e8f0",
                              color: "#64748b",
                              fontWeight: 700,
                              fontSize: 13,
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
                                d === babyInput.currentDay || d === 21
                                  ? "#fefce8"
                                  : d % 2 === 0
                                    ? "#f8fafc"
                                    : "#fff",
                            }}
                          >
                            <td
                              style={{
                                padding: "8px",
                                textAlign: "center",
                                fontWeight: 600,
                                color:
                                  d <= babyInput.currentDay
                                    ? "#1e293b"
                                    : "#94a3b8",
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
                                color: "#16a34a",
                              }}
                            >
                              {(row.whoLow / 1000).toFixed(2)}kg
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                textAlign: "center",
                                color: "#0284c7",
                                fontWeight: 600,
                              }}
                            >
                              {(row.whoMid / 1000).toFixed(2)}kg
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                textAlign: "center",
                                color: "#16a34a",
                              }}
                            >
                              {(row.whoHigh / 1000).toFixed(2)}kg
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                textAlign: "center",
                                color: "#ea580c",
                                fontWeight: 700,
                              }}
                            >
                              {(
                                (row.actualProjection ||
                                  row.actual ||
                                  0) / 1000
                              ).toFixed(2)}
                              kg
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                textAlign: "center",
                                color:
                                  diff > 0 ? "#dc2626" : "#16a34a",
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
                  background: "#fff",
                  borderRadius: 16,
                  padding: 24,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <h2
                  style={{
                    fontSize: 19,
                    fontWeight: 700,
                    margin: "0 0 6px",
                  }}
                >
                  体重別 1回の授乳量 ({feedCount}回/日)
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
                    margin: "0 0 20px",
                  }}
                >
                  WHO基準 (150~180 ml/kg/日)
                </p>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={feedingData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="weight"
                      stroke="#cbd5e1"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                    />
                    <YAxis
                      stroke="#cbd5e1"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 13, paddingTop: 10 }}
                    />
                    <Bar
                      dataKey="who150per"
                      stackId="a"
                      fill="#16a34a"
                      name="最低 (150ml/kg)"
                      unit="ml"
                    />
                    <Bar
                      dataKey="who180perDiff"
                      stackId="a"
                      fill="#2563eb"
                      name="最高までの差分 (180ml/kg)"
                      unit="ml"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>

                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    margin: "24px 0 12px",
                    color: "#1e293b",
                  }}
                >
                  日齢別 WHO基準授乳量の推移 (0~90日)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={feedChartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="day"
                      stroke="#cbd5e1"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) =>
                        v % 7 === 0 ? `${v / 7}w` : ""
                      }
                    />
                    <YAxis
                      stroke="#cbd5e1"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 13, paddingTop: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="perFeed8"
                      stroke="#22c55e"
                      strokeWidth={2.5}
                      dot={false}
                      name="WHO 1回量(8回/日)"
                      unit="ml"
                    />
                    <Line
                      type="monotone"
                      dataKey="perFeed10"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="WHO 1回量(10回/日)"
                      unit="ml"
                    />
                    <ReferenceLine
                      x={babyInput.currentDay}
                      stroke="#eab308"
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
                  background: "#fff",
                  borderRadius: 16,
                  padding: 24,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <h2
                  style={{
                    fontSize: 19,
                    fontWeight: 700,
                    margin: "0 0 6px",
                  }}
                >
                  日別授乳スケジュール (WHO基準)
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
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
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600,
                        background:
                          scheduleRange === r.id
                            ? "#0284c7"
                            : "#e2e8f0",
                        color:
                          scheduleRange === r.id ? "#fff" : "#64748b",
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
                      fontSize: 13,
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
                        ].map((h, i) => (
                          <th
                            key={i}
                            style={{
                              padding: "8px 6px",
                              textAlign: "center",
                              whiteSpace: "pre-line",
                              borderBottom: "2px solid #e2e8f0",
                              color: "#64748b",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchedule.map((d, i) => {
                        const isToday = d.day === babyInput.currentDay;
                        const isWeekStart = d.day % 7 === 0;
                        return (
                          <tr
                            key={i}
                            style={{
                              background: isToday
                                ? "#fefce8"
                                : isWeekStart
                                  ? "#eff6ff"
                                  : i % 2 === 0
                                    ? "#f8fafc"
                                    : "#fff",
                            }}
                          >
                            <td
                              style={{
                                padding: "7px 6px",
                                textAlign: "center",
                                fontWeight:
                                  isToday || isWeekStart ? 800 : 400,
                                color: isToday
                                  ? "#ca8a04"
                                  : isWeekStart
                                    ? "#2563eb"
                                    : "#1e293b",
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
                                color: "#94a3b8",
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
                                color: "#0284c7",
                              }}
                            >
                              {d.mlPerKg}
                            </td>
                            <td
                              style={{
                                padding: "7px 6px",
                                textAlign: "center",
                                color: "#16a34a",
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
                                color: "#15803d",
                                background: "#f0fdf4",
                              }}
                            >
                              {d.perFeed8}ml
                            </td>
                            <td
                              style={{
                                padding: "7px 6px",
                                textAlign: "center",
                                color: "#2563eb",
                              }}
                            >
                              {d.perFeed10}ml
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary */}
            {tab === "summary" && whoPerFeed && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: 28,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <h2
                  style={{
                    fontSize: 21,
                    fontWeight: 800,
                    margin: "0 0 20px",
                  }}
                >
                  医師相談用サマリー
                </h2>

                <Section
                  title="患児情報"
                  color="#2563eb"
                  bg="#eff6ff"
                  border="#bfdbfe"
                >
                  出生日: {formatDate(babyInput.birthDate)} / 出生体重:{" "}
                  {babyInput.birthWeight.toLocaleString()}g
                  {babyInput.birthWeight < 2500 ? " (低出生体重児)" : ""}
                  <br />
                  現在: 生後{babyInput.currentDay}日目 / 現在体重:{" "}
                  {babyInput.currentWeight.toLocaleString()}g
                  <br />
                  体重増加: +{weightGain}g / 推定速度: 約
                  {babyInput.actualGrowthRate.toFixed(1)} g/kg/日 ({dailyGain}
                  g/日)
                  {babyInput.actualGrowthRate > 16 &&
                    ` -> WHO上限の${(babyInput.actualGrowthRate / 16).toFixed(1)}倍`}
                </Section>

                <Section
                  title="WHO基準の授乳量 (現在体重ベース)"
                  color="#16a34a"
                  bg="#f0fdf4"
                  border="#bbf7d0"
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
                        background: "#fff",
                        borderRadius: 8,
                        padding: 14,
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "#16a34a",
                          fontWeight: 700,
                        }}
                      >
                        最低 (150ml/kg/日)
                      </div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 800,
                          color: "#15803d",
                          margin: "6px 0",
                        }}
                      >
                        {whoPerFeed.low}ml x {feedCount}回
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {whoPerFeed.totalLow}ml/日
                      </div>
                    </div>
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 8,
                        padding: 14,
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "#2563eb",
                          fontWeight: 700,
                        }}
                      >
                        最高 (180ml/kg/日)
                      </div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 800,
                          color: "#1d4ed8",
                          margin: "6px 0",
                        }}
                      >
                        {whoPerFeed.high}ml x {feedCount}回
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {whoPerFeed.totalHigh}ml/日
                      </div>
                    </div>
                  </div>
                </Section>

                <Section
                  title="懸念チェックリスト"
                  color="#ca8a04"
                  bg="#fefce8"
                  border="#fef08a"
                >
                  {babyInput.actualGrowthRate > 16 && (
                    <>
                      - 体重増加速度{" "}
                      {babyInput.actualGrowthRate.toFixed(1)}g/kg/日 -&gt;
                      WHO上限16g/kg/日の
                      {(babyInput.actualGrowthRate / 16).toFixed(1)}倍
                      <br />
                    </>
                  )}
                  {babyInput.actualGrowthRate < 10 && (
                    <>
                      - 体重増加速度{" "}
                      {babyInput.actualGrowthRate.toFixed(1)}g/kg/日 -&gt;
                      WHO下限10g/kg/日を下回っています
                      <br />
                    </>
                  )}
                  {babyInput.birthWeight < 2500 && (
                    <>
                      - 低出生体重児 (LBW): 体重ベースの授乳量管理が重要
                      <br />
                    </>
                  )}
                  - WHO基準の授乳量: {whoPerFeed.low}~{whoPerFeed.high}ml x
                  {feedCount}回/日 ({whoPerFeed.totalLow}~{whoPerFeed.totalHigh}ml/日)
                </Section>

                <Section
                  title="医師にご確認いただきたいこと"
                  color="#16a34a"
                  bg="#f0fdf4"
                  border="#bbf7d0"
                >
                  1. WHO基準 (150~180ml/kg/日)
                  に基づく適切な授乳量
                  <br />
                  2. 現在の体重増加速度{" "}
                  {babyInput.actualGrowthRate.toFixed(1)}g/kg/日に対する評価
                  <br />
                  3. 吐き戻し・ガス・不機嫌等の消化器症状との関連
                  <br />
                  4. 長期フォローアップの方針
                </Section>

                <Section
                  title="参考文献"
                  color="#64748b"
                  bg="#f8fafc"
                  border="#e2e8f0"
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      lineHeight: 2,
                    }}
                  >
                    - WHO (2011) Guidelines on Optimal Feeding of LBW
                    Infants. ISBN: 9789241548366
                    <br />
                    - WHO (2022) Recommendations for Care of the Preterm or
                    LBW Infant. ISBN: 9789240058262
                    <br />
                    - WHO (2009) Infant and Young Child Feeding: Model
                    Chapter. Table 7/8
                    <br />
                    - Bergman NJ (2013) Neonatal stomach volume and
                    physiology. Acta Paediatr 102:773-777
                    <br />- Naveed et al (2008) Anatomic stomach capacity at
                    autopsy. J Hum Lact
                  </div>
                </Section>

                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 8,
                    fontSize: 13,
                    color: "#64748b",
                    textAlign: "center",
                    lineHeight: 1.8,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                  }}
                >
                  ※この資料はWHO公式ガイドラインに基づく参考情報です。
                  <br />
                  具体的な授乳量の変更は必ず担当医師の指示のもとで行ってください。
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
