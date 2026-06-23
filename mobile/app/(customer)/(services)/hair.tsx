import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Hair() {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);

  const services = [
    { id: 1, title: "Hair Cutting & Styling", desc: "A professional trimming or styling of hair based on your preferred look.", time: "30 – 45 minutes", price: 2500 },
    { id: 2, title: "Hair Wash", desc: "Cleanses the scalp and hair while adding softness and shine.", time: "30 minutes", price: 1200 },
    { id: 3, title: "Hair Blow Dry", desc: "Dries and styles hair using a blow dryer for a voluminous finish.", time: "30 – 45 minutes", price: 6000 },
    { id: 4, title: "Hair Straightening (Temporary)", desc: "Uses heat tools to temporarily straighten hair.", time: "45 – 60 minutes", price: 10000 },
    { id: 5, title: "Hair Coloring", desc: "Professional hair coloring for a new look.", time: "1.5 – 3 hours", price: 8200 },
    { id: 6, title: "Hair Highlights", desc: "Adds lighter strands for brightness.", time: "45 – 60 minutes", price: 10000 },
    { id: 7, title: "Hair Spa Treatment", desc: "Deep nourishment treatment.", time: "30 – 45 minutes", price: 5000 },
    { id: 8, title: "Oil Massage (Head Massage)", desc: "Improves blood circulation.", time: "30 – 45 minutes", price: 2500 },
    { id: 9, title: "Keratin Treatment", desc: "Smooths and strengthens hair.", time: "2 – 4 hours", price: 20000 },
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
    <SafeAreaView style={styles.container}>

      {/* HEADER (FIGMA FIXED) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Hair Care Services</Text>

        <View style={{ width: 26 }} />
      </View>

      {/* STEP INDICATOR (IMPORTANT FIX) */}
      <View style={styles.stepBox}>
        <Text style={styles.stepText}>
          Select one or more services to book
        </Text>

        <View style={styles.stepRow}>
          <View style={styles.stepActive} />
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
        </View>
      </View>

      {/* SERVICE LIST */}
      <ScrollView showsVerticalScrollIndicator={false}>

        {services.map((item) => {
          const active = selected.includes(item.id);

          return (
            <View
              key={item.id}
              style={[styles.card, active && styles.cardActive]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.desc}>{item.desc}</Text>
                <Text style={styles.time}>{item.time}</Text>
                <Text style={styles.price}>LKR {item.price}</Text>
              </View>

              <TouchableOpacity
                onPress={() => toggle(item.id)}
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

      {/* BOTTOM SUMMARY (FIGMA FIXED) */}
      <View style={styles.bottom}>
        <Text style={styles.bottomText}>
          {selected.length} Service selected
        </Text>

        <Text style={styles.bottomPrice}>
          LKR {total}.00
        </Text>

        <TouchableOpacity style={styles.continue}>
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

/* ================= FIGMA MATCH STYLES ================= */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  /* HEADER FIX */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },

  /* STEP BOX FIX */
  stepBox: {
    backgroundColor: "#ECEFF3",   // IMPORTANT (not white)
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },

  stepText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },

  stepRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },

  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "#C4C4C4",
  },

  stepActive: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "#FF2D55",
  },

  /* CARD FIX (Figma white cards) */
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
  },

  cardActive: {
    borderColor: "#FF2D55",
    borderWidth: 2,
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
    marginTop: 5,
  },

  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF2D55",
    marginTop: 5,
  },

  btn: {
    backgroundColor: "#FF2D55",
    paddingHorizontal: 16,
    paddingVertical: 8,
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

  /* BOTTOM BAR FIX */
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

  bottomText: {
    fontSize: 13,
    fontWeight: "600",
  },

  bottomPrice: {
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