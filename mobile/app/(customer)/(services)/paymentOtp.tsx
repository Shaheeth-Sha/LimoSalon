import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const PAYMENT_API =
  "https://limosalon.onrender.com/api/payments";

const BOOKING_API =
  "https://limosalon.onrender.com/api/bookings";

type PaymentOption = "advance" | "full";

const getParamValue = (
  value: string | string[] | undefined
): string => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

const safeJsonParse = <T,>(
  value: string | string[] | undefined,
  fallback: T
): T => {
  const rawValue = getParamValue(value);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
};

const readJsonResponse = async (
  response: Response
): Promise<any> => {
  const rawBody = await response.text();

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(
      `Unexpected server response with status ${response.status}`
    );
  }
};

export default function PaymentOtp() {
  const router = useRouter();

  const {
    selectedServices,
    selectedLength,
    selectedDate,
    selectedTime,
    selectedStaff,
    totalAmount,
    advancePayment,
    balancePayment,
    paymentMethod,
    paymentOption,
    bookingType,
  } = useLocalSearchParams();

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const [loading, setLoading] =
    useState(false);

  const inputs =
    useRef<Array<TextInput | null>>([]);

  const services = safeJsonParse<any[]>(
    selectedServices,
    []
  );

  const hairLength = safeJsonParse<any | null>(
    selectedLength,
    null
  );

  const staff = safeJsonParse<any | null>(
    selectedStaff,
    null
  );

  const total =
    Number(getParamValue(totalAmount)) || 0;

  const normalizedBookingType =
    getParamValue(bookingType) === "bridal"
      ? "bridal"
      : "hair";

  const normalizedPaymentOption:
    PaymentOption =
    getParamValue(paymentOption) === "full"
      ? "full"
      : "advance";

  const normalizedPaymentMethod =
    getParamValue(paymentMethod) ||
    "Credit/Debit Card";

  const getToken = async () => {
    const customerToken =
      await AsyncStorage.getItem(
        "customerToken"
      );

    if (customerToken) {
      return customerToken;
    }

    return AsyncStorage.getItem("token");
  };

  const resetOtp = () => {
    setOtp(["", "", "", "", "", ""]);

    setTimeout(() => {
      inputs.current[0]?.focus();
    }, 100);
  };

  const handleChange = (
    text: string,
    index: number
  ) => {
    const value = text
      .replace(/\D/g, "")
      .slice(0, 1);

    const updatedOtp = [...otp];
    updatedOtp[index] = value;

    setOtp(updatedOtp);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (
    currentValue: string,
    index: number
  ) => {
    if (!currentValue && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const buildBookingRequest = () => {
    return {
      services: services.map(
        (item: any) => ({
          serviceId: String(
            item?._id ||
              item?.serviceId ||
              ""
          ),

          name: String(item?.name || ""),

          price: Number(
            item?.price || 0
          ),

          duration: Number(
            item?.duration || 0
          ),

          durationText: String(
            item?.durationText || ""
          ),
        })
      ),

      hairLength: hairLength
        ? {
            hairLengthId: String(
              hairLength?._id ||
                hairLength?.hairLengthId ||
                ""
            ),

            name: String(
              hairLength?.name || ""
            ),

            description: String(
              hairLength?.description || ""
            ),

            extraPrice: Number(
              hairLength?.extraPrice || 0
            ),
          }
        : {
            hairLengthId: "",
            name: "",
            description: "",
            extraPrice: 0,
          },

      staff: staff
        ? {
            staffId: String(
              staff?._id ||
                staff?.staffId ||
                ""
            ),

            name: String(
              staff?.name || ""
            ),

            role: String(
              staff?.role || ""
            ),
          }
        : {
            staffId: "",
            name: "",
            role: "",
          },

      selectedDate:
        getParamValue(selectedDate),

      selectedTime:
        getParamValue(selectedTime),

      totalAmount: total,

      bookingType:
        normalizedBookingType,

      paymentOption:
        normalizedPaymentOption,

      paymentMethod:
        normalizedPaymentMethod,
    };
  };

  const createBooking = async (
    token: string
  ) => {
    const response = await fetch(
      BOOKING_API,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          buildBookingRequest()
        ),
      }
    );

    const data =
      await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Booking creation failed"
      );
    }

    if (!data.booking?._id) {
      throw new Error(
        "Booking was not returned by the server"
      );
    }

    return data;
  };

  const goToBookingSuccess = (
    bookingData: any
  ) => {
    const booking = bookingData.booking;

    router.replace({
      pathname:
        "/(customer)/(services)/bookingSuccess",

      params: {
        bookingId:
          booking?._id || "",

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

        totalAmount: String(
          booking?.totalAmount ?? total
        ),

        advancePayment: String(
          booking?.advancePayment ?? 0
        ),

        amountPaid: String(
          booking?.amountPaid ?? 0
        ),

        balancePayment: String(
          booking?.balancePayment ?? 0
        ),

        advancePercentage: String(
          booking?.advancePercentage ?? 0
        ),

        paymentOption:
          booking?.paymentOption ||
          normalizedPaymentOption,

        paymentMethod:
          booking?.paymentMethod ||
          normalizedPaymentMethod,

        paymentStatus:
          booking?.paymentStatus ||
          "Pending",

        transactionReference:
          booking?.transactionReference ||
          "",

        bookingType:
          booking?.bookingType ||
          normalizedBookingType,
      },
    });
  };

  const verifyPaymentOtp = async () => {
    if (loading) {
      return;
    }

    const finalOtp = otp.join("");

    if (!/^\d{6}$/.test(finalOtp)) {
      Alert.alert(
        "Invalid OTP",
        "Please enter the complete 6-digit OTP."
      );

      return;
    }

    if (services.length === 0) {
      Alert.alert(
        "Booking Error",
        "No selected service information was found."
      );

      return;
    }

    if (
      !getParamValue(selectedDate) ||
      !getParamValue(selectedTime)
    ) {
      Alert.alert(
        "Booking Error",
        "Booking date or time is missing."
      );

      return;
    }

    if (total <= 0) {
      Alert.alert(
        "Booking Error",
        "The booking total is invalid."
      );

      return;
    }

    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        Alert.alert(
          "Login Required",
          "Your login session has expired. Please login again."
        );

        router.replace(
          "/(customer)/(auth)/login"
        );

        return;
      }

      const verifyResponse = await fetch(
        `${PAYMENT_API}/verify-otp`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            otp: finalOtp,
          }),
        }
      );

      const verifyData =
        await readJsonResponse(
          verifyResponse
        );

      if (!verifyResponse.ok) {
        Alert.alert(
          "OTP Verification Failed",
          verifyData.message ||
            "The entered OTP is invalid."
        );

        return;
      }

      /*
       * OTP is now verified.
       * The booking controller will find the
       * verified OTP and allow booking creation.
       */
      const bookingData =
        await createBooking(token);

      Alert.alert(
        "Booking Confirmed",
        "Payment verification and booking creation were successful.",
        [
          {
            text: "Continue",

            onPress: () =>
              goToBookingSuccess(
                bookingData
              ),
          },
        ]
      );
    } catch (error) {
      console.error(
        "Payment verification or booking creation error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to complete the booking";

      Alert.alert(
        "Booking Error",
        message
      );
    } finally {
      setLoading(false);
    }
  };

  const resendPaymentOtp = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        Alert.alert(
          "Login Required",
          "Your login session has expired. Please login again."
        );

        router.replace(
          "/(customer)/(auth)/login"
        );

        return;
      }

      const response = await fetch(
        `${PAYMENT_API}/send-otp`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          /*
           * The updated backend recalculates
           * the payment from these values.
           */
          body: JSON.stringify({
            totalAmount: total,

            selectedServices:
              getParamValue(
                selectedServices
              ),

            bookingType:
              normalizedBookingType,

            paymentOption:
              normalizedPaymentOption,

            paymentMethod:
              normalizedPaymentMethod,
          }),
        }
      );

      const data =
        await readJsonResponse(response);

      if (!response.ok) {
        Alert.alert(
          "OTP Error",
          data.message ||
            "Failed to resend the OTP."
        );

        return;
      }

      resetOtp();

      Alert.alert(
        "OTP Sent",
        "A new OTP has been sent to your registered email."
      );
    } catch (error) {
      console.error(
        "Resend payment OTP error:",
        error
      );

      Alert.alert(
        "Connection Error",
        error instanceof Error
          ? error.message
          : "Cannot connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  const displayedAmount =
    Number(
      getParamValue(advancePayment)
    ) || total;

  const displayedBalance =
    Number(
      getParamValue(balancePayment)
    ) || 0;

  const formatMoney = (
    amount: number
  ) =>
    `LKR ${amount.toLocaleString(
      "en-LK",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.logoRow}>
          <Image
            source={require(
              "../../../assets/LimoIcon/logo.png"
            )}
            style={styles.logo}
          />

          <Text style={styles.logoText}>
            LIMO{"\n"}SALON
          </Text>
        </View>

        <View style={styles.card}>
          <Ionicons
            name="shield-checkmark-outline"
            size={64}
            color="#FFFFFF"
          />

          <Text style={styles.heading}>
            Payment Verification
          </Text>

          <Text style={styles.cardText}>
            We sent a 6-digit OTP to your
            registered email to confirm this
            payment.
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text
              style={styles.summaryLabel}
            >
              Payment Type
            </Text>

            <Text
              style={styles.summaryValue}
            >
              {normalizedPaymentOption ===
              "advance"
                ? normalizedBookingType ===
                  "bridal"
                  ? "20% Bridal Advance"
                  : "10% Advance"
                : "Full Payment"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text
              style={styles.summaryLabel}
            >
              Paying Now
            </Text>

            <Text
              style={styles.summaryValue}
            >
              {formatMoney(
                displayedAmount
              )}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text
              style={styles.summaryLabel}
            >
              Balance
            </Text>

            <Text
              style={styles.summaryValue}
            >
              {formatMoney(
                displayedBalance
              )}
            </Text>
          </View>
        </View>

        <Text style={styles.sentText}>
          Enter payment OTP
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] =
                  ref;
              }}
              value={digit}
              onChangeText={(text) =>
                handleChange(
                  text,
                  index
                )
              }
              onKeyPress={({
                nativeEvent,
              }) => {
                if (
                  nativeEvent.key ===
                  "Backspace"
                ) {
                  handleBackspace(
                    digit,
                    index
                  );
                }
              }}
              keyboardType="number-pad"
              maxLength={1}
              editable={!loading}
              selectTextOnFocus
              style={styles.otpBox}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={resendPaymentOtp}
          disabled={loading}
        >
          <Text
            style={[
              styles.resendText,
              loading &&
                styles.disabledText,
            ]}
          >
            Resend OTP
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            loading &&
              styles.disabledButton,
          ]}
          onPress={verifyPaymentOtp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={styles.buttonText}
            >
              Verify & Create Booking
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color="#FF2D75"
          />

          <Text style={styles.backText}>
            Back to payment
          </Text>
        </TouchableOpacity>

        <View style={styles.noteBox}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#777777"
          />

          <Text style={styles.noteText}>
            This is currently a simulated
            payment flow. No real card
            transaction is processed.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 25,
    paddingTop: 65,
    paddingBottom: 45,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },

  logo: {
    width: 65,
    height: 65,
    marginRight: 10,
  },

  logoText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF1744",
  },

  card: {
    backgroundColor: "#D96C91",
    borderRadius: 18,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 20,
  },

  heading: {
    fontSize: 27,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 14,
    textAlign: "center",
  },

  cardText: {
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },

  summaryBox: {
    borderRadius: 14,
    backgroundColor: "#F7F7F7",
    padding: 16,
    marginBottom: 25,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  summaryLabel: {
    color: "#666666",
    fontSize: 13,
    fontWeight: "600",
  },

  summaryValue: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "800",
  },

  sentText: {
    textAlign: "center",
    fontSize: 17,
    color: "#111111",
    fontWeight: "700",
    marginBottom: 18,
  },

  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 9,
    marginBottom: 18,
  },

  otpBox: {
    width: 44,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#F2F2F2",
    borderWidth: 1,
    borderColor: "#D96C91",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: "#111111",
  },

  resendText: {
    textAlign: "center",
    color: "#408BFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 22,
  },

  disabledText: {
    opacity: 0.5,
  },

  button: {
    backgroundColor: "#FF2D75",
    minHeight: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  backButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 6,
  },

  backText: {
    color: "#FF2D75",
    fontSize: 15,
    fontWeight: "700",
  },

  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F7F7F7",
    padding: 14,
    borderRadius: 12,
    marginTop: 28,
  },

  noteText: {
    flex: 1,
    color: "#777777",
    fontSize: 13,
    lineHeight: 18,
  },
});