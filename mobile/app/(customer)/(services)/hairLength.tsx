import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const HAIR_LENGTH_API = "https://limosalon.onrender.com/api/hair-lengths";

type HairLengthItem = {
  _id: string;
  name: string;
  description: string;
  extraPrice: number;
};

export default function HairLength() {
  const router = useRouter();
  const { selectedServices } = useLocalSearchParams();

  const services = selectedServices
    ? JSON.parse(selectedServices as string)
    : [];

  const [selectedLength, setSelectedLength] = useState("");
  const [hairLengths, setHairLengths] = useState<HairLengthItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHairLengths = async () => {
      try {
        const res = await fetch(HAIR_LENGTH_API);
        const data = await res.json();

        if (res.ok) {
          setHairLengths(data.hairLengths);
        }
      } catch (error) {
        console.log("Hair lengths load failed:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHairLengths();
  }, []);

  const basePrice = services.reduce(
    (total: number, item: any) => total + Number(item.price || 0),
    0
  );

  const selectedHairLength = hairLengths.find(
    (item) => item._id === selectedLength
  );

  const finalPrice = basePrice + Number(selectedHairLength?.extraPrice || 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Hair Length</Text>
      </View>

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

      <Text style={styles.sectionTitle}>Select Hair Length</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#ff2d55" />
      ) : (
        hairLengths.map((item) => (
          <TouchableOpacity
            key={item._id}
            onPress={() => setSelectedLength(item._id)}
            style={[
              styles.lengthCard,
              selectedLength === item._id && styles.selectedCard,
            ]}
          >
            <View>
              <Text style={styles.lengthTitle}>{item.name}</Text>
              <Text style={styles.lengthDesc}>{item.description}</Text>
            </View>

            <Text style={styles.lengthPrice}>
              {item.extraPrice === 0
                ? "Base Price"
                : `Base Price + ${item.extraPrice}`}
            </Text>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity
        disabled={!selectedLength}
        style={[styles.continueBtn, !selectedLength && { opacity: 0.5 }]}
        onPress={() => {
          if (!selectedLength) return;

          router.push({
            pathname: "/(customer)/(services)/dateTime",
            params: {
              selectedServices: JSON.stringify(services),
              selectedLength: JSON.stringify(selectedHairLength),
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
    fontSize: 16,
  },

  serviceTime: {
    color: "#777",
    marginTop: 5,
    fontSize: 13,
  },

  servicePrice: {
    color: "#ff2d55",
    marginTop: 5,
    fontWeight: "700",
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
    backgroundColor: "#fff",
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