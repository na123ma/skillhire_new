const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
{
  username: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  rollNo: {
    type: String,
    required: true,
    unique: true
  },

  collegeName: {
    type: String,
    required: true
  },

  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },

  passedYear: {
    type: Number,
    required: true
  },

  batchNo: {
    type: String,
    required: true
  },

  branch: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    default: "user"
  },

  testCompleted: {
    type: Boolean,
    default: false
  }

},
{
  timestamps: true
});

module.exports =
mongoose.model("User", UserSchema);