const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema(
{
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        unique:true,
        sparse:true
    },

    aptitudeScore:{
        type:Number,
        default:0
    },

    reasoningScore:{
        type:Number,
        default:0
    },

    totalScore:{
        type:Number,
        default:0
    },

    percentage:{
        type:Number,
        default:0
    },

    aptitudeAnswers:[
        {
            questionId:String,
            selectedAnswer:String
        }
    ],

    reasoningAnswers:[
        {
            questionId:String,
            selectedAnswer:String
        }
    ]

},
{
    timestamps:true
});

ResultSchema.index({ createdAt: -1 });

module.exports =
mongoose.model(
"Result",
ResultSchema
);