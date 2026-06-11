const express = require("express");

const router = express.Router();

const auth =
  require("../middleware/authMiddleware");

const admin =
  require("../middleware/adminMiddleware");

const {
  dashboard,
  getUsers,
  getResults,
  getViolations,
  exportResultDetails
} = require("../controllers/adminController");

router.get(
  "/dashboard",
  auth,
  admin,
  dashboard
);

router.get(
  "/users",
  auth,
  admin,
  getUsers
);

router.get(
  "/results",
  auth,
  admin,
  getResults
);

router.get(
  "/violations",
  auth,
  admin,
  getViolations
);

router.get(
  "/results/export/:userId",
  auth,
  admin,
  exportResultDetails
);

module.exports = router;