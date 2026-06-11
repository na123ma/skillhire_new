const mongoose = require("mongoose");
const Result = require("../models/Result");

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.error("Missing MONGO_URI environment variable. Create a .env file with MONGO_URI set.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI);
    await Result.syncIndexes();
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
};

module.exports = connectDB;