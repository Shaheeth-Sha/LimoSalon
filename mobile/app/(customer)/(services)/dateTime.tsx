import React, {
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";



/*
|--------------------------------------------------------------------------
| DateTime Screen
|--------------------------------------------------------------------------
|
| Purpose:
|
| 1. Customer selects booking date
| 2. Customer selects booking time
| 3. Pass selection to Staff screen
|
| Important business logic:
|
| - Past dates cannot be selected
| - Past times on today's date cannot be selected
| - Booking hold is NOT created here
| - Hold starts after staff selection
|
|--------------------------------------------------------------------------
*/



/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/


type DateItem = {

  id:number;

  fullDate:string;

  month:string;

  day:number;

  week:string;

  isToday:boolean;

};




/*
|--------------------------------------------------------------------------
| Helper functions
|--------------------------------------------------------------------------
*/


const getParamValue = (
  value:string | string[] | undefined
):string => {


  if(Array.isArray(value)){

    return value[0] ?? "";

  }


  return value ?? "";

};





/*
|--------------------------------------------------------------------------
| Create local date string
|--------------------------------------------------------------------------
|
| We avoid:
|
| new Date().toISOString()
|
| because it converts local time to UTC.
|
| Sri Lanka timezone (+05:30)
| can shift the date backwards.
|
| Example:
|
| 2026-07-17
|
| can become:
|
| 2026-07-16T18:30:00Z
|
|--------------------------------------------------------------------------
*/


const formatLocalDate = (
  date:Date
):string => {


  return (

    `${date.getFullYear()}-` +

    `${String(
      date.getMonth()+1
    ).padStart(2,"0")}-` +

    `${String(
      date.getDate()
    ).padStart(2,"0")}`

  );


};





/*
|--------------------------------------------------------------------------
| Convert selected time into minutes
|--------------------------------------------------------------------------
|
| Used to check whether today's time already passed.
|
| Example:
|
| 09.00 am = 540 minutes
|
|--------------------------------------------------------------------------
*/


const timeToMinutes = (
  time:string
):number => {


  const clean =
    time
    .replace(".",
    ":")
    .toLowerCase();


  const match =
    clean.match(
      /(\d+):(\d+)\s(am|pm)/
    );


  if(!match){

    return 0;

  }



  let hour =
    Number(match[1]);


  const minute =
    Number(match[2]);


  const period =
    match[3];



  if(
    period==="pm" &&
    hour!==12
  ){

    hour += 12;

  }



  if(
    period==="am" &&
    hour===12
  ){

    hour = 0;

  }



  return (
    hour * 60 +
    minute
  );


};





/*
|--------------------------------------------------------------------------
| Check if selected slot is already passed
|--------------------------------------------------------------------------
*/


const isPastTime = (
  date:string,
  time:string
):boolean => {


  const today =
    new Date();



  const selectedDate =
    new Date(
      `${date}T00:00:00`
    );



  const todayDate =
    formatLocalDate(today);



  /*
  | Future dates are always allowed
  */

  if(date > todayDate){

    return false;

  }



  /*
  | Previous dates are blocked
  */

  if(date < todayDate){

    return true;

  }



  /*
  | Today:
  | Compare current time
  */


  const currentMinutes =
    today.getHours()*60 +
    today.getMinutes();



  return (
    timeToMinutes(time)
    <=
    currentMinutes
  );


};





/*
|--------------------------------------------------------------------------
| Generate next 30 days
|--------------------------------------------------------------------------
*/


const generateDates = ():DateItem[] => {


  const result:DateItem[] = [];



  for(
    let i=0;
    i<30;
    i++
  ){


    const date =
      new Date();



    date.setDate(
      date.getDate()+i
    );



    result.push({

      id:i,


      fullDate:
        formatLocalDate(date),


      month:
        date
        .toLocaleString(
          "en-US",
          {
            month:"short"
          }
        )
        .toUpperCase(),


      day:
        date.getDate(),


      week:
        date
        .toLocaleString(
          "en-US",
          {
            weekday:"short"
          }
        ),


      isToday:
        i===0,

    });


  }



  return result;


};





export default function DateAndTime(){


  const router =
    useRouter();



  const {

    selectedServices,

    selectedLength,

    totalAmount,

    bookingType,

  } =
  useLocalSearchParams();




  const [selectedDate,setSelectedDate] =
    useState("");



  const [selectedTime,setSelectedTime] =
    useState("");




  const dates =
    useMemo(
      ()=>generateDates(),
      []
    );



  const booking =
    getParamValue(
      bookingType
    );



  const isHairFlow =
    booking==="hair";



  const totalSteps =
    isHairFlow ? 5 : 4;



  const currentStep =
    isHairFlow ? 3 : 2;



  const times = [

    "08.00 am",
    "09.00 am",
    "10.00 am",
    "11.00 am",
    "12.00 pm",
    "01.00 pm",
    "02.00 pm",
    "03.00 pm",

  ];

  return (

    <View style={styles.container}>


      {/* Header */}
      <View style={styles.header}>


        <TouchableOpacity
          onPress={() => router.back()}
        >

          <Ionicons
            name="chevron-back"
            size={26}
            color="#000"
          />

        </TouchableOpacity>



        <Text style={styles.headerText}>
          Date and Time
        </Text>


      </View>





      {/* Progress indicator */}

      <View style={styles.stepContainer}>


        <Text style={styles.stepText}>
          Select date and available time
        </Text>



        <View style={styles.stepRow}>


          {
            Array.from(
              {length:totalSteps},
              (_,index)=>index+1
            )
            .map((step)=>{


              const done =
                step < currentStep;



              const active =
                step === currentStep &&
                selectedDate &&
                selectedTime;



              return (

                <View
                  key={step}
                  style={styles.stepItem}
                >


                  <View
                    style={[
                      styles.stepCircle,

                      (done || active)
                      &&
                      styles.stepDone
                    ]}
                  >


                    {
                      done &&
                      <Ionicons
                        name="checkmark"
                        size={10}
                        color="#fff"
                      />
                    }


                  </View>



                  {
                    step !== totalSteps &&
                    <View
                      style={styles.stepLine}
                    />
                  }



                </View>

              );


            })
          }


        </View>


      </View>







      <ScrollView
        showsVerticalScrollIndicator={false}
      >



        {/* Date selection */}


        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >


          {
            dates.map((item)=>{


              const selected =
                selectedDate === item.fullDate;



              return (


                <TouchableOpacity

                  key={item.id}

                  disabled={
                    item.fullDate < 
                    formatLocalDate(new Date())
                  }

                  style={[
                    styles.dateCard,

                    selected &&
                    styles.dateActive,


                    item.isToday &&
                    styles.todayCard,


                    item.fullDate <
                    formatLocalDate(new Date())
                    &&
                    styles.disabledDate
                  ]}


                  onPress={()=>{


                    setSelectedDate(
                      item.fullDate
                    );


                    /*
                    If customer changes date,
                    old selected time is removed.
                    */
                    setSelectedTime("");

                  }}

                >



                  <Text
                    style={styles.dateMonth}
                  >
                    {item.month}
                  </Text>



                  <Text
                    style={styles.dateDay}
                  >
                    {item.day}
                  </Text>



                  <Text
                    style={styles.dateWeek}
                  >
                    {item.week}
                  </Text>



                  {
                    item.isToday &&
                    <Text
                      style={styles.todayText}
                    >
                      Today
                    </Text>
                  }



                </TouchableOpacity>


              );


            })
          }



        </ScrollView>






        <Text style={styles.sectionTitle}>
          Available Time
        </Text>





        <View style={styles.timeGrid}>


          {
            times.map((time)=>{


              const blocked =
                !selectedDate ||
                isPastTime(
                  selectedDate,
                  time
                );



              const selected =
                selectedTime === time;



              return (


                <TouchableOpacity

                  key={time}


                  disabled={blocked}


                  style={[

                    styles.timeBox,


                    selected &&
                    styles.timeActive,


                    blocked &&
                    styles.timeDisabled

                  ]}


                  onPress={()=>
                    setSelectedTime(time)
                  }


                >


                  <Text
                    style={[

                      styles.timeText,


                      selected &&
                      styles.timeTextActive,


                      blocked &&
                      styles.disabledText

                    ]}
                  >

                    {time}

                  </Text>


                </TouchableOpacity>


              );


            })
          }


        </View>


        <View
          style={{
            height:120
          }}
        />


      </ScrollView>







      {/* Continue button */}


      <View style={styles.bottom}>


        <TouchableOpacity

          disabled={
            !selectedDate ||
            !selectedTime
          }


          style={[
            styles.continue,


            (!selectedDate ||
             !selectedTime)
             &&
             styles.disabledButton
          ]}


          onPress={()=>{


            router.push({


              pathname:
              "/(customer)/(services)/staff",


              params:{


                selectedServices:
                String(selectedServices),


                selectedLength:
                String(selectedLength),


                selectedDate,


                selectedTime,


                totalAmount:
                String(totalAmount),


                bookingType:
                String(bookingType)

              }


            });


          }}


        >


          <Text
            style={styles.continueText}
          >

            Continue

          </Text>


        </TouchableOpacity>


      </View>


    </View>

  );

}







const styles = StyleSheet.create({


container:{

 flex:1,

 backgroundColor:"#F5F5F7",

 paddingTop:50,

 paddingHorizontal:16,

},



header:{

 flexDirection:"row",

 alignItems:"center",

 marginBottom:10,

},



headerText:{

 fontSize:18,

 fontWeight:"700",

 marginLeft:10,

},




stepContainer:{

 alignItems:"center",

 marginBottom:18,

},



stepText:{

 fontSize:13,

 color:"#777",

 marginBottom:10,

},



stepRow:{

 flexDirection:"row",

 alignItems:"center",

},



stepItem:{

 flexDirection:"row",

 alignItems:"center",

},



stepCircle:{

 width:12,

 height:12,

 borderRadius:6,

 backgroundColor:"#D1D5DB",

 justifyContent:"center",

 alignItems:"center",

},



stepDone:{

 backgroundColor:"#FF2D55",

},



stepLine:{

 width:25,

 height:2,

 backgroundColor:"#E5E7EB",

 marginHorizontal:4,

},




dateCard:{

 width:90,

 height:120,

 backgroundColor:"#D86B91",

 borderRadius:12,

 justifyContent:"space-around",

 alignItems:"center",

 marginRight:12,

},



dateActive:{

 backgroundColor:"#FF2D55",

},



todayCard:{

 borderWidth:2,

 borderColor:"#FF2D55",

},



disabledDate:{

 opacity:0.35,

},



dateMonth:{

 color:"#fff",

 fontWeight:"700",

},



dateDay:{

 color:"#fff",

 fontSize:22,

 fontWeight:"800",

},



dateWeek:{

 color:"#fff",

},



todayText:{

 color:"#fff",

 fontSize:11,

},




sectionTitle:{

 marginTop:25,

 marginBottom:15,

 fontSize:16,

 fontWeight:"700",

},



timeGrid:{

 flexDirection:"row",

 flexWrap:"wrap",

 justifyContent:"space-between",

},



timeBox:{

 width:"47%",

 height:45,

 borderWidth:1,

 borderColor:"#FF2D55",

 borderRadius:10,

 justifyContent:"center",

 alignItems:"center",

 marginBottom:15,

 backgroundColor:"#fff",

},



timeActive:{

 backgroundColor:"#FF2D55",

},



timeDisabled:{

 backgroundColor:"#E5E5E5",

 borderColor:"#CCC",

},



timeText:{

 color:"#111",

},



timeTextActive:{

 color:"#fff",

 fontWeight:"700",

},



disabledText:{

 color:"#999",

},




bottom:{

 position:"absolute",

 bottom:0,

 left:0,

 right:0,

 backgroundColor:"#fff",

 padding:15,

 borderTopLeftRadius:25,

 borderTopRightRadius:25,

 elevation:8,

},



continue:{

 backgroundColor:"#FF2D55",

 padding:14,

 borderRadius:25,

 alignItems:"center",

},



disabledButton:{

 opacity:0.5,

},



continueText:{

 color:"#fff",

 fontWeight:"700",

 fontSize:15,

},


});