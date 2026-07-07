import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function HairLength() {
  const router = useRouter();
  const { selectedServices } = useLocalSearchParams();

  const services = selectedServices
    ? JSON.parse(selectedServices as string)
    : [];

  const [selectedLength, setSelectedLength] = useState("");

  const basePrice = services.reduce(
    (total: number, item: any) => total + Number(item.price || 0),
    0
  );

  const getExtraPrice = (length: string) => {
    if (length === "medium") return 1000;
    if (length === "long") return 2000;
    return 0;
  };

  const finalPrice = basePrice + getExtraPrice(selectedLength);

  const hairLengths = [
    {
      id: "short",
      label: "Short Hair",
      desc: "Above shoulder",
      extra: 0,
    },
    {
      id: "medium",
      label: "Medium Hair",
      desc: "Shoulder length",
      extra: 1000,
    },
    {
      id: "long",
      label: "Long Hair",
      desc: "Below shoulder",
      extra: 2000,
    },
  ];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Hair Length</Text>
      </View>

      {/* STEP NAVIGATION */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>Select one or more services to book</Text>

        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((i) => {
            const isDone = i === 1 || (i === 2 && selectedLength !== "");
            const isActive = i === 2 && selectedLength === "";

            return (
              <View key={i} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isDone && styles.stepDone,
                    isActive && styles.stepActive,
                  ]}
                >
                  {isDone && (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  )}
                </View>

                {i !== 5 && <View style={styles.stepLine} />}
              </View>
            );
          })}
        </View>
      </View>

      {/* SELECTED SERVICES */}
      <Text style={styles.sectionTitle}>Selected Services</Text>

      {services.length === 0 ? (
        <Text style={styles.emptyText}>No services selected</Text>
      ) : (
        services.map((item: any, index: number) => (
          <View key={index} style={styles.serviceCard}>
            <Text style={styles.serviceName}>{item.title}</Text>
            <Text style={styles.servicePrice}>LKR {item.price}</Text>
          </View>
        ))
      )}

      {/* HAIR LENGTH OPTIONS */}
      <Text style={styles.sectionTitle}>Select Hair Length</Text>

      {hairLengths.map((item) => {
        const totalPrice = basePrice + item.extra;

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => setSelectedLength(item.id)}
            style={[
              styles.lengthCard,
              selectedLength === item.id && styles.selectedCard,
            ]}
          >
            <View>
              <Text style={styles.lengthTitle}>{item.label}</Text>
              <Text style={styles.lengthDesc}>{item.desc}</Text>
            </View>

            <Text style={styles.lengthPrice}>
              {item.extra === 0
                ? "Base Price"
                : `Base Price + ${item.extra}`}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* CONTINUE */}
      <TouchableOpacity
      disabled={!selectedLength}
      style={[
        styles.continueBtn,
        !selectedLength && { opacity: 0.5 },
      ]}
  
  onPress={() => {
    if (!selectedLength) return;

    const extraPrice =
      selectedLength === "medium"
        ? 1000
        : selectedLength === "long"
        ? 2000
        : 0;

    const finalPrice = basePrice + extraPrice;

    router.push({
      pathname: "/(customer)/(services)/dateTime",
      params: {
        selectedServices: JSON.stringify(services),
        selectedLength: selectedLength,
        totalAmount: String(finalPrice),
        bookingType: "hair",
      },
    });
  }}
>
  <Text style={styles.continueText}>Continue</Text>
</TouchableOpacity>
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

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 10,
  },

  stepContainer: {
    alignItems: "center",
    marginBottom: 18,
  },

  stepText: {
    fontSize: 13,
    color: "#777",
    marginBottom: 10,
    textAlign: "center",
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  stepCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },

  stepActive: {
    backgroundColor: "#FF2D55",
  },

  stepDone: {
    backgroundColor: "#FF2D55",
  },

  stepLine: {
    width: 25,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },

  serviceCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#ff2d55",
  },

  serviceName: {
    fontWeight: "700",
  },

  servicePrice: {
    color: "#ff2d55",
    marginTop: 4,
  },

  lengthCard: {
    backgroundColor: "#EDEDED",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: "#ff2d55",
  },

  lengthTitle: {
    fontWeight: "700",
  },

  lengthDesc: {
    color: "#777",
    fontSize: 12,
  },

  lengthPrice: {
    color: "#ff2d55",
    fontWeight: "700",
    maxWidth: 170,
    textAlign: "right",
  },

  continueBtn: {
    backgroundColor: "#ff2d55",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 10,
  },

  continueText: {
    color: "#fff",
    fontWeight: "700",
  },

  sectionTitle: {
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 8,
  },

  emptyText: {
    color: "#777",
    marginBottom: 10,
  },
});