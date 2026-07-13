const fs = require("fs");
const path = require("path");
const supabase = require("../config/supabase");
const { asyncHandler } = require("../middleware/errorHandler");

// Load the knowledge base JSON once at startup as an in-memory fallback/cache.
// (Primary source of truth is the `chatbot_qa` Supabase table once seeded.)
let knowledgeBase = [];
try {
  const raw = fs.readFileSync(path.join(__dirname, "../../datasets/chatbot_qa.json"), "utf-8");
  knowledgeBase = JSON.parse(raw);
} catch (e) {
  console.warn("[chatbot] Could not load local chatbot_qa.json cache:", e.message);
}

const STOPWORDS = new Set(["what","is","are","the","a","an","how","do","i","should","for","to","of","in","on","my","can","you","please","tell","me","about","need","help","understanding","guidance"]);

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w && !STOPWORDS.has(w));
}

/** Very lightweight TF-style keyword overlap scorer — no external NLP deps required */
function scoreMatch(queryTokens, entry) {
  const entryTokens = new Set(tokenize(entry.question + " " + entry.category));
  let score = 0;
  queryTokens.forEach((t) => {
    if (entryTokens.has(t)) score += 1;
  });
  return score;
}

function findBestAnswer(message) {
  const queryTokens = tokenize(message);
  if (queryTokens.length === 0) return null;

  let best = null;
  let bestScore = 0;
  for (const entry of knowledgeBase) {
    const score = scoreMatch(queryTokens, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore > 0 ? best : null;
}

// GET /api/chatbot/categories
const categories = asyncHandler(async (req, res) => {
  const unique = [...new Set(knowledgeBase.map((e) => e.category))];
  res.json({ success: true, categories: unique });
});

// GET /api/chatbot/suggestions?category=Heart Attack
const suggestions = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const pool = category ? knowledgeBase.filter((e) => e.category === category) : knowledgeBase;
  const sample = pool.sort(() => 0.5 - Math.random()).slice(0, 6).map((e) => ({ id: e.id, question: e.question }));
  res.json({ success: true, suggestions: sample });
});

// POST /api/chatbot/message  { message }
const sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: "Message text is required." });
  }

  const match = findBestAnswer(message);

  const response = match
    ? {
        answer: match.answer,
        category: match.category,
        isEmergency: match.isEmergency,
        matchedQuestion: match.question
      }
    : {
        answer:
          "I don't have a confident answer for that yet. For anything urgent, please use the SOS button immediately or call your local emergency number. You can also try rephrasing your question.",
        category: "Unmatched",
        isEmergency: false,
        matchedQuestion: null
      };

  // Persist to chat history if the user is authenticated
  if (req.user?.id) {
    await supabase.from("chat_history").insert([
      { user_id: req.user.id, message, sender: "user" },
      { user_id: req.user.id, message: response.answer, sender: "bot" }
    ]);
  }

  res.json({ success: true, ...response });
});

// GET /api/chatbot/history — requires auth
const history = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("chat_history")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  res.json({ success: true, data });
});

module.exports = { categories, suggestions, sendMessage, history };
