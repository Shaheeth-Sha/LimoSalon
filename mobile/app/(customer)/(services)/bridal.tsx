import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";


import { BASE_URL } from "../../../config/api";

const SERVICES_API =
  `${BASE_URL}/api/services?category=Bridal`;

// Only used on the "Change Package" edit path from reviewBooking.tsx
// — mirrors the same hold call staff.tsx/eventTime.tsx already make.
const HOLD_API =
  `${BASE_URL}/api/bookings/hold`;

const getParamValue = (
  value: string | string[] | undefined
): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};



type ServiceItem = {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  durationText: string;
};



export default function BridalDressing() {


  const router = useRouter();

  const params = useLocalSearchParams();

  // Only ever populated on the "Change Package" path from
  // reviewBooking.tsx — every other field the review screen already
  // knows about, carried through untouched so nothing already
  // answered (date, time, staff, trial info) gets lost.
  const editMode = getParamValue(params.editMode) === "true";
  const editSelectedDate = getParamValue(params.selectedDate);
  const editSelectedTime = getParamValue(params.selectedTime);
  const editSelectedStaff = getParamValue(params.selectedStaff);
  const editWantsTrialMakeup = getParamValue(params.wantsTrialMakeup);
  const editTrialMakeupDate = getParamValue(params.trialMakeupDate);
  const editTrialMakeupTime = getParamValue(params.trialMakeupTime);
  const editTrialHoldId = getParamValue(params.trialHoldId);
  const editTrialHoldExpiresAt = getParamValue(params.trialHoldExpiresAt);
  const editTrialHoldExpiresInSeconds = getParamValue(params.trialHoldExpiresInSeconds);
  const editNotes = getParamValue(params.notes);
  const editPreviousServiceIds = useMemo(() => {
    const raw = getParamValue(params.selectedServices);
    if (!raw) return [] as string[];

    try {
      const parsed = JSON.parse(raw) as ServiceItem[];
      return parsed.map((item) => item._id).filter(Boolean);
    } catch {
      return [] as string[];
    }
  }, [params.selectedServices]);

  const [creatingHold, setCreatingHold] = useState(false);


  // Services loaded from database
  const [services, setServices] =
    useState<ServiceItem[]>([]);



  // Selected bridal services
  const [selectedServices, setSelectedServices] =
    useState<ServiceItem[]>([]);



  const [loading, setLoading] =
    useState(true);




  /*
    Load Bridal services from backend
  */
  const loadServices = async () => {

    try {

      setLoading(true);


      const response =
        await fetch(SERVICES_API);



      const data =
        await response.json();



      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to load bridal services"
        );

      }



      setServices(
        data.services || []
      );


    } catch(error) {


      console.log(
        "Bridal services error:",
        error
      );


      Alert.alert(
        "Error",
        "Unable to load bridal services"
      );


    } finally {

      setLoading(false);

    }

  };




  useEffect(() => {

    loadServices();

  }, []);



  // "Change Package" edit path: once the full service list has
  // loaded, pre-select whatever was already chosen so the customer
  // starts from their current picks instead of an empty list.
  useEffect(() => {

    if (!editMode || services.length === 0 || editPreviousServiceIds.length === 0) {
      return;
    }

    setSelectedServices(
      services.filter((item) =>
        editPreviousServiceIds.includes(item._id)
      )
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, services]);





  /*
    Select / remove bridal services
  */
  const toggleService = (
    service: ServiceItem
  ) => {


    const exists =
      selectedServices.some(
        item =>
          item._id === service._id
      );



    if (exists) {


      setSelectedServices(
        selectedServices.filter(
          item =>
            item._id !== service._id
        )
      );


    } else {


      setSelectedServices([
        ...selectedServices,
        service,
      ]);

    }


  };





  /*
    Calculate total amount
  */
  const totalAmount = useMemo(() => {


    return selectedServices.reduce(
      (sum,item) =>
        sum + Number(item.price),
      0
    );


  }, [selectedServices]);



  const estimatedDuration = useMemo(() => {

    return selectedServices.reduce(
      (sum, item) =>
        sum + Number(item.duration || 0),
      0
    );

  }, [selectedServices]);



  const goToEventDate = (preselectedDate?: string) => {

    router.push({

      pathname:
      "/(customer)/(services)/eventDate",

      params:{

        selectedServices:
        JSON.stringify(
          selectedServices
        ),

        selectedLength:
        "",

        totalAmount:
        String(totalAmount),

        bookingType:
        "bridal",

        ...(editMode && {

          editMode: "true",

          selectedDate:
          preselectedDate || "",

          selectedStaff:
          editSelectedStaff,

          estimatedDuration:
          String(estimatedDuration),

          wantsTrialMakeup:
          editWantsTrialMakeup,

          trialMakeupDate:
          editTrialMakeupDate,

          trialMakeupTime:
          editTrialMakeupTime,

          trialHoldId:
          editTrialHoldId,

          trialHoldExpiresAt:
          editTrialHoldExpiresAt,

          trialHoldExpiresInSeconds:
          editTrialHoldExpiresInSeconds,

          notes:
          editNotes,

        }),

      },

    });

  };



  // "Change Package" edit path: the customer already has a staff
  // member and a date/time reserved — try to keep that exact slot by
  // simply refreshing the hold with the new (possibly longer/shorter)
  // service duration. Only if that slot no longer fits the new
  // duration does this fall back to sending them through Event
  // Date/Event Time to pick a new one — Continue still always lands
  // them back on Review Booking either way, never staff.tsx or the
  // trial-makeup screens again.
  const handleEditContinue = async () => {

    if (creatingHold) return;

    setCreatingHold(true);

    try {

      const staff = JSON.parse(
        editSelectedStaff || "{}"
      );

      const staffId = String(
        staff.staffId || staff._id || ""
      );

      if (!staffId || !editSelectedDate || !editSelectedTime) {
        Alert.alert(
          "Missing Details",
          "Your date, time, or staff selection is missing — please pick them again.",
          [
            {
              text: "OK",
              onPress: () => goToEventDate(),
            },
          ]
        );
        return;
      }

      const token =
        await AsyncStorage.getItem("customerToken");

      if (!token) {
        Alert.alert("Login Required", "Please login again.");
        return;
      }

      const response = await fetch(HOLD_API, {

        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          staffId,
          selectedDate: editSelectedDate,
          selectedTime: editSelectedTime,
          estimatedDuration,
          // Protects an already-reserved trial hold from being wiped
          // out by this hold's cleanup step.
          keepHoldId: editTrialHoldId || undefined,
        }),

      });

      const data = await response.json();

      if (!response.ok || !data.hold?.holdId) {

        // The new package no longer fits the previously reserved
        // slot (e.g. it now runs longer and overlaps another
        // booking) — the only remaining option is to pick a new
        // date/time, but the staff member and trial info are still
        // carried forward so nothing else has to be redone.
        Alert.alert(
          "Time No Longer Available",
          "Your previous date and time can't fit this updated package. Please choose a new date and time.",
          [
            {
              text: "Choose New Time",
              onPress: () => goToEventDate(editSelectedDate),
            },
          ]
        );
        return;
      }

      router.replace({

        pathname:
        "/(customer)/(services)/reviewBooking",

        params: {
          selectedServices: JSON.stringify(selectedServices),
          selectedLength: "",
          selectedDate: editSelectedDate,
          selectedTime: editSelectedTime,
          selectedStaff: editSelectedStaff,
          totalAmount: String(totalAmount),
          bookingType: "bridal",
          estimatedDuration: String(estimatedDuration),
          holdId: String(data.hold.holdId),
          holdExpiresAt: String(data.hold.expiresAt),
          holdExpiresInSeconds: String(data.hold.expiresInSeconds),
          wantsTrialMakeup: editWantsTrialMakeup,
          trialMakeupDate: editTrialMakeupDate,
          trialMakeupTime: editTrialMakeupTime,
          trialHoldId: editTrialHoldId,
          trialHoldExpiresAt: editTrialHoldExpiresAt,
          trialHoldExpiresInSeconds: editTrialHoldExpiresInSeconds,
          notes: editNotes,
        },

      });

    } catch (error) {

      console.log("Package change hold refresh failed:", error);

      Alert.alert(
        "Connection Error",
        "Unable to update your package right now. Please try again."
      );

    } finally {

      setCreatingHold(false);

    }

  };



  if (loading) {


    return (

      <View style={styles.loadingContainer}>


        <ActivityIndicator
          size="large"
          color="#FF2D55"
        />


        <Text>
          Loading Bridal Services...
        </Text>


      </View>

    );

  }




  return (

    <View style={styles.container}>


      {/* HEADER */}

      <View style={styles.header}>


        <TouchableOpacity
          onPress={() =>
            router.back()
          }
        >

          <Ionicons
            name="chevron-back"
            size={26}
            color="#000"
          />


        </TouchableOpacity>



        <Text style={styles.headerText}>
          Bridal Dressing
        </Text>


      </View>




      <View style={styles.divider}/>





      {/* Bridal flow doesn't use the numbered step-indicator dots the
          shared hair/face/body/nail flow uses — just the section
          label. */}
      <Text style={styles.stepText}>
        Select one or more services to book
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
      >

        {services.map((item) => {

          const selected =
            selectedServices.some(
              service =>
                service._id === item._id
            );


          return (

            <TouchableOpacity

              key={item._id}

              style={[
                styles.serviceCard,
                selected &&
                styles.selectedCard,
              ]}

              onPress={() =>
                toggleService(item)
              }

              activeOpacity={0.8}

            >

              <View style={styles.serviceContent}>

                <Text style={styles.serviceTitle}>
                  {item.name}
                </Text>


                <Text style={styles.serviceDesc}>
                  {item.description}
                </Text>


                <Text style={styles.duration}>
                  {item.durationText}
                </Text>


                <Text style={styles.price}>
                  LKR {item.price.toLocaleString()}
                </Text>


              </View>



              <View
                style={[
                  styles.bookBtn,
                  selected &&
                  styles.addedBtn,
                ]}
              >

                <Text style={styles.bookText}>
                  {
                    selected
                    ? "Added"
                    : "Book"
                  }
                </Text>


              </View>


            </TouchableOpacity>

          );


        })}


        <View style={{height:120}} />


      </ScrollView>




      {/* BOTTOM SUMMARY */}

      <View style={styles.bottomBox}>


        <Text style={styles.summaryText}>
          {selectedServices.length} Service selected
        </Text>



        <Text style={styles.summaryPrice}>
          LKR {totalAmount.toFixed(2)}
        </Text>



        <TouchableOpacity

          disabled={
            selectedServices.length === 0 ||
            creatingHold
          }


          style={[
            styles.continueBtn,

            (selectedServices.length === 0 || creatingHold) &&
            {
              opacity:0.5
            }

          ]}



          onPress={() =>
            editMode
              ? handleEditContinue()
              // Bridal gets its own Event Date / Event Time screens
              // (matching the Figma flow) instead of the combined
              // dateTime.tsx picker every other booking type still
              // uses.
              : goToEventDate()
          }


        >

          <Text style={styles.continueText}>
            {creatingHold ? "Updating..." : "Continue"}
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



  loadingContainer:{
    flex:1,
    justifyContent:"center",
    alignItems:"center",
  },



  header:{
    flexDirection:"row",
    alignItems:"center",
  },


  headerText:{
    fontSize:18,
    fontWeight:"700",
    marginLeft:10,
  },


  divider:{
    height:1,
    backgroundColor:"#DADADA",
    marginTop:12,
    marginBottom:14,
  },


  stepContainer:{
    alignItems:"center",
    marginBottom:18,
  },


  stepText:{
    fontSize:13,
    color:"#777",
    marginBottom:18,
    textAlign:"center",
  },


  stepRow:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"center",
  },


  stepItem:{
    flexDirection:"row",
    alignItems:"center",
  },


  stepCircle:{
    width:18,
    height:18,
    borderRadius:9,
    backgroundColor:"#D1D5DB",
    justifyContent:"center",
    alignItems:"center",
  },


  stepActive:{
    backgroundColor:"#FF2D55",
  },


  stepDone:{
    backgroundColor:"#FF2D55",
  },


  stepLine:{
    width:34,
    height:2,
    backgroundColor:"#E5E7EB",
    marginHorizontal:5,
  },


  serviceCard:{
    backgroundColor:"#EDEDED",
    borderRadius:15,
    padding:15,
    marginBottom:12,
    flexDirection:"row",
    alignItems:"flex-end",
  },


  selectedCard:{
    backgroundColor:"#fff",
    borderWidth:2,
    borderColor:"#FF2D55",
  },


  serviceContent:{
    flex:1,
    paddingRight:8,
  },


  serviceTitle:{
    fontSize:15,
    fontWeight:"800",
    color:"#111",
  },


  serviceDesc:{
    fontSize:12,
    color:"#777",
    marginTop:3,
    lineHeight:16,
  },


  duration:{
    fontSize:12,
    color:"#777",
    marginTop:4,
  },


  price:{
    fontSize:13,
    color:"#FF2D55",
    fontWeight:"800",
    marginTop:4,
  },


  bookBtn:{
    backgroundColor:"#FF2D55",
    paddingHorizontal:18,
    paddingVertical:8,
    borderRadius:25,
  },


  addedBtn:{
    backgroundColor:"#888",
  },


  bookText:{
    color:"#fff",
    fontSize:12,
    fontWeight:"800",
  },


  bottomBox:{
    position:"absolute",
    bottom:0,
    left:0,
    right:0,
    backgroundColor:"#DADADA",
    paddingHorizontal:16,
    paddingTop:8,
    paddingBottom:12,
  },


  summaryText:{
    fontSize:14,
    fontWeight:"700",
    color:"#111",
  },


  summaryPrice:{
    fontSize:14,
    fontWeight:"800",
    color:"#111",
    marginBottom:8,
  },


  continueBtn:{
    backgroundColor:"#FF2D55",
    padding:15,
    borderRadius:25,
    alignItems:"center",
  },


  continueText:{
    color:"#fff",
    fontWeight:"800",
    fontSize:15,
  },


});