export interface UserProfile {
  age: string;
  gender: string;
  height: string;
  heightUnit: "cm" | "ft";
  weight: string;
  weightUnit: "kg" | "lbs";
  goal: string;
  experience: string;
  daysPerWeek: number;
  equipment: string;
  injuries: string;
}

export interface Exercise {
  name: string;
  setsReps: string;
}

export interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
}

export interface ProteinInfo {
  recommendedProteinGrams: number;
  multiplierUsed: number;
  suggestedFoods: string[];
}

export interface WorkoutPlanResponse {
  workoutPlan: WorkoutDay[];
  protein: ProteinInfo;
  safetyWarning: string;
  dailyTip: string;
  motivationQuote: string;
  generatedAt: string; // ISO string
}
