import { format, addMonths } from "date-fns";

/** Plan starts June 2025 — 24 months to land purchase goal */
export const LAND_PLAN_START = new Date(2025, 5, 1);
export const LAND_PLAN_MONTHS_COUNT = 24;

const TARGETS = [
  29061,
  33040, 33040, 33040,
  43061,
  ...Array(11).fill(52361),
  ...Array(8).fill(57816),
];

/** Title, bullets, phase per month (aligned with TARGETS) */
const DETAILS = [
  {
    phase: "Phase 1",
    phaseLabel: "Survive",
    headline: "Open your Krishnagiri Land Fund account today",
    bullets: ["Transfer ₹29,061 before spending anything"],
  },
  {
    phase: "Phase 2",
    phaseLabel: "Momentum",
    headline: "True Balance ends — +₹3,979 freed",
    bullets: [
      "True Balance closed — redirect freed cash immediately",
      "Transfer ₹33,040 (₹29,061 + ₹3,979 freed)",
    ],
  },
  {
    phase: "Phase 2",
    phaseLabel: "Momentum",
    headline: "DBS + Prabha Cheetu end next month — stay ready",
    bullets: ["Transfer ₹33,040 to land fund"],
  },
  {
    phase: "Phase 2",
    phaseLabel: "Momentum",
    headline: "DBS Bank + Prabha Cheetu end — +₹13,876 freed",
    bullets: [
      "DBS Bank + Prabha Cheetu closed — huge relief",
      "Transfer ₹33,040 (next month target jumps to ₹43,061)",
    ],
  },
  {
    phase: "Phase 2",
    phaseLabel: "Momentum",
    headline: "Last tight month — Navi + Sangam freed from Nov",
    bullets: ["Transfer ₹43,061 to land fund"],
  },
  {
    phase: "Phase 3",
    phaseLabel: "Acceleration",
    headline: "Navi + Sangam Krishnagiri end — +₹8,500 freed",
    bullets: [
      "Navi + Sangam closed — savings cross ~₹52k/month",
      "Transfer ₹52,361 — consider locking some in 6-month FD",
    ],
  },
  {
    phase: "Phase 3",
    phaseLabel: "Acceleration",
    headline: "Visit Krishnagiri — talk to local agents",
    bullets: ["Transfer ₹52,361 to land fund"],
  },
  {
    phase: "Phase 3",
    phaseLabel: "Acceleration",
    headline: "Market up or down — keep the discipline",
    bullets: ["Transfer ₹52,361 to land fund — never pause the plan"],
  },
  {
    phase: "Phase 3",
    phaseLabel: "Acceleration",
    headline: "Review checkpoint — fund vs this plan",
    bullets: ["Transfer ₹52,361 to land fund"],
  },
  {
    phase: "Phase 3",
    phaseLabel: "Acceleration",
    headline: "Lock accumulated corpus in FD (~7–7.5%)",
    bullets: ["Transfer ₹52,361 to land fund"],
  },
  {
    phase: "Phase 3",
    phaseLabel: "Acceleration",
    headline: "You are building real wealth",
    bullets: ["Transfer ₹52,361 to land fund"],
  },
  {
    phase: "Phase 3",
    phaseLabel: "Acceleration",
    headline: "Review FD maturity, SIP NAV, land fund balance",
    bullets: ["Transfer ₹52,361 to land fund"],
  },
  {
    phase: "Phase 3",
    phaseLabel: "Acceleration",
    headline: "Ask for EC, Patta, Chitta — verify ownership",
    bullets: ["Transfer ₹52,361 to land fund"],
  },
  {
    phase: "Phase 3",
    phaseLabel: "Acceleration",
    headline: "Budget ~₹5,000 for property lawyer due diligence",
    bullets: ["Transfer ₹52,361 to land fund"],
  },
  {
    phase: "Phase 3",
    phaseLabel: "Acceleration",
    headline: "Last full month with Ather EMI",
    bullets: ["Transfer ₹52,361 to land fund"],
  },
  {
    phase: "Phase 3",
    phaseLabel: "Acceleration",
    headline: "After this month — path to debt-free",
    bullets: ["Transfer ₹52,361 to land fund"],
  },
  {
    phase: "Phase 4",
    phaseLabel: "Peak Savings",
    headline: "Ather ends — +₹5,455 freed — debt free unlocked",
    bullets: ["Transfer ₹57,816 — celebrate responsibly"],
  },
  {
    phase: "Phase 4",
    phaseLabel: "Peak Savings",
    headline: "Narrow to one preferred plot",
    bullets: ["Transfer ₹57,816 — get offer in writing"],
  },
  {
    phase: "Phase 4",
    phaseLabel: "Peak Savings",
    headline: "Cash buyers negotiate 5–10% off",
    bullets: ["Transfer ₹57,816 to land fund"],
  },
  {
    phase: "Phase 4",
    phaseLabel: "Peak Savings",
    headline: "Advance only after lawyer clears documents",
    bullets: ["Transfer ₹57,816 to land fund"],
  },
  {
    phase: "Phase 4",
    phaseLabel: "Peak Savings",
    headline: "EC + Patta + road access confirmed",
    bullets: ["Transfer ₹57,816 to land fund"],
  },
  {
    phase: "Phase 4",
    phaseLabel: "Peak Savings",
    headline: "Redeem FDs into land fund",
    bullets: ["Transfer ₹57,816 — ready for full payment"],
  },
  {
    phase: "Phase 4",
    phaseLabel: "Peak Savings",
    headline: "Stamp duty + registration (~4–6% of value)",
    bullets: ["Plan registration costs — transfer ₹57,816"],
  },
  {
    phase: "Phase 4",
    phaseLabel: "Peak Savings",
    headline: "Final push — align fund with closing",
    bullets: ["Transfer ₹57,816 — lawyer + seller timeline"],
  },
];

export function formatLakhs(rupees) {
  if (rupees == null || Number.isNaN(rupees)) return "—";
  const l = rupees / 100000;
  const s = l >= 10 ? l.toFixed(2) : l.toFixed(2);
  return `${s}L`;
}

/** Full 24-month plan rows with targets and narrative */
export function getLandPlanMonths() {
  let plannedCumulative = 0;
  return TARGETS.map((target, i) => {
    plannedCumulative += target;
    const d = addMonths(LAND_PLAN_START, i);
    const detail = DETAILS[i] || {
      phase: "Phase 4",
      phaseLabel: "Peak Savings",
      headline: "Stay on plan",
      bullets: [`Transfer ₹${target.toLocaleString("en-IN")} to land fund`],
    };
    return {
      planMonthIndex: i + 1,
      year: d.getFullYear(),
      monthIndex0: d.getMonth(),
      monthShort: format(d, "MMM yyyy"),
      monthLong: format(d, "MMMM yyyy"),
      target,
      plannedCumulative,
      phase: detail.phase,
      phaseLabel: detail.phaseLabel,
      headline: detail.headline,
      bullets: detail.bullets,
    };
  });
}
