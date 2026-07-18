const mongoose = require("mongoose");

const HOLD_DURATION_MINUTES =
  Number(process.env.BOOKING_HOLD_MINUTES || 10);


const bookingHoldSchema =
new mongoose.Schema(

{
 customer:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Customer",
  required:true,
  index:true,
 },


 staffId:{
  type:String,
  required:true,
  trim:true,
  index:true,
 },


 selectedDate:{
  type:String,
  required:true,
  trim:true,
  index:true,
 },


 selectedTime:{
  type:String,
  required:true,
  trim:true,
 },


 estimatedDuration:{
  type:Number,
  required:true,
  min:1,
 },


 slotKeys:{
  type:[String],
  required:true,
  validate:{
   validator:(value)=>
    Array.isArray(value)&&value.length>0,

   message:
   "At least one slot key is required",
  },
 },


 expiresAt:{
  type:Date,
  required:true,

  default:()=>(
   new Date(
    Date.now()+
    HOLD_DURATION_MINUTES*60*1000
   )
  ),
 },


},

{
 timestamps:true
}

);


/*
 Prevent double booking of temporary slots
*/
bookingHoldSchema.index(
{
 slotKeys:1
},
{
 unique:true
}
);


/*
 Automatically remove expired holds
*/
bookingHoldSchema.index(
{
 expiresAt:1
},
{
 expireAfterSeconds:0
}
);



bookingHoldSchema.index(
{
 customer:1,
 expiresAt:1
}
);



bookingHoldSchema.index(
{
 staffId:1,
 selectedDate:1,
 expiresAt:1
}
);



module.exports =
mongoose.model(
"BookingHold",
bookingHoldSchema
);