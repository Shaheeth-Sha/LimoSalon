import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Bookings() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const router = useRouter();

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.header}>My Bookings</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Toggle */}
      <View style={styles.toggleWrapper}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeTab === "upcoming" && styles.activeBtn,
          ]}
          onPress={() => setActiveTab("upcoming")}
        >
          <Text
            style={[
              styles.toggleText,
              activeTab === "upcoming" && styles.activeText,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeTab === "past" && styles.activeBtn,
          ]}
          onPress={() => setActiveTab("past")}
        >
          <Text
            style={[
              styles.toggleText,
              activeTab === "past" && styles.activeText,
            ]}
          >
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* UPCOMING */}
        {activeTab === "upcoming" && (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>Confirmed</Text>
              </View>
              <Text style={styles.priceTop}>LKR,5300</Text>
            </View>

            <Text style={styles.title}>Glow Signature Facial</Text>
            <Text style={styles.sub}>With Olivia Dias</Text>

            <Text style={styles.info}>📅 Wed, March 25 2026</Text>
            <Text style={styles.info}>⏰ 10.00 a.m</Text>

            <View style={styles.rowBetween}>
              <Text style={styles.priceBottom}>LKR,5300</Text>
              <TouchableOpacity>
                <Text style={styles.viewDetails}>View Details</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rowBetween}>
              <TouchableOpacity style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.rescheduleBtn}>
                <Text style={styles.rescheduleText}>Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PAST */}
        {activeTab === "past" && (
          <>
            {/* Completed */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.completedPill}>
                  <Text style={styles.statusText}>Completed</Text>
                </View>
                <Text style={styles.priceTop}>LKR,3500</Text>
              </View>

              <Text style={styles.title}>HairCut & Style</Text>

              <Text style={styles.info}>📅 Tue, Feb 10 2026</Text>
              <Text style={styles.info}>⏰ 02.30 p.m</Text>

              <View style={styles.rowBetween}>
                <Text style={styles.priceBottom}>LKR,3500</Text>
                <TouchableOpacity>
                  <Text style={styles.viewDetails}>View Details</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.feedbackBtn}>
                <Text style={styles.feedbackText}>Leave Feedback</Text>
              </TouchableOpacity>
            </View>

            {/* Cancelled */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.cancelPill}>
                  <Text style={styles.statusText}>Cancel</Text>
                </View>
                <Text style={styles.priceTop}>LKR,5500</Text>
              </View>

              <Text style={styles.title}>Swedish Massage</Text>
              <Text style={styles.sub}>With maya Perera</Text>

              <Text style={styles.info}>📅 Fri, Dec 15 2025</Text>
            </View>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  header: {
    fontSize: 18,
    fontWeight: "600",
  },

  /* Toggle */
  toggleWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },

  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },

  activeBtn: {
    backgroundColor: "#ff2d55",
  },

  toggleText: {
    fontSize: 13,
    color: "#777",
  },

  activeText: {
    color: "#fff",
    fontWeight: "600",
  },

  /* Card */
  card: {
    backgroundColor: "#d86a86",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
  },

  sub: {
    fontSize: 12,
    marginBottom: 6,
  },

  info: {
    fontSize: 12,
    marginTop: 4,
  },

  priceTop: {
    fontSize: 12,
  },

  priceBottom: {
    fontSize: 12,
    marginVertical: 10,
  },

  /* Pills */
  statusPill: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },

  completedPill: {
    backgroundColor: "#eee",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },

  cancelPill: {
    backgroundColor: "#eee",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },

  statusText: {
    fontSize: 11,
  },

  viewDetails: {
    fontSize: 11,
    textDecorationLine: "underline",
  },

  /* Buttons */
  feedbackBtn: {
    backgroundColor: "#ff2d55",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  feedbackText: {
    color: "#fff",
    fontSize: 13,
  },

  cancelBtn: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  cancelText: {
    fontSize: 12,
  },

  rescheduleBtn: {
    backgroundColor: "#ff2d55",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  rescheduleText: {
    color: "#fff",
    fontSize: 12,
  },
});