import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  useStripe,
} from "@stripe/stripe-react-native";


const PAYMENT_API =
  "http://10.0.2.2:5000/api/payments";


const BOOKING_API =
  "http://10.0.2.2:5000/api/bookings";


type PaymentOption =
  | "advance"
  | "full";


const getParamValue = (
  value: string | string[] | undefined
): string => {

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";

};



const safeJsonParse = <T,>(
  value:
    | string
    | string[]
    | undefined,

  fallback: T

): T => {

  const raw =
    getParamValue(value);


  if (!raw) {
    return fallback;
  }


  try {

    return JSON.parse(raw) as T;

  } catch {

    return fallback;

  }

};



export default function CardPayment() {


  const router = useRouter();


  const {
    selectedServices,
    selectedLength,
    selectedDate,
    selectedTime,
    selectedStaff,
    totalAmount,
    bookingType,
    holdId,
    estimatedDuration,

  } = useLocalSearchParams();



  const {
    initPaymentSheet,
    presentPaymentSheet,

  } = useStripe();



  const [loading, setLoading] =
    useState(false);



  const [paymentOption, setPaymentOption] =
    useState<PaymentOption>("advance");



  const services =
    safeJsonParse<any[]>(
      selectedServices,
      []
    );



  const parsedTotal =
    Number(
      getParamValue(totalAmount)
    );



  const total =
    Number.isFinite(parsedTotal)
      ? parsedTotal
      : 0;



  const duration =
    Number(
      getParamValue(
        estimatedDuration
      )
    ) ||

    services.reduce(
      (sum, item) =>
        sum +
        Number(item.duration || 0),

      0
    );



  const isBridal =
    String(
      getParamValue(bookingType)
    )
      .toLowerCase()
      .includes("bridal");



  const advanceAmount =
    isBridal
      ? total * 0.2
      : total >= 10000
        ? total * 0.1
        : 0;



  const amountToPay =
    paymentOption === "advance"
      ? advanceAmount
      : total;



  const formatMoney =
    (amount:number) =>
      `LKR ${amount.toLocaleString(
        "en-LK",
        {
          minimumFractionDigits: 2,
        }
      )}`;



      const createPayment =
    async () => {

      if (loading) return;


      try {

        setLoading(true);



        const token =
          await AsyncStorage.getItem(
            "customerToken"
          )
          ||
          await AsyncStorage.getItem(
            "token"
          );



        if (!token) {

          Alert.alert(
            "Login Required",
            "Please login again"
          );

          return;

        }



        if (!holdId) {

          Alert.alert(
            "Missing Hold",
            "Booking slot reservation not found."
          );

          return;

        }



        // CREATE STRIPE PAYMENT INTENT

        const response =
          await fetch(
            `${PAYMENT_API}/create-payment-intent`,
            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,

              },


              body: JSON.stringify({

                totalAmount:
                  total,


                selectedServices:
                  services,


                bookingType:
                  getParamValue(
                    bookingType
                  ),


                paymentOption,


                holdId:
                  getParamValue(
                    holdId
                  ),

              }),

            }
          );



        const data =
          await response.json();



        if (!response.ok) {

          Alert.alert(
            "Payment Error",
            data.message ||
            "Unable to create payment"
          );

          return;

        }



        if (!data.clientSecret) {

          Alert.alert(
            "Stripe Error",
            "Payment secret missing"
          );

          return;

        }



        const paymentIntentId =
          data.paymentIntentId;



        // OPEN STRIPE PAYMENT SHEET

        const init =
          await initPaymentSheet({

            paymentIntentClientSecret:
              data.clientSecret,


            merchantDisplayName:
              "LimoSalon",

          });



        if (init.error) {

          Alert.alert(
            "Stripe Error",
            init.error.message
          );

          return;

        }



        const payment =
          await presentPaymentSheet();



        if (payment.error) {

          Alert.alert(
            "Payment Failed",
            payment.error.message
          );

          return;

        }



        // CREATE BOOKING AFTER SUCCESSFUL PAYMENT


        const bookingResponse =
          await fetch(
            BOOKING_API,
            {

              method: "POST",


              headers: {

                "Content-Type":
                  "application/json",


                Authorization:
                  `Bearer ${token}`,

              },


              body: JSON.stringify({

                holdId:
                  getParamValue(
                    holdId
                  ),



                services:
                  services.map(
                    (item) => ({

                      serviceId:
                        String(
                          item._id ||
                          item.serviceId ||
                          ""
                        ),


                      name:
                        String(
                          item.name ||
                          ""
                        ),


                      price:
                        Number(
                          item.price ||
                          0
                        ),


                      duration:
                        Number(
                          item.duration ||
                          0
                        ),


                      durationText:
                        String(
                          item.durationText ||
                          ""
                        ),

                    })
                  ),



                hairLength:
                  safeJsonParse(
                    selectedLength,

                    {
                      hairLengthId:"",
                      name:"",
                      description:"",
                      extraPrice:0,
                    }
                  ),



                staff:
                  safeJsonParse(
                    selectedStaff,

                    {}
                  ),



                selectedDate:
                  getParamValue(
                    selectedDate
                  ),



                selectedTime:
                  getParamValue(
                    selectedTime
                  ),



                estimatedDuration:
                  duration,



                totalAmount:
                  total,



                bookingType:
                  getParamValue(
                    bookingType
                  ),



                paymentOption,



                paymentMethod:
                  "Credit/Debit Card",



                stripePaymentIntentId:
                  paymentIntentId,

              }),

            }
          );



        const bookingData =
          await bookingResponse.json();



        if (!bookingResponse.ok) {

          Alert.alert(
            "Booking Error",

            bookingData.message ||
            "Payment completed but booking failed"
          );

          return;

        }

        Alert.alert(
          "Payment Successful",
          "Your booking has been confirmed",
          [
            {
              text: "OK",

              onPress: () => {

                router.replace({

                  pathname:
                    "/(customer)/(services)/bookingSuccess",


                  params: {

  bookingId:
    bookingData.booking?._id || "",


  selectedServices:
    getParamValue(selectedServices),


  selectedLength:
    getParamValue(selectedLength),


  selectedDate:
    getParamValue(selectedDate),


  selectedTime:
    getParamValue(selectedTime),


  selectedStaff:
    getParamValue(selectedStaff),


  totalAmount:
    String(total),


  advancePayment:
    String(
      bookingData.booking?.advancePayment || 0
    ),


  amountPaid:
    String(
      bookingData.booking?.amountPaid || 0
    ),


  balancePayment:
    String(
      bookingData.booking?.balancePayment || 0
    ),


  advancePercentage:
    String(
      bookingData.booking?.advancePercentage || 0
    ),


  paymentOption:
    bookingData.booking?.paymentOption || "",


  paymentMethod:
    bookingData.booking?.paymentMethod ||
    "Credit/Debit Card",


  paymentStatus:
    bookingData.booking?.paymentStatus ||
    "Paid",


  transactionReference:
    bookingData.booking?.transactionReference ||
    "",


},

                    


                  },

                );

              },

            },

          ]

        );



      }
      catch(error) {


        console.log(
          "Payment Error:",
          error
        );


        Alert.alert(
          "Error",
          "Cannot complete payment"
        );


      }
      finally {

        setLoading(false);

      }


    };



  return (

    <View style={styles.container}>


      <View style={styles.header}>


        <TouchableOpacity
          onPress={() =>
            router.back()
          }
          disabled={loading}
        >

          <Ionicons
            name="chevron-back"
            size={28}
            color="#000"
          />


        </TouchableOpacity>



        <Text style={styles.title}>
          Secure Payment
        </Text>


      </View>



      <ScrollView>


        <View style={styles.card}>


          <Ionicons
            name="card-outline"
            size={55}
            color="#FF2D55"
          />


          <Text style={styles.cardTitle}>
            Pay securely with Stripe
          </Text>


          <Text style={styles.description}>

            Your card details are handled securely by Stripe.
            LimoSalon never stores your card information.

          </Text>


        </View>


        <View style={styles.summary}>

          <Text style={styles.heading}>
            Payment Summary
          </Text>


          <Text style={styles.row}>
            Total: {formatMoney(total)}
          </Text>



          <TouchableOpacity
            style={[
              styles.option,
              paymentOption === "advance" &&
              styles.selected
            ]}
            onPress={() =>
              setPaymentOption("advance")
            }
          >

            <Text>
              {
                isBridal
                ? "20% Bridal Advance"
                : "10% Advance"
              }
            </Text>


            <Text>
              {formatMoney(advanceAmount)}
            </Text>


          </TouchableOpacity>




          <TouchableOpacity
            style={[
              styles.option,
              paymentOption === "full" &&
              styles.selected
            ]}
            onPress={() =>
              setPaymentOption("full")
            }
          >

            <Text>
              Full Payment
            </Text>


            <Text>
              {formatMoney(total)}
            </Text>


          </TouchableOpacity>


        </View>




        <TouchableOpacity
          style={styles.button}
          disabled={loading}
          onPress={createPayment}
        >

          {
            loading

            ?

            <ActivityIndicator
              color="#fff"
            />

            :

            <Text style={styles.buttonText}>
              Pay {formatMoney(amountToPay)}
            </Text>

          }


        </TouchableOpacity>


      </ScrollView>


    </View>

  );

}



const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    paddingTop: 50,
    paddingHorizontal: 20,
  },


  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },


  title: {
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 15,
    color: "#111",
  },


  card: {
    backgroundColor: "#FFFFFF",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 20,
  },


  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 15,
    color: "#111",
  },


  description: {
    textAlign: "center",
    color: "#777",
    marginTop: 10,
    lineHeight: 20,
  },


  summary: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 18,
  },


  heading: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 15,
    color: "#111",
  },


  row: {
    fontSize: 16,
    marginBottom: 15,
    fontWeight: "600",
    color: "#333",
  },


  option: {
    padding: 18,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 15,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
  },


  selected: {
    backgroundColor: "#FFD6E3",
    borderColor: "#FF2D55",
    borderWidth: 2,
  },


  button: {
    backgroundColor: "#FF2D55",
    height: 55,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40,
  },


  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

});