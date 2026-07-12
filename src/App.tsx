import React, { useState } from "react";
import { 
  Dumbbell, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Calendar, 
  User, 
  Scale, 
  Ruler, 
  Activity, 
  ShieldAlert, 
  Flame, 
  HelpCircle,
  Clock,
  Mic
} from "lucide-react";
import { UserProfile, WorkoutPlanResponse } from "./types";
import Dashboard from "./components/Dashboard";
import VoiceAssistant from "./components/VoiceAssistant";

export default function App() {
  const [step, setStep] = useState<number>(1);
  const [profile, setProfile] = useState<UserProfile>({
    age: "",
    gender: "",
    height: "",
    heightUnit: "cm",
    weight: "",
    weightUnit: "kg",
    goal: "",
    experience: "",
    daysPerWeek: 4,
    equipment: "",
    injuries: "",
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [plan, setPlan] = useState<WorkoutPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>("Analyzing your goals...");

  // Mock initial load/test plan just in case, but we default to asking questions
  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleNext = () => {
    // Basic validation for active step
    if (step === 1 && !profile.age) {
      setError("Please enter your age.");
      return;
    }
    if (step === 2 && !profile.gender) {
      setError("Please select or enter your gender.");
      return;
    }
    if (step === 3 && !profile.height) {
      setError("Please enter your height.");
      return;
    }
    if (step === 4 && !profile.weight) {
      setError("Please enter your weight.");
      return;
    }
    if (step === 5 && !profile.goal) {
      setError("Please select a fitness goal.");
      return;
    }
    if (step === 6 && !profile.experience) {
      setError("Please select your experience level.");
      return;
    }
    if (step === 7 && (!profile.daysPerWeek || profile.daysPerWeek < 1 || profile.daysPerWeek > 7)) {
      setError("Please choose working days between 1 and 7.");
      return;
    }
    if (step === 8 && !profile.equipment) {
      setError("Please select your equipment access.");
      return;
    }

    if (step < 9) {
      setStep(prev => prev + 1);
      setError(null);
    } else {
      generatePlan();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
      setError(null);
    }
  };

  const generatePlan = async () => {
    setIsGenerating(true);
    setError(null);
    setLoadingStatus("GymCoach AI is analyzing your metabolic rate...");
    
    // Periodically update loading tips to keep the user engaged
    const tips = [
      "Calculating target macro-nutrient ratios...",
      "Tailoring your workout volume and recovery splits...",
      "Drafting safe compound and isolation progressions...",
      "Finishing up your personalized workout structure..."
    ];
    let tipIdx = 0;
    const interval = setInterval(() => {
      if (tipIdx < tips.length) {
        setLoadingStatus(tips[tipIdx]);
        tipIdx++;
      }
    }, 1500);

    try {
      // Formulate weight in KG for backend calculations
      let weightInKg = parseFloat(profile.weight);
      if (profile.weightUnit === "lbs") {
        weightInKg = Math.round(weightInKg * 0.453592);
      }

      const response = await fetch("/api/coach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          weight: weightInKg.toString(), // ensure weight is sent in kg for standard formulas
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate plan. Please try again.");
      }

      const planData = await response.json();
      setPlan({
        ...planData,
        generatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An unexpected error occurred. Please check your secrets configuration.");
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setPlan(null);
    setError(null);
    setProfile({
      age: "",
      gender: "",
      height: "",
      heightUnit: "cm",
      weight: "",
      weightUnit: "kg",
      goal: "",
      experience: "",
      daysPerWeek: 4,
      equipment: "",
      injuries: "",
    });
  };

  const handleUpdatePlan = (updatedPlan: Partial<WorkoutPlanResponse>) => {
    setPlan(prev => prev ? { ...prev, ...updatedPlan } : null);
  };

  const handleUpdateProfile = (updatedProfile: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updatedProfile }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" id="app-root">
      {/* Top Header matching High Density branding */}
      <header className="bg-indigo-700 text-white px-6 py-4 md:px-8 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center font-bold text-lg">
            🏋️
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
            GymCoach <span className="font-light opacity-85">AI</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4 text-xs md:text-sm font-medium">
          {plan ? (
            <>
              <div className="bg-white/10 px-3.5 py-1.5 rounded-full hidden sm:block">
                {profile.gender === "Prefer not to say" ? "Athlete" : profile.gender} • {profile.experience}
              </div>
              <div className="bg-indigo-600 px-3.5 py-1.5 rounded-full border border-indigo-400">
                Plan Loaded 🔥
              </div>
            </>
          ) : (
            <div className="bg-white/10 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Personal Fitness Guide</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center min-h-0">
        {isGenerating ? (
          /* High density modern loading card */
          <div className="w-full max-w-md mx-auto p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm animate-pulse">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Dumbbell className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-xl font-display font-black text-slate-800">
              Tailoring Your Plan
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              {loadingStatus}
            </p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-6 overflow-hidden">
              <div className="bg-indigo-600 h-full w-2/3 rounded-full animate-infinite-loading" style={{ animationDuration: '2s' }} />
            </div>
          </div>
        ) : plan ? (
          /* Render full high-density dashboard */
          <Dashboard 
            plan={plan} 
            profile={profile} 
            onReset={handleReset} 
            onUpdatePlan={handleUpdatePlan}
            onUpdateProfile={handleUpdateProfile}
          />
        ) : (
          /* Questionnaire view with bento side panel */
          <div className="w-full max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left side: Interactive questionnaire wizard (col-span-8) */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[460px]">
              
              <div>
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                    Question {step} of 9
                  </span>
                  <div className="flex-1 max-w-[200px] bg-slate-100 h-1.5 rounded-full overflow-hidden ml-4">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-300" 
                      style={{ width: `${(step / 9) * 100}%` }}
                    />
                  </div>
                </div>

                <VoiceAssistant 
                  currentStep={step}
                  profile={profile}
                  onChangeValue={handleInputChange}
                  onNextStep={handleNext}
                  onPrevStep={handleBack}
                  generatePlan={generatePlan}
                />

                {/* Question prompts & inputs */}
                <div className="space-y-6">
                  
                  {/* STEP 1: Age */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-display font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <User className="w-6 h-6 text-indigo-600" />
                        First, let's start with the basics. What is your age?
                      </h2>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Your age helps GymCoach AI calculate optimal recovery times and design safe intensity thresholds.
                      </p>
                      
                      <div className="max-w-xs mt-4">
                        <label htmlFor="input-age" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Age (years)</label>
                        <input
                          id="input-age"
                          type="number"
                          min="10"
                          max="110"
                          value={profile.age}
                          onChange={(e) => handleInputChange("age", e.target.value)}
                          placeholder="e.g. 28"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-lg"
                        />
                      </div>

                      {/* Quick preset chips */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {["18", "25", "35", "45", "55"].map(preset => (
                          <button
                            key={preset}
                            onClick={() => handleInputChange("age", preset)}
                            className="px-3.5 py-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors"
                          >
                            {preset} yr
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Gender */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-display font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <User className="w-6 h-6 text-indigo-600" />
                        What is your gender?
                      </h2>
                      <p className="text-sm text-slate-500">
                        This assists in customizing metabolic rate equations and muscle distribution tips.
                      </p>

                      <div className="grid grid-cols-2 gap-3 max-w-md mt-4">
                        {["Male", "Female", "Non-binary", "Prefer not to say"].map(gender => {
                          const isSelected = profile.gender === gender;
                          return (
                            <button
                              key={gender}
                              id={`gender-btn-${gender.toLowerCase().replace(/\s+/g, '-')}`}
                              onClick={() => handleInputChange("gender", gender)}
                              className={`p-4 rounded-xl border text-sm font-bold text-left transition-all duration-150 ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                  : "bg-slate-50 hover:bg-slate-100/80 border-slate-100 text-slate-700"
                              }`}
                            >
                              {gender}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Height */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-display font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Ruler className="w-6 h-6 text-indigo-600" />
                        What is your height?
                      </h2>
                      <p className="text-sm text-slate-500">
                        Input your height so we can log your physical ratios.
                      </p>

                      <div className="flex gap-3 max-w-sm mt-4">
                        <div className="flex-1">
                          <label htmlFor="input-height" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Height</label>
                          <input
                            id="input-height"
                            type="text"
                            value={profile.height}
                            onChange={(e) => handleInputChange("height", e.target.value)}
                            placeholder={profile.heightUnit === "cm" ? "e.g. 175" : "e.g. 5'9"}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-lg"
                          />
                        </div>
                        <div className="w-28">
                          <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Unit</span>
                          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                            {(["cm", "ft"] as const).map(unit => {
                              const isSelected = profile.heightUnit === unit;
                              return (
                                <button
                                  key={unit}
                                  type="button"
                                  onClick={() => handleInputChange("heightUnit", unit)}
                                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    isSelected 
                                      ? "bg-white text-slate-800 shadow-sm" 
                                      : "text-slate-400 hover:text-slate-600"
                                  }`}
                                >
                                  {unit}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="flex gap-2 pt-2">
                        {profile.heightUnit === "cm" ? (
                          ["160", "170", "175", "180", "185"].map(h => (
                            <button
                              key={h}
                              onClick={() => handleInputChange("height", h)}
                              className="px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600"
                            >
                              {h} cm
                            </button>
                          ))
                        ) : (
                          ["5'4", "5'8", "5'10", "6'0", "6'2"].map(h => (
                            <button
                              key={h}
                              onClick={() => handleInputChange("height", h)}
                              className="px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600"
                            >
                              {h}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Weight */}
                  {step === 4 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-display font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Scale className="w-6 h-6 text-indigo-600" />
                        What is your weight?
                      </h2>
                      <p className="text-sm text-slate-500">
                        We use this to establish optimal daily protein levels and load capacity guidelines.
                      </p>

                      <div className="flex gap-3 max-w-sm mt-4">
                        <div className="flex-1">
                          <label htmlFor="input-weight" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Weight</label>
                          <input
                            id="input-weight"
                            type="number"
                            value={profile.weight}
                            onChange={(e) => handleInputChange("weight", e.target.value)}
                            placeholder={profile.weightUnit === "kg" ? "e.g. 75" : "e.g. 165"}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-lg"
                          />
                        </div>
                        <div className="w-28">
                          <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Unit</span>
                          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                            {(["kg", "lbs"] as const).map(unit => {
                              const isSelected = profile.weightUnit === unit;
                              return (
                                <button
                                  key={unit}
                                  type="button"
                                  onClick={() => handleInputChange("weightUnit", unit)}
                                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    isSelected 
                                      ? "bg-white text-slate-800 shadow-sm" 
                                      : "text-slate-400 hover:text-slate-600"
                                  }`}
                                >
                                  {unit}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="flex gap-2 pt-2">
                        {profile.weightUnit === "kg" ? (
                          ["55", "65", "75", "85", "95"].map(w => (
                            <button
                              key={w}
                              onClick={() => handleInputChange("weight", w)}
                              className="px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600"
                            >
                              {w} kg
                            </button>
                          ))
                        ) : (
                          ["120", "140", "160", "180", "200"].map(w => (
                            <button
                              key={w}
                              onClick={() => handleInputChange("weight", w)}
                              className="px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600"
                            >
                              {w} lbs
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 5: Fitness Goal */}
                  {step === 5 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-display font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Activity className="w-6 h-6 text-indigo-600" />
                        What is your primary fitness goal?
                      </h2>
                      <p className="text-sm text-slate-500">
                        This forms the core logic of your workout volume splits and targeted protein ratios.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        {[
                          { title: "Muscle Gain", desc: "Build size, hypertrophy, and muscular shape", icon: "🏋️" },
                          { title: "Weight Loss", desc: "Preserve muscle while shedding fat calories", icon: "🏃" },
                          { title: "Strength", desc: "Focus on compound power and heavy lifting splits", icon: "💪" },
                          { title: "General Fitness", desc: "Improve health, tone, and steady cardiovascular rate", icon: "🌟" }
                        ].map(goal => {
                          const isSelected = profile.goal === goal.title;
                          return (
                            <button
                              key={goal.title}
                              id={`goal-btn-${goal.title.toLowerCase().replace(/\s+/g, '-')}`}
                              onClick={() => handleInputChange("goal", goal.title)}
                              className={`p-4 rounded-2xl border text-left transition-all duration-150 flex items-start gap-4 group ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                                  : "bg-slate-50 hover:bg-slate-100/80 border-slate-100 text-slate-700"
                              }`}
                            >
                              <span className="text-2xl shrink-0">{goal.icon}</span>
                              <div>
                                <h4 className="font-extrabold text-sm md:text-base">{goal.title}</h4>
                                <p className={`text-xs mt-0.5 ${isSelected ? "text-indigo-200" : "text-slate-400 group-hover:text-slate-500"}`}>
                                  {goal.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 6: Experience Level */}
                  {step === 6 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-display font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Activity className="w-6 h-6 text-indigo-600" />
                        What is your experience level?
                      </h2>
                      <p className="text-sm text-slate-500">
                        Ensures you receive standard compound linear reps or advanced, periodized splits.
                      </p>

                      <div className="grid grid-cols-1 gap-3 max-w-md mt-4">
                        {[
                          { title: "Beginner", desc: "learning proper compound forms, 0-1 years lifting history." },
                          { title: "Intermediate", desc: "progressive overload understanding, 1-3 years lifting." },
                          { title: "Advanced", desc: "highly adapted, fine-tuned routines, 3+ years lifting." }
                        ].map(exp => {
                          const isSelected = profile.experience === exp.title;
                          return (
                            <button
                              key={exp.title}
                              id={`exp-btn-${exp.title.toLowerCase()}`}
                              onClick={() => handleInputChange("experience", exp.title)}
                              className={`p-4 rounded-xl border text-left transition-all duration-150 flex justify-between items-center group ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                  : "bg-slate-50 hover:bg-slate-100/80 border-slate-100 text-slate-700"
                              }`}
                            >
                              <div>
                                <h4 className="font-extrabold text-sm md:text-base">{exp.title}</h4>
                                <p className={`text-xs mt-0.5 ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                                  {exp.desc}
                                </p>
                              </div>
                              <ChevronRight className={`w-5 h-5 shrink-0 ${isSelected ? "text-white" : "text-slate-300"}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 7: Days Per Week */}
                  {step === 7 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-display font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                        How many days per week can you work out?
                      </h2>
                      <p className="text-sm text-slate-500">
                        GymCoach AI will craft a schedule that maximizes your target split across your exact available training days.
                      </p>

                      <div className="flex gap-2 flex-wrap max-w-md mt-4">
                        {[2, 3, 4, 5, 6].map(days => {
                          const isSelected = profile.daysPerWeek === days;
                          return (
                            <button
                              key={days}
                              id={`days-btn-${days}`}
                              onClick={() => handleInputChange("daysPerWeek", days)}
                              className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-105"
                                  : "bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-700"
                              }`}
                            >
                              <span className="text-lg font-black">{days}</span>
                              <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                                days
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 8: Equipment */}
                  {step === 8 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-display font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Dumbbell className="w-6 h-6 text-indigo-600" />
                        Do you have access to?
                      </h2>
                      <p className="text-sm text-slate-500">
                        Allows us to write recipes strictly with compound barbells/cables, home DBs, or purely bodyweight callisthenics.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                        {[
                          { title: "Gym", desc: "Barbells, dumbells, cables, leg machines", icon: "🏢" },
                          { title: "Home Equipment", desc: "Dumbbells, bands, pullup bar", icon: "🏠" },
                          { title: "Bodyweight Only", desc: "No equipment, calisthenics target", icon: "🧍" }
                        ].map(equip => {
                          const isSelected = profile.equipment === equip.title;
                          return (
                            <button
                              key={equip.title}
                              id={`equip-btn-${equip.title.toLowerCase().replace(/\s+/g, '-')}`}
                              onClick={() => handleInputChange("equipment", equip.title)}
                              className={`p-4 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between h-36 ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                  : "bg-slate-50 hover:bg-slate-100/80 border-slate-100 text-slate-700"
                              }`}
                            >
                              <div className="text-2xl">{equip.icon}</div>
                              <div>
                                <h4 className="font-extrabold text-sm">{equip.title}</h4>
                                <p className={`text-[10px] leading-snug mt-1 ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                                  {equip.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 9: Injuries & limitations */}
                  {step === 9 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-display font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-indigo-600" />
                        Do you have any injuries or health limitations?
                      </h2>
                      <p className="text-sm text-slate-500">
                        Your health is paramount. If you have joint pains, lower back issues, or muscle strains, specify them so we can replace hazardous lifts with safe alternatives.
                      </p>

                      <div className="space-y-3 mt-4">
                        <textarea
                          id="input-injuries"
                          rows={3}
                          value={profile.injuries}
                          onChange={(e) => handleInputChange("injuries", e.target.value)}
                          placeholder="e.g. Lower back pain, bad left knee, tendonitis in right wrist. (Or leave blank/type None)"
                          className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-slate-800"
                        />
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleInputChange("injuries", "None")}
                            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                              profile.injuries === "None" || profile.injuries === ""
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-100"
                            }`}
                          >
                            ✓ I have no injuries
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleInputChange("injuries", "Lower back tightness")}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-500"
                          >
                            + Lower Back Pain
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleInputChange("injuries", "Knee joint sensitivity")}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-500"
                          >
                            + Bad Knees
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Navigation controls */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {step > 1 ? (
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-extrabold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                      id="wizard-back-btn"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  ) : (
                    <div className="w-10 h-10" />
                  )}
                </div>

                <div className="text-center text-xs text-rose-500 font-semibold max-w-md mx-4">
                  {error}
                </div>

                <div>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1.5 py-3 px-6 rounded-xl text-xs font-extrabold bg-indigo-700 text-white hover:bg-indigo-800 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-sm shadow-indigo-100"
                    id="wizard-next-btn"
                  >
                    {step === 9 ? "Generate My Plan 🏋️" : "Continue"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

            {/* Right side: High-density preview panel showing their collected choices (col-span-4) */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">
                Profile-in-Progress
              </h3>
              
              <div className="space-y-3.5">
                {[
                  { label: "Age", value: profile.age ? `${profile.age} years` : null, stepRef: 1 },
                  { label: "Gender", value: profile.gender, stepRef: 2 },
                  { label: "Height", value: profile.height ? `${profile.height} ${profile.heightUnit}` : null, stepRef: 3 },
                  { label: "Weight", value: profile.weight ? `${profile.weight} ${profile.weightUnit}` : null, stepRef: 4 },
                  { label: "Goal", value: profile.goal, stepRef: 5 },
                  { label: "Experience", value: profile.experience, stepRef: 6 },
                  { label: "Days / Wk", value: profile.daysPerWeek ? `${profile.daysPerWeek} days` : null, stepRef: 7 },
                  { label: "Equipment", value: profile.equipment, stepRef: 8 },
                  { label: "Injuries", value: profile.injuries || "None declared", stepRef: 9 },
                ].map((item, idx) => {
                  const isActive = step === item.stepRef;
                  const isDone = step > item.stepRef;
                  
                  return (
                    <div 
                      key={item.label}
                      onClick={() => { if (item.stepRef < step) setStep(item.stepRef); }}
                      className={`flex justify-between items-center pb-2.5 border-b border-slate-100 last:border-0 last:pb-0 transition-colors cursor-pointer group ${
                        isActive ? "text-indigo-600" : ""
                      }`}
                    >
                      <span className={`text-xs font-medium transition-colors ${
                        isActive ? "text-indigo-600 font-extrabold" : "text-slate-400 group-hover:text-slate-600"
                      }`}>
                        {idx + 1}. {item.label}
                      </span>
                      
                      <span className={`text-xs font-bold transition-all ${
                        isDone 
                          ? "text-slate-800" 
                          : isActive 
                            ? "text-indigo-600 underline decoration-indigo-400 decoration-2" 
                            : "text-slate-300 italic"
                      }`}>
                        {item.value || "Pending..."}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Motivation quote snippet */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="bg-slate-50 rounded-2xl p-4 flex gap-3">
                  <Flame className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] italic text-slate-500 leading-relaxed font-medium">
                    &ldquo;GymCoach AI builds splits in strict alignment with guidelines. Progressive overload, injury safety, and dynamic recovery are prioritized.&rdquo;
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Footer matching mockup layout */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 md:px-8 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 text-center sm:text-left">
        <p className="text-slate-400 text-xs font-medium">
          © {new Date().getFullYear()} GymCoach AI • Powered by Advanced Fitness Logic & Gemini 3.5
        </p>
        <div className="flex gap-4">
          <button 
            onClick={() => window.print()}
            className="text-xs font-bold text-indigo-600 hover:underline px-2 py-1 rounded"
          >
            Export PDF
          </button>
          <a 
            href="https://ai.studio/build" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-bold text-indigo-600 hover:underline px-2 py-1 rounded"
          >
            AI Studio Workspace
          </a>
        </div>
      </footer>
    </div>
  );
}

// Chevron Icon helper if needed
function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
