require("dotenv").config();

const connectDB = require("./config/db");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
  try {
    await connectDB();

    const hash = await bcrypt.hash("Admin@123", 10);

    await User.findOneAndUpdate(
      { email: "admin@skillhire.com" },
      {
        username: "Administrator",
        email: "admin@skillhire.com",
        rollNo: "ADMIN001",
        collegeName: "SkillHire",
        phoneNumber: "9999999998",
        passedYear: 2026,
        batchNo: "ADM-01",
        branch: "Admin",
        password: hash,
        role: "admin"
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log("Admin Created");
    return true;
  } catch (error) {
    console.error("Failed to seed admin:", error.message || error);
    throw error;
  }
}

if (require.main === module) {
  createAdmin()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = createAdmin;
