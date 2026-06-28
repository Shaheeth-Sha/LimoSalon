import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function Payment() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [paymentMethod, setPaymentMethod] = useState("");

  const totalAmount = params.totalAmount ? String(params.totalAmount) : "4500";

  const methods = [
    {
      id: "card",
      title: "Credit/Debit Card",
      sub: "Visa, Master Card, Amex",
      icon: "card-outline",
    },
    {
      id: "salon",
      title: "Pay at Salon",
      sub: "Physically",
      icon: "cash-outline",
    },
  ];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Payment Options</Text>
      </View>

      <View style={styles.divider} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Select Your Payment Method</Text>

        {methods.map((item) => {
          const active = paymentMethod === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.paymentCard, active && styles.paymentActive]}
              onPress={() => setPaymentMethod(item.id)}
            >
              <View style={[styles.radio, active && styles.radioActive]} />

              <Ionicons
                name={item.icon as any}
                size={34}
                color="#333"
                style={styles.icon}
              />

              <View style={styles.methodTextBox}>
                <Text style={styles.methodTitle}>{item.title}</Text>
                <Text style={styles.methodSub}>{item.sub}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>LKR {totalAmount}</Text>
        </View>

        <TouchableOpacity
          disabled={!paymentMethod}
          style={[styles.payBtn, !paymentMethod && { opacity: 0.5 }]}
          onPress={() => {
            // next frame path
            router.push({
              pathname: "/(customer)/(services)/paymentSuccess",
              params: {
                ...params,
                paymentMethod,
                totalAmount,
              },
            });
          }}
        >
          <Text style={styles.payText}>Pay LKR {totalAmount}</Text>
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
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  headerText: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 10,
  },

  divider: {
    height: 1,
    backgroundColor: "#DADADA",
    marginBottom: 35,
  },

  title: {
    fontSize: 15,
    color: "#111",
    marginBottom: 28,
  },

  paymentCard: {
    backgroundColor: "#D86B91",
    borderRadius: 8,
    padding: 18,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C94E78",
  },

  paymentActive: {
    backgroundColor: "#FF2D55",
  },

  radio: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginRight: 22,
  },

  radioActive: {
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#FF2D55",
  },

  icon: {
    marginRight: 20,
  },

  methodTextBox: {
    flex: 1,
    alignItems: "center",
  },

  methodTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },

  methodSub: {
    fontSize: 15,
    color: "#fff",
    marginTop: 4,
  },

  amountRow: {
    marginTop: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  amountLabel: {
    fontSize: 15,
    color: "#666",
  },

  amountValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FF2D55",
  },

  payBtn: {
    marginTop: 55,
    backgroundColor: "#FF0A5B",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  payText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
});