// routes/chatbot.js
// Rule-based medical/emergency chatbot. Matches user messages against a categorized
// FAQ knowledge base using keyword overlap scoring. No external AI API required to run,
// but designed so you can swap in a real LLM call (e.g. the Anthropic API) — see comment below.

const express = require('express');
const { readJSON } = require('../lib/store');

const router = express.Router();

const EMERGENCY_HINT_WORDS = ['emergency', 'urgent', 'severe', 'dying', 'help me', 'critical'];

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

function scoreMatch(userText, faq) {
  const text = normalize(userText);
  let score = 0;
  faq.keywords.forEach((kw) => {
    if (text.includes(kw.toLowerCase())) score += kw.split(' ').length; // multi-word keyword = stronger match
  });
  return score;
}

function findBestMatches(message, limit = 1) {
  const faqs = readJSON('faqs', []);
  const scored = faqs
    .map((faq) => ({ faq, score: scoreMatch(message, faq) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.faq);
}

// POST /api/chatbot/query  { message: string }
router.post('/query', (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const matches = findBestMatches(message, 1);
  const isUrgentSounding = EMERGENCY_HINT_WORDS.some((w) => normalize(message).includes(w));

  if (matches.length > 0) {
    const faq = matches[0];
    return res.json({
      reply: faq.answer,
      category: faq.category,
      matchedQuestion: faq.question,
      suggestSOS: isUrgentSounding,
    });
  }

  // Fallback when nothing matches
  return res.json({
    reply:
      "I don't have specific guidance for that yet. If this is a medical emergency, please use the SOS button immediately or call 108 (ambulance) / 112 (emergency). You can also try rephrasing your symptom or question.",
    category: null,
    matchedQuestion: null,
    suggestSOS: isUrgentSounding,
  });

  // --- To upgrade this into a full generative AI chatbot ---
  // Replace the fallback above with a call to the Anthropic API (or another LLM provider):
  //
  // const response = await fetch('https://api.anthropic.com/v1/messages', {
  //   method: 'POST',
  //   headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
  //   body: JSON.stringify({
  //     model: 'claude-sonnet-4-6',
  //     max_tokens: 400,
  //     system: 'You are a calm, careful first-aid and emergency triage assistant. Always tell users to call local emergency services for anything severe.',
  //     messages: [{ role: 'user', content: message }],
  //   }),
  // });
  // Requires an ANTHROPIC_API_KEY environment variable — ask me to wire this up if you want it.
});

// GET /api/chatbot/faqs — used to render quick-reply chips in the chat UI
router.get('/faqs', (req, res) => {
  const faqs = readJSON('faqs', []);
  res.json(faqs.map((f) => ({ category: f.category, question: f.question })));
});

module.exports = router;
