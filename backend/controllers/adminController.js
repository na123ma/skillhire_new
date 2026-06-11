const User = require("../models/User");
const Result = require("../models/Result");
const Violation = require("../models/Violation");
const Question = require("../models/Question");

exports.dashboard = async (req, res) => {
  try {
    const totalUsers =
      await User.countDocuments();

    const totalResults =
      await Result.countDocuments();

    const totalViolations =
      await Violation.countDocuments();

    res.json({
      totalUsers,
      totalResults,
      totalViolations
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.getUsers = async (req, res) => {
  const users =
    await User.find().select("-password");

  res.json(users);
};

exports.getResults = async (req, res) => {
  try {
    const results = await Result.find()
      .select("userId totalScore percentage createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("userId", "username email")
      .lean();

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to load results" });
  }
};

exports.getViolations = async (req, res) => {
  try {
    const violations = await Violation.find()
      .select("userId type description createdAt")
      .sort({ createdAt: -1 })
      .populate("userId", "username email")
      .lean();

    res.json(violations);
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to load violations" });
  }
};

exports.exportResultDetails = async (req, res) => {
  try {
    const result = await Result.findOne({ userId: req.params.userId })
      .populate("userId", "username email")
      .lean();

    if (!result) {
      return res.status(404).json({ message: "No result found for this candidate" });
    }

    const questionIds = [
      ...(result.aptitudeAnswers || []).map((item) => item.questionId),
      ...(result.reasoningAnswers || []).map((item) => item.questionId),
    ].filter(Boolean);

    const questions = await Question.find({ _id: { $in: questionIds } })
      .select("question category answer")
      .lean();

    const questionMap = Object.fromEntries(
      questions.map((question) => [String(question._id), question])
    );

    const rows = [
      ["Candidate", "Email", "Category", "Question", "Selected Answer", "Correct Answer"],
      ...[...(result.aptitudeAnswers || []).map((item) => {
        const question = questionMap[String(item.questionId)] || {};
        return [result.userId?.username || "Unknown", result.userId?.email || "—", question.category || "aptitude", question.question || "Question", item.selectedAnswer || "—", question.answer || "—"];
      }),
      ...(result.reasoningAnswers || []).map((item) => {
        const question = questionMap[String(item.questionId)] || {};
        return [result.userId?.username || "Unknown", result.userId?.email || "—", question.category || "reasoning", question.question || "Question", item.selectedAnswer || "—", question.answer || "—"];
      })],
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const safeName = String(result.userId?.username || "candidate").toLowerCase().replace(/[^a-z0-9]+/g, "-");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}-answers.csv"`);
    res.send("\uFEFF" + csv);
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to export answers" });
  }
};