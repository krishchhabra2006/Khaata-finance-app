import React, { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  User, Wallet, GraduationCap, Building2, Home, Plane, ArrowRight, ArrowLeft,
  Sparkles, MapPin, IndianRupee, ShieldCheck, Loader2, AlertCircle
} from "lucide-react";

/* ------------------------------ CATEGORY SETS ------------------------------ */

const COLLEGE_NO_MESS = [
  { name: "Food & Mess",            pct: 30, color: "#B8935A" },
  { name: "Transport",              pct: 10, color: "#4A7C82" },
  { name: "Books & Stationery",     pct: 5,  color: "#5C6B73" },
  { name: "Entertainment & Outings",pct: 15, color: "#A2673E" },
  { name: "Personal Care & Misc",   pct: 10, color: "#B7B3A6" },
  { name: "Subscriptions",          pct: 5,  color: "#9C8AA5" },
  { name: "Savings / Emergency",    pct: 15, color: "#2F6B4F" },
  { name: "Buffer",                 pct: 10, color: "#8B5E83" },
];

const COLLEGE_MESS = [
  { name: "Food (outside mess)",    pct: 10, color: "#B8935A" },
  { name: "Transport",              pct: 10, color: "#4A7C82" },
  { name: "Books & Stationery",     pct: 5,  color: "#5C6B73" },
  { name: "Entertainment & Outings",pct: 20, color: "#A2673E" },
  { name: "Personal Care & Misc",   pct: 10, color: "#B7B3A6" },
  { name: "Subscriptions",          pct: 5,  color: "#9C8AA5" },
  { name: "Savings / Emergency",    pct: 25, color: "#2F6B4F" },
  { name: "Buffer",                 pct: 15, color: "#8B5E83" },
];

const FLAT_CATS = [
  { name: "Groceries",              pct: 25, color: "#6B8F71" },
  { name: "Food & Dining Out",      pct: 15, color: "#B8935A" },
  { name: "Utilities & Bills",      pct: 10, color: "#C4622D" },
  { name: "Transport",              pct: 10, color: "#4A7C82" },
  { name: "Entertainment",          pct: 10, color: "#A2673E" },
  { name: "Shopping",               pct: 10, color: "#8B5E83" },
  { name: "Savings / Emergency",    pct: 15, color: "#2F6B4F" },
  { name: "Buffer",                 pct: 5,  color: "#B7B3A6" },
];

const HOME_CATS = [
  { name: "Groceries",              pct: 20, color: "#6B8F71" },
  { name: "Food & Dining Out",      pct: 10, color: "#B8935A" },
  { name: "Utilities & Bills",      pct: 10, color: "#C4622D" },
  { name: "Transport",              pct: 10, color: "#4A7C82" },
  { name: "Entertainment",          pct: 10, color: "#A2673E" },
  { name: "Shopping",               pct: 10, color: "#8B5E83" },
  { name: "Savings / Emergency",    pct: 25, color: "#2F6B4F" },
  { name: "Buffer",                 pct: 5,  color: "#B7B3A6" },
];

const TRIP_STYLES = {
  backpacker: [
    { name: "Accommodation",        pct: 25, color: "#1B2340" },
    { name: "Food",                 pct: 20, color: "#B8935A" },
    { name: "Local Transport",      pct: 15, color: "#4A7C82" },
    { name: "Activities & Sightseeing", pct: 20, color: "#A2673E" },
    { name: "Shopping & Souvenirs", pct: 10, color: "#8B5E83" },
    { name: "Buffer / Emergency",   pct: 10, color: "#B7B3A6" },
  ],
  midrange: [
    { name: "Accommodation",        pct: 35, color: "#1B2340" },
    { name: "Food",                 pct: 20, color: "#B8935A" },
    { name: "Local Transport",      pct: 15, color: "#4A7C82" },
    { name: "Activities & Sightseeing", pct: 15, color: "#A2673E" },
    { name: "Shopping & Souvenirs", pct: 10, color: "#8B5E83" },
    { name: "Buffer / Emergency",   pct: 5,  color: "#B7B3A6" },
  ],
  luxury: [
    { name: "Accommodation",        pct: 45, color: "#1B2340" },
    { name: "Food",                 pct: 20, color: "#B8935A" },
    { name: "Local Transport",      pct: 10, color: "#4A7C82" },
    { name: "Activities & Sightseeing", pct: 15, color: "#A2673E" },
    { name: "Shopping & Souvenirs", pct: 7,  color: "#8B5E83" },
    { name: "Buffer / Emergency",   pct: 3,  color: "#B7B3A6" },
  ],
};

const inr = (n) => "₹" + Math.round(Math.max(n, 0)).toLocaleString("en-IN");

function computePlan(s) {
  let fixed = 0;
  let base = [];
  let cycleDays = 30;

  if (s.situation === "college") {
    base = s.messIncluded ? COLLEGE_MESS : COLLEGE_NO_MESS;
    cycleDays = s.daysCycle || 30;
  } else if (s.situation === "flat") {
    fixed = Number(s.rent) || 0;
    base = FLAT_CATS;
    cycleDays = s.daysCycle || 30;
  } else if (s.situation === "home") {
    fixed = (Number(s.emi) || 0) + (Number(s.maintenance) || 0);
    base = HOME_CATS;
    cycleDays = s.daysCycle || 30;
  } else if (s.situation === "trip") {
    base = TRIP_STYLES[s.travelStyle] || TRIP_STYLES.midrange;
    cycleDays = Number(s.tripDays) || 1;
  }

  let cats = base.map((c) => ({ ...c }));

  if (s.situation !== "trip" && s.savingsPriority && s.savingsPriority !== "balanced") {
    const shift = s.savingsPriority === "aggressive" ? 10 : -8;
    const donors = cats.filter((c) => c.name.includes("Entertainment") || c.name === "Shopping" || c.name === "Buffer");
    if (donors.length) {
      const per = shift / donors.length;
      cats = cats.map((c) => {
        if (c.name.includes("Savings")) return { ...c, pct: Math.max(c.pct + shift, 3) };
        if (donors.includes(c)) return { ...c, pct: Math.max(c.pct - per, 3) };
        return c;
      });
    }
  }

  const spendable = Math.max((Number(s.balance) || 0) - fixed, 0);
  const pctSum = cats.reduce((a, c) => a + c.pct, 0) || 100;
  const amounts = cats.map((c) => ({ ...c, amount: Math.round((spendable * c.pct) / pctSum) }));
  const dailyBudget = Math.round(spendable / Math.max(cycleDays, 1));

  return { fixed, spendable, amounts, dailyBudget, cycleDays };
}

const SITUATIONS = [
  { id: "college", label: "College / Hostel", icon: GraduationCap, desc: "Living in a hostel or PG" },
  { id: "flat",    label: "Rented Flat",       icon: Building2,     desc: "Paying monthly rent" },
  { id: "home",    label: "Personal Home",     icon: Home,          desc: "Own home, EMI or none" },
  { id: "trip",    label: "On a Trip",         icon: Plane,         desc: "Traveling between cities" },
];

export default function App() {
  const [step, setStep] = useState(0);
  const [s, setS] = useState({
    name: "", balance: "", situation: null,
    messIncluded: false, rent: "", emi: "", maintenance: "",
    fromCity: "", toCity: "", tripDays: "",
    daysCycle: 30, incomeType: "student", savingsPriority: "balanced", travelStyle: "midrange",
  });

  const update = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const plan = useMemo(() => computePlan(s), [s]);

  const canNext = () => {
    if (step === 0) return s.name.trim().length > 0;
    if (step === 1) return Number(s.balance) > 0;
    if (step === 2) return !!s.situation;
    if (step === 3) {
      if (s.situation === "trip") return s.fromCity && s.toCity && Number(s.tripDays) > 0;
      return true;
    }
    return true;
  };

  const next = () => setStep((v) => Math.min(v + 1, 5));
  const back = () => setStep((v) => Math.max(v - 1, 0));

  return (
    <div className="app">
      <GlobalStyle />
      <div className="wizard">
        {step < 5 && (
          <div className="progress">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={"progress__dot" + (i <= step ? " progress__dot--done" : "")} />
            ))}
          </div>
        )}

        {step === 0 && <StepName s={s} update={update} />}
        {step === 1 && <StepBalance s={s} update={update} />}
        {step === 2 && <StepSituation s={s} update={update} />}
        {step === 3 && <StepDetails s={s} update={update} />}
        {step === 4 && <StepPreferences s={s} update={update} />}
        {step === 5 && <StepResult s={s} plan={plan} restart={() => setStep(0)} />}

        {step < 5 && (
          <div className="nav-row">
            <button className="back-btn" onClick={back} disabled={step === 0}>
              <ArrowLeft size={15} /> Back
            </button>
            <button className="next-btn" onClick={next} disabled={!canNext()}>
              {step === 4 ? "Generate my plan" : "Continue"} <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepName({ s, update }) {
  return (
    <div className="step">
      <div className="step__icon"><User size={20} /></div>
      <h1>What should we call you?</h1>
      <p className="step__sub">We'll use this to personalize your plan.</p>
      <input className="big-input" autoFocus placeholder="Your name" value={s.name}
        onChange={(e) => update({ name: e.target.value })} />
    </div>
  );
}

function StepBalance({ s, update }) {
  return (
    <div className="step">
      <div className="step__icon"><Wallet size={20} /></div>
      <h1>How much money do you have right now?</h1>
      <p className="step__sub">Your current balance — cash, bank, wallet, all combined.</p>
      <div className="big-input-money">
        <span>₹</span>
        <input type="number" autoFocus placeholder="0" value={s.balance}
          onChange={(e) => update({ balance: e.target.value })} />
      </div>
    </div>
  );
}

function StepSituation({ s, update }) {
  return (
    <div className="step">
      <div className="step__icon"><MapPin size={20} /></div>
      <h1>Where are you right now, {s.name || "friend"}?</h1>
      <p className="step__sub">This shapes how we split your budget.</p>
      <div className="situation-grid">
        {SITUATIONS.map(({ id, label, icon: Icon, desc }) => (
          <button key={id} className={"situation-card" + (s.situation === id ? " situation-card--active" : "")}
            onClick={() => update({ situation: id })}>
            <Icon size={22} />
            <span className="situation-card__label">{label}</span>
            <span className="situation-card__desc">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDetails({ s, update }) {
  return (
    <div className="step">
      <div className="step__icon"><IndianRupee size={20} /></div>
      <h1>A few specifics</h1>
      <p className="step__sub">This helps us get the numbers right.</p>

      {s.situation === "college" && (
        <div className="field-block">
          <label className="toggle-row">
            <input type="checkbox" checked={s.messIncluded} onChange={(e) => update({ messIncluded: e.target.checked })} />
            <span>My mess/food fees are already included in my hostel fee</span>
          </label>
          <label className="field">
            Days until your next allowance/pocket money
            <input type="number" min={1} value={s.daysCycle} onChange={(e) => update({ daysCycle: +e.target.value || 30 })} />
          </label>
        </div>
      )}

      {s.situation === "flat" && (
        <div className="field-block">
          <label className="field">Monthly rent
            <div className="input-money"><span>₹</span>
              <input type="number" placeholder="e.g. 12000" value={s.rent} onChange={(e) => update({ rent: e.target.value })} />
            </div>
          </label>
          <label className="field">Days until your next income
            <input type="number" min={1} value={s.daysCycle} onChange={(e) => update({ daysCycle: +e.target.value || 30 })} />
          </label>
        </div>
      )}

      {s.situation === "home" && (
        <div className="field-block">
          <label className="field">Monthly EMI / home loan (0 if none)
            <div className="input-money"><span>₹</span>
              <input type="number" placeholder="0" value={s.emi} onChange={(e) => update({ emi: e.target.value })} />
            </div>
          </label>
          <label className="field">Maintenance / property costs (0 if none)
            <div className="input-money"><span>₹</span>
              <input type="number" placeholder="0" value={s.maintenance} onChange={(e) => update({ maintenance: e.target.value })} />
            </div>
          </label>
          <label className="field">Days until your next income
            <input type="number" min={1} value={s.daysCycle} onChange={(e) => update({ daysCycle: +e.target.value || 30 })} />
          </label>
        </div>
      )}

      {s.situation === "trip" && (
        <div className="field-block">
          <div className="field-row">
            <label className="field">Traveling from
              <input placeholder="e.g. Delhi" value={s.fromCity} onChange={(e) => update({ fromCity: e.target.value })} />
            </label>
            <label className="field">Traveling to
              <input placeholder="e.g. Manali" value={s.toCity} onChange={(e) => update({ toCity: e.target.value })} />
            </label>
          </div>
          <label className="field">Trip duration (days)
            <input type="number" min={1} placeholder="e.g. 5" value={s.tripDays} onChange={(e) => update({ tripDays: e.target.value })} />
          </label>
        </div>
      )}
    </div>
  );
}

function StepPreferences({ s, update }) {
  const incomeOptions = [
    { id: "student", label: "No regular income" },
    { id: "salaried", label: "Salaried" },
    { id: "freelance", label: "Freelance / irregular" },
  ];
  const savingsOptions = [
    { id: "spend", label: "Spend freely" },
    { id: "balanced", label: "Balanced" },
    { id: "aggressive", label: "Save aggressively" },
  ];
  const travelOptions = [
    { id: "backpacker", label: "Backpacker" },
    { id: "midrange", label: "Comfort" },
    { id: "luxury", label: "Luxury" },
  ];

  return (
    <div className="step">
      <div className="step__icon"><ShieldCheck size={20} /></div>
      <h1>Last few preferences</h1>
      <p className="step__sub">Fine-tunes how your money gets split.</p>

      {s.situation !== "trip" && (
        <>
          <div className="pref-block">
            <div className="pref-label">Income type</div>
            <div className="chip-select">
              {incomeOptions.map((o) => (
                <button key={o.id} className={"chip-opt" + (s.incomeType === o.id ? " chip-opt--active" : "")}
                  onClick={() => update({ incomeType: o.id })}>{o.label}</button>
              ))}
            </div>
          </div>
          <div className="pref-block">
            <div className="pref-label">Savings priority</div>
            <div className="chip-select">
              {savingsOptions.map((o) => (
                <button key={o.id} className={"chip-opt" + (s.savingsPriority === o.id ? " chip-opt--active" : "")}
                  onClick={() => update({ savingsPriority: o.id })}>{o.label}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {s.situation === "trip" && (
        <div className="pref-block">
          <div className="pref-label">Travel style</div>
          <div className="chip-select">
            {travelOptions.map((o) => (
              <button key={o.id} className={"chip-opt" + (s.travelStyle === o.id ? " chip-opt--active" : "")}
                onClick={() => update({ travelStyle: o.id })}>{o.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepResult({ s, plan, restart }) {
  const isTrip = s.situation === "trip";
  const cycleLabel = isTrip ? `${plan.cycleDays}-day trip` : `next ${plan.cycleDays} days`;

  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetch("/api/advice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: s.name,
        situation: s.situation,
        cycleLabel,
        spendable: plan.spendable,
        dailyBudget: plan.dailyBudget,
        fixed: plan.fixed,
        categories: plan.amounts,
      }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Request failed");
        return data;
      })
      .then((data) => {
        if (!cancelled) setAdvice(data.advice);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load AI advice.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="result">
      <div className="result__head"><Sparkles size={16} /><span>{s.name}'s budget plan</span></div>

      {isTrip && (
        <div className="trip-route">
          <span>{s.fromCity}</span><span className="trip-route__arrow">→</span><span>{s.toCity}</span>
        </div>
      )}

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card__label">{isTrip ? "Trip budget" : "Available to spend"}</div>
          <div className="summary-card__value">{inr(plan.spendable)}</div>
        </div>
        <div className="summary-card summary-card--accent">
          <div className="summary-card__label">Safe daily budget</div>
          <div className="summary-card__value">{inr(plan.dailyBudget)}<span>/day</span></div>
        </div>
        {plan.fixed > 0 && (
          <div className="summary-card">
            <div className="summary-card__label">Fixed costs deducted</div>
            <div className="summary-card__value">{inr(plan.fixed)}</div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel__head"><h2>Category breakdown</h2><span className="chip-muted">{cycleLabel}</span></div>
        <div className="breakdown">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={plan.amounts} dataKey="amount" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={1.5} stroke="none">
                {plan.amounts.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [inr(v), n]} contentStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="legend">
            {plan.amounts.map((c) => (
              <li key={c.name} className="legend__row">
                <span className="legend__dot" style={{ background: c.color }} />
                <span className="legend__name">{c.name}</span>
                <span className="legend__pct">{Math.round(c.pct)}%</span>
                <span className="legend__amt">{inr(c.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel advisory">
        <h3><Sparkles size={14} /> Claude's take</h3>
        {loading && (
          <p className="advisory__loading"><Loader2 size={14} className="spin" /> Thinking through your numbers…</p>
        )}
        {!loading && error && (
          <p className="advisory__error"><AlertCircle size={14} /> {error} — showing your plan above still stands.</p>
        )}
        {!loading && !error && <p>{advice}</p>}
      </div>

      <button className="restart-btn" onClick={restart}>Start over</button>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      html, body, #root { height: 100%; margin: 0; }
      .app {
        --paper: #EFEEE7; --card: #F8F6F1; --ink: #1B2340; --ink-soft: #545B7A;
        --gold: #B8935A; --gold-deep: #93733F; --green: #2F6B4F; --rust: #C4622D; --line: rgba(27,35,64,0.12);
        background: var(--paper); color: var(--ink); font-family: 'Inter', sans-serif; min-height: 100%;
      }
      .app button { font-family: inherit; cursor: pointer; }
      .app input { font-family: inherit; }
      .app :focus-visible { outline: 2px solid var(--gold-deep); outline-offset: 2px; }

      .wizard { max-width: 480px; margin: 0 auto; padding: 32px 20px 40px; min-height: 560px; display: flex; flex-direction: column; }
      .progress { display: flex; gap: 6px; margin-bottom: 28px; }
      .progress__dot { flex: 1; height: 4px; border-radius: 999px; background: var(--line); }
      .progress__dot--done { background: var(--gold-deep); }

      .step { flex: 1; display: flex; flex-direction: column; }
      .step__icon { width: 40px; height: 40px; border-radius: 11px; background: var(--ink); color: var(--paper); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
      .step h1 { font-family: 'Fraunces', serif; font-size: 23px; font-weight: 600; margin: 0 0 6px; line-height: 1.3; }
      .step__sub { font-size: 13px; color: var(--ink-soft); margin: 0 0 22px; }

      .big-input { font-family: 'Fraunces', serif; font-size: 24px; border: none; border-bottom: 2px solid var(--line); background: transparent; padding: 8px 2px; width: 100%; }
      .big-input:focus { border-color: var(--gold-deep); outline: none; }
      .big-input-money { display: flex; align-items: baseline; border-bottom: 2px solid var(--line); padding: 8px 2px; }
      .big-input-money:focus-within { border-color: var(--gold-deep); }
      .big-input-money span { font-family: 'IBM Plex Mono', monospace; font-size: 24px; color: var(--ink-soft); margin-right: 4px; }
      .big-input-money input { border: none; background: transparent; font-family: 'IBM Plex Mono', monospace; font-size: 26px; width: 100%; outline: none; }

      .situation-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .situation-card { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 16px; border-radius: 14px; border: 1px solid var(--line); background: var(--card); text-align: left; }
      .situation-card--active { border-color: var(--ink); background: var(--ink); color: var(--paper); }
      .situation-card__label { font-weight: 600; font-size: 13.5px; }
      .situation-card__desc { font-size: 11.5px; opacity: 0.7; }

      .field-block { display: flex; flex-direction: column; gap: 16px; }
      .field-row { display: flex; gap: 12px; }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-soft); font-weight: 500; flex: 1; }
      .field input { padding: 10px 11px; border-radius: 9px; border: 1px solid var(--line); font-size: 13.5px; background: var(--card); }
      .input-money { display: flex; align-items: center; border: 1px solid var(--line); border-radius: 9px; background: var(--card); padding: 0 10px; }
      .input-money span { color: var(--ink-soft); font-size: 13px; }
      .input-money input { border: none; background: transparent; padding: 10px 4px; font-size: 13.5px; width: 100%; outline: none; }
      .toggle-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--ink-soft); }
      .toggle-row input { width: 16px; height: 16px; accent-color: var(--gold-deep); }

      .pref-block { margin-bottom: 18px; }
      .pref-label { font-size: 12px; font-weight: 600; color: var(--ink-soft); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
      .chip-select { display: flex; gap: 8px; flex-wrap: wrap; }
      .chip-opt { border: 1px solid var(--line); background: var(--card); padding: 9px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 500; color: var(--ink-soft); }
      .chip-opt--active { background: var(--ink); color: var(--paper); border-color: var(--ink); }

      .nav-row { display: flex; justify-content: space-between; margin-top: 28px; }
      .back-btn, .next-btn { display: flex; align-items: center; gap: 6px; padding: 11px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 500; border: none; }
      .back-btn { background: transparent; color: var(--ink-soft); }
      .back-btn:disabled { opacity: 0.3; }
      .next-btn { background: var(--ink); color: var(--paper); }
      .next-btn:disabled { opacity: 0.35; }

      .result { max-width: 480px; margin: 0 auto; padding: 32px 20px 40px; display: flex; flex-direction: column; gap: 16px; }
      .result__head { display: flex; align-items: center; gap: 8px; color: var(--gold-deep); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      .trip-route { font-family: 'Fraunces', serif; font-size: 20px; display: flex; align-items: center; gap: 10px; }
      .trip-route__arrow { color: var(--gold-deep); }

      .summary-cards { display: flex; gap: 10px; flex-wrap: wrap; }
      .summary-card { flex: 1; min-width: 130px; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
      .summary-card--accent { background: var(--ink); color: var(--paper); border-color: var(--ink); }
      .summary-card__label { font-size: 11px; opacity: 0.7; margin-bottom: 6px; }
      .summary-card__value { font-family: 'IBM Plex Mono', monospace; font-size: 19px; font-weight: 500; }
      .summary-card__value span { font-size: 11px; opacity: 0.6; margin-left: 2px; }

      .panel { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; }
      .panel__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
      .panel__head h2 { font-family: 'Fraunces', serif; font-size: 16px; margin: 0; }
      .chip-muted { font-size: 11px; background: var(--line); padding: 4px 9px; border-radius: 999px; color: var(--ink-soft); }
      .breakdown { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
      .legend { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 200px; }
      .legend__row { display: flex; align-items: center; gap: 8px; padding: 6px 4px; font-size: 12px; }
      .legend__dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .legend__name { flex: 1; }
      .legend__pct { color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; width: 30px; font-size: 11px; }
      .legend__amt { font-family: 'IBM Plex Mono', monospace; font-weight: 500; width: 66px; text-align: right; }

      .advisory h3 { font-family: 'Fraunces', serif; font-size: 15.5px; margin: 0 0 8px; display: flex; align-items: center; gap: 6px; color: var(--gold-deep); }
      .advisory p { font-size: 13px; line-height: 1.65; color: var(--ink-soft); margin: 0; }
      .advisory__loading { display: flex; align-items: center; gap: 6px; }
      .advisory__error { display: flex; align-items: center; gap: 6px; color: var(--rust); }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }

      .restart-btn { align-self: center; background: transparent; border: 1px solid var(--line); color: var(--ink-soft); padding: 10px 18px; border-radius: 10px; font-size: 12.5px; margin-top: 6px; }

      @media (max-width: 420px) {
        .situation-grid { grid-template-columns: 1fr; }
        .field-row { flex-direction: column; }
      }
    `}</style>
  );
}
