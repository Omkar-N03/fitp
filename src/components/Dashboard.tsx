import React, { useState } from "react";
import { 
  Dumbbell, 
  Flame, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  RotateCcw, 
  Calendar, 
  Utensils, 
  User, 
  Zap, 
  Droplet,
  Heart,
  ChevronRight,
  ShieldCheck,
  Award,
  MessageSquare,
  Send,
  Bot,
  RefreshCw,
  Mic,
  MicOff
} from "lucide-react";
import { WorkoutPlanResponse, UserProfile, WorkoutDay } from "../types";

interface DashboardProps {
  plan: WorkoutPlanResponse;
  profile: UserProfile;
  onReset: () => void;
  onUpdatePlan: (updatedPlan: Partial<WorkoutPlanResponse>) => void;
  onUpdateProfile: (updatedProfile: Partial<UserProfile>) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "coach";
  text: string;
  timestamp: string;
  systemNotification?: string;
}

export default function Dashboard({ 
  plan, 
  profile, 
  onReset, 
  onUpdatePlan, 
  onUpdateProfile 
}: DashboardProps) {
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [completedDays, setCompletedDays] = useState<Record<string, boolean>>({});

  // Interactive Coach Chat States
  const [activeTab, setActiveTab] = useState<"advice" | "chat">("chat");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      sender: "coach",
      text: "Hey! I am GymCoach AI, your interactive fitness coach. Ask me questions, suggest replacements (e.g. 'replace Bench Press with pushups'), or modify target days, and I will instantly adapt your plan and UI! 🏋️‍♂️",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [uiNotification, setUiNotification] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onerror = (e: any) => {
          console.error("Speech Recognition Error:", e.error);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        rec.onresult = (event: any) => {
          const resultText = event.results[0][0].transcript;
          setInputText(prev => prev ? `${prev} ${resultText}` : resultText);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isSending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText;
    if (!text.trim() || isSending) return;

    if (textToSend === undefined) {
      setInputText("");
    }

    const userMessageId = `msg-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setIsSending(true);

    try {
      const response = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          profile: profile,
          plan: plan,
          chatHistory: chatMessages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const responseData = await response.json();
      
      let notificationMsg = "";
      
      // Update workoutPlan if returned and different
      if (responseData.updatedWorkoutPlan && JSON.stringify(responseData.updatedWorkoutPlan) !== JSON.stringify(plan.workoutPlan)) {
        onUpdatePlan({ workoutPlan: responseData.updatedWorkoutPlan });
        notificationMsg += "Workout split adapted! 🏋️";
      }

      // Update protein goals if returned and different
      if (responseData.updatedProtein && JSON.stringify(responseData.updatedProtein) !== JSON.stringify(plan.protein)) {
        onUpdatePlan({ protein: responseData.updatedProtein });
        notificationMsg += " Protein target updated! 🥦";
      }

      // Update profile if returned and different
      if (responseData.updatedProfile && JSON.stringify(responseData.updatedProfile) !== JSON.stringify(profile)) {
        onUpdateProfile(responseData.updatedProfile);
        notificationMsg += " Profile traits modified! ⚙️";
      }

      const coachMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "coach",
        text: responseData.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        systemNotification: notificationMsg || undefined
      };

      setChatMessages(prev => [...prev, coachMsg]);

      if (notificationMsg) {
        setUiNotification(notificationMsg);
        setTimeout(() => setUiNotification(null), 5000);
      }

    } catch (err) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: "coach",
          text: "I had an issue communicating with the AI. Please verify your network and Gemini API keys and try again!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Food descriptors matching top protein sources
  const getFoodStats = (foodName: string) => {
    const name = foodName.toLowerCase();
    if (name.includes("chicken")) return { weight: "31g", label: "per 100g", icon: "🍗" };
    if (name.includes("egg")) return { weight: "6g", label: "per egg", icon: "🥚" };
    if (name.includes("paneer")) return { weight: "18g", label: "per 100g", icon: "🥛" };
    if (name.includes("fish")) return { weight: "25g", label: "per 100g", icon: "🐟" };
    if (name.includes("soy")) return { weight: "36g", label: "per 100g", icon: "🌱" };
    if (name.includes("greek yogurt")) return { weight: "10g", label: "per 100g", icon: "🥛" };
    if (name.includes("milk")) return { weight: "8g", label: "per glass", icon: "🥛" };
    if (name.includes("lentils")) return { weight: "9g", label: "per 100g", icon: "🌱" };
    if (name.includes("whey")) return { weight: "25g", label: "per scoop", icon: "🥤" };
    return { weight: "15g", label: "per serving", icon: "⚡" };
  };

  const toggleExercise = (dayName: string, exerciseName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const key = `${dayName}-${exerciseName}`;
    setCompletedExercises(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const calculateDayProgress = (day: WorkoutDay) => {
    if (!day || !day.exercises || day.exercises.length === 0) return 0;
    const completed = day.exercises.filter(ex => completedExercises[`${day.day}-${ex.name}`]).length;
    return Math.round((completed / day.exercises.length) * 100);
  };

  const toggleDayComplete = (dayName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletedDays(prev => ({
      ...prev,
      [dayName]: !prev[dayName]
    }));
  };

  const currentDay = plan.workoutPlan[selectedDayIndex] || plan.workoutPlan[0];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6" id="dashboard-container">
      {uiNotification && (
        <div className="mb-6 bg-teal-50 border border-teal-200 text-teal-800 p-3.5 rounded-xl flex items-center justify-between text-xs font-bold animate-pulse shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚡</span>
            <span>GymCoach AI: {uiNotification}</span>
          </div>
          <span className="text-[10px] text-teal-600 bg-white border border-teal-100 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Reactive UI Update</span>
        </div>
      )}
      {/* 3-Column Grid representing High Density Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* SIDEBAR LEFT (col-span-3): User Profile summary & Nutrition advice */}
        <aside className="col-span-1 lg:col-span-3 flex flex-col gap-6">
          
          {/* User Profile Summary */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              User Profile
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-slate-500 text-xs">Goal</span>
                <span className="font-bold text-xs text-slate-800">{profile.goal}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-slate-500 text-xs">Experience</span>
                <span className="font-bold text-xs text-slate-800">{profile.experience}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-slate-500 text-xs">Weight</span>
                <span className="font-bold text-xs text-slate-800">
                  {profile.weight} {profile.weightUnit}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-slate-500 text-xs">Height</span>
                <span className="font-bold text-xs text-slate-800">
                  {profile.height} {profile.heightUnit}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-slate-500 text-xs">Frequency</span>
                <span className="font-bold text-xs text-slate-800">{profile.daysPerWeek} Days / Wk</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-slate-500 text-xs">Access</span>
                <span className="font-bold text-xs text-slate-800">{profile.equipment}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-500 text-xs">Age / Gender</span>
                <span className="font-bold text-xs text-slate-800">
                  {profile.age} yrs • {profile.gender === "Prefer not to say" ? "Athlete" : profile.gender}
                </span>
              </div>
            </div>
          </div>

          {/* Nutrition Advice Panel */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1">
            <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5" />
              Nutrition Advice
            </h2>
            
            <div className="bg-indigo-50 p-4 rounded-xl mb-4 text-center border border-indigo-100">
              <p className="text-indigo-900 text-[10px] mb-1 uppercase font-extrabold tracking-wider">
                Daily Protein Goal
              </p>
              <p className="text-3xl font-black text-indigo-700">
                {plan.protein.recommendedProteinGrams}
                <span className="text-sm font-normal text-indigo-500 ml-1">g/day</span>
              </p>
              <p className="text-[9px] text-indigo-400 mt-1 font-semibold">
                Factor: {plan.protein.multiplierUsed}g × Body Weight
              </p>
            </div>

            <h3 className="text-xs font-bold text-slate-700 mb-2.5 uppercase tracking-wider">
              Top Protein Sources
            </h3>
            
            <div className="space-y-2">
              {plan.protein.suggestedFoods.slice(0, 5).map((food, idx) => {
                const stats = getFoodStats(food);
                return (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{stats.icon}</span>
                      <span className="text-xs font-semibold text-slate-700">{food}</span>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-50 shadow-sm">
                      {stats.weight} <span className="text-[9px] text-slate-400 font-normal">{stats.label}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            
            <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-medium">
              * Distribute protein evenly across 3-4 meals to maximize muscle protein synthesis and facilitate recovery.
            </p>
          </div>

        </aside>

        {/* SECTION CENTRAL (col-span-6): Workout Split Day Grid & Active exercises checklist */}
        <section className="col-span-1 lg:col-span-6 flex flex-col gap-6">
          
          {/* Personalized Workout Plan Overview */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-lg">🏋️</span> 
                  Personalized Workout Plan
                </h2>
                <span className="text-[10px] font-bold bg-slate-100 text-indigo-700 border border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider">
                  {profile.goal} Split
                </span>
              </div>

              {/* Grid of Workout Days */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {plan.workoutPlan.map((day, idx) => {
                  const isSelected = selectedDayIndex === idx;
                  const progress = calculateDayProgress(day);
                  const isComplete = completedDays[day.day] || progress === 100;
                  
                  return (
                    <button
                      key={day.day}
                      id={`day-card-${day.day.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`p-3.5 rounded-xl border text-left transition-all duration-200 relative ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                          : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isSelected ? "text-indigo-200" : "text-indigo-600"
                        }`}>
                          {day.day}
                        </span>
                        
                        {isComplete && (
                          <CheckCircle className={`w-3.5 h-3.5 ${
                            isSelected ? "text-white" : "text-emerald-500 fill-emerald-50"
                          }`} />
                        )}
                      </div>

                      <h4 className="text-xs font-extrabold line-clamp-1 leading-snug">
                        {day.focus}
                      </h4>

                      {/* Day Exercises Counter */}
                      <div className="flex items-center justify-between mt-3">
                        <span className={`text-[9px] font-semibold ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                          {day.exercises.length} Exercises
                        </span>
                        <span className={`text-[10px] font-black ${isSelected ? "text-white" : "text-teal-600"}`}>
                          {progress}%
                        </span>
                      </div>

                      {/* Progress bar line */}
                      <div className="w-full bg-slate-200/40 rounded-full h-1 mt-1.5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            isSelected ? "bg-white" : "bg-teal-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Day Exercises Detail Checklist */}
            {currentDay && (
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                      Active Target Split List ({currentDay.day})
                    </h3>
                    <p className="text-sm font-black text-slate-800 mt-0.5">
                      {currentDay.focus}
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => toggleDayComplete(currentDay.day, e)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors ${
                      completedDays[currentDay.day]
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {completedDays[currentDay.day] ? "✓ Completed" : "Mark Day Complete"}
                  </button>
                </div>

                {/* Exercises list */}
                <div className="space-y-2.5">
                  {currentDay.exercises.map((exercise, idx) => {
                    const isDone = !!completedExercises[`${currentDay.day}-${exercise.name}`];
                    return (
                      <div
                        key={idx}
                        onClick={(e) => toggleExercise(currentDay.day, exercise.name, e)}
                        className={`p-2.5 rounded-lg border flex justify-between items-center cursor-pointer transition-all ${
                          isDone 
                            ? "bg-emerald-50/40 border-emerald-100" 
                            : "bg-white hover:bg-slate-50 border-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            className={`w-5 h-5 rounded-md flex items-center justify-center border text-[10px] font-bold ${
                              isDone 
                                ? "bg-emerald-500 border-emerald-500 text-white" 
                                : "border-slate-200 bg-slate-50 text-slate-400"
                            }`}
                          >
                            {isDone ? "✓" : ""}
                          </button>
                          
                          <div>
                            <span className={`text-xs font-bold ${isDone ? "text-slate-400 line-through" : "text-slate-800"}`}>
                              {exercise.name}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isDone ? "bg-emerald-100/60 text-emerald-600" : "bg-slate-100 text-slate-500"
                        }`}>
                          {exercise.setsReps}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </section>

        {/* SIDEBAR RIGHT (col-span-3): Coach's Corner & Hydration tracker */}
        <aside className="col-span-1 lg:col-span-3 flex flex-col gap-6">
          
          {/* Coach's Corner & Live Interactive Chat */}
          <div className="bg-indigo-950 text-white rounded-2xl shadow-lg border border-indigo-900 overflow-hidden flex flex-col justify-between min-h-[380px] lg:h-[460px] relative">
            
            {/* Header Tabs */}
            <div className="bg-indigo-900/50 p-2.5 flex gap-1.5 border-b border-indigo-900/80 z-10 relative">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "chat"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-indigo-300 hover:text-indigo-100 hover:bg-indigo-900/30"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Live Coach Chat
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              </button>
              
              <button
                onClick={() => setActiveTab("advice")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "advice"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-indigo-300 hover:text-indigo-100 hover:bg-indigo-900/30"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Daily Advice
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 flex flex-col justify-between p-4 min-h-0 z-10 relative">
              
              {activeTab === "advice" ? (
                /* Advice Content */
                <div className="space-y-4 py-2">
                  <div>
                    <p className="text-[10px] uppercase font-black text-indigo-400 tracking-wider mb-1">Daily Fitness Tip</p>
                    <p className="text-xs leading-relaxed font-semibold italic text-slate-100">
                      &ldquo;{plan.dailyTip}&rdquo;
                    </p>
                  </div>
                  
                  <div className="border-t border-indigo-900 pt-4">
                    <p className="text-[10px] uppercase font-black text-indigo-400 tracking-wider mb-1">Motivation</p>
                    <p className="text-xs italic font-light leading-relaxed text-indigo-200">
                      &ldquo;{plan.motivationQuote}&rdquo;
                    </p>
                  </div>
                  
                  <div className="border-t border-indigo-900 pt-4">
                    <p className="text-[10px] uppercase font-black text-indigo-400 tracking-wider mb-1.5">Coach Interactive Capabilities</p>
                    <ul className="space-y-1.5">
                      <li className="text-[10px] text-indigo-200 flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span> Replace exercises you don't like
                      </li>
                      <li className="text-[10px] text-indigo-200 flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span> Adjust workout split length
                      </li>
                      <li className="text-[10px] text-indigo-200 flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span> Ask for detailed diet options
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* Interactive Chat Content */
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  
                  {/* Messages list */}
                  <div 
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[220px] lg:max-h-[250px] scrollbar-thin scrollbar-thumb-indigo-850 scrollbar-track-transparent"
                  >
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="flex flex-col">
                        <div className={`max-w-[85%] rounded-xl p-2.5 text-[11px] leading-relaxed shadow-xs ${
                          msg.sender === "user"
                            ? "bg-indigo-600 text-white rounded-tr-none self-end ml-4"
                            : "bg-indigo-900/60 border border-indigo-850 text-indigo-50 rounded-tl-none self-start mr-4"
                        }`}>
                          <p className="font-medium whitespace-pre-wrap">{msg.text}</p>
                          {msg.systemNotification && (
                            <div className="mt-1.5 pt-1.5 border-t border-indigo-850 text-[9px] text-teal-300 font-bold flex items-center gap-1">
                              <span>⚡</span>
                              <span>{msg.systemNotification}</span>
                            </div>
                          )}
                        </div>
                        <span className={`text-[8px] text-indigo-400 mt-1 ${
                          msg.sender === "user" ? "self-end mr-1" : "self-start ml-1"
                        }`}>
                          {msg.timestamp}
                        </span>
                      </div>
                    ))}

                    {isSending && (
                      <div className="flex items-center gap-1.5 text-[10px] text-indigo-300 italic self-start ml-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                        <span>GymCoach AI is editing your plan...</span>
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  <div className="mt-2 flex flex-wrap gap-1 border-t border-indigo-900/40 pt-2 pb-1">
                    {[
                      { label: "Replace Bench Press", text: "Replace Bench Press with standard Push-ups in my routine." },
                      { label: "High Protein Diet", text: "What high-protein food options do you suggest instead of Eggs?" },
                      { label: "Sore knees", text: "My knees are feeling sore, please adjust the lower body movements safely." },
                      { label: "Add Calf work", text: "Can you add a specialized Calf exercise to my leg training day?" }
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        disabled={isSending}
                        onClick={() => handleSendMessage(chip.text)}
                        className="text-[9px] font-bold bg-indigo-900 hover:bg-indigo-800 text-indigo-200 px-2 py-1 rounded-md transition-all truncate max-w-[120px] disabled:opacity-50"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Input form */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-1.5 items-center mt-1 border-t border-indigo-900/40 pt-2"
                  >
                    <input
                      type="text"
                      disabled={isSending}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={isListening ? "Listening... Speak now!" : "Ask Coach or tweak splits..."}
                      className="flex-1 bg-indigo-900/40 border border-indigo-850 focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-indigo-400/60"
                    />
                    {recognitionRef.current && (
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                          isListening 
                            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                            : "bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 hover:text-white"
                        }`}
                        title={isListening ? "Stop Listening" : "Speak your message"}
                      >
                        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSending || !inputText.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/40 disabled:text-indigo-500 text-white p-1.5 rounded-lg transition-colors shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                </div>
              )}

            </div>

            {/* Subtle background glow effect */}
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Hydration Reminder widget */}
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex flex-col items-center text-center">
            <div className="text-2xl mb-1">💧</div>
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Hydration Reminder
            </h3>
            <p className="text-xs text-emerald-600 mt-0.5">
              Aim for {profile.weightUnit === "kg" ? "3.5" : "4.0"} Liters today
            </p>

            <div className="w-full mt-4">
              <HydrationGlassesTracker />
            </div>
          </div>

        </aside>

      </div>

      {/* Safety warning banner */}
      <div className="mt-6 bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-amber-800">Safety Acknowledgment: </span> 
          {plan.safetyWarning} If any pain occurs during compound lifts, lower weights or swap with a machine alternative. Always warm up properly!
        </div>
      </div>

      {/* Action triggers and Reset option */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-end items-center">
        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl transition-all shadow-xs"
        >
          🖨️ Print Workout Split
        </button>
        <button
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all shadow-xs"
          id="btn-re-evaluate"
        >
          Update My Stats & Reset
        </button>
      </div>

    </div>
  );
}

// Compact water glass logger for high-density sidebar
function HydrationGlassesTracker() {
  const [logged, setLogged] = useState<number>(0);
  const target = 7;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-[10px] font-bold text-emerald-700">
        <span>Logged Water:</span>
        <span>{logged * 500} ml / 3500 ml</span>
      </div>

      <div className="flex gap-1 justify-between">
        {Array.from({ length: target }).map((_, i) => (
          <button
            key={i}
            onClick={() => setLogged(i + 1)}
            className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center ${
              i < logged
                ? "bg-emerald-500 text-white shadow-xs scale-105"
                : "bg-white border border-emerald-200 text-emerald-300 hover:bg-emerald-100/50"
            }`}
          >
            <Droplet className="w-3.5 h-3.5 fill-current" />
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center pt-1.5">
        <button
          onClick={() => setLogged(0)}
          className="text-[9px] font-bold text-emerald-500 hover:text-emerald-700"
        >
          Reset Water
        </button>
        <span className="text-[9px] font-medium text-emerald-600">
          {logged} / {target} glasses (500ml)
        </span>
      </div>
    </div>
  );
}
