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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function CardPayment() {
  const router = useRouter();
  const { selectedServices, selectedLength, selectedDate, selectedTime, selectedStaff, totalAmount } = useLocalSearchParams();

  const amount = totalAmount ? String(totalAmount) : "4500";

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cardName, setCardName] = useState("");
  const [cvv, setCvv] = useState("");
  const [showCvv, setShowCvv] = useState(false);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 16);
    setCardNumber(cleaned.replace(/(.{4})/g, "$1 ").trim());
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 4);

    if (!cleaned) {
      setExpiry("");
      return;
    }

    let month = cleaned.slice(0, 2);
    const year = cleaned.slice(2);

    if (month.length === 1 && Number(month) > 1) {
      month = `0${month}`;
    }

    if (month.length === 2) {
      const monthNum = Number(month);
      if (monthNum < 1) month = "01";
      if (monthNum > 12) month = "12";
    }

    setExpiry(year ? `${month}/${year}` : month);
  };

  const canPay =
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiry.length === 5 &&
    cardName.trim().length > 0 &&
    cvv.length === 3;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={34} color="#000" />
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
            <View style={styles.cardTop}>
              <View style={styles.smallCircle} />
              <View style={styles.smallCircleLight} />
              <Text style={styles.visaText}>VISA</Text>
            </View>

            <Text style={styles.cardNumber}>1234 5678 9100 1121</Text>

            <View style={styles.cardBottom}>
              <Text style={styles.cardSmallText}>XYZ</Text>

              <View>
                <Text style={styles.expLabel}>EXP{"\n"}DATE</Text>
              </View>

              <Text style={styles.cardSmallText}>01/33</Text>
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.fixedLabel}>Card number</Text>
            <TextInput
              style={styles.rightInput}
              keyboardType="number-pad"
              value={cardNumber}
              onChangeText={formatCardNumber}
              maxLength={19}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor="#BBB"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.fixedLabel}>Expire Date</Text>
            <TextInput
              style={styles.rightInput}
              keyboardType="number-pad"
              value={expiry}
              onChangeText={formatExpiry}
              maxLength={5}
              placeholder="MM/YY"
              placeholderTextColor="#BBB"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.fixedLabel}>Cardholder’s Name</Text>
            <TextInput
              style={styles.rightInput}
              value={cardName}
              onChangeText={setCardName}
              autoCapitalize="characters"
              placeholder="NAME"
              placeholderTextColor="#BBB"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.fixedLabel}>CVV</Text>

            <TextInput
              style={styles.cvvInput}
              keyboardType="number-pad"
              secureTextEntry={!showCvv}
              value={cvv}
              onChangeText={(text) =>
                setCvv(text.replace(/\D/g, "").slice(0, 3))
              }
              maxLength={3}
              placeholder="***"
              placeholderTextColor="#BBB"
            />

            <TouchableOpacity onPress={() => setShowCvv(!showCvv)}>
              <Ionicons
                name={showCvv ? "eye-off" : "eye"}
                size={24}
                color="#555"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sub Total</Text>
              <Text style={styles.totalValue}>LKR {amount}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>LKR {amount}</Text>
            </View>
          </View>

          <TouchableOpacity
            disabled={!canPay}
            style={[styles.payButton, !canPay && styles.disabledButton]}
            onPress={() =>
              router.push({
                pathname: "/(customer)/(services)/bookingSuccess",
                params: { 
                  selectedServices,
                  selectedLength,
                  selectedDate,
                  selectedTime,
                  selectedStaff,
                  totalAmount: amount,
                  paymentMethod: "Credit/Debit Card",
                },
              })
            }
          >
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingHorizontal: 22,
  },

  scrollContent: {
    paddingBottom: 160,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    height: 55,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    marginRight: 34,
  },

  divider: {
    height: 1,
    backgroundColor: "#DDD",
    marginBottom: 45,
  },

  cardBox: {
    height: 220,
    borderRadius: 18,
    padding: 28,
    backgroundColor: "#D86491",
    marginBottom: 45,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  smallCircle: {
    width: 44,
    height: 28,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  smallCircleLight: {
    width: 34,
    height: 28,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.45)",
    marginLeft: -12,
  },

  visaText: {
    marginLeft: "auto",
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    fontStyle: "italic",
  },

  cardNumber: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 52,
  },

  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
  },

  cardSmallText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  expLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 13,
  },

  inputRow: {
    height: 58,
    borderBottomWidth: 1.3,
    borderBottomColor: "#222",
    flexDirection: "row",
    alignItems: "center",
  },

  fixedLabel: {
    width: "45%",
    fontSize: 17,
    color: "#999",
    fontWeight: "600",
  },

  rightInput: {
    flex: 1,
    fontSize: 17,
    color: "#000",
    fontWeight: "800",
    textAlign: "right",
    paddingVertical: 0,
  },

  cvvInput: {
    flex: 1,
    fontSize: 17,
    color: "#000",
    fontWeight: "800",
    textAlign: "right",
    paddingVertical: 0,
    marginRight: 10,
  },

  totalBox: {
    marginTop: 35,
    marginHorizontal: 45,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  totalLabel: {
    fontSize: 22,
    color: "#000",
    fontWeight: "800",
  },

  totalValue: {
    fontSize: 22,
    color: "#000",
    fontWeight: "900",
  },

  payButton: {
    backgroundColor: "#FF1462",
    height: 68,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 45,
    marginBottom: 40,
  },

  disabledButton: {
    opacity: 0.5,
  },

  payButtonText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
});