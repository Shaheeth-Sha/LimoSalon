import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const API_URL = "http://10.0.2.2:5000/api/payments";

export default function CardPayment() {
  const router = useRouter();

  const {
    selectedServices,
    selectedLength,
    selectedDate,
    selectedTime,
    selectedStaff,
    totalAmount,
  } = useLocalSearchParams();

  const total = totalAmount ? Number(totalAmount) : 0;
  const advancePayment = total > 10000 ? total * 0.1 : 0;

  const [paymentOption, setPaymentOption] = useState(
    advancePayment > 0 ? "advance" : "full"
  );

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cardName, setCardName] = useState("");
  const [cvv, setCvv] = useState("");
  const [showCvv, setShowCvv] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tracks whether the user has left each field, so errors only show
  // once they've actually finished typing in it (not on first keystroke)
  const [touched, setTouched] = useState({
    cardNumber: false,
    expiry: false,
    cardName: false,
    cvv: false,
  });
  const markTouched = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const amountToPay = paymentOption === "advance" ? advancePayment : total;
  const balancePayment = paymentOption === "advance" ? total - advancePayment : 0;

  const formatMoney = (amount: number) =>
    `LKR ${amount.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
    })}`;

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 16);
    setCardNumber(cleaned.replace(/(.{4})/g, "$1 ").trim());
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 4);

    if (cleaned.length === 0) {
      setExpiry("");
      return;
    }

    if (cleaned.length === 1) {
      const firstDigit = Number(cleaned);
      setExpiry(firstDigit > 1 ? `0${firstDigit}/` : cleaned);
      return;
    }

    let month = cleaned.slice(0, 2);
    const year = cleaned.slice(2);
    const monthNum = Number(month);

    if (monthNum < 1) month = "01";
    if (monthNum > 12) month = "12";

    setExpiry(year.length > 0 ? `${month}/${year}` : month);
  };

  const isExpiryValid = () => {
    if (expiry.length !== 5) return false;

    const [month, year] = expiry.split("/");
    const monthNum = Number(month);
    const yearNum = Number(year);

    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    if (monthNum < 1 || monthNum > 12) return false;
    if (yearNum < currentYear) return false;
    if (yearNum === currentYear && monthNum < currentMonth) return false;
    if (yearNum > currentYear + 15) return false;

    return true;
  };

  const isCardNumberValid = cardNumber.replace(/\s/g, "").length === 16;
  const isNameValid = cardName.trim().length > 1;
  const isCvvValid = cvv.length === 3;

  const canPay =
    isCardNumberValid && isExpiryValid() && isNameValid && isCvvValid;

  // Live preview values shown on the card graphic
  const previewNumber = cardNumber.length > 0 ? cardNumber : "•••• •••• •••• ••••";
  const previewName = cardName.length > 0 ? cardName : "YOUR NAME";
  const previewExpiry = expiry.length > 0 ? expiry : "MM/YY";

  const handlePay = async () => {
    if (loading) return; // guard against double-taps firing two requests

    try {
      setLoading(true);

      const token =
        (await AsyncStorage.getItem("customerToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) {
        Alert.alert("Error", "Please login again.");
        return;
      }

      const res = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountToPay,
          paymentMethod: "Credit/Debit Card",
        }),
      });

      // Read the body as text first — some error responses (404 pages,
      // proxy errors, empty bodies) aren't valid JSON, and calling
      // res.json() directly on those throws before we ever get to check
      // res.ok, which was swallowing the real error and blocking navigation.
      const rawBody = await res.text();
      let data: any = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch (parseErr) {
        console.error("send-otp: non-JSON response", rawBody);
        Alert.alert(
          "Error",
          `Unexpected server response (status ${res.status}). Check that the API server is running at ${API_URL}.`
        );
        return;
      }

      if (!res.ok) {
        console.error("send-otp failed", res.status, data);
        Alert.alert("Error", data.message || `Failed to send payment OTP (status ${res.status})`);
        return;
      }

      Alert.alert("OTP Sent", "Please check your registered email.");

      router.push({
        pathname: "/(customer)/(services)/paymentOtp",
        params: {
          selectedServices,
          selectedLength,
          selectedDate,
          selectedTime,
          selectedStaff,
          totalAmount: String(total),
          advancePayment: String(amountToPay),
          balancePayment: String(balancePayment),
          paymentMethod: "Credit/Debit Card",
        },
      });
    } catch (err) {
      // Logged so you can see the actual network/JS error while testing,
      // instead of only a generic alert
      console.error("handlePay error:", err);
      Alert.alert("Error", "Cannot connect to backend. Check your network settings and that the server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={30} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Credit & Debit Card</Text>
        </View>

        <View style={styles.divider} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.cardBox}>
            <View style={styles.cardTopRow}>
              <View style={styles.chip}>
                <View style={styles.chipLineH} />
                <View style={styles.chipLineV} />
              </View>

              <Ionicons
                name="wifi"
                size={22}
                color="rgba(255,255,255,0.85)"
                style={styles.contactlessIcon}
              />

              <Text style={styles.visaText}>VISA</Text>
            </View>

            <Text style={styles.cardNumberText}>{previewNumber}</Text>

            <View style={styles.cardBottom}>
              <View style={styles.nameBlock}>
                <Text style={styles.cardFieldLabel}>CARD HOLDER</Text>
                <Text style={styles.cardFieldValue} numberOfLines={1}>
                  {previewName.toUpperCase()}
                </Text>
              </View>

              <View style={styles.expBlock}>
                <Text style={styles.cardFieldLabel}>EXPIRES</Text>
                <Text style={styles.cardFieldValue}>{previewExpiry}</Text>
              </View>
            </View>
          </View>

          <View>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Card Number</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={cardNumber}
                onChangeText={formatCardNumber}
                onBlur={() => markTouched("cardNumber")}
                maxLength={19}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor="#BBB"
              />
            </View>
            {touched.cardNumber && !isCardNumberValid && (
              <Text style={styles.errorText}>Enter a 16-digit card number</Text>
            )}
          </View>

          <View>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Expire Date</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={expiry}
                onChangeText={formatExpiry}
                onBlur={() => markTouched("expiry")}
                maxLength={5}
                placeholder="MM/YY"
                placeholderTextColor="#BBB"
              />
            </View>
            {touched.expiry && !isExpiryValid() && (
              <Text style={styles.errorText}>
                Enter a valid, unexpired MM/YY date
              </Text>
            )}
          </View>

          <View>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Cardholder Name</Text>
              <TextInput
                style={styles.input}
                value={cardName}
                onChangeText={(text) =>
                  setCardName(text.replace(/[^a-zA-Z\s]/g, ""))
                }
                onBlur={() => markTouched("cardName")}
                autoCapitalize="characters"
                placeholder="NAME"
                placeholderTextColor="#BBB"
              />
            </View>
            {touched.cardName && !isNameValid && (
              <Text style={styles.errorText}>Enter the name on the card</Text>
            )}
          </View>

          <View>
            <View style={styles.inputRow}>
              <Text style={styles.label}>CVV</Text>
              <TextInput
                style={styles.cvvInput}
                keyboardType="number-pad"
                secureTextEntry={!showCvv}
                value={cvv}
                maxLength={3}
                placeholder="***"
                placeholderTextColor="#BBB"
                onChangeText={(text) =>
                  setCvv(text.replace(/\D/g, "").slice(0, 3))
                }
                onBlur={() => markTouched("cvv")}
              />
              <TouchableOpacity onPress={() => setShowCvv(!showCvv)}>
                <Ionicons
                  name={showCvv ? "eye-off" : "eye"}
                  size={22}
                  color="#555"
                />
              </TouchableOpacity>
            </View>
            {touched.cvv && !isCvvValid && (
              <Text style={styles.errorText}>Enter the 3-digit CVV</Text>
            )}
          </View>

          {advancePayment > 0 && (
            <View style={styles.paymentBox}>
              <Text style={styles.paymentTitle}>Payment Option</Text>

              <TouchableOpacity
                style={[
                  styles.option,
                  paymentOption === "advance" && styles.selected,
                ]}
                onPress={() => setPaymentOption("advance")}
              >
                <Text style={styles.optionText}>Pay Advance Only</Text>
                <Text style={styles.optionAmount}>
                  {formatMoney(advancePayment)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.option,
                  paymentOption === "full" && styles.selected,
                ]}
                onPress={() => setPaymentOption("full")}
              >
                <Text style={styles.optionText}>Pay Full Amount</Text>
                <Text style={styles.optionAmount}>{formatMoney(total)}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Paying Now</Text>
              <Text style={styles.summaryValue}>{formatMoney(amountToPay)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Balance Amount</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(balancePayment)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Booking</Text>
              <Text style={styles.summaryValue}>{formatMoney(total)}</Text>
            </View>
          </View>

          <TouchableOpacity
            disabled={!canPay || loading}
            style={[styles.payButton, (!canPay || loading) && styles.disabled]}
            onPress={handlePay}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payText}>Pay {formatMoney(amountToPay)}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: "#fff" },
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 22,
    backgroundColor: "#fff",
  },
  scrollContent: { paddingBottom: 80 },
  header: { flexDirection: "row", alignItems: "center", height: 52 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    marginRight: 30,
  },
  divider: { height: 1, backgroundColor: "#ddd", marginBottom: 22 },

  cardBox: {
    height: 205,
    borderRadius: 20,
    backgroundColor: "#B84B72",
    padding: 22,
    marginBottom: 24,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center" },
  chip: {
    width: 42,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#E8C878",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  chipLineH: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  chipLineV: {
    position: "absolute",
    width: 1,
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  contactlessIcon: { marginLeft: 14, transform: [{ rotate: "90deg" }] },
  visaText: {
    marginLeft: "auto",
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    fontStyle: "italic",
  },
  cardNumberText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  nameBlock: { maxWidth: "65%" },
  expBlock: { alignItems: "flex-end" },
  cardFieldLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 3,
  },
  cardFieldValue: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 1,
  },

  inputRow: {
    height: 54,
    borderBottomWidth: 1,
    borderColor: "#aaa",
    flexDirection: "row",
    alignItems: "center",
  },
  label: { width: "42%", color: "#999", fontSize: 15 },
  input: {
    flex: 1,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  cvvInput: {
    flex: 1,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginRight: 10,
  },
  errorText: {
    color: "#FF1462",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 4,
  },

  paymentBox: { marginTop: 24 },
  paymentTitle: { fontSize: 17, fontWeight: "800", marginBottom: 12 },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  selected: { backgroundColor: "#FFD5E3", borderColor: "#FF1462" },
  optionText: { fontSize: 14, fontWeight: "600", color: "#111" },
  optionAmount: { fontSize: 14, fontWeight: "800", color: "#111" },

  summary: { marginTop: 24 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  summaryLabel: { fontSize: 15, color: "#555", fontWeight: "600" },
  summaryValue: { fontSize: 15, color: "#111", fontWeight: "800" },

  payButton: {
    height: 58,
    backgroundColor: "#FF1462",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 26,
  },
  disabled: { opacity: 0.5 },
  payText: { color: "#fff", fontSize: 19, fontWeight: "800" },
});