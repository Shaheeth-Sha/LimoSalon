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

type NailStyleItem = {
  _id: string;
  name: string;
  description: string;
  extraPrice: number;
  swatchColor: string;
};

// Static list — unlike hairLength.tsx these aren't fetched from the
// backend. There's no add-on pricing model for a pure style choice,
// but extraPrice is kept (always 0) so the object shape stays
// compatible with what dateTime.tsx/payment.tsx already expect from
// the "selectedLength" param.
// NOTE: no real swatch photos exist yet in assets/LimoImage for these
// 8 styles, so each option uses a solid color swatch as a stand-in.
// Swap swatchColor for an Image source once real photos are available.
//
// OPEN ISSUE (flagged, not yet resolved): this still reuses the
// "selectedLength" param key/shape from the Hair flow. Needs
// confirm.tsx (and bookingSuccess.tsx/bookingDetails.tsx) reviewed
// together to fix the display label properly without breaking the
// data flow — see chat discussion.
const NAIL_STYLES: NailStyleItem[] = [
  { _id: "classic", name: "Classic", description: "Clean, natural finish", extraPrice: 0, swatchColor: "#E8B4B8" },
  { _id: "french", name: "French", description: "Classic white-tip look", extraPrice: 0, swatchColor: "#FDF6EC" },
  { _id: "ombre", name: "Ombre", description: "Soft color gradient fade", extraPrice: 0, swatchColor: "#D8A7CA" },
  { _id: "matte", name: "Matte", description: "Rich, non-glossy finish", extraPrice: 0, swatchColor: "#8B3A62" },
  { _id: "chrome", name: "Chrome", description: "Mirror-like metallic shine", extraPrice: 0, swatchColor: "#C7CBD1" },
  { _id: "minimal", name: "Minimal", description: "Subtle, understated lines", extraPrice: 0, swatchColor: "#F5F1EA" },
  { _id: "floral", name: "Floral", description: "Hand-painted flower detail", extraPrice: 0, swatchColor: "#F7CAD0" },
  { _id: "3d-art", name: "3D Art", description: "Bold, sculpted embellishments", extraPrice: 0, swatchColor: "#6C3483" },
];

const getParamValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

export default function NailStyle() {
  const router = useRouter();

  const {
    selectedServices,
    totalAmount,
    bookingType,
  } = useLocalSearchParams();

  const selectedServicesText = getParamValue(selectedServices);
  const totalAmountText = getParamValue(totalAmount);
  const bookingTypeText = getParamValue(bookingType);

  const services = selectedServicesText
    ? JSON.parse(selectedServicesText)
    : [];

  const [selectedStyleId, setSelectedStyleId] = useState("");

  const selectedStyle = NAIL_STYLES.find(
    (item) => item._id === selectedStyleId
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Nail Style</Text>
      </View>

      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>Select your nail style</Text>

        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((i) => {
            // Matches hairLength.tsx's behavior exactly: this step's
            // own dot checkmarks the instant a selection is made, not
            // only after navigating away from this screen.
            const isDone = i === 1 || (i === 2 && selectedStyleId !== "");
            const isActive = i === 2 && selectedStyleId === "";

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

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Selected Services</Text>

        {services.length === 0 ? (
          <Text style={styles.emptyText}>No services selected</Text>
        ) : (
          services.map((item: any, index: number) => (
            <View key={index} style={styles.serviceCard}>
              <Text style={styles.serviceName}>{item.name}</Text>
              <Text style={styles.serviceTime}>
                {item.durationText || `${item.duration} minutes`}
              </Text>
              <Text style={styles.servicePrice}>
                LKR {Number(item.price).toLocaleString()}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Select Nail Style</Text>

        <View style={styles.grid}>
          {NAIL_STYLES.map((item) => (
            <TouchableOpacity
              key={item._id}
              onPress={() => setSelectedStyleId(item._id)}
              style={[
                styles.styleCard,
                selectedStyleId === item._id && styles.selectedCard,
              ]}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: item.swatchColor },
                ]}
              />

              <Text style={styles.styleName}>{item.name}</Text>
              <Text style={styles.styleDesc}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <TouchableOpacity
        disabled={!selectedStyleId}
        style={[styles.continueBtn, !selectedStyleId && { opacity: 0.5 }]}
        onPress={() => {
          if (!selectedStyleId) return;

          router.push({
            pathname: "/(customer)/(services)/dateTime",
            params: {
              selectedServices: selectedServicesText,
              selectedLength: JSON.stringify(selectedStyle),
              totalAmount: totalAmountText,
              bookingType: bookingTypeText || "nail",
            },
          });
        }}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

// =====================================================
// App primary color: #FF2D75 (matches project design spec)
// Was #ff2d55/#FF2D55 throughout — fixed to the correct hex.
// =====================================================
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
    backgroundColor: "#FF2D75",
  },

  stepDone: {
    backgroundColor: "#FF2D75",
  },

  stepLine: {
    width: 25,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
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

  serviceCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#FF2D75",
  },

  serviceName: {
    fontWeight: "700",
    fontSize: 16,
  },

  serviceTime: {
    color: "#777",
    marginTop: 5,
    fontSize: 13,
  },

  servicePrice: {
    color: "#FF2D75",
    marginTop: 5,
    fontWeight: "700",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  styleCard: {
    width: "48%",
    backgroundColor: "#EDEDED",
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: "#FF2D75",
    backgroundColor: "#fff",
  },

  swatch: {
    width: "100%",
    height: 70,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#00000014",
  },

  styleName: {
    fontWeight: "700",
    fontSize: 14,
  },

  styleDesc: {
    color: "#777",
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },

  continueBtn: {
    backgroundColor: "#FF2D75",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },

  continueText: {
    color: "#fff",
    fontWeight: "700",
  },
});