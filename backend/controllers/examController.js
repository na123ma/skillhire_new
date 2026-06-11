const Question = require("../models/Question");
const Result = require("../models/Result");
const User = require("../models/User");
const generateQuestions = require("../services/geminiService");

const QUESTIONS_PER_CATEGORY = 15;

// ── Generate and parse questions from Gemini ─────────────────────────────────

const fetchFreshQuestions = async (category, existingQuestions = []) => {
  const raw = await generateQuestions(category, QUESTIONS_PER_CATEGORY, existingQuestions);
  const cleaned = String(raw).replace(/```json|```/gi, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Gemini returned empty response for ${category}`);
  }

  const seen = new Set();
  const questions = parsed
    .filter(
      (item) =>
        item?.question &&
        Array.isArray(item.options) &&
        item.options.length === 4 &&
        item.answer &&
        item.options.includes(item.answer)
    )
    .map((item) => ({
      category,
      question: String(item.question || "").trim(),
      options: item.options.map((o) => String(o || "").trim()).filter(Boolean),
      answer: String(item.answer || "").trim(),
    }))
    .filter((item) => {
      const key = item.question.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (questions.length < QUESTIONS_PER_CATEGORY) {
    throw new Error(
      `Gemini returned only ${questions.length}/${QUESTIONS_PER_CATEGORY} valid questions for ${category}`
    );
  }

  return questions.slice(0, QUESTIONS_PER_CATEGORY);
};

// ── Controllers ──────────────────────────────────────────────────────────────

exports.startExam = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.testCompleted) {
      return res.status(400).json({ message: "You have already attended the exam" });
    }

    // Get questions already used in any previous results to feed as exclusions
    const previousResults = await Result.find({}).select("aptitudeAnswers reasoningAnswers").lean();

    const usedAptitudeIds = previousResults.flatMap((r) =>
      (r.aptitudeAnswers || []).map((a) => a.questionId?.toString())
    ).filter(Boolean);

    const usedReasoningIds = previousResults.flatMap((r) =>
      (r.reasoningAnswers || []).map((a) => a.questionId?.toString())
    ).filter(Boolean);

    const [prevAptitude, prevReasoning] = await Promise.all([
      Question.find({ _id: { $in: usedAptitudeIds } }).select("question").lean(),
      Question.find({ _id: { $in: usedReasoningIds } }).select("question").lean(),
    ]);

    const usedAptitudeTexts = prevAptitude.map((q) => q.question);
    const usedReasoningTexts = prevReasoning.map((q) => q.question);

    // Generate brand new questions for this user directly from Gemini
    const [aptitudeRaw, reasoningRaw] = await Promise.all([
      fetchFreshQuestions("aptitude", usedAptitudeTexts),
      fetchFreshQuestions("reasoning", usedReasoningTexts),
    ]);

    // Save to DB so we can score them on submit
    const [aptitudeSaved, reasoningSaved] = await Promise.all([
      Question.insertMany(aptitudeRaw, { ordered: false }),
      Question.insertMany(reasoningRaw, { ordered: false }),
    ]);

    res.json({
      aptitude: aptitudeSaved,
      reasoning: reasoningSaved,
    });
  } catch (error) {
    console.error("startExam error:", error);
    res.status(500).json({
      message: "Failed to generate exam questions. Please try again.",
      error: error.message,
    });
  }
};

exports.submitExam = async (req, res) => {
  try {
    const existingResult = await Result.findOne({ userId: req.user.id });
    if (existingResult) {
      return res.status(400).json({ message: "You have already submitted the exam." });
    }

    const { aptitudeAnswers, reasoningAnswers } = req.body;

    const aptitudeIds = aptitudeAnswers.map((a) => a.questionId);
    const reasoningIds = reasoningAnswers.map((a) => a.questionId);

    const [aptitudeQuestions, reasoningQuestions] = await Promise.all([
      Question.find({ _id: { $in: aptitudeIds } }).lean(),
      Question.find({ _id: { $in: reasoningIds } }).lean(),
    ]);

    const aptitudeMap = Object.fromEntries(
      aptitudeQuestions.map((q) => [q._id.toString(), q])
    );
    const reasoningMap = Object.fromEntries(
      reasoningQuestions.map((q) => [q._id.toString(), q])
    );

    const aptitudeScore = aptitudeAnswers.reduce((score, item) => {
      const q = aptitudeMap[item.questionId];
      return score + (q && q.answer === item.selectedAnswer ? 1 : 0);
    }, 0);

    const reasoningScore = reasoningAnswers.reduce((score, item) => {
      const q = reasoningMap[item.questionId];
      return score + (q && q.answer === item.selectedAnswer ? 1 : 0);
    }, 0);

    const totalScore = aptitudeScore + reasoningScore;
    const percentage = (totalScore / 30) * 100;

    await Result.create({
      userId: req.user.id,
      aptitudeScore,
      reasoningScore,
      totalScore,
      percentage,
      aptitudeAnswers,
      reasoningAnswers,
    });

    await User.findByIdAndUpdate(req.user.id, { testCompleted: true });

    res.json({
      message: "Exam Submitted Successfully",
      totalScore,
      percentage,
    });
  } catch (error) {
    console.error("submitExam error:", error);
    res.status(500).json({
      message: "Failed to submit exam",
      error: error.message,
    });
  }
};