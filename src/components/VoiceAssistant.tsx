import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  RefreshCw, 
  Sparkles,
  Play,
  Square
} from "lucide-react";
import { UserProfile } from "../types";

interface VoiceAssistantProps {
  currentStep: number;
  profile: UserProfile;
  onChangeValue: (field: keyof UserProfile, value: any) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  generatePlan?: () => void;
}

export default function VoiceAssistant({
  currentStep,
  profile,
  onChangeValue,
  onNextStep,
  onPrevStep,
  generatePlan
}: VoiceAssistantProps) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedVal, setParsedVal] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Ready to assist. Toggle me on to start hands-free coaching!");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Web APIs
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onstart = () => {
          setIsListening(true);
          setStatusMessage("Listening carefully to your answer...");
          setErrorMsg(null);
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === "not-allowed") {
            setErrorMsg("Microphone permission denied. Please enable mic access in your browser settings.");
            setStatusMessage("Permission error. Check microphone settings.");
          } else if (event.error === "no-speech") {
            setStatusMessage("I didn't hear anything. Try clicking 'Listen' again.");
          } else {
            setErrorMsg(`Recognition error: ${event.error}`);
            setStatusMessage("An error occurred during voice capturing.");
          }
        };

        rec.onend = () => {
          setIsListening(false);
        };

        rec.onresult = (event: any) => {
          const resultText = event.results[0][0].transcript;
          setTranscript(resultText);
          handleVoiceInput(resultText);
        };

        recognitionRef.current = rec;
      } else {
        setErrorMsg("Your browser does not support Speech Recognition. Try Google Chrome or Safari.");
      }
    }

    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  // Trigger speech and auto-listen on step changes when Voice Assistant is active
  useEffect(() => {
    if (isActive) {
      speakQuestion();
    }
  }, [currentStep, isActive]);

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  };

  // Convert steps to active question text
  const getQuestionText = (stepNum: number) => {
    switch (stepNum) {
      case 1:
        return "First, let's start with the basics. What is your age?";
      case 2:
        return "What is your gender? Male, Female, Non-binary, or prefer not to say?";
      case 3:
        return "What is your height? You can state it in centimeters, or in feet and inches.";
      case 4:
        return "What is your weight? Please say your weight and unit, like seventy-five kilograms or one-hundred sixty pounds.";
      case 5:
        return "What is your primary fitness goal? Muscle gain, weight loss, strength, or general fitness?";
      case 6:
        return "What is your experience level? Beginner, Intermediate, or Advanced?";
      case 7:
        return "How many days per week can you work out? Please select between two and six days.";
      case 8:
        return "Do you have access to a Gym, Home equipment like dumbbells, or Bodyweight only?";
      case 9:
        return "Do you have any injuries or health limitations? Speak them aloud or say none.";
      default:
        return "";
    }
  };

  const speakQuestion = () => {
    if (!synthRef.current || isMuted) {
      // If muted, just skip straight to listening
      startListeningDelayed();
      return;
    }

    stopSpeaking();
    stopListening();

    const text = getQuestionText(currentStep);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatusMessage("Speaking: " + text);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      startListeningDelayed();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      startListeningDelayed();
    };

    activeUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const startListeningDelayed = () => {
    // Add a tiny delay so it doesn't catch its own speech echo
    setTimeout(() => {
      startListening();
    }, 450);
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    stopSpeaking();
    stopListening();
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error(e);
    }
  };

  const speakFeedback = (text: string, callback?: () => void) => {
    if (!synthRef.current || isMuted) {
      if (callback) callback();
      return;
    }
    stopSpeaking();
    stopListening();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (callback) callback();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (callback) callback();
    };
    synthRef.current.speak(utterance);
  };

  // Parsing engine
  const handleVoiceInput = (text: string) => {
    const norm = text.toLowerCase().trim();
    let parsed: any = null;
    let fieldKey: keyof UserProfile | null = null;
    let spokenVal = "";

    switch (currentStep) {
      case 1: // Age
        fieldKey = "age";
        const ageMatch = norm.match(/\d+/);
        if (ageMatch) {
          parsed = ageMatch[0];
          spokenVal = `${parsed} years`;
        } else {
          // simple word check
          const words: Record<string, string> = {
            "eighteen": "18", "nineteen": "19", "twenty": "20", "thirty": "30", "forty": "40"
          };
          for (const key of Object.keys(words)) {
            if (norm.includes(key)) {
              parsed = words[key];
              spokenVal = `${parsed} years`;
              break;
            }
          }
        }
        break;

      case 2: // Gender
        fieldKey = "gender";
        if (norm.includes("non-binary") || norm.includes("non binary")) {
          parsed = "Non-binary";
        } else if (norm.includes("female") || norm.includes("woman") || norm.includes("girl")) {
          parsed = "Female";
        } else if (norm.includes("male") || norm.includes("man") || norm.includes("boy")) {
          parsed = "Male";
        } else if (norm.includes("prefer not") || norm.includes("say") || norm.includes("private") || norm.includes("athlete")) {
          parsed = "Prefer not to say";
        }
        spokenVal = parsed || "";
        break;

      case 3: // Height
        fieldKey = "height";
        const cmMatch = norm.match(/(\d+)\s*(cm|centimeter|centimetres)/);
        if (cmMatch) {
          parsed = cmMatch[1];
          onChangeValue("heightUnit", "cm");
          spokenVal = `${parsed} centimeters`;
        } else {
          const ftMatch = norm.match(/(\d+)\s*(foot|feet|ft|f)\s*(\d+)?\s*(inches|inch|in|i)?/);
          if (ftMatch) {
            const feet = ftMatch[1];
            const inches = ftMatch[3] || "0";
            parsed = `${feet}'${inches}`;
            onChangeValue("heightUnit", "ft");
            spokenVal = `${feet} foot ${inches} inches`;
          } else {
            // Check raw digits
            const digits = norm.match(/\d+/g);
            if (digits) {
              if (digits.length === 1) {
                const val = parseInt(digits[0]);
                if (val > 100) {
                  parsed = digits[0];
                  onChangeValue("heightUnit", "cm");
                  spokenVal = `${parsed} centimeters`;
                } else {
                  parsed = `${val}'0`;
                  onChangeValue("heightUnit", "ft");
                  spokenVal = `${val} feet`;
                }
              } else if (digits.length === 2) {
                parsed = `${digits[0]}'${digits[1]}`;
                onChangeValue("heightUnit", "ft");
                spokenVal = `${digits[0]} feet ${digits[1]} inches`;
              }
            }
          }
        }
        break;

      case 4: // Weight
        fieldKey = "weight";
        const kgMatch = norm.match(/(\d+)\s*(kg|kilo|kilogram|kilograms)/);
        if (kgMatch) {
          parsed = kgMatch[1];
          onChangeValue("weightUnit", "kg");
          spokenVal = `${parsed} kilograms`;
        } else {
          const lbsMatch = norm.match(/(\d+)\s*(lb|pound|lbs|pounds)/);
          if (lbsMatch) {
            parsed = lbsMatch[1];
            onChangeValue("weightUnit", "lbs");
            spokenVal = `${parsed} pounds`;
          } else {
            const digits = norm.match(/\d+/);
            if (digits) {
              parsed = digits[0];
              spokenVal = `${parsed} ${profile.weightUnit}`;
            }
          }
        }
        break;

      case 5: // Goal
        fieldKey = "goal";
        if (norm.includes("muscle") || norm.includes("gain") || norm.includes("hypertrophy") || norm.includes("build") || norm.includes("bulk")) {
          parsed = "Muscle Gain";
        } else if (norm.includes("loss") || norm.includes("lose") || norm.includes("fat") || norm.includes("weight") || norm.includes("slim") || norm.includes("cut")) {
          parsed = "Weight Loss";
        } else if (norm.includes("strength") || norm.includes("heavy") || norm.includes("power") || norm.includes("strong")) {
          parsed = "Strength";
        } else if (norm.includes("general") || norm.includes("fit") || norm.includes("health") || norm.includes("tone") || norm.includes("steady")) {
          parsed = "General Fitness";
        }
        spokenVal = parsed || "";
        break;

      case 6: // Experience
        fieldKey = "experience";
        if (norm.includes("begin") || norm.includes("new") || norm.includes("novice") || norm.includes("fresh")) {
          parsed = "Beginner";
        } else if (norm.includes("inter") || norm.includes("medium") || norm.includes("some") || norm.includes("moderate")) {
          parsed = "Intermediate";
        } else if (norm.includes("adv") || norm.includes("pro") || norm.includes("expert") || norm.includes("years")) {
          parsed = "Advanced";
        }
        spokenVal = parsed || "";
        break;

      case 7: // Days per week
        fieldKey = "daysPerWeek";
        const dayWords: Record<string, number> = {
          "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
          "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7
        };
        for (const word of Object.keys(dayWords)) {
          if (norm.includes(word)) {
            parsed = dayWords[word];
            spokenVal = `${parsed} days`;
            break;
          }
        }
        break;

      case 8: // Equipment
        fieldKey = "equipment";
        if (norm.includes("gym") || norm.includes("club") || norm.includes("facility")) {
          parsed = "Gym";
        } else if (norm.includes("home") || norm.includes("dumb") || norm.includes("band") || norm.includes("bell")) {
          parsed = "Home Equipment";
        } else if (norm.includes("body") || norm.includes("calis") || norm.includes("pure") || norm.includes("none")) {
          parsed = "Bodyweight Only";
        }
        spokenVal = parsed || "";
        break;

      case 9: // Injuries
        fieldKey = "injuries";
        if (norm.includes("none") || norm.includes("no injury") || norm.includes("nothing") || norm.trim() === "no") {
          parsed = "None";
        } else {
          parsed = text; // accept full transcribed text for injuries
        }
        spokenVal = parsed;
        break;
    }

    if (parsed !== null && fieldKey) {
      setParsedVal(String(parsed));
      onChangeValue(fieldKey, parsed);
      
      const successFeedback = `Got it! Setting your ${fieldKey} to ${spokenVal}.`;
      setStatusMessage(successFeedback);

      if (autoAdvance) {
        speakFeedback(successFeedback, () => {
          setTimeout(() => {
            if (currentStep < 9) {
              onNextStep();
            } else if (currentStep === 9 && generatePlan) {
              speakFeedback("Brilliant! All information gathered. Generating your personalized workout program now!", () => {
                generatePlan();
              });
            }
          }, 800);
        });
      }
    } else {
      setParsedVal(null);
      const failFeedback = `I heard "${text}", but couldn't match it. Could you please state that again clearly?`;
      setStatusMessage(failFeedback);
      speakFeedback(failFeedback, () => {
        startListeningDelayed();
      });
    }
  };

  const handleToggleActive = () => {
    if (!isActive) {
      setIsActive(true);
      setErrorMsg(null);
      setStatusMessage("Voice Coach active! Listen for the first question...");
    } else {
      setIsActive(false);
      stopSpeaking();
      stopListening();
      setStatusMessage("Voice Coach deactivated. Manual input is ready.");
    }
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4" id="voice-assistant-panel">
      <div className="flex items-center gap-3.5">
        <button
          onClick={handleToggleActive}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isActive 
              ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
          title={isActive ? "Disable Voice Guidance" : "Enable Voice Guidance"}
        >
          {isActive ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              GymCoach Voice Assistant
            </span>
            <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500 animate-ping" : "bg-slate-300"}`} />
          </div>
          
          <p className="text-xs text-indigo-900 font-semibold leading-relaxed">
            {statusMessage}
          </p>

          {transcript && (
            <div className="text-[10px] bg-indigo-100/50 text-indigo-950 px-2.5 py-1 rounded-md font-medium border border-indigo-100/80 inline-block">
              Heard: &ldquo;<span className="italic">{transcript}</span>&rdquo;
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end border-t md:border-t-0 border-indigo-100/60 pt-2 md:pt-0">
        {isActive && (
          <>
            <button
              onClick={speakQuestion}
              disabled={isSpeaking || isListening}
              className="px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[10px] font-bold transition-all flex items-center gap-1"
            >
              <Volume2 className="w-3 h-3" />
              Repeat
            </button>
            <button
              onClick={startListening}
              disabled={isListening}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold transition-all flex items-center gap-1"
            >
              <Mic className="w-3 h-3" />
              Listen
            </button>
          </>
        )}

        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2 rounded-lg transition-colors ${isMuted ? "bg-slate-200 text-slate-500" : "bg-indigo-100 text-indigo-700"}`}
          title={isMuted ? "Unmute Coach Voice" : "Mute Coach Voice"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <label className="flex items-center gap-1.5 cursor-pointer ml-1 select-none">
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={() => setAutoAdvance(!autoAdvance)}
            className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
          />
          <span className="text-[10px] font-bold text-indigo-800">Auto-Next</span>
        </label>
      </div>
      
      {errorMsg && (
        <div className="w-full text-[10px] text-red-600 font-bold bg-red-50 border border-red-100 p-2 rounded-xl mt-2 flex items-center gap-1.5 md:col-span-3">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
