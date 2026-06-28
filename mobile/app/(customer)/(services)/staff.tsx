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

export default function Staff() {
    const currentStep = 4; // Staff step
  const router = useRouter();

  const { selectedServices, selectedLength, selectedDate, selectedTime } =
    useLocalSearchParams();

  const [selectedStaff, setSelectedStaff] = useState("");

  const staffList = [
    { id: "any", name: "Any Available Users", role: "maximum availability" },
    { id: "nimesha", name: "Nimesha Fernando", role: "Senior Stylist" },
    { id: "rashmi", name: "Rashmi W.", role: "junior Stylist" },
    { id: "olivia", name: "Olivia Dias", role: "Massage Therephist" },
  ];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Choose Staff</Text>
      </View>

      {/* STEP NAVIGATION */}
      <View style={styles.stepContainer}>
        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((i) => {
            const isDone = i < 4 || (i === 4 && selectedStaff !== "");
            const isActive = i === 4 && selectedStaff === "";

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
        {staffList.map((item) => {
          const active = selectedStaff === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.staffCard, active && styles.staffActive]}
              onPress={() => setSelectedStaff(item.id)}
            >
              <Ionicons name="person-outline" size={42} color="#111" />

              <View style={styles.staffTextBox}>
                <Text style={styles.staffName}>{item.name}</Text>
                <Text style={styles.staffRole}>{item.role}</Text>
              </View>

              <View style={[styles.radio, active && styles.radioActive]} />
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CONTINUE */}
      <View style={styles.bottom}>
        <TouchableOpacity
          disabled={!selectedStaff}
          style={[styles.continue, !selectedStaff && { opacity: 0.5 }]}
          onPress={() => {
            router.push({
              pathname: "/(customer)/(services)/confirm",
              params: {
                selectedServices,
                selectedLength,
                selectedDate,
                selectedTime,
                selectedStaff,
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

  stepDone: {
    backgroundColor: "#FF2D55",
  },

  stepActive: {
    backgroundColor: "#FF2D55",
  },

  stepLine: {
    width: 25,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },

  staffCard: {
    backgroundColor: "#D86B91",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 95,
  },
  stepContainer: {
  alignItems: "center",
  marginBottom: 18,
},

stepText: {
  fontSize: 13,
  color: "#8E8E93",
  marginBottom: 10,
  textAlign: "center",
},

  staffActive: {
    backgroundColor: "#FF2D55",
  },

  staffTextBox: {
    flex: 1,
    marginLeft: 20,
  },

  staffName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },

  staffRole: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },

  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E5E5E5",
  },

  radioActive: {
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#FF2D55",
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

  continue: {
    backgroundColor: "#FF2D55",
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
  },

  continueText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});