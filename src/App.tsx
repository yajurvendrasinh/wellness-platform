/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ChevronDown, Copy, Check } from "lucide-react";
import workoutData from "./workouts.json";
import enduranceData from "./endurance.json";
import mobilityData from "./mobility.json";

// --- Types ---

type Unit = "imperial" | "metric";
type Sex = "female" | "male";
type ActivityLevel = "sedentary" | "lightly" | "moderately" | "very" | "extra";

interface TDEEInputs {
  unit: Unit;
  sex: Sex;
  age: string;
  heightFt: string;
  heightIn: string;
  heightCm: string;
  weight: string;
  activity: ActivityLevel;
  bodyFat: string;
}

// --- Constants ---

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly: 1.375,
  moderately: 1.55,
  very: 1.725,
  extra: 1.9,
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (Office job, little exercise)",
  lightly: "Lightly Active (1-3 days/week)",
  moderately: "Moderately Active (3-5 days/week)",
  very: "Very Active (6-7 days/week)",
  extra: "Extra Active (Physical job/training)",
};

// --- Components ---

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-surface-container-highest transition-colors group/copy relative inline-flex items-center justify-center ml-2 align-middle"
      title={`Copy "${text}" to clipboard`}
    >
      {copied ? (
        <Check size={14} className="text-primary" />
      ) : (
        <Copy
          size={14}
          className="text-on-surface-variant group-hover/copy:text-primary transition-colors"
        />
      )}
      {copied && (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: -20 }}
          className="absolute text-[10px] font-bold text-primary uppercase tracking-tighter"
        >
          Copied
        </motion.span>
      )}
    </button>
  );
};

const Navbar = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (t: string) => void;
}) => {
  const isCalculator = activeTab === "calculators";
  const label = isCalculator ? "Build My Workout" : "Calculate My Macros";
  const target = isCalculator ? "workout" : "calculators";

  return (
    <nav className="fixed top-0 w-full z-50 glass-panel shadow-[0_20px_40px_rgba(41,24,2,0.06)]">
      <div className="flex justify-between items-center w-full px-8 py-6 max-w-7xl mx-auto">
        <div
          onClick={() => setActiveTab("calculators")}
          className="text-xl font-bold tracking-tight text-on-surface font-alata cursor-pointer active:opacity-70 tracking-widest uppercase"
        >
          Wellness Ethos
        </div>

        <button
          onClick={() => setActiveTab(target)}
          className="gradient-btn text-white font-alata text-sm px-6 py-2.5 rounded-lg hover:opacity-90 transition-all flex items-center gap-2 group"
        >
          {label}
          <ArrowRight
            size={16}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-[#fff1e5] w-full py-12 flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto mt-auto border-t border-outline-variant/10">
    <div className="text-lg font-bold text-on-surface font-alata text-sm tracking-widest uppercase mb-4 md:mb-0">
      Wellness Ethos
    </div>
    <div className="flex gap-6">{/* Footer links removed */}</div>
  </footer>
);

interface TDEEResultData {
  weightKg: number;
  bmr: number;
  tdee: number;
  activityEnergy: number;
  macros: {
    protein: number;
    fats: number;
    carbs: number;
  };
}

const Digit: React.FC<{ value: string }> = ({ value }) => {
  const num = parseInt(value);
  const isNumeric = !isNaN(num);

  return (
    <div
      className="inline-block overflow-hidden relative"
      style={{ height: "1em", lineHeight: "1em" }}
    >
      <div
        className={`flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.45,0.05,0.55,0.95)] ${!isNumeric ? "transition-none" : ""}`}
        style={{
          transform: isNumeric ? `translateY(-${num * 10}%)` : "translateY(0)",
        }}
      >
        {isNumeric ? (
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span
              key={n}
              className="flex items-center justify-center"
              style={{ height: "1em" }}
            >
              {n}
            </span>
          ))
        ) : (
          <span
            className="flex items-center justify-center"
            style={{ height: "1em" }}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
};

const Odometer: React.FC<{ value: string }> = ({ value }) => {
  // Use a fixed length to keep indices stable if the value is a number
  // TDEE is usually 4 digits plus possible comma
  return (
    <span className="flex items-center tabular-nums">
      {value.split("").map((char, i) => (
        <Digit key={i} value={char} />
      ))}
    </span>
  );
};

const TDEEResults = ({ results }: { results: TDEEResultData | null }) => {
  const [goal, setGoal] = useState<"cut" | "maintain" | "bulk">("maintain");

  const adjustedData = useMemo(() => {
    if (!results) return null;

    const adjustment = goal === "cut" ? -500 : goal === "bulk" ? 500 : 0;
    const targetCalories = results.tdee + adjustment;

    // Recalculate macros based on goal
    const proteinGrams = Math.round(results.weightKg * 2.2);
    const proteinKcal = proteinGrams * 4;
    const fatKcal = targetCalories * 0.3;
    const fatGrams = Math.round(fatKcal / 9);
    const carbKcal = targetCalories - proteinKcal - fatKcal;
    const carbGrams = Math.round(carbKcal / 4);

    return {
      targetCalories,
      bmr: results.bmr,
      activityEnergy: results.activityEnergy,
      macros: {
        protein: proteinGrams,
        fats: fatGrams,
        carbs: carbGrams,
        proteinPct: Math.round((proteinKcal / targetCalories) * 100),
        fatPct: Math.round((fatKcal / targetCalories) * 100),
        carbPct: Math.round((carbKcal / targetCalories) * 100),
      },
    };
  }, [results, goal]);

  return (
    <div className="lg:col-span-7 flex flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h2 className="font-alata text-sm tracking-widest uppercase text-on-surface-variant mb-6">
          Your Daily Caloric Target
        </h2>
        <div className="flex items-end gap-3 mb-2">
          <div className="font-alata text-7xl md:text-8xl tracking-tighter text-primary flex items-baseline overflow-hidden h-[1em]">
            <Odometer
              value={
                adjustedData
                  ? adjustedData.targetCalories.toLocaleString()
                  : "-"
              }
            />
          </div>
          <span className="text-xl text-on-surface-variant mb-6">kcal/day</span>
        </div>
        <p className="text-on-surface-variant leading-relaxed max-w-md">
          {goal === "maintain"
            ? "This is your estimated maintenance calories — the amount you burn in a typical day."
            : goal === "cut"
              ? "This target represents a 500 kcal deficit from maintenance to support weight reduction."
              : "This target includes a 500 kcal surplus to support lean mass development."}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-8 mb-12 border-t border-outline-variant/15 pt-8">
        <div>
          <span className="block font-alata text-xs tracking-widest uppercase text-on-surface-variant mb-2">
            Basal Metabolic Rate
          </span>
          <span className="font-alata text-3xl text-secondary">
            {adjustedData ? adjustedData.bmr.toLocaleString() : "-"}{" "}
            <span className="text-sm text-on-surface-variant">kcal</span>
          </span>
        </div>
        <div>
          <span className="block font-alata text-xs tracking-widest uppercase text-on-surface-variant mb-2">
            Activity Energy
          </span>
          <span className="font-alata text-3xl text-secondary">
            {adjustedData ? adjustedData.activityEnergy.toLocaleString() : "-"}{" "}
            <span className="text-sm text-on-surface-variant">kcal</span>
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-8 shadow-[0_20px_40px_rgba(41,24,2,0.03)] border border-outline-variant/10">
        <div className="mb-8">
          <label className="block font-alata text-sm tracking-widest uppercase text-on-surface-variant mb-4">
            Select Caloric Goal
          </label>
          <div className="flex bg-surface-container-low p-1 rounded-full w-full">
            {(["cut", "maintain", "bulk"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={`flex-1 py-2 px-4 rounded-full font-alata text-xs tracking-widest uppercase transition-all duration-300 ${goal === g ? "bg-primary text-white shadow-md" : "text-on-surface-variant hover:text-primary"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <h3 className="font-alata text-sm tracking-widest uppercase text-on-surface-variant mb-6">
          Macronutrient Baseline Focus
        </h3>
        <div className="space-y-6">
          <MacroBar
            label="Protein"
            grams={adjustedData?.macros.protein ?? 0}
            calories={(adjustedData?.macros.protein ?? 0) * 4}
            percentage={
              adjustedData && results
                ? Math.round(
                    ((adjustedData.macros.protein * 4) / results.tdee) * 100,
                  )
                : 0
            }
            color="bg-primary"
          />
          <MacroBar
            label="Fats"
            grams={adjustedData?.macros.fats ?? 0}
            calories={(adjustedData?.macros.fats ?? 0) * 9}
            percentage={
              adjustedData && results
                ? Math.round(
                    ((adjustedData.macros.fats * 9) / results.tdee) * 100,
                  )
                : 0
            }
            color="bg-secondary"
          />
          <MacroBar
            label="Carbohydrates"
            grams={adjustedData?.macros.carbs ?? 0}
            calories={(adjustedData?.macros.carbs ?? 0) * 4}
            percentage={
              adjustedData && results
                ? Math.round(
                    ((adjustedData.macros.carbs * 4) / results.tdee) * 100,
                  )
                : 0
            }
            color="bg-tertiary"
          />
        </div>
      </div>
    </div>
  );
};

const MacroBar = ({
  label,
  grams,
  calories,
  percentage,
  color,
}: {
  label: string;
  grams: number;
  calories: number;
  percentage: number;
  color: string;
}) => (
  <div>
    <div className="flex justify-between mb-2">
      <span className="font-medium text-on-surface">{label}</span>
      <span className="text-on-surface-variant">
        {grams}g / {calories.toLocaleString()} kcal
      </span>
    </div>
    <div className="h-3 w-full bg-surface-dim rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`h-full ${color} rounded-full`}
      />
    </div>
  </div>
);

const TDEECalculator = () => {
  const [inputs, setInputs] = useState<TDEEInputs>({
    unit: "imperial",
    sex: "female",
    age: "",
    heightFt: "",
    heightIn: "",
    heightCm: "",
    weight: "",
    activity: "moderately",
    bodyFat: "",
  });

  const [results, setResults] = useState<TDEEResultData | null>(null);

  const handleChange = (field: keyof TDEEInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    const ageValue = parseFloat(inputs.age);
    let weightKg = parseFloat(inputs.weight);
    if (inputs.unit === "imperial") weightKg = weightKg * 0.453592;

    let heightCmValue = parseFloat(inputs.heightCm);
    if (inputs.unit === "imperial") {
      const totalInches =
        (parseFloat(inputs.heightFt) || 0) * 12 +
        (parseFloat(inputs.heightIn) || 0);
      heightCmValue = totalInches * 2.54;
    }

    // Mifflin-St Jeor BMR
    let bmr = 10 * weightKg + 6.25 * heightCmValue - 5 * ageValue;
    bmr += inputs.sex === "male" ? 5 : -161;

    // Katch-McArdle if body fat is provided
    const bodyFatValue = parseFloat(inputs.bodyFat);
    if (!isNaN(bodyFatValue)) {
      const leanMass = weightKg * (1 - bodyFatValue / 100);
      bmr = 370 + 21.6 * leanMass;
    }

    const tdee = bmr * ACTIVITY_FACTORS[inputs.activity];

    setResults({
      weightKg,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      activityEnergy: Math.round(tdee - bmr),
      macros: {
        protein: Math.round(weightKg * 2.2),
        fats: Math.round((tdee * 0.3) / 9),
        carbs: Math.round((tdee - weightKg * 2.2 * 4 - tdee * 0.3) / 4),
      },
    });
  };

  const handleReset = () => {
    setInputs({
      unit: "imperial",
      sex: "female",
      age: "",
      heightFt: "",
      heightIn: "",
      heightCm: "",
      weight: "",
      activity: "moderately",
      bodyFat: "",
    });
    setResults(null);
  };

  const isFormValid = useMemo(() => {
    const ageValid = parseFloat(inputs.age) > 0;
    const weightValid = parseFloat(inputs.weight) > 0;
    let heightValid = false;
    if (inputs.unit === "imperial") {
      heightValid =
        parseFloat(inputs.heightFt) > 0 || parseFloat(inputs.heightIn) > 0;
    } else {
      heightValid = parseFloat(inputs.heightCm) > 0;
    }
    return ageValid && weightValid && heightValid;
  }, [inputs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
      <div className="lg:col-span-5 bg-surface-container-low rounded-xl p-8 md:p-10">
        <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
          {/* Unit Toggle */}
          <div className="flex bg-surface-container-highest p-1 rounded-full w-full mb-8">
            <button
              onClick={() => handleChange("unit", "imperial")}
              className={`flex-1 py-3 px-6 rounded-full font-alata text-sm tracking-widest uppercase transition-all ${inputs.unit === "imperial" ? "bg-white text-primary shadow-[0_2px_10px_rgba(41,24,2,0.05)]" : "text-on-surface-variant hover:text-primary"}`}
            >
              Imperial
            </button>
            <button
              onClick={() => handleChange("unit", "metric")}
              className={`flex-1 py-3 px-6 rounded-full font-alata text-sm tracking-widest uppercase transition-all ${inputs.unit === "metric" ? "bg-white text-primary shadow-[0_2px_10px_rgba(41,24,2,0.05)]" : "text-on-surface-variant hover:text-primary"}`}
            >
              Metric
            </button>
          </div>

          {/* Biological Sex */}
          <div className="space-y-3">
            <label className="block font-alata text-sm tracking-widest uppercase text-on-surface-variant">
              Biological Sex
            </label>
            <div className="flex gap-4">
              {["female", "male"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleChange("sex", s as Sex)}
                  className={`flex-1 py-4 text-center rounded-xl transition-all border-none font-medium capitalize ${
                    inputs.sex === s
                      ? "bg-primary-fixed text-primary ring-2 ring-outline-variant/30"
                      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div className="space-y-3">
            <label
              className="block font-alata text-sm tracking-widest uppercase text-on-surface-variant"
              htmlFor="age"
            >
              Age
            </label>
            <input
              className="w-full bg-surface-container-high border-none rounded-xl px-5 py-4 text-on-surface focus:ring-2 focus:ring-outline-variant/30 focus:bg-primary-fixed transition-colors outline-none"
              id="age"
              placeholder="Years"
              type="number"
              value={inputs.age}
              onChange={(e) => handleChange("age", e.target.value)}
            />
          </div>

          {/* Height & Weight */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block font-alata text-sm tracking-widest uppercase text-on-surface-variant">
                Height
              </label>
              {inputs.unit === "imperial" ? (
                <div className="flex gap-2">
                  <input
                    className="w-full bg-surface-container-high border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-outline-variant/30 focus:bg-primary-fixed outline-none"
                    placeholder="Ft"
                    type="number"
                    value={inputs.heightFt}
                    onChange={(e) => handleChange("heightFt", e.target.value)}
                  />
                  <input
                    className="w-full bg-surface-container-high border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-outline-variant/30 focus:bg-primary-fixed outline-none"
                    placeholder="In"
                    type="number"
                    value={inputs.heightIn}
                    onChange={(e) => handleChange("heightIn", e.target.value)}
                  />
                </div>
              ) : (
                <input
                  className="w-full bg-surface-container-high border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-outline-variant/30 focus:bg-primary-fixed outline-none"
                  placeholder="cm"
                  type="number"
                  value={inputs.heightCm}
                  onChange={(e) => handleChange("heightCm", e.target.value)}
                />
              )}
            </div>
            <div className="space-y-3">
              <label className="block font-alata text-sm tracking-widest uppercase text-on-surface-variant">
                Weight
              </label>
              <div className="relative">
                <input
                  className="w-full bg-surface-container-high border-none rounded-xl px-5 py-4 text-on-surface focus:ring-2 focus:ring-outline-variant/30 focus:bg-primary-fixed outline-none pr-12"
                  placeholder="0"
                  type="number"
                  value={inputs.weight}
                  onChange={(e) => handleChange("weight", e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                  {inputs.unit === "imperial" ? "lbs" : "kg"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label
              className="block font-alata text-sm tracking-widest uppercase text-on-surface-variant"
              htmlFor="activity"
            >
              Activity Level
            </label>
            <div className="relative">
              <select
                className="w-full select-wellness pr-12"
                id="activity"
                value={inputs.activity}
                onChange={(e) =>
                  handleChange("activity", e.target.value as ActivityLevel)
                }
              >
                {Object.entries(ACTIVITY_LABELS).map(([val, label]) => (
                  <option
                    key={val}
                    value={val}
                    className="bg-surface py-2 text-on-surface"
                  >
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                size={20}
              />
            </div>
          </div>

          {/* Optional Body Fat */}
          <div className="space-y-3 pt-4 border-t border-outline-variant/15">
            <label className="block font-alata text-sm tracking-widest uppercase text-on-surface-variant flex justify-between">
              <span>Body Fat %</span>
              <span className="text-xs text-on-surface-variant/70 normal-case tracking-normal">
                Optional for accuracy
              </span>
            </label>
            <div className="relative">
              <input
                className="w-full bg-surface-container-high border-none rounded-xl px-5 py-4 text-on-surface focus:ring-2 focus:ring-outline-variant/30 focus:bg-primary-fixed outline-none pr-12"
                placeholder="e.g. 15"
                type="number"
                value={inputs.bodyFat}
                onChange={(e) => handleChange("bodyFat", e.target.value)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                %
              </span>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={handleCalculate}
              disabled={!isFormValid}
              className="flex-[2] gradient-btn text-white font-alata text-lg tracking-wide py-5 rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
            >
              Calculate Expenditure
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-surface-container-highest text-primary font-alata text-lg tracking-wide py-5 rounded-xl hover:bg-surface-container-high transition-all"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <TDEEResults results={results} />
    </div>
  );
};

const WorkoutBuilder = () => {
  const [focus, setFocus] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [showRoutine, setShowRoutine] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState<any>(null);
  const routineRef = useRef<HTMLDivElement>(null);

  const canBuild = focus && experience && duration;

  const handleBuildWorkout = () => {
    if (focus === "Strength" && experience && duration) {
      const levelKey = experience.toLowerCase();
      const durationKey = duration.split(" ")[0];

      const category = (workoutData as any)[levelKey];
      if (category && category[durationKey]) {
        const variants = category[durationKey].variants;
        const randomIndex = Math.floor(Math.random() * variants.length);
        setCurrentWorkout({ ...variants[randomIndex], type: "strength" });
      }
    } else if (focus === "Endurance" && experience && duration) {
      const levelKey = experience.toLowerCase();
      const durationKey = duration.split(" ")[0];

      const category = (enduranceData as any)[levelKey];
      if (category && category[durationKey]) {
        const variants = category[durationKey].variants;
        const randomIndex = Math.floor(Math.random() * variants.length);
        setCurrentWorkout({ ...variants[randomIndex], type: "endurance" });
      }
    } else if (focus === "Flexibility" && experience && duration) {
      const levelKey = experience.toLowerCase();
      const durationKey = duration.split(" ")[0];

      const category = (mobilityData as any)[levelKey];
      if (category && category[durationKey]) {
        const variants = category[durationKey].variants;
        const randomIndex = Math.floor(Math.random() * variants.length);
        setCurrentWorkout({ ...variants[randomIndex], type: "mobility" });
      }
    } else {
      // Fallback
      setCurrentWorkout(null);
    }

    setShowRoutine(true);
    setTimeout(() => {
      routineRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const handleReset = () => {
    setFocus(null);
    setExperience(null);
    setDuration(null);
    setShowRoutine(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-5xl mx-auto py-12">
      <header className="mb-16 text-center max-w-3xl mx-auto">
        <h1 className="font-alata text-4xl md:text-5xl text-primary-container tracking-tight mb-6 mt-12 text-center">
          Curate Your Intent
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed text-center">
          Select your focus and dedicated time. We will architect a bespoke
          routine grounded in a mindful wellness ethos.
        </p>
      </header>

      <section className="bg-surface-container-low rounded-xl p-8 md:p-12 shadow-[0_20px_40px_rgba(41,24,2,0.06)] relative overflow-hidden mb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
          <SelectionGroup
            title="Focus"
            options={[
              { id: "Strength", sub: "Foundation & Power" },
              { id: "Endurance", sub: "Stamina & Breath" },
              { id: "Flexibility", sub: "Mobility & Restoration" },
            ]}
            value={focus}
            onChange={(v) => {
              setFocus(v);
              setDuration(null); // Reset duration when focus changes
              setShowRoutine(false);
            }}
          />
          <SelectionGroup
            title="Experience"
            options={[
              { id: "Beginner", sub: "Show me the way" },
              { id: "Intermediate", sub: "I know what I am doing" },
              { id: "Expert", sub: "Bring it on" },
            ]}
            value={experience}
            onChange={setExperience}
          />
          <SelectionGroup
            title="Duration"
            options={
              focus === "Flexibility"
                ? [
                    { id: "5 min", sub: "Efficient Flow" },
                    { id: "10 min", sub: "Balanced Daily" },
                    { id: "20 min", sub: "Total Immersion" },
                  ]
                : [
                    { id: "30 min", sub: "Focused Burst" },
                    { id: "60 min", sub: "Balanced Session" },
                    { id: "90 min", sub: "Deep Engagement" },
                  ]
            }
            value={duration}
            onChange={setDuration}
          />
        </div>

        <div className="mt-12 flex justify-center">
          <button
            disabled={!canBuild}
            onClick={handleBuildWorkout}
            className="gradient-btn text-white font-alata text-lg px-12 py-5 rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_10px_20px_rgba(102,76,45,0.15)] flex items-center gap-3 group"
          >
            Build My Workout
            <ArrowRight
              size={20}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </div>
      </section>

      <AnimatePresence>
        {showRoutine && (
          <motion.div
            ref={routineRef}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="space-y-12 scroll-mt-32"
          >
            <div className="flex items-center gap-4">
              <div className="h-px bg-outline-variant/30 flex-grow" />
              <h3 className="font-alata text-2xl text-primary-container tracking-tight px-4 whitespace-nowrap">
                Your Curated Routine
              </h3>
              <div className="h-px bg-outline-variant/30 flex-grow" />
            </div>

            <div className="bg-white rounded-xl shadow-[0_20px_40px_rgba(41,24,2,0.04)] overflow-hidden border border-outline-variant/10 text-left">
              <div className="px-8 py-5 bg-surface-container-low border-b border-outline-variant/15 flex justify-between items-center">
                <span className="font-alata text-primary-container font-bold text-sm tracking-widest uppercase">
                  {currentWorkout?.type === "strength"
                    ? `Theme: ${currentWorkout?.theme}`
                    : `Focus: ${currentWorkout?.title}`}
                </span>
                <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
                  {duration} · {experience}
                </span>
              </div>

              {currentWorkout?.type === "strength" ? (
                <>
                  <div className="grid grid-cols-12 gap-4 px-8 py-5 bg-surface-container-low/50 border-b border-outline-variant/15 font-bold text-xs tracking-wider uppercase">
                    <div className="col-span-6">Movement</div>
                    <div className="col-span-3 text-right">Target RIR</div>
                    <div className="col-span-3 text-right">Volume</div>
                  </div>

                  <div className="divide-y divide-outline-variant/10">
                    {currentWorkout?.exercises?.map((m: any, i: number) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-4 px-8 py-6 items-center hover:bg-surface-container-low/50 transition-colors group"
                      >
                        <div className="col-span-6">
                          <div className="flex items-center flex-wrap">
                            <span className="font-alata text-lg text-primary">
                              {m.name}
                            </span>
                            <CopyButton text={m.name} />
                          </div>
                          <span className="text-sm text-on-surface-variant font-medium block">
                            {m.coaching_cue || m.desc}
                          </span>
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface uppercase tracking-wider">
                            RIR {m.rir}
                          </span>
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="block font-semibold">
                            {m.sets} Sets
                          </span>
                          <span className="text-xs text-on-surface-variant font-medium">
                            {m.rep_range} Reps
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : currentWorkout?.type === "endurance" ? (
                <>
                  <div className="grid grid-cols-12 gap-4 px-8 py-5 bg-surface-container-low/50 border-b border-outline-variant/15 font-bold text-xs tracking-wider uppercase">
                    <div className="col-span-7">Phase / Work Block</div>
                    <div className="col-span-5 text-right">
                      Metric / Duration
                    </div>
                  </div>

                  <div className="divide-y divide-outline-variant/10">
                    {currentWorkout?.structure?.map((phase: any, i: number) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-4 px-8 py-6 items-center hover:bg-surface-container-low/50 transition-colors group"
                      >
                        <div className="col-span-7">
                          <div className="flex items-center flex-wrap">
                            <span className="font-alata text-lg text-primary">
                              {phase.phase}
                            </span>
                            <CopyButton text={phase.phase} />
                          </div>
                          <span className="text-sm text-on-surface-variant font-medium block">
                            {phase.description}
                          </span>
                        </div>
                        <div className="col-span-5 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="block font-semibold">
                              {phase.duration_min} min
                            </span>
                            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface uppercase tracking-wider">
                              {phase.bpm_target} BPM
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {currentWorkout?.rp_principle && (
                    <div className="px-8 py-6 bg-surface-container-low/30 border-t border-outline-variant/15 italic text-sm text-on-surface-variant">
                      <span className="font-bold uppercase tracking-widest text-[10px] block mb-1 not-italic opacity-70">
                        Scientific Insight
                      </span>
                      {currentWorkout.rp_principle}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-4 px-8 py-5 bg-surface-container-low/50 border-b border-outline-variant/15 font-bold text-xs tracking-wider uppercase">
                    <div className="col-span-8">Mobility Drill</div>
                    <div className="col-span-4 text-right">Target Duration</div>
                  </div>

                  <div className="divide-y divide-outline-variant/10">
                    {currentWorkout?.drills?.map((drill: any, i: number) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-4 px-8 py-6 items-start hover:bg-surface-container-low/50 transition-colors group"
                      >
                        <div className="col-span-8">
                          <div className="flex items-center flex-wrap">
                            <span className="font-alata text-lg text-primary leading-tight mb-1">
                              {drill.name}
                            </span>
                            <CopyButton text={drill.name} />
                          </div>
                          <span className="text-sm text-on-surface-variant leading-relaxed block">
                            {drill.instruction}
                          </span>
                        </div>
                        <div className="col-span-4 text-right">
                          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface uppercase tracking-wider">
                            {drill.duration}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="px-8 py-4 bg-surface-container-low/30 border-t border-outline-variant/15 flex justify-between items-center text-xs opacity-60">
                <span>
                  Modality: {currentWorkout?.modality || "Gym/Bodyweight"}
                </span>
                <span>Type: {currentWorkout?.session_type || "Standard"}</span>
              </div>
            </div>

            <div className="flex justify-center mt-12">
              <button
                onClick={handleReset}
                className="bg-surface-container-high text-primary font-alata text-lg px-12 py-4 rounded-xl hover:bg-surface-container-highest transition-all border border-outline-variant/10"
              >
                Reset Builder
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SelectionGroup = ({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { id: string; sub: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-col space-y-6 text-left">
    <h2 className="font-bold text-lg text-on-surface tracking-wide uppercase border-b border-outline-variant/30 pb-3">
      {title}
    </h2>
    <div className="flex flex-col gap-3">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`w-full text-left px-6 py-4 rounded-xl border transition-all duration-300 ${
            value === opt.id
              ? "bg-surface-container-highest text-primary border-primary/20"
              : "bg-white text-on-surface-variant border-outline-variant/15 hover:bg-surface-container-high"
          }`}
        >
          <span className="font-medium block">{opt.id}</span>
          <span className="block text-sm opacity-70 mt-0.5">{opt.sub}</span>
        </button>
      ))}
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState("calculators");

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-24 md:py-32">
        <AnimatePresence mode="wait">
          {activeTab === "calculators" ? (
            <motion.div
              key="calculators"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <header className="mb-16 max-w-2xl">
                <h1 className="font-alata text-4xl md:text-5xl text-primary tracking-tight mb-4 gradient-text">
                  Total Daily Energy Expenditure
                </h1>
                <p className="text-on-surface-variant text-lg leading-relaxed">
                  Determine how many calories your body burns each day,
                  establishing your baseline for a mindful approach to wellness
                  and nutrition.
                </p>
              </header>
              <TDEECalculator />
            </motion.div>
          ) : activeTab === "workout" ? (
            <motion.div
              key="workout"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="py-12 text-center"
            >
              <WorkoutBuilder />
            </motion.div>
          ) : (
            <motion.div
              key="other"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-24 text-center"
            >
              <h2 className="text-3xl font-alata text-primary-container">
                Bespoke Wellness Awaits
              </h2>
              <p className="text-on-surface-variant mt-4">
                We are curating the finest content for you.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
