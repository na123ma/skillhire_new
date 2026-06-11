const mongoose =
require("mongoose");

const QuestionSchema =
new mongoose.Schema({

    category:{
        type:String,
        enum:[
            "aptitude",
            "reasoning"
        ]
    },

    question:String,

    options:[String],

    answer:String

},
{
    timestamps:true
});

module.exports =
mongoose.model(
"Question",
QuestionSchema
);