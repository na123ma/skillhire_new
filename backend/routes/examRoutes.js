const express =
require("express");

const router =
express.Router();

const auth =
require(
"../middleware/authMiddleware"
);

const {
startExam,
submitExam
}
=
require(
"../controllers/examController"
);

router.get(
"/start",
auth,
startExam
);

router.post(
"/submit",
auth,
submitExam
);

module.exports =
router;