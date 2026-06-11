const mongoose = require("mongoose");

const ViolationSchema = new mongoose.Schema(
{
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },

    type:{
        type:String
    },

    description:{
        type:String
    },

    screenshot:{
        type:String,
        default:""
    }

},
{
    timestamps:true
});

ViolationSchema.index({ createdAt: -1 });

module.exports =
mongoose.model(
"Violation",
ViolationSchema
);