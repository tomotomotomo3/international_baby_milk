"use client";

import { useState, useMemo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
  LineChart,
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
  whoEstimate: number;
  actual: number | null;
  actualProjection: number | null;
  mhlw3rd: number;
  mhlw10th: number;
  mhlw50th: number;
  mhlw90th: number;
  mhlw97th: number;
}

// WHO Child Growth Standards 2006 - 50th percentile weight (grams)
// Source: WHO Multicentre Growth Reference Study Group
// https://www.who.int/tools/child-growth-standards/standards/weight-for-age
type WHORef = readonly (readonly [number, number])[];

// 生理的体重減少: 生後2~3日で5~7%減少、7~10日で出生体重に回復
// WHO (2022) Recommendations for Care of the Preterm or LBW Infant
const WHO_BOYS: WHORef = [
  [0, 3346],   // 出生
  [1, 3296],   // -1.5%
  [2, 3213],   // -4%
  [3, 3179],   // -5% (最低点)
  [4, 3196],   // 回復開始
  [5, 3230],
  [7, 3313],
  [10, 3346],  // 出生体重に回復
  [14, 3600],
  [30, 4471],
  [45, 5100],
  [60, 5575],
  [75, 6000],
  [90, 6392],
  [105, 6700],
  [120, 6998],
  [135, 7250],
  [150, 7495],
  [165, 7720],
  [180, 7934],
];

const WHO_GIRLS: WHORef = [
  [0, 3232],   // 出生
  [1, 3184],   // -1.5%
  [2, 3103],   // -4%
  [3, 3070],   // -5% (最低点)
  [4, 3086],   // 回復開始
  [5, 3119],
  [7, 3200],
  [10, 3232],  // 出生体重に回復
  [14, 3450],
  [30, 4187],
  [45, 4700],
  [60, 5131],
  [75, 5550],
  [90, 5845],
  [105, 6140],
  [120, 6421],
  [135, 6670],
  [150, 6918],
  [165, 7150],
  [180, 7369],
];

// 令和5年(2023) 乳幼児身体発育調査 - 体重パーセンタイル値 (grams)
// Source: こども家庭庁 https://www.cfa.go.jp/policies/boshihoken/r5-nyuuyoujityousa
// [day, 3rd, 10th, 50th, 90th, 97th]
type MHLWRef = readonly (readonly [number, number, number, number, number, number])[];

const MHLW_BOYS: MHLWRef = [
  [0,   2316, 2581, 3057, 3556, 3815],
  [1,   2262, 2494, 2958, 3450, 3708],
  [2,   2214, 2452, 2910, 3402, 3652],
  [3,   2224, 2458, 2928, 3426, 3676],
  [4,   2224, 2478, 2953, 3464, 3700],
  [30,  3226, 3525, 4151, 4763, 5044],
  [45,  3756, 4093, 4798, 5485, 5801],  // 1~2ヶ月中間
  [75,  4591, 4982, 5802, 6604, 6974],  // 2~3ヶ月中間
  [105, 5223, 5650, 6550, 7434, 7842],  // 3~4ヶ月中間
  [135, 5711, 6163, 7118, 8063, 8500],  // 4~5ヶ月中間
  [165, 6094, 6563, 7560, 8550, 9010],  // 5~6ヶ月中間
  [180, 6399, 6881, 7909, 8933, 9411],  // 6~7ヶ月
];

const MHLW_GIRLS: MHLWRef = [
  [0,   2222, 2460, 2950, 3436, 3662],
  [1,   2169, 2372, 2854, 3322, 3562],
  [2,   2120, 2334, 2798, 3270, 3492],
  [3,   2126, 2344, 2810, 3282, 3506],
  [4,   2130, 2350, 2824, 3295, 3512],
  [30,  3047, 3324, 3907, 4477, 4740],
  [45,  3505, 3806, 4440, 5066, 5356],
  [75,  4275, 4612, 5334, 6056, 6392],
  [105, 4899, 5267, 6061, 6862, 7239],
  [135, 5397, 5790, 6642, 7510, 7920],
  [165, 5791, 6203, 7103, 8026, 8465],
  [180, 6100, 6527, 7466, 8436, 8899],
];

function interpolateMHLW(day: number, ref: MHLWRef, idx: number): number {
  if (day <= ref[0][0]) return ref[0][idx];
  if (day >= ref[ref.length - 1][0]) return ref[ref.length - 1][idx];
  for (let i = 0; i < ref.length - 1; i++) {
    if (day >= ref[i][0] && day <= ref[i + 1][0]) {
      const t = (day - ref[i][0]) / (ref[i + 1][0] - ref[i][0]);
      return ref[i][idx] + t * (ref[i + 1][idx] - ref[i][idx]);
    }
  }
  return ref[ref.length - 1][idx];
}

function interpolateWHO(day: number, ref: WHORef): number {
  if (day <= ref[0][0]) return ref[0][1];
  if (day >= ref[ref.length - 1][0]) return ref[ref.length - 1][1];
  for (let i = 0; i < ref.length - 1; i++) {
    if (day >= ref[i][0] && day <= ref[i + 1][0]) {
      const t = (day - ref[i][0]) / (ref[i + 1][0] - ref[i][0]);
      return ref[i][1] + t * (ref[i + 1][1] - ref[i][1]);
    }
  }
  return ref[ref.length - 1][1];
}

// WHO (2011) Guidelines on Optimal Feeding of LBW Infants
// 日齢に応じた推奨授乳量 (ml/kg/日)
function getWhoMlPerKg(day: number): number {
  if (day <= 1) return 60;
  if (day === 2) return 80;
  if (day === 3) return 100;
  if (day === 4) return 120;
  if (day === 5) return 140;
  if (day === 6) return 150;
  if (day === 7) return 160;
  if (day <= 14) return Math.min(160 + ((day - 7) * 20) / 7, 180);
  return 180;
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

function generateWeightData(input: BabyInput, whoRef: WHORef, mhlwRef: MHLWRef): WeightRow[] {
  const data: WeightRow[] = [];
  const whoBirthWeight = whoRef[0][1];
  const scaleFactor = input.birthWeight / whoBirthWeight;

  const actualDailyGain =
    (input.currentWeight - input.birthWeight) / input.currentDay;

  for (let day = 0; day <= 180; day++) {
    const date = new Date(input.birthDate);
    date.setDate(date.getDate() + day);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

    const whoEstimate = Math.round(interpolateWHO(day, whoRef) * scaleFactor);

    let actualWeight: number;
    if (day <= input.currentDay) {
      const t = input.currentDay > 0 ? day / input.currentDay : 0;
      actualWeight = input.birthWeight + t * (input.currentWeight - input.birthWeight);
    } else {
      const whoAtCurrentDay = interpolateWHO(input.currentDay, whoRef) * scaleFactor;
      const whoAtDay = interpolateWHO(day, whoRef) * scaleFactor;

      if (actualDailyGain <= 0 || input.currentDay <= 10) {
        // 生理的体重減少期: WHO曲線に沿って予測（現在体重からのオフセットを維持）
        const whoGainFromNow = whoAtDay - whoAtCurrentDay;
        actualWeight = input.currentWeight + whoGainFromNow;
      } else {
        // 成長期: 実際の成長率をWHO曲線の形で減衰させて予測
        const whoTomorrow = interpolateWHO(input.currentDay + 1, whoRef) * scaleFactor;
        const whoDailyGainAtToday = whoTomorrow - whoAtCurrentDay;
        const daysFromNow = day - input.currentDay;
        const avgDecay =
          whoDailyGainAtToday > 0
            ? ((whoAtDay - whoAtCurrentDay) / (daysFromNow * whoDailyGainAtToday))
            : 1;
        actualWeight =
          input.currentWeight + daysFromNow * actualDailyGain * Math.max(0, avgDecay);
      }
    }

    // 厚労省パーセンタイル（出生体重でスケーリング）
    const mhlwBirthWeight50 = mhlwRef[0][3]; // 出生時50thパーセンタイル
    const mhlwScale = input.birthWeight / mhlwBirthWeight50;

    data.push({
      day,
      date: dateStr,
      whoEstimate,
      actual: day <= input.currentDay ? Math.round(actualWeight) : null,
      actualProjection:
        day >= input.currentDay ? Math.round(actualWeight) : null,
      mhlw3rd: Math.round(interpolateMHLW(day, mhlwRef, 1) * mhlwScale),
      mhlw10th: Math.round(interpolateMHLW(day, mhlwRef, 2) * mhlwScale),
      mhlw50th: Math.round(interpolateMHLW(day, mhlwRef, 3) * mhlwScale),
      mhlw90th: Math.round(interpolateMHLW(day, mhlwRef, 4) * mhlwScale),
      mhlw97th: Math.round(interpolateMHLW(day, mhlwRef, 5) * mhlwScale),
    });
  }
  return data;
}

function generateFeedingData(count: number): FeedingRow[] {
  const data: FeedingRow[] = [];
  const weights: number[] = [];
  for (let w = 2.0; w <= 8.0; w = Math.round((w + 0.2) * 10) / 10) {
    weights.push(w);
  }
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

function generateDailySchedule(input: BabyInput, whoRef: WHORef): ScheduleRow[] {
  const data: ScheduleRow[] = [];
  const whoBirthWeight = whoRef[0][1];
  const scaleFactor = input.birthWeight / whoBirthWeight;

  for (let day = 0; day <= 180; day++) {
    // WHO推定体重をスケーリングして使用（生理的体重減少も含む）
    const weight = interpolateWHO(day, whoRef) * scaleFactor;

    const mlPerKg = getWhoMlPerKg(day);

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

interface AdviceItem {
  icon: string;
  title: string;
  message: string;
  detail: string;
  tone: "positive" | "neutral" | "caution" | "info";
  evidence: string;
}

function generateAdvice(input: BabyInput, feedCount: number): AdviceItem[] {
  const items: AdviceItem[] = [];
  const rate = input.actualGrowthRate;
  const day = input.currentDay;
  const mlPerKgDay = 180; // WHO upper
  const isLBW = input.birthWeight < 2500;

  // --- 日齢別の特別アドバイス ---
  if (day <= 5) {
    items.push({
      icon: "(*)",
      title: "生まれたばかりの時期です",
      message:
        "生後数日は生理的体重減少といって、赤ちゃんの体重が少し減るのは自然なことです。出生体重の5~7%ほど減ることがあります。",
      detail:
        "これは余分な水分が排出されるためで、心配しなくて大丈夫です。まだ母乳やミルクに慣れ始めたばかりなので、少しずつ授乳のリズムを作っていきましょう。",
      tone: "info",
      evidence:
        "WHO (2022) Recommendations for Care of the Preterm or LBW Infant: 生後3~5日で最大の生理的体重減少が起こるのは正常な経過",
    });
  } else if (day <= 14) {
    items.push({
      icon: "(*)",
      title: "体重回復の時期です",
      message:
        "生後1~2週間は、生理的体重減少から回復する大切な時期です。少しずつ体重が戻ってきているはずです。",
      detail:
        "多くの赤ちゃんは生後10~14日で出生体重に戻ります。焦らず、赤ちゃんのペースを見守ってあげてくださいね。",
      tone: "info",
      evidence:
        "WHO (2011) Guidelines on Optimal Feeding of LBW Infants: 出生体重への回復は通常10~14日で達成される",
    });
  }

  // --- 体重増加速度のアドバイス ---
  if (day > 7) {
    if (rate < 8) {
      items.push({
        icon: "(!)",
        title: "体重の増え方がゆっくりめです",
        message: `現在の体重増加速度は${rate.toFixed(1)}g/kg/日で、WHO基準の目安(10~16g/kg/日)より少しゆっくりです。`,
        detail:
          "赤ちゃんにはそれぞれ成長のペースがあります。ただ、もう少し授乳量を増やしてみたり、授乳回数を増やしてみることで改善することもあります。次の健診で相談してみてくださいね。",
        tone: "caution",
        evidence:
          "WHO (2011) Guidelines on Optimal Feeding of LBW Infants: 出生体重回復後の推奨体重増加速度は10~16g/kg/日",
      });
    } else if (rate < 10) {
      items.push({
        icon: "(!)",
        title: "もう少し体重が増えるといいかも",
        message: `現在${rate.toFixed(1)}g/kg/日のペースで、WHO基準の下限(10g/kg/日)に近い状態です。`,
        detail:
          "少しだけゆっくりめの成長ペースですが、赤ちゃんが元気で機嫌よく過ごしているなら大きな心配はいりません。授乳量を少し増やしてみるのもいいかもしれません。",
        tone: "caution",
        evidence:
          "WHO (2011): 10g/kg/日を下回る場合は授乳量の見直しと経過観察を推奨",
      });
    } else if (rate <= 13) {
      items.push({
        icon: "(*)",
        title: "とても順調に育っています",
        message: `体重増加速度${rate.toFixed(1)}g/kg/日は、WHOの推奨範囲のちょうど真ん中あたりです。`,
        detail:
          "今の授乳ペースがとてもよい感じです。赤ちゃんもしっかり栄養を吸収できているようですね。このまま続けていきましょう。",
        tone: "positive",
        evidence:
          "WHO (2011): LBW児の理想的な体重増加速度は約13g/kg/日(範囲: 10~16g/kg/日)",
      });
    } else if (rate <= 16) {
      items.push({
        icon: "(*)",
        title: "しっかり大きくなっています",
        message: `体重増加速度${rate.toFixed(1)}g/kg/日は、WHO推奨範囲の上のほうです。`,
        detail:
          "元気にすくすく育っていますね。成長が早めですが、WHO基準の範囲内なので安心してください。赤ちゃんがお腹いっぱいのサインを出していないか見てあげてくださいね。",
        tone: "positive",
        evidence:
          "WHO (2011): 16g/kg/日はWHO推奨範囲の上限で、正常な成長速度",
      });
    } else if (rate <= 20) {
      items.push({
        icon: "(!)",
        title: "成長ペースが少し早めです",
        message: `体重増加速度${rate.toFixed(1)}g/kg/日は、WHO推奨上限(16g/kg/日)を少し超えています。`,
        detail:
          "赤ちゃんがとても元気に育っている証拠でもあります。ただ、吐き戻しが多かったり、お腹が張って苦しそうな様子があれば、1回の授乳量を少し減らして回数を増やす方法もあります。次の健診で先生に相談してみてくださいね。",
        tone: "neutral",
        evidence:
          "WHO (2022): 急速な体重増加は過栄養のリスクがあるが、キャッチアップ成長の場合もある。消化器症状の有無で判断",
      });
    } else {
      items.push({
        icon: "(!)",
        title: "かなり早いペースで大きくなっています",
        message: `体重増加速度${rate.toFixed(1)}g/kg/日は、WHO推奨上限(16g/kg/日)の${(rate / 16).toFixed(1)}倍です。`,
        detail:
          "赤ちゃんの食欲が旺盛なのは素晴らしいことです。ただ、急激な体重増加は赤ちゃんの消化器官に負担がかかることがあります。吐き戻し、お腹の張り、不機嫌などがないか観察してみてください。次の受診時に授乳量について相談するのがおすすめです。",
        tone: "caution",
        evidence:
          "WHO (2022) Recommendations for Care of the Preterm or LBW Infant: 過度な体重増加は長期的な肥満リスクとの関連が報告されている (Singhal et al, Lancet 2004)",
      });
    }
  }

  // --- 授乳量に関するアドバイス ---
  const currentMlPerKg =
    ((input.currentWeight / 1000) * mlPerKgDay) /
    (input.currentWeight / 1000);
  const totalPerDay150 = (input.currentWeight / 1000) * 150;
  const totalPerDay180 = (input.currentWeight / 1000) * 180;
  const perFeedLow = Math.round(totalPerDay150 / feedCount);
  const perFeedHigh = Math.round(totalPerDay180 / feedCount);

  items.push({
    icon: "(*)",
    title: "今日の授乳量の目安",
    message: `WHO基準では、1回あたり${perFeedLow}~${perFeedHigh}ml(${feedCount}回/日)が目安です。`,
    detail: `1日の合計は${Math.round(totalPerDay150)}~${Math.round(totalPerDay180)}mlになります。赤ちゃんの様子を見ながら、この範囲を参考にしてみてくださいね。あくまで目安なので、赤ちゃんが満足して眠れていれば大丈夫です。`,
    tone: "info",
    evidence:
      "WHO (2011) Guidelines on Optimal Feeding of LBW Infants: 安定期の推奨摂取量は150~180ml/kg/日",
  });

  // --- 授乳回数に関するアドバイス ---
  if (feedCount < 6) {
    items.push({
      icon: "(!)",
      title: "授乳回数を増やしてみましょう",
      message: `現在の授乳回数は${feedCount}回/日です。${isLBW ? "低出生体重児の場合は特に" : ""}もう少し回数を増やすのがおすすめです。`,
      detail:
        "1回の量を減らして回数を増やすと、赤ちゃんの小さな胃にも優しく、消化もしやすくなります。8~12回/日が一般的な目安です。",
      tone: "caution",
      evidence:
        "WHO (2009) Infant and Young Child Feeding: Model Chapter: 新生児は1日8~12回の授乳が推奨される",
    });
  } else if (feedCount >= 8 && feedCount <= 12) {
    items.push({
      icon: "(*)",
      title: "授乳回数はちょうどよいです",
      message: `${feedCount}回/日の授乳回数は、一般的な推奨範囲(8~12回)の中にあります。`,
      detail:
        "いいリズムで授乳できていますね。赤ちゃんもお腹が空きすぎず、ちょうどよいペースで栄養を摂れています。",
      tone: "positive",
      evidence:
        "WHO (2009) Infant and Young Child Feeding: 新生児の推奨授乳頻度は8~12回/日",
    });
  }

  // --- LBW特有のアドバイス ---
  if (isLBW) {
    items.push({
      icon: "(*)",
      title: "低出生体重児の成長について",
      message: `出生体重${input.birthWeight.toLocaleString()}gは低出生体重児(LBW)に該当します。`,
      detail:
        "低出生体重で生まれた赤ちゃんは、キャッチアップ成長といって、しばらくの間は標準体重の赤ちゃんよりも早いペースで成長することがあります。これは自然な過程なので、焦らず見守ってあげてくださいね。定期的な健診でフォローしてもらいましょう。",
      tone: "info",
      evidence:
        "WHO (2022): LBW児は適切な栄養管理下でキャッチアップ成長を示すことが多く、これは正常な発達過程である",
    });
  }

  // --- 赤ちゃんの満腹サインのアドバイス ---
  if (rate > 14 || feedCount > 10) {
    items.push({
      icon: "(*)",
      title: "赤ちゃんの「お腹いっぱい」サイン",
      message:
        "授乳中の赤ちゃんの様子を観察してみましょう。",
      detail:
        "お腹がいっぱいになると、赤ちゃんは口を閉じる、顔をそむける、手を広げる、寝落ちするなどのサインを出します。泣いているのが空腹以外の理由(おむつ、眠い、抱っこしてほしい等)のこともあります。サインを見つけるのは最初は難しいですが、だんだんわかるようになりますよ。",
      tone: "info",
      evidence:
        "Bergman NJ (2013) Neonatal stomach volume and physiology, Acta Paediatr: 新生児の胃容量は体重に比例し、過度な充満は吐き戻しの原因となる",
    });
  }

  return items;
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
  const [sex, setSex] = useState<"boy" | "girl">("boy");
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
    () => {
      const whoRef = sex === "boy" ? WHO_BOYS : WHO_GIRLS;
      const mhlwRef = sex === "boy" ? MHLW_BOYS : MHLW_GIRLS;
      return babyInput ? generateWeightData(babyInput, whoRef, mhlwRef) : [];
    },
    [babyInput, sex]
  );
  const feedingData = useMemo(() => generateFeedingData(feedCount), [feedCount]);
  const scheduleData = useMemo(
    () => {
      const whoRef = sex === "boy" ? WHO_BOYS : WHO_GIRLS;
      return babyInput ? generateDailySchedule(babyInput, whoRef) : [];
    },
    [babyInput, sex]
  );

  const tabs = [
    { id: "weight", label: "体重推移" },
    { id: "feeding", label: "授乳量目安" },
    { id: "schedule", label: "日別スケジュール" },
    { id: "summary", label: "サマリー" },
  ];

  const weekRanges = [
    { id: "week0", label: "0~2週", start: 0, end: 14 },
    { id: "week2", label: "2~4週", start: 14, end: 28 },
    { id: "week4", label: "4~6週", start: 28, end: 42 },
    { id: "week6", label: "6~8週", start: 42, end: 56 },
    { id: "week8", label: "8~10週", start: 56, end: 70 },
    { id: "week10", label: "10~13週", start: 70, end: 91 },
    { id: "week13", label: "13~17週", start: 91, end: 119 },
    { id: "week17", label: "17~21週", start: 119, end: 147 },
    { id: "week21", label: "21~26週", start: 147, end: 180 },
  ];

  const currentRange =
    weekRanges.find((r) => r.id === scheduleRange) || weekRanges[0];
  const filteredSchedule = scheduleData.filter(
    (d) => d.day >= currentRange.start && d.day <= currentRange.end
  );

  const feedChartData = scheduleData.filter(
    (d) => d.day % 5 === 0 || (babyInput && d.day === babyInput.currentDay)
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
      } else {
        const dayAge = Math.floor(
          (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (dayAge > 180) {
          errs.birthDate =
            "生後6ヶ月を超えています。このツールは生後6ヶ月までの赤ちゃんが対象です";
        }
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

    // 今日が含まれる週レンジを自動選択
    const bd = new Date(birthDateStr + "T00:00:00");
    const today = new Date();
    const dayAge = Math.floor(
      (today.getTime() - bd.getTime()) / (1000 * 60 * 60 * 24)
    );
    const matchRange = weekRanges.find(
      (r) => dayAge >= r.start && dayAge <= r.end
    );
    if (matchRange) {
      setScheduleRange(matchRange.id);
    }
  };

  const weightGain = babyInput
    ? babyInput.currentWeight - babyInput.birthWeight
    : 0;
  const dailyGain = babyInput
    ? Math.round(weightGain / babyInput.currentDay)
    : 0;
  const whoPerFeed = babyInput
    ? (() => {
        const todayMlPerKg = getWhoMlPerKg(babyInput.currentDay);
        const isFullFeeds = babyInput.currentDay >= 14;
        const weightKg = babyInput.currentWeight / 1000;
        return {
          low: Math.round((weightKg * (isFullFeeds ? 150 : todayMlPerKg)) / feedCount),
          high: Math.round((weightKg * (isFullFeeds ? 180 : todayMlPerKg)) / feedCount),
          totalLow: Math.round(weightKg * (isFullFeeds ? 150 : todayMlPerKg)),
          totalHigh: Math.round(weightKg * (isFullFeeds ? 180 : todayMlPerKg)),
          mlPerKgLow: isFullFeeds ? 150 : todayMlPerKg,
          mlPerKgHigh: isFullFeeds ? 180 : todayMlPerKg,
          isSingleTarget: !isFullFeeds,
        };
      })()
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
          <div className="form-grid">
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
              <label style={labelStyle}>性別</label>
              <div style={{ display: "flex", gap: 8 }}>
                {([["boy", "男の子"], ["girl", "女の子"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { setSex(val); setSubmitted(false); }}
                    style={{
                      ...inputStyle,
                      cursor: "pointer",
                      textAlign: "center" as const,
                      background: sex === val ? (val === "boy" ? "#eff6ff" : "#fdf2f8") : "#fff",
                      borderColor: sex === val ? (val === "boy" ? "#2563eb" : "#ec4899") : "#cbd5e1",
                      color: sex === val ? (val === "boy" ? "#2563eb" : "#ec4899") : "#64748b",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
              className="info-row"
              style={{
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
              className={whoPerFeed.isSingleTarget ? "" : "milk-grid"}
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              {whoPerFeed.isSingleTarget ? (
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
                    今日のミルク目安 (WHO推奨)
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#1d4ed8",
                      margin: "4px 0",
                    }}
                  >
                    {whoPerFeed.low}ml x {feedCount}回
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1d4ed8", margin: "4px 0" }}>
                    1日合計 {whoPerFeed.totalLow}ml
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>
                    ({whoPerFeed.mlPerKgLow}ml/kg/日 - 生後{babyInput.currentDay}日目の推奨量)
                  </div>
                </div>
              ) : (
                <>
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
                <div style={{ fontSize: 22, fontWeight: 700, color: "#15803d", margin: "4px 0" }}>
                  1日合計 {whoPerFeed.totalLow}ml
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  (150ml/kg/日)
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
                <div style={{ fontSize: 22, fontWeight: 700, color: "#1d4ed8", margin: "4px 0" }}>
                  1日合計 {whoPerFeed.totalHigh}ml
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  (180ml/kg/日)
                </div>
              </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Show content only after submission */}
        {babyInput && (
          <>
            {/* Tabs */}
            <div
              className="tab-row"
              style={{ marginBottom: 20 }}
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
                  体重推移 (0~180日)
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
                    margin: "0 0 20px",
                  }}
                >
                  WHO基準 + 厚労省パーセンタイル帯 vs 現在のペース予測
                </p>
                <ResponsiveContainer width="100%" height={380}>
                  <ComposedChart
                    data={weightData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="day"
                      stroke="#cbd5e1"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v: number) =>
                        v % 14 === 0 ? `${v / 7}w` : ""
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
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}kg`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 13, paddingTop: 10 }}
                    />
                    {/* 厚労省 3rd-97th パーセンタイル帯 */}
                    <Area
                      type="monotone"
                      dataKey="mhlw97th"
                      stroke="none"
                      fill="#e0f2fe"
                      fillOpacity={0.6}
                      name="厚労省 3-97th"
                      unit="g"
                      legendType="rect"
                    />
                    <Area
                      type="monotone"
                      dataKey="mhlw3rd"
                      stroke="none"
                      fill="#ffffff"
                      fillOpacity={1}
                      name=""
                      legendType="none"
                    />
                    {/* 厚労省 10th-90th パーセンタイル帯 */}
                    <Area
                      type="monotone"
                      dataKey="mhlw90th"
                      stroke="none"
                      fill="#bae6fd"
                      fillOpacity={0.5}
                      name="厚労省 10-90th"
                      unit="g"
                      legendType="rect"
                    />
                    <Area
                      type="monotone"
                      dataKey="mhlw10th"
                      stroke="none"
                      fill="#ffffff"
                      fillOpacity={1}
                      name=""
                      legendType="none"
                    />
                    {/* 厚労省 50th ライン */}
                    <Line
                      type="monotone"
                      dataKey="mhlw50th"
                      stroke="#7dd3fc"
                      strokeWidth={1.5}
                      dot={false}
                      name="厚労省50th"
                      unit="g"
                      strokeDasharray="6 3"
                    />
                    {/* WHO推定 */}
                    <Line
                      type="monotone"
                      dataKey="whoEstimate"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={false}
                      name="WHO推定"
                      unit="g"
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
                      stroke="#f97316"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{
                        value: "今日",
                        position: "top",
                        fill: "#f97316",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    />
                  </ComposedChart>
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
                          "WHO推定",
                          "厚労省範囲",
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
                      {[0, 7, 14, 30, 60, 90, 120, 150, 180].map((d) => {
                        const row = weightData.find((r) => r.day === d);
                        if (!row) return null;
                        const diff =
                          (row.actualProjection || row.actual || 0) -
                          row.whoEstimate;
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
                                color: "#2563eb",
                                fontWeight: 600,
                              }}
                            >
                              {(row.whoEstimate / 1000).toFixed(2)}kg
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                textAlign: "center",
                                color: "#0ea5e9",
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                            >
                              {(row.mhlw3rd / 1000).toFixed(2)}~{(row.mhlw97th / 1000).toFixed(2)}kg
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
                    <ReferenceLine
                      x={`${(Math.round(babyInput.currentWeight / 100) / 10).toFixed(1)}kg`}
                      stroke="#f97316"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{
                        value: "現在",
                        position: "top",
                        fill: "#f97316",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
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
                  日齢別 WHO基準授乳量の推移 (0~180日)
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
                        v % 14 === 0 ? `${v / 7}w` : ""
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
                      stroke="#f97316"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{
                        value: "今日",
                        position: "top",
                        fill: "#f97316",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
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
                  className="week-row"
                  style={{ marginBottom: 16 }}
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
            {tab === "summary" && whoPerFeed && (() => {
              const adviceItems = generateAdvice(babyInput, feedCount);
              const toneStyles: Record<AdviceItem["tone"], { bg: string; border: string; titleColor: string; iconBg: string }> = {
                positive: { bg: "#f0fdf4", border: "#bbf7d0", titleColor: "#15803d", iconBg: "#dcfce7" },
                neutral: { bg: "#eff6ff", border: "#bfdbfe", titleColor: "#1d4ed8", iconBg: "#dbeafe" },
                caution: { bg: "#fffbeb", border: "#fde68a", titleColor: "#b45309", iconBg: "#fef3c7" },
                info: { bg: "#f8fafc", border: "#e2e8f0", titleColor: "#475569", iconBg: "#f1f5f9" },
              };
              return (
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
                    margin: "0 0 8px",
                  }}
                >
                  赤ちゃんの成長サマリー
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "#64748b",
                    margin: "0 0 24px",
                    lineHeight: 1.6,
                  }}
                >
                  WHO国際基準に基づいて、赤ちゃんの成長状態をやさしくお伝えします。
                </p>

                {/* 基本情報カード */}
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 24,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 12,
                    }}
                  >
                    現在の状態
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    {[
                      { label: "生後", value: `${babyInput.currentDay}日目` },
                      { label: "体重増加", value: `+${weightGain}g` },
                      {
                        label: "増加ペース",
                        value: `${babyInput.actualGrowthRate.toFixed(1)}g/kg/日`,
                      },
                      {
                        label: "WHO目安",
                        value: "10~16g/kg/日",
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#94a3b8",
                            marginBottom: 2,
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#1e293b",
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* アドバイスカード */}
                {adviceItems.map((item, idx) => {
                  const style = toneStyles[item.tone];
                  return (
                    <div
                      key={idx}
                      style={{
                        background: style.bg,
                        borderRadius: 12,
                        padding: 20,
                        marginBottom: 16,
                        border: `1px solid ${style.border}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: style.iconBg,
                            fontSize: 14,
                            fontWeight: 800,
                            color: style.titleColor,
                            flexShrink: 0,
                          }}
                        >
                          {item.icon}
                        </span>
                        <h3
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: style.titleColor,
                            margin: 0,
                          }}
                        >
                          {item.title}
                        </h3>
                      </div>
                      <p
                        style={{
                          fontSize: 15,
                          color: "#1e293b",
                          margin: "0 0 8px",
                          lineHeight: 1.7,
                          fontWeight: 600,
                        }}
                      >
                        {item.message}
                      </p>
                      <p
                        style={{
                          fontSize: 14,
                          color: "#475569",
                          margin: "0 0 12px",
                          lineHeight: 1.7,
                        }}
                      >
                        {item.detail}
                      </p>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#94a3b8",
                          borderTop: `1px solid ${style.border}`,
                          paddingTop: 8,
                          lineHeight: 1.5,
                        }}
                      >
                        [根拠] {item.evidence}
                      </div>
                    </div>
                  );
                })}

                {/* 参考文献 */}
                <div
                  style={{
                    marginTop: 8,
                    padding: 16,
                    borderRadius: 10,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#64748b",
                      marginBottom: 8,
                    }}
                  >
                    参考文献
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      lineHeight: 1.8,
                    }}
                  >
                    - WHO (2011) Guidelines on Optimal Feeding of Low-Birth-Weight Infants. ISBN: 9789241548366
                    <br />
                    - WHO (2022) Recommendations for Care of the Preterm or Low-Birth-Weight Infant. ISBN: 9789240058262
                    <br />
                    - WHO (2009) Infant and Young Child Feeding: Model Chapter. Table 7/8
                    <br />
                    - Bergman NJ (2013) Neonatal stomach volume and physiology. Acta Paediatr 102:773-777
                    <br />
                    - Singhal A et al (2004) Early nutrition and leptin concentrations in later life. Am J Clin Nutr
                  </div>
                </div>

              </div>
              );
            })()}
          </>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 32,
            padding: "20px 24px",
            borderRadius: 12,
            fontSize: 13,
            color: "#94a3b8",
            textAlign: "center",
            lineHeight: 1.8,
            border: "1px solid #e2e8f0",
            background: "#fff",
          }}
        >
          ※本サイトはWHO公式ガイドラインに基づく参考情報として作成しておりますが、
          表示される数値はすべて推定値です。
          <br />
          実際の授乳量や体重管理については、担当医にご相談の上、参考としてご使用ください。
        </div>
      </div>
    </div>
  );
}
