import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Hair() {
  const step = 1;
  const router = useRouter();

  const [selected, setSelected] = useState<number[]>([]);


  const services = [
    { id: 1, title: "Hair Cutting & Styling", desc: "A professional trimming or styling of hair based on your preferred look.", time: "30 – 45 minutes", price: 2500 },
    { id: 2, title: "Hair Wash", desc: "Cleanses the scalp and hair while adding softness and shine.", time: "30 minutes", price: 1200 },
    { id: 3, title: "Hair Blow Dry", desc: "Dries and styles hair using a blow dryer for a voluminous finish.", time: "30 – 45 minutes", price: 6000 },
    { id: 4, title: "Hair Straightening (Temporary)", desc: "Uses heat tools to temporarily straighten curly or wavy hair.", time: "45 – 60 minutes", price: 10000 },
    { id: 5, title: "Hair Coloring", desc: "Changes hair color using professional dyes for a new look.", time: "1.5 – 3 hours", price: 8200 },
    { id: 6, title: "Hair Highlights", desc: "Adds lighter strands to create dimension and brightness.", time: "45 – 60 minutes", price: 10000 },
    { id: 7, title: "Hair Spa Treatment", desc: "Deep conditioning treatment that nourishes and repairs damaged hair.", time: "30 – 45 minutes", price: 5000 },
    { id: 8, title: "Oil Massage (Head Massage)", desc: "Relaxing massage that improves blood circulation and hair health.", time: "30 – 45 minutes", price: 2500 },
    { id: 9, title: "Keratin Treatment", desc: "Smooths and strengthens hair while reducing frizz.", time: "2 – 4 hours", price: 20000 },
    { id: 10, title: "Hair Rebonding", desc: "Chemically straightens hair for a sleek long-lasting look.", time: "3 – 5 hours", price: 18000 },
  ];

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const total = services
    .filter((s) => selected.includes(s.id))
    .reduce((a, b) => a + b.price, 0);

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Hair Care Services</Text>
      </View>

    {/* STEP NAVIGATION */}
<View style={styles.stepContainer}>
  <Text style={styles.stepText}>
    Select one or more services to book
  </Text>

  <View style={styles.stepRow}>
    {[1, 2, 3, 4, 5].map((i) => {
      const isDone = selected.length > 0 && i === 1;
      const isActive = selected.length === 0 && i === 1;

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

      {/* LIST */}
      <ScrollView showsVerticalScrollIndicator={false}>

        {services.map((item) => {
          const active = selected.includes(item.id);

          return (
            <View
              key={item.id}
              style={[styles.card, active && styles.activeCard]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.desc}>{item.desc}</Text>
                <Text style={styles.time}>{item.time}</Text>
                <Text style={styles.price}>LKR {item.price}</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  toggle(item.id);
                }}
                style={[styles.btn, active && styles.btnActive]}
              >
                <Text style={styles.btnText}>
                  {active ? "Added" : "Book"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* BOTTOM */}
      <View style={styles.bottom}>
        <Text style={styles.summaryText}>
          {selected.length} Service selected
        </Text>

        <Text style={styles.summaryPrice}>
          LKR {total}.00
        </Text>

        <TouchableOpacity
        disabled={selected.length === 0}
        style={[
          styles.continue,
          selected.length === 0 && { opacity: 0.5 },
        ]}
  
  onPress={() => {
    if (selected.length === 0) return;

    router.push({
      pathname: "/(customer)/(services)/hairLength",
      params: {
        selectedServices: JSON.stringify(services.filter((s) => selected.includes(s.id))),
        bookingType: "hair",
      },
    });
  }}
>
  <Text style={styles.continueText}>Continue</Text>
</TouchableOpacity>
      </View>

    </View>
  );
}

/* ================= STYLES ================= */

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

  /* STEP NAV FIGMA */
  stepContainer: {
    alignItems: "center",
    marginBottom: 10,
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
  },

  stepActive: {
    backgroundColor: "#FF2D55",
  },

  stepDone: {
    backgroundColor: "#FF2D55",
    justifyContent: "center",
    alignItems: "center",
  },

  stepLine: {
    width: 25,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },

  /* CARD */
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
  },

  activeCard: {
    borderWidth: 2,
    borderColor: "#FF2D55",
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
  },

  desc: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  time: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
  },

  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF2D55",
    marginTop: 6,
  },

  btn: {
    backgroundColor: "#FF2D55",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: "center",
  },

  btnActive: {
    backgroundColor: "#999",
  },

  btnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  /* BOTTOM */
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 15,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },

  summaryText: {
    fontSize: 13,
    fontWeight: "600",
  },

  summaryPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF2D55",
    marginTop: 4,
  },

  continue: {
    marginTop: 10,
    backgroundColor: "#FF2D55",
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
  },

  continueText: {
    color: "#fff",
    fontWeight: "700",
  },
});