import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const SERVICES_API = "http://10.0.2.2:5000/api/services?category=Hair";

type ServiceItem = {
  _id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  durationText?: string;
  description: string;
};

export default function Hair() {
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await fetch(SERVICES_API);
        const data = await res.json();

        if (res.ok) {
          setServices(data.services);
        }
      } catch (error) {
        console.log("Services load failed:", error);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const total = services
    .filter((s) => selected.includes(s._id))
    .reduce((a, b) => a + b.price, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Hair Care Services</Text>
      </View>

      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>Select one or more services to book</Text>

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

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FF2D55"
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {services.map((item) => {
            const active = selected.includes(item._id);

            return (
              <View
                key={item._id}
                style={[styles.card, active && styles.activeCard]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.desc}>{item.description}</Text>
                  <Text style={styles.time}>
                    {item.durationText || `${item.duration} minutes`}
                  </Text>
                  <Text style={styles.price}>LKR {item.price}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => toggle(item._id)}
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
      )}

      <View style={styles.bottom}>
        <Text style={styles.summaryText}>
          {selected.length} Service selected
        </Text>

        <Text style={styles.summaryPrice}>LKR {total}.00</Text>

        <TouchableOpacity
          disabled={selected.length === 0}
          style={[styles.continue, selected.length === 0 && { opacity: 0.5 }]}
          onPress={() => {
            if (selected.length === 0) return;

            router.push({
              pathname: "/(customer)/(services)/hairLength",
              params: {
                selectedServices: JSON.stringify(
                  services.filter((s) => selected.includes(s._id))
                ),
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
  card: {
    backgroundColor: "#EDEDED",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    minHeight: 115,
  },
  activeCard: {
    borderWidth: 2,
    borderColor: "#FF2D55",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  desc: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    lineHeight: 18,
  },
  time: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF2D55",
    marginTop: 6,
  },
  btn: {
    backgroundColor: "#FF2D55",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 25,
    alignSelf: "flex-end",
  },
  btnActive: {
    backgroundColor: "#999",
  },
  btnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
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