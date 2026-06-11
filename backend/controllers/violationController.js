const Violation =
require("../models/Violation");

exports.createViolation =
async(req,res)=>{

try{

const {
type,
description,
screenshot
}
=
req.body;

await Violation.create({

userId:req.user.id,

type,

description,

screenshot

});

res.json({
message:
"Violation Saved"
});

}
catch(error){

res.status(500)
.json(error);

}

};