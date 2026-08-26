import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";

import { Ionicons, Feather } from "@expo/vector-icons";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  useStripe,
} from "@stripe/stripe-react-native";

import { BASE_URL } from "../../../config/api";



const PAYMENT_API =
  `${BASE_URL}/api/payments`;


const BOOKING_API =
  `${BASE_URL}/api/bookings`;

// Mirrors the same threshold used on the payment method screen and
// the backend — a non-bridal booking under this total has no advance
// option at all, only Pay in Full (online) or Pay at Salon.
const NON_BRIDAL_ADVANCE_MINIMUM = 10000;


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
    wantsTrialMakeup,
    trialMakeupDate,
    trialMakeupTime,
    trialHoldId,
    notes,

  } = useLocalSearchParams();



  const {
    initPaymentSheet,
    presentPaymentSheet,

  } = useStripe();



  const [loading, setLoading] =
    useState(false);



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



  const isBridal =
    String(
      getParamValue(bookingType)
    )
      .toLowerCase()
      .includes("bridal");

  // Fixed: an advance was always selectable regardless of whether
  // this booking actually qualifies for one. For a non-bridal total
  // under LKR 10,000 that meant "10% Advance" showed LKR 0.00 and was
  // still tappable, only failing once Pay was pressed. Now it's
  // computed up front — same rule the payment method screen and
  // backend already use — and the option is disabled and defaults to
  // Full Payment whenever it doesn't apply.
  const advanceAvailable =
    isBridal || total >= NON_BRIDAL_ADVANCE_MINIMUM;

  const [paymentOption, setPaymentOption] =
    useState<PaymentOption>(
      advanceAvailable ? "advance" : "full"
    );

  // Fixed: previously every message on this screen used the native
  // Alert.alert() (plain system-styled popup) instead of the app's
  // branded modal used everywhere else.
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    isSuccess?: boolean;
    onOk?: () => void;
  }>({ visible: false, title: "", message: "" });

  const showAlert = (
    title: string,
    message: string,
    onOk?: () => void,
    isSuccess?: boolean
  ) => {
    setAlertState({ visible: true, title, message, onOk, isSuccess });
  };

  const closeAlert = () => {
    const onOk = alertState.onOk;
    setAlertState((prev) => ({ ...prev, visible: false }));
    if (onOk) onOk();
  };



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



  const roundMoney = (value: number): number =>
    Math.round((value + Number.EPSILON) * 100) / 100;

  const advanceAmount =
    roundMoney(
      isBridal
        ? total * 0.2
        : total >= 10000
          ? total * 0.1
          : 0
    );



  const amountToPay =
    roundMoney(
      paymentOption === "advance"
        ? advanceAmount
        : total
    );



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

          showAlert(
            "Login Required",
            "Please login again"
          );

          return;

        }



        if (!holdId) {

          showAlert(
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

          showAlert(
            "Payment Error",
            data.message ||
            "Unable to create payment"
          );

          return;

        }



        if (!data.clientSecret) {

          showAlert(
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

          showAlert(
            "Stripe Error",
            init.error.message
          );

          return;

        }



        const payment =
          await presentPaymentSheet();



        if (payment.error) {

          showAlert(
            "Payment Failed",
            payment.error.message
          );

          return;

        }



        // CREATE BOOKING AFTER SUCCESSFUL PAYMENT
        // Fixed: previously nothing told the backend that Stripe had
        // actually confirmed the charge, so every booking saved as
        // Pending/unpaid regardless of payment option. Reaching this
        // point means presentPaymentSheet() returned no error, i.e.
        // Stripe genuinely confirmed the payment — so paymentConfirmed
        // is sent as true here, and only here.

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


                // Bridal-only fields collected by trialMakeup.tsx /
                // trialMakeupDate.tsx / additionalNotes.tsx and
                // forwarded unchanged through confirm.tsx and
                // payment.tsx. Empty/false for every other booking
                // type since those screens are never visited.
                wantsTrialMakeup:
                  getParamValue(
                    wantsTrialMakeup
                  ) === "true",

                trialMakeupDate:
                  getParamValue(
                    trialMakeupDate
                  ),

                trialMakeupTime:
                  getParamValue(
                    trialMakeupTime
                  ),

                trialHoldId:
                  getParamValue(
                    trialHoldId
                  ),

                notes:
                  getParamValue(
                    notes
                  ),



                paymentOption,



                paymentMethod:
                  "Credit/Debit Card",



                stripePaymentIntentId:
                  paymentIntentId,


                paymentConfirmed:
                  true,

              }),

            }
          );



        const bookingData =
          await bookingResponse.json();



        if (!bookingResponse.ok) {

          showAlert(
            "Booking Error",

            bookingData.message ||
            "Payment completed but booking failed"
          );

          return;

        }

        showAlert(
          "Payment Successful",
          "Your booking has been confirmed",
          () => {

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


  bookingType:
    getParamValue(bookingType),


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

  // Bridal-only — read back from the saved booking rather than
  // the raw params, so bookingSuccess.tsx shows exactly what was
  // actually persisted.
  wantsTrialMakeup:
    String(Boolean(bookingData.booking?.wantsTrialMakeup)),

  trialMakeupDate:
    bookingData.booking?.trialMakeupDate || "",

  trialMakeupTime:
    bookingData.booking?.trialMakeupTime || "",

},

              },

            );

          },

          true

        );



      }
      catch(error) {


        console.log(
          "Payment Error:",
          error
        );


        showAlert(
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
            color="#FF2D75"
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
            disabled={!advanceAvailable}
            style={[
              styles.option,
              paymentOption === "advance" &&
              styles.selected,
              !advanceAvailable &&
              styles.optionDisabled,
            ]}
            onPress={() =>
              setPaymentOption("advance")
            }
          >

            <Text
              style={
                !advanceAvailable &&
                styles.optionTextDisabled
              }
            >
              {
                isBridal
                ? "20% Bridal Advance"
                : "10% Advance"
              }
            </Text>


            <Text
              style={
                !advanceAvailable &&
                styles.optionTextDisabled
              }
            >
              {
                advanceAvailable
                ? formatMoney(advanceAmount)
                : "Not available"
              }
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

          {!advanceAvailable && (
            <Text style={styles.advanceNote}>
              Advance payment is only available for bridal bookings
              or bookings of LKR 10,000 or more.
            </Text>
          )}


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

      <Modal visible={alertState.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconCircle, alertState.isSuccess && styles.modalIconCircleSuccess]}>
              <Feather
                name={alertState.isSuccess ? "check" : "alert-circle"}
                size={28}
                color={alertState.isSuccess ? "#2ECC71" : "#FF2D75"}
              />
            </View>
            <Text style={styles.modalTitle}>{alertState.title}</Text>
            <Text style={styles.modalMessage}>{alertState.message}</Text>
            <TouchableOpacity style={styles.modalButton} activeOpacity={0.8} onPress={closeAlert}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


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
    borderColor: "#FF2D75",
    borderWidth: 2,
  },

  optionDisabled: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E5E5E5",
  },

  optionTextDisabled: {
    color: "#999",
  },

  advanceNote: {
    fontSize: 12,
    color: "#888",
    lineHeight: 17,
    marginTop: -4,
    marginBottom: 4,
  },


  button: {
    backgroundColor: "#FF2D75",
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

  /* ===== Custom Alert Modal ===== */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFE1EC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalIconCircleSuccess: {
    backgroundColor: "#E8F8EF",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 6,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 20,
  },
  modalButton: {
    width: "100%",
    backgroundColor: "#FF2D75",
    paddingVertical: 13,
    borderRadius: 25,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },

});