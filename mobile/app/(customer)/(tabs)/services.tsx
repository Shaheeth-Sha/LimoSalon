import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";

import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://limosalon.onrender.com";

const CATEGORY_API = `${BASE_URL}/api/services`;
const PROFILE_API = `${BASE_URL}/api/customers/profile`;

type CategoryItem = {
  category: string;
  title: string;
  image: any;
};

type ServiceItem = {
  category: string;
  name: string;
  [key: string]: any;
};

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
};

const categories: CategoryItem[] = [
  {
    category: "Hair",
    title: "Hair Care",
    image: require("../../../assets/LimoImage/hair.png"),
  },

  {
    category: "Body",
    title: "Body Care",
    image: require("../../../assets/LimoImage/body.png"),
  },

  {
    category: "Face",
    title: "Face Care",
    image: require("../../../assets/LimoImage/face.png"),
  },

  {
    category: "Bridal",
    title: "Bridal Dressing",
    image: require("../../../assets/LimoImage/bridal.png"),
  },
];

export default function Services() {
  const router = useRouter();
  const { query: incomingQuery } = useLocalSearchParams<{ query?: string }>();

  const [loading, setLoading] = useState(true);

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Fixed: previously only category names were kept, so there was
  // nothing to actually search against. Now the full service list is
  // kept in state too, so the search bar has something to match on.
  const [allServices, setAllServices] = useState<ServiceItem[]>([]);

  // Fixed: greeting was a literal hardcoded "Nisali" string. Now
  // loaded the same way as home.tsx — fetch the profile, use the
  // customer's real first name.
  const [customerName, setCustomerName] = useState("Customer");

  const [searchQuery, setSearchQuery] = useState(incomingQuery || "");

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) => {
    setAlert({ visible: true, title, message });
  };

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  useEffect(() => {
    loadCategories();
    loadProfile();
  }, []);

  // If this screen was opened via Home's search bar (which passes a
  // `query` param), run that search automatically once the service
  // list has finished loading.
  useEffect(() => {
    if (incomingQuery && allServices.length > 0) {
      runSearch(String(incomingQuery));
    }
  }, [incomingQuery, allServices]);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("customerToken");
      if (!token) return;

      const res = await fetch(PROFILE_API, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.customer?.name) {
        const fullName = data.customer.name || "";
        const firstName = fullName.trim().split(" ")[0];
        setCustomerName(firstName || "Customer");
      }
    } catch (error) {
      console.log("Profile load failed:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(CATEGORY_API);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load services");
      }

      const services: ServiceItem[] = Array.isArray(data.services)
        ? data.services
        : [];

      setAllServices(services);

      const uniqueCategories = [
        ...new Set(services.map((item: any) => item.category)),
      ];

      setAvailableCategories(uniqueCategories);
    } catch (error) {
      console.log("Service category error:", error);
      showAlert("Error", "Unable to load services");
    } finally {
      setLoading(false);
    }
  };

  const openCategory = (category: string, query?: string) => {
    let route: any;

    switch (category) {
      case "Hair":
        route = "/(customer)/(services)/hair";
        break;

      case "Body":
        route = "/(customer)/(services)/body";
        break;

      case "Face":
        route = "/(customer)/(services)/face";
        break;

      case "Bridal":
        route = "/(customer)/(services)/bridal";
        break;

      default:
        return;
    }

    router.push({
      pathname: route,
      params: query ? { category, query } : { category },
    });
  };

  // Fixed: search box previously had no state, no submit handler, and
  // the icon wasn't wrapped in a touchable — typing or tapping it did
  // nothing. Now it matches against the loaded service names and
  // opens the category screen for the first match, passing the query
  // along so that screen can highlight/filter to it.
  // NOTE: if a search matches services across more than one category,
  // this currently opens just the first match's category. Building a
  // proper "all results across categories" screen would be a nice
  // future improvement, but is more than a bug fix for now.
  const runSearch = (value?: string) => {
    const term = (value ?? searchQuery).trim().toLowerCase();
    if (!term) return;

    const match = allServices.find((service) =>
      String(service.name || "").toLowerCase().includes(term)
    );

    if (!match) {
      showAlert("No Results", `No services found matching "${term}".`);
      return;
    }

    openCategory(match.category, term);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Image
            source={require("../../../assets/LimoImage/serviceTop.png")}
            style={styles.headerImage}
          />

          <View style={styles.overlay}>
            <Text style={styles.hello}>Hello, {customerName}!</Text>

            <Text style={styles.sub}>Find the best service for you</Text>

            <View style={styles.searchBox}>
              <TouchableOpacity onPress={() => runSearch()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="search" size={18} color="#999" />
              </TouchableOpacity>

              <TextInput
                placeholder="Search for service..."
                style={styles.input}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={() => runSearch()}
              />
            </View>
          </View>
        </View>

        <Text style={styles.title}>OUR SERVICES</Text>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#FF2D75" />
          </View>
        ) : availableCategories.length === 0 ? (
          <View style={styles.loader}>
            <Text style={styles.emptyText}>No services available right now.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {categories
              .filter((item) => availableCategories.includes(item.category))
              .map((item) => (
                <TouchableOpacity
                  key={item.category}
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => openCategory(item.category)}
                >
                  <Image source={item.image} style={styles.cardImage} />

                  <Text style={styles.cardText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </ScrollView>

      {/* Custom branded alert modal — replaces Alert.alert() */}
      <Modal visible={alert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="alert-circle" size={28} color="#FF2D75" />
            </View>
            <Text style={styles.modalTitle}>{alert.title}</Text>
            <Text style={styles.modalMessage}>{alert.message}</Text>
            <TouchableOpacity style={styles.modalButton} activeOpacity={0.8} onPress={closeAlert}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =====================================================
// App primary color: #FF2D75 (matches project design spec)
// Was #ff4d6d (greeting text) and #FF2D55 (loading spinner) —
// both fixed to the correct hex.
// =====================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    height: 260,
  },

  headerImage: {
    width: "100%",
    height: "100%",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },

  overlay: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
  },

  hello: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FF2D75",
  },

  sub: {
    fontSize: 14,
    color: "#FF2D75",
    marginBottom: 10,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },

  input: {
    marginLeft: 8,
    flex: 1,
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    margin: 20,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  card: {
    width: "48%",
    marginBottom: 20,
    alignItems: "center",
  },

  cardImage: {
    width: "100%",
    height: 140,
    borderRadius: 20,
  },

  cardText: {
    marginTop: 8,
    fontWeight: "600",
    fontSize: 14,
  },

  loader: {
    marginTop: 50,
    alignItems: "center",
  },

  emptyText: {
    color: "#777",
    fontSize: 14,
  },

  /* ===== Custom Alert Modal ===== */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },

  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFE1EC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 6,
    textAlign: "center",
  },

  modalMessage: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 20,
  },

  modalButton: {
    width: "100%",
    backgroundColor: "#FF2D75",
    paddingVertical: 13,
    borderRadius: 25,
    alignItems: "center",
  },

  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});