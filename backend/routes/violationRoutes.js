const express =
require("express");

const router =
express.Router();

const auth =
require("../middleware/authMiddleware");

const {
createViolation
}
=
require(
"../controllers/violationController"
);

router.post(
"/create",
auth,
createViolation
);

module.exports =
router;