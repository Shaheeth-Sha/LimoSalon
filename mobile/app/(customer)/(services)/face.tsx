import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function FaceCareServices() {
  const router = useRouter();

  const [selectedServices, setSelectedServices] = useState<any[]>([]);

  const services = [
    {
      id: 1,
      title: "Basic Facial",
      desc: "Cleanses, exfoliates, and nourishes the skin for a fresh and healthy look.",
      duration: "45 – 60 minutes",
      price: 4500,
    },
    {
      id: 2,
      title: "Deep Cleansing Facial",
      desc: "Removes dirt, oil, and impurities from deep within pores.",
      duration: "60 minutes",
      price: 5000,
    },
    {
      id: 3,
      title: "Whitening / Brightening Facial",
      desc: "Improves skin tone and adds a brighter, glowing appearance.",
      duration: "60 – 75 minutes",
      price: 6000,
    },
    {
      id: 4,
      title: "Anti-Aging Facial",
      desc: "Reduces fine lines and wrinkles while improving skin firmness.",
      duration: "60 – 90 minutes",
      price: 7000,
    },
    {
      id: 5,
      title: "Acne Treatment Facial",
      desc: "Targets pimples and oily skin to reduce acne and prevent breakouts.",
      duration: "1 – 1.5 hours",
      price: 6000,
    },
    {
      id: 6,
      title: "Gold Facial",
      desc: "Uses gold-based products to enhance skin radiance and glow.",
      duration: "75 – 90 minutes",
      price: 5000,
    },
    {
      id: 7,
      title: "Fruit Facial",
      desc: "Uses natural fruit extracts to nourish and refresh the skin.",
      duration: "45 – 60 minutes",
      price: 4500,
    },
    {
      id: 8,
      title: "Herbal Facial",
      desc: "Uses herbal ingredients to gently treat and soothe sensitive skin.",
      duration: "60 minutes",
      price: 5500,
    },
    {
      id: 9,
      title: "Face Bleaching",
      desc: "Lightens facial hair and evens out skin tone for a brighter look.",
      duration: "20 – 30 minutes",
      price: 4000,
    },
    {
      id: 10,
      title: "Threading (Eyebrows/Full Face)",
      desc: "Removes unwanted facial hair using thread for a clean defined look.",
      duration: "15 – 25 minutes",
      price: 1500,
    },
  ];

  const toggleService = (service: any) => {
    const exists = selectedServices.some((s) => s.id === service.id);

    if (exists) {
      setSelectedServices(selectedServices.filter((s) => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const totalAmount = selectedServices.reduce(
    (sum, item) => sum + item.price,
    0
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Face Care Services</Text>
      </View>

      <View style={styles.divider} />

      {/* STEP NAVIGATION - 4 STEPS */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>Select one or more services to book</Text>

        <View style={styles.stepRow}>
          {[1, 2, 3, 4].map((i) => {
            const isDone = i === 1 && selectedServices.length > 0;
            const isActive = i === 1 && selectedServices.length === 0;

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

                {i !== 4 && <View style={styles.stepLine} />}
              </View>
            );
          })}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {services.map((item) => {
          const selected = selectedServices.some((s) => s.id === item.id);

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.serviceCard, selected && styles.selectedCard]}
              onPress={() => toggleService(item)}
              activeOpacity={0.8}
            >
              <View style={styles.serviceContent}>
                <Text style={styles.serviceTitle}>{item.title}</Text>
                <Text style={styles.serviceDesc}>{item.desc}</Text>
                <Text style={styles.duration}>{item.duration}</Text>
                <Text style={styles.price}>
                  LKR {item.price.toLocaleString()}
                </Text>
              </View>

              <View style={[styles.bookBtn, selected && styles.addedBtn]}>
                <Text style={styles.bookText}>
                  {selected ? "Added" : "Book"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 120 }} />
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
          disabled={selectedServices.length === 0}
          style={[
            styles.continueBtn,
            selectedServices.length === 0 && { opacity: 0.5 },
          ]}
          onPress={() =>
            router.push({
              pathname: "/(customer)/(services)/dateTime",
              params: {
                selectedServices: JSON.stringify(selectedServices),
                selectedLength: "",
                totalAmount: String(totalAmount),
                bookingType: "face",
              },
            })
          }
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
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
  },

  headerText: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 10,
  },

  divider: {
    height: 1,
    backgroundColor: "#DADADA",
    marginTop: 12,
    marginBottom: 14,
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
    justifyContent: "center",
  },

  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  stepCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
    width: 34,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 5,
  },

  serviceCard: {
    backgroundColor: "#EDEDED",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
  },

  selectedCard: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#FF2D55",
  },

  serviceContent: {
    flex: 1,
    paddingRight: 8,
  },

  serviceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
  },

  serviceDesc: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
    lineHeight: 16,
  },

  duration: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  price: {
    fontSize: 13,
    color: "#FF2D55",
    fontWeight: "800",
    marginTop: 4,
  },

  bookBtn: {
    backgroundColor: "#FF2D55",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },

  addedBtn: {
    backgroundColor: "#888",
  },

  bookText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  bottomBox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#DADADA",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },

  summaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  summaryPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },

  continueBtn: {
    backgroundColor: "#FF0A5B",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },

  continueText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});