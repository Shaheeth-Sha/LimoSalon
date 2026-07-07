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

export default function BridalDressing() {
  const router = useRouter();

  const [selectedServices, setSelectedServices] = useState<any[]>([]);

  const services = [
    {
      id: 1,
      title: "Bridal Dressing Package",
      desc: "Complete bridal preparation including saree draping, makeup, and final styling.",
      duration: "4 hours",
      price: 80000,
    },
    {
      id: 2,
      title: "Bridal Makeup",
      desc: "Professional long-lasting makeup designed to enhance the bride’s features.",
      duration: "2.5 hours",
      price: 20000,
    },
    {
      id: 3,
      title: "Bridal Hairstyling",
      desc: "Elegant hairstyles customized to match the bridal outfit and theme.",
      duration: "2 hours",
      price: 15000,
    },
    {
      id: 4,
      title: "Pre-Bridal Package",
      desc: "Includes facials, waxing, and treatments to prepare the bride before.",
      duration: "60 – 90 minutes",
      price: 15000,
    },
    {
      id: 5,
      title: "Nail Extensions & Bridal Nail Art",
      desc: "Stylish nail enhancements with elegant designs suitable for weddings.",
      duration: "1 – 1.5 hours",
      price: 10000,
    },
    {
      id: 6,
      title: "Saree Draping / Dressing Only",
      desc: "Professional draping of saree or bridal outfit for a perfect look.",
      duration: "75 – 90 minutes",
      price: 15000,
    },
    {
      id: 7,
      title: "Bridal Hair Treatment",
      desc: "Strengthens and smooths hair to make it healthy and manageable.",
      duration: "1 – 3 hours",
      price: 15000,
    },
    {
      id: 8,
      title: "Dressing for Homecoming",
      desc: "Makeup and styling for post-wedding events like reception or homecoming.",
      duration: "1.5 – 3 hours",
      price: 25000,
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Bridal Dressing</Text>
      </View>

      <View style={styles.divider} />

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
                bookingType: "bridal",
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
    borderRadius: 25,
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
    backgroundColor: "#FF2D55",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
  },

  continueText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});