import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const STAFF_API = "http://10.0.2.2:5000/api/staff?category=Hair";

type StaffItem = {
  _id: string;
  name: string;
  role: string;
  category?: string;
  experience?: number;
  rating?: number;
  image?: string;
  available?: boolean;
};

export default function Staff() {
  const router = useRouter();

  const {
    selectedServices,
    selectedLength,
    selectedDate,
    selectedTime,
    totalAmount,
    bookingType,
  } = useLocalSearchParams();

  const [selectedStaff, setSelectedStaff] = useState("");
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);

  const booking = Array.isArray(bookingType) ? bookingType[0] : bookingType;
  const isHairFlow = booking === "hair";

  const totalSteps = isHairFlow ? 5 : 4;
  const currentStep = isHairFlow ? 4 : 3;

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const res = await fetch(STAFF_API);
        const data = await res.json();

        if (res.ok) {
          const anyStaff: StaffItem = {
            _id: "any",
            name: "Any Available Staff",
            role: "maximum availability",
          };

          setStaffList([anyStaff, ...data.staff]);
        }
      } catch (error) {
        console.log("Staff load failed:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
  }, []);

  const selectedStaffData = staffList.find((item) => item._id === selectedStaff);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Choose Staff</Text>
      </View>

      <View style={styles.stepContainer}>
        <View style={styles.stepRow}>
          {Array.from({ length: totalSteps }, (_, index) => index + 1).map((i) => {
            const isDone =
              i < currentStep || (i === currentStep && selectedStaff !== "");
            const isActive = i === currentStep && selectedStaff === "";

            return (
              <View key={i} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    !isHairFlow && styles.bodyStepCircle,
                    isDone && styles.stepDone,
                    isActive && styles.stepActive,
                  ]}
                >
                  {isDone && (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  )}
                </View>

                {i !== totalSteps && (
                  <View
                    style={[
                      styles.stepLine,
                      !isHairFlow && styles.bodyStepLine,
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF2D55" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {staffList.map((item) => {
            const active = selectedStaff === item._id;

            return (
              <TouchableOpacity
                key={item._id}
                style={[styles.staffCard, active && styles.staffActive]}
                onPress={() => setSelectedStaff(item._id)}
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
      )}

      <View style={styles.bottom}>
        <TouchableOpacity
          disabled={!selectedStaff}
          style={[styles.continue, !selectedStaff && { opacity: 0.5 }]}
          onPress={() => {
            if (!selectedStaffData) return;

            router.push({
              pathname: "/(customer)/(services)/confirm",
              params: {
                selectedServices: String(selectedServices),
                selectedLength: String(selectedLength),
                selectedDate: String(selectedDate),
                selectedTime: String(selectedTime),
                selectedStaff: JSON.stringify(selectedStaffData),
                totalAmount: String(totalAmount),
                bookingType: String(bookingType),
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

  bodyStepCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
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

  bodyStepLine: {
    width: 34,
    marginHorizontal: 5,
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