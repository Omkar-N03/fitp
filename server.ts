import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK server-side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// REST API endpoint to generate workout and nutrition plans
app.post("/api/coach/generate", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "GymCoach AI is temporarily offline. Please ensure your GEMINI_API_KEY is configured in Settings > Secrets.",
      });
    }

    const {
      age,
      gender,
      height,
      weight,
      goal,
      experience,
      daysPerWeek,
      equipment,
      injuries,
    } = req.body;

    // Server-side calculation of protein as a backup/reference
    // Goal mapping: Muscle Gain (2.0), Weight Loss (1.6), Strength (1.8), General Fitness (1.5)
    let multiplier = 1.5;
    const gLower = goal ? goal.toLowerCase() : "";
    if (gLower.includes("loss") || gLower.includes("weight")) {
      multiplier = 1.6;
    } else if (gLower.includes("gain") || gLower.includes("muscle")) {
      multiplier = 2.0;
    } else if (gLower.includes("strength")) {
      multiplier = 1.8;
    } else {
      multiplier = 1.5;
    }

    const numericWeight = parseFloat(weight) || 70;
    const computedProtein = Math.round(numericWeight * multiplier);

    const prompt = `
You are GymCoach AI, a friendly, knowledgeable, and professional virtual fitness coach.
Your job is to generate a highly personalized, simple, and safe workout and nutrition plan.

User Profile:
- Age: ${age}
- Gender: ${gender}
- Height: ${height}
- Weight: ${weight} kg
- Fitness Goal: ${goal}
- Experience Level: ${experience}
- Workout Frequency: ${daysPerWeek} days per week
- Access / Equipment: ${equipment}
- Injuries or Health Limitations: ${injuries || "None"}

Rules:
1. Provide a workout plan matching exactly ${daysPerWeek} days of workout. Be realistic, safe, and progressive.
2. If injuries or health limitations are reported (${injuries}), acknowledge them gracefully and provide specific safety advice/modifications. ALWAYS advise them to consult a healthcare professional.
3. Keep the splits logical (e.g. Full Body for 3 days or Push/Pull/Legs for 3-6 days, or Upper/Lower, adjusted to their frequency and equipment).
4. Do NOT recommend steroids or unsafe practices.
5. Provide a daily fitness tip emphasizing form, hydration, sleep, or progressive overload.
6. Provide a single motivational quote.
7. Return the response strictly adhering to the JSON schema specified.

Output Schema Requirements:
{
  "workoutPlan": [
    {
      "day": "Day 1",
      "focus": "Chest & Triceps (example)",
      "exercises": [
        { "name": "Bench Press", "setsReps": "3 × 10" },
        { "name": "Incline Dumbbell Press", "setsReps": "3 × 12" }
      ]
    }
  ],
  "protein": {
    "recommendedProteinGrams": ${computedProtein},
    "multiplierUsed": ${multiplier},
    "suggestedFoods": ["Chicken", "Eggs", "Paneer", "Fish", "Soy", "Milk", "Greek Yogurt", "Lentils", "Whey Protein"]
  },
  "safetyWarning": "If injuries exist, safety warning here. Otherwise, general advice about safety and warming up.",
  "dailyTip": "One useful fitness tip here.",
  "motivationQuote": "One motivational quote here."
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["workoutPlan", "protein", "safetyWarning", "dailyTip", "motivationQuote"],
          properties: {
            workoutPlan: {
              type: Type.ARRAY,
              description: `A list of days representing the workout plan. Generate exactly ${daysPerWeek} day entries.`,
              items: {
                type: Type.OBJECT,
                required: ["day", "focus", "exercises"],
                properties: {
                  day: { type: Type.STRING, description: "e.g., 'Day 1' or 'Day 1 – Chest & Triceps'" },
                  focus: { type: Type.STRING, description: "Focus/Target muscles of the day" },
                  exercises: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["name", "setsReps"],
                      properties: {
                        name: { type: Type.STRING, description: "Exercise name" },
                        setsReps: { type: Type.STRING, description: "Sets & reps, e.g. 3 × 10" },
                      },
                    },
                  },
                },
              },
            },
            protein: {
              type: Type.OBJECT,
              required: ["recommendedProteinGrams", "multiplierUsed", "suggestedFoods"],
              properties: {
                recommendedProteinGrams: { type: Type.INTEGER, description: "Protein in grams per day" },
                multiplierUsed: { type: Type.NUMBER },
                suggestedFoods: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            },
            safetyWarning: { type: Type.STRING, description: "A friendly safety warning or consulting advice, especially if they have injuries." },
            dailyTip: { type: Type.STRING, description: "One valuable fitness tip." },
            motivationQuote: { type: Type.STRING, description: "One motivating quote." },
          },
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Gemini API generation error:", error);
    res.status(500).json({
      error: "Failed to generate your personalized plan. " + (error?.message || "Please check your network or server setup."),
    });
  }
});

// REST API endpoint for conversational interaction and dynamic plan updates
app.post("/api/coach/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "GymCoach AI is temporarily offline. Please ensure your GEMINI_API_KEY is configured.",
      });
    }

    const {
      message,
      profile,
      plan,
      chatHistory,
    } = req.body;

    const prompt = `
You are GymCoach AI, an elite, highly interactive, and supportive virtual fitness coach.
The user is viewing their personalized plan and has sent you an interactive message/request.

Your objectives:
1. Provide a knowledgeable, friendly, and motivating response to their message.
2. If the user requests modifications (e.g., "replace Bench Press with pushups", "I want to switch from weight loss to muscle gain", "add an exercise for calves on legs day", "I have dumbbells only now", "can we make it a 3-day split?"), you must update the workout plan, nutrition, or profile variables accordingly in the JSON response.
3. Keep your direct reply concise, clear, and action-oriented. Use bullet points where appropriate.
4. If they report a new injury, express concern, advise them to consult a medical professional, and modify their workout plan immediately to avoid using the injured area.
5. If they ask a general question (e.g., "what is progressive overload?", "how much sleep do I need?"), answer it beautifully, and keep the existing plan intact.

Current User Profile:
${JSON.stringify(profile, null, 2)}

Current Active Plan:
${JSON.stringify(plan, null, 2)}

Interactive Chat History:
${JSON.stringify(chatHistory || [], null, 2)}

New User Message:
"${message}"

Return a strict JSON response matching the schema below.
If you do not modify the workout plan, protein, or profile, keep the returned arrays/objects EXACTLY matching the current ones. Do NOT leave them empty unless the user requested to clear them. Always return the full current workoutPlan if no changes are requested.

Output Schema:
{
  "reply": "Your friendly, supportive, and motivating response explaining what you did or answering their question.",
  "updatedWorkoutPlan": [
    // Represent the full current workout plan, modifying only the parts requested by the user. Must match the structure with days, focus, and exercises.
  ],
  "updatedProtein": {
    "recommendedProteinGrams": number,
    "multiplierUsed": number,
    "suggestedFoods": ["string"]
  },
  "updatedProfile": {
    // Current profile properties, with any updates (like goals, injuries, weight) modified if requested.
  }
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["reply", "updatedWorkoutPlan", "updatedProtein", "updatedProfile"],
          properties: {
            reply: { type: Type.STRING, description: "Your friendly chat reply to the user." },
            updatedWorkoutPlan: {
              type: Type.ARRAY,
              description: "The complete workout plan, including modifications if requested.",
              items: {
                type: Type.OBJECT,
                required: ["day", "focus", "exercises"],
                properties: {
                  day: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  exercises: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["name", "setsReps"],
                      properties: {
                        name: { type: Type.STRING },
                        setsReps: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            },
            updatedProtein: {
              type: Type.OBJECT,
              required: ["recommendedProteinGrams", "multiplierUsed", "suggestedFoods"],
              properties: {
                recommendedProteinGrams: { type: Type.INTEGER },
                multiplierUsed: { type: Type.NUMBER },
                suggestedFoods: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            },
            updatedProfile: {
              type: Type.OBJECT,
              required: ["age", "gender", "height", "heightUnit", "weight", "weightUnit", "goal", "experience", "daysPerWeek", "equipment", "injuries"],
              properties: {
                age: { type: Type.STRING },
                gender: { type: Type.STRING },
                height: { type: Type.STRING },
                heightUnit: { type: Type.STRING },
                weight: { type: Type.STRING },
                weightUnit: { type: Type.STRING },
                goal: { type: Type.STRING },
                experience: { type: Type.STRING },
                daysPerWeek: { type: Type.INTEGER },
                equipment: { type: Type.STRING },
                injuries: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Coach chat error:", error);
    res.status(500).json({
      error: "Interactive coach response failed. " + (error?.message || ""),
    });
  }
});

// Serve frontend assets in production / dev middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GymCoach AI Server is running on port ${PORT}`);
  });
}

startServer();
