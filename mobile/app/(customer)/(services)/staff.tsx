import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

const BASE_URL = "https://limosalon.onrender.com";

const STAFF_API = `${BASE_URL}/api/staff?category=Hair`;
const AVAILABILITY_API = `${BASE_URL}/api/bookings/availability`;
const HOLD_API = `${BASE_URL}/api/bookings/hold`;

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

type ServiceItem = {
  _id?: string;
  serviceId?: string;
  name?: string;
  duration?: number | string;
  durationText?: string;
  price?: number;
};

type AvailabilityResponse = {
  success: boolean;
  message?: string;
  isPast?: boolean;
  hasAvailableStaff?: boolean;
  availableStaffIds?: string[];
  unavailableStaffIds?: string[];
};

type HoldResponse = {
  success: boolean;
  message?: string;
  hold?: {
    holdId: string;
    staffId: string;
    selectedDate: string;
    selectedTime: string;
    estimatedDuration: number;
    expiresAt: string;
    expiresInSeconds: number;
  };
};

const getParamValue = (
  value: string | string[] | undefined
): string => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

const safeJsonParse = <T,>(
  value: string | string[] | undefined,
  fallback: T
): T => {
  const rawValue = getParamValue(value);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
};

const readJsonResponse = async (
  response: Response
): Promise<any> => {
  const rawBody = await response.text();

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(
      `Unexpected server response with status ${response.status}`
    );
  }
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

  const selectedServicesText =
    getParamValue(selectedServices);

  const selectedLengthText =
    getParamValue(selectedLength);

  const selectedDateText =
    getParamValue(selectedDate);

  const selectedTimeText =
    getParamValue(selectedTime);

  const totalAmountText =
    getParamValue(totalAmount);

  const bookingTypeText =
    getParamValue(bookingType);

  const services = useMemo(
    () =>
      safeJsonParse<ServiceItem[]>(
        selectedServices,
        []
      ),
    [selectedServices]
  );

  const estimatedDuration = useMemo(() => {
    return services.reduce(
      (totalDuration, service) => {
        const duration = Number(
          service?.duration || 0
        );

        return (
          totalDuration +
          (Number.isFinite(duration) &&
          duration > 0
            ? duration
            : 0)
        );
      },
      0
    );
  }, [services]);

  const [selectedStaffId, setSelectedStaffId] =
    useState("");

  const [staffList, setStaffList] =
    useState<StaffItem[]>([]);

  const [
    availableStaffIds,
    setAvailableStaffIds,
  ] = useState<string[]>([]);

  const [
    unavailableStaffIds,
    setUnavailableStaffIds,
  ] = useState<string[]>([]);

  const [loadingStaff, setLoadingStaff] =
    useState(true);

  const [
    checkingAvailability,
    setCheckingAvailability,
  ] = useState(false);

  const [creatingHold, setCreatingHold] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const isHairFlow =
    bookingTypeText.toLowerCase() === "hair";

  const totalSteps = isHairFlow ? 5 : 4;
  const currentStep = isHairFlow ? 4 : 3;

  const realStaffList = useMemo(
    () =>
      staffList.filter(
        (staffMember) =>
          staffMember._id !== "any"
      ),
    [staffList]
  );

  const anyStaffAvailable =
    availableStaffIds.length > 0;

  const getCustomerToken =
    useCallback(async () => {
      return (
        (await AsyncStorage.getItem(
          "customerToken"
        )) ||
        (await AsyncStorage.getItem(
          "token"
        ))
      );
    }, []);

  const loadStaff = useCallback(async () => {
    try {
      setLoadingStaff(true);

      const response = await fetch(
        STAFF_API
      );

      const data =
        await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load staff members"
        );
      }

      const backendStaff: StaffItem[] =
        Array.isArray(data.staff)
          ? data.staff
          : Array.isArray(data)
            ? data
            : [];

      const normalizedStaff =
        backendStaff
          .filter(
            (item) =>
              item &&
              item._id &&
              item.name
          )
          .map((item) => ({
            ...item,
            _id: String(item._id),
          }));

      const anyStaff: StaffItem = {
        _id: "any",
        name: "Any Available Staff",
        role: "Maximum availability",
      };

      setStaffList([
        anyStaff,
        ...normalizedStaff,
      ]);
    } catch (error) {
      console.error(
        "Staff load failed:",
        error
      );

      Alert.alert(
        "Staff Error",
        error instanceof Error
          ? error.message
          : "Unable to load staff members."
      );

      setStaffList([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  const checkAvailability =
    useCallback(async () => {
      if (
        realStaffList.length === 0 ||
        !selectedDateText ||
        !selectedTimeText
      ) {
        setAvailableStaffIds([]);
        setUnavailableStaffIds([]);
        return;
      }

      if (
        !Number.isFinite(
          estimatedDuration
        ) ||
        estimatedDuration <= 0
      ) {
        Alert.alert(
          "Duration Error",
          "The selected services do not have a valid duration."
        );
        return;
      }

      try {
        setCheckingAvailability(true);

        const token =
          await getCustomerToken();

        if (!token) {
          Alert.alert(
            "Login Required",
            "Please login again."
          );

          router.replace(
            "/(customer)/(auth)/login"
          );

          return;
        }

        const staffIds = realStaffList
          .map((staffMember) =>
            String(staffMember._id)
          )
          .join(",");

        const query =
          `?date=${encodeURIComponent(
            selectedDateText
          )}` +
          `&time=${encodeURIComponent(
            selectedTimeText
          )}` +
          `&duration=${encodeURIComponent(
            String(estimatedDuration)
          )}` +
          `&staffIds=${encodeURIComponent(
            staffIds
          )}`;

        const response = await fetch(
          `${AVAILABILITY_API}${query}`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        const data =
          (await readJsonResponse(
            response
          )) as AvailabilityResponse;

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to check staff availability"
          );
        }

        const available =
          Array.isArray(
            data.availableStaffIds
          )
            ? data.availableStaffIds.map(
                String
              )
            : [];

        const unavailable =
          Array.isArray(
            data.unavailableStaffIds
          )
            ? data.unavailableStaffIds.map(
                String
              )
            : [];

        setAvailableStaffIds(available);
        setUnavailableStaffIds(
          unavailable
        );

        setSelectedStaffId(
          (currentSelection) => {
            if (
              currentSelection === "any" &&
              available.length === 0
            ) {
              return "";
            }

            if (
              currentSelection &&
              currentSelection !== "any" &&
              unavailable.includes(
                currentSelection
              )
            ) {
              return "";
            }

            return currentSelection;
          }
        );

        if (data.isPast) {
          Alert.alert(
            "Time Unavailable",
            "The selected date or time has already passed. Please choose another time."
          );
        }
      } catch (error) {
        console.error(
          "Availability check failed:",
          error
        );

        setAvailableStaffIds([]);
        setUnavailableStaffIds(
          realStaffList.map(
            (staffMember) =>
              String(staffMember._id)
          )
        );

        Alert.alert(
          "Availability Error",
          error instanceof Error
            ? error.message
            : "Unable to check staff availability."
        );
      } finally {
        setCheckingAvailability(false);
      }
    }, [
      estimatedDuration,
      getCustomerToken,
      realStaffList,
      router,
      selectedDateText,
      selectedTimeText,
    ]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    if (
      !loadingStaff &&
      realStaffList.length > 0
    ) {
      checkAvailability();
    }
  }, [
    checkAvailability,
    loadingStaff,
    realStaffList.length,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (
        !loadingStaff &&
        realStaffList.length > 0
      ) {
        checkAvailability();
      }
    }, [
      checkAvailability,
      loadingStaff,
      realStaffList.length,
    ])
  );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadStaff();
    } finally {
      setRefreshing(false);
    }
  };

  const handleStaffPress = (
    staffMember: StaffItem
  ) => {
    if (
      creatingHold ||
      checkingAvailability
    ) {
      return;
    }

    if (staffMember._id === "any") {
      if (!anyStaffAvailable) {
        Alert.alert(
          "No Staff Available",
          `All staff members are unavailable at ${selectedTimeText}. Please select another date or time.`
        );
        return;
      }

      setSelectedStaffId("any");
      return;
    }

    const unavailable =
      unavailableStaffIds.includes(
        String(staffMember._id)
      );

    if (unavailable) {
      Alert.alert(
        "Staff Unavailable",
        `${staffMember.name} is not available at ${selectedTimeText}. Please select another staff member or time.`
      );
      return;
    }

    setSelectedStaffId(
      String(staffMember._id)
    );
  };

  const resolveStaffForHold = () => {
    if (selectedStaffId === "any") {
      const firstAvailableId =
        availableStaffIds[0];

      if (!firstAvailableId) {
        return null;
      }

      return (
        realStaffList.find(
          (staffMember) =>
            String(staffMember._id) ===
            String(firstAvailableId)
        ) ?? null
      );
    }

    return (
      realStaffList.find(
        (staffMember) =>
          String(staffMember._id) ===
          String(selectedStaffId)
      ) ?? null
    );
  };

  const createTemporaryHold =
    async () => {
      if (
        creatingHold ||
        checkingAvailability
      ) {
        return;
      }

      if (!selectedStaffId) {
        Alert.alert(
          "Select Staff",
          "Please select a staff member."
        );
        return;
      }

      if (
        !Number.isFinite(
          estimatedDuration
        ) ||
        estimatedDuration <= 0
      ) {
        Alert.alert(
          "Duration Error",
          "Unable to calculate the selected service duration."
        );
        return;
      }

      const actualStaff =
        resolveStaffForHold();

      if (!actualStaff) {
        Alert.alert(
          "Staff Unavailable",
          "No staff member is currently available. Please select another time."
        );

        await checkAvailability();
        return;
      }

      try {
        setCreatingHold(true);

        const token =
          await getCustomerToken();

        if (!token) {
          Alert.alert(
            "Login Required",
            "Please login again."
          );

          router.replace(
            "/(customer)/(auth)/login"
          );
          return;
        }

        const response = await fetch(
          HOLD_API,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              staffId:
                String(actualStaff._id),
              selectedDate:
                selectedDateText,
              selectedTime:
                selectedTimeText,
              estimatedDuration,
            }),
          }
        );

        const data =
          (await readJsonResponse(
            response
          )) as HoldResponse;

        if (
          !response.ok ||
          !data.hold?.holdId
        ) {
          if (response.status === 409) {
            await checkAvailability();
          }

          throw new Error(
            data.message ||
              "Unable to reserve this appointment"
          );
        }

        router.push({
          pathname:
            "/(customer)/(services)/confirm",
          params: {
            selectedServices:
              selectedServicesText,

            selectedLength:
              selectedLengthText,

            selectedDate:
              selectedDateText,

            selectedTime:
              selectedTimeText,

            selectedStaff:
              JSON.stringify(
                actualStaff
              ),

            totalAmount:
              totalAmountText,

            bookingType:
              bookingTypeText,

            estimatedDuration:
              String(
                estimatedDuration
              ),

            holdId:
              String(
                data.hold.holdId
              ),

            holdExpiresAt:
              String(
                data.hold.expiresAt
              ),

            holdExpiresInSeconds:
              String(
                data.hold
                  .expiresInSeconds
              ),
          },
        });
      } catch (error) {
        console.error(
          "Create hold failed:",
          error
        );

        Alert.alert(
          "Unable to Reserve Slot",
          error instanceof Error
            ? error.message
            : "This slot is no longer available."
        );
      } finally {
        setCreatingHold(false);
      }
    };

  const screenLoading =
    loadingStaff ||
    checkingAvailability;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.back()
          }
          disabled={creatingHold}
        >
          <Ionicons
            name="chevron-back"
            size={26}
            color="#000"
          />
        </TouchableOpacity>

        <Text style={styles.headerText}>
          Choose Staff
        </Text>
      </View>

      <View style={styles.stepContainer}>
        <View style={styles.stepRow}>
          {Array.from(
            { length: totalSteps },
            (_, index) =>
              index + 1
          ).map((stepNumber) => {
            const isDone =
              stepNumber < currentStep ||
              (stepNumber ===
                currentStep &&
                selectedStaffId !== "");

            const isActive =
              stepNumber ===
                currentStep &&
              selectedStaffId === "";

            return (
              <View
                key={stepNumber}
                style={styles.stepItem}
              >
                <View
                  style={[
                    styles.stepCircle,
                    !isHairFlow &&
                      styles.bodyStepCircle,
                    isDone &&
                      styles.stepDone,
                    isActive &&
                      styles.stepActive,
                  ]}
                >
                  {isDone && (
                    <Ionicons
                      name="checkmark"
                      size={10}
                      color="#fff"
                    />
                  )}
                </View>

                {stepNumber !==
                  totalSteps && (
                  <View
                    style={[
                      styles.stepLine,
                      !isHairFlow &&
                        styles.bodyStepLine,
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.detailsBox}>
        <View style={styles.detailRow}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color="#FF2D55"
          />

          <Text style={styles.detailText}>
            {selectedDateText
            ? new Date(selectedDateText).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
           })
           :"_"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="time-outline"
            size={18}
            color="#FF2D55"
          />

          <Text style={styles.detailText}>
            {selectedTimeText}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="hourglass-outline"
            size={18}
            color="#FF2D55"
          />

          <Text style={styles.detailText}>
            {estimatedDuration} min
          </Text>
        </View>
      </View>

      {screenLoading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator
            size="large"
            color="#FF2D55"
          />

          <Text style={styles.loaderText}>
            {loadingStaff
              ? "Loading staff..."
              : "Checking availability..."}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={
                handleRefresh
              }
              colors={["#FF2D55"]}
            />
          }
          contentContainerStyle={
            styles.scrollContent
          }
        >
          {staffList.map(
            (staffMember) => {
              const isAny =
                staffMember._id ===
                "any";

              const unavailable = isAny
                ? !anyStaffAvailable
                : unavailableStaffIds.includes(
                    String(
                      staffMember._id
                    )
                  );

              const active =
                selectedStaffId ===
                staffMember._id;

              return (
                <TouchableOpacity
                  key={staffMember._id}
                  activeOpacity={0.85}
                  style={[
                    styles.staffCard,
                    active &&
                      styles.staffActive,
                    unavailable &&
                      styles.staffUnavailable,
                  ]}
                  onPress={() =>
                    handleStaffPress(
                      staffMember
                    )
                  }
                >
                  <Ionicons
                    name={
                      isAny
                        ? "people-outline"
                        : "person-outline"
                    }
                    size={42}
                    color={
                      unavailable
                        ? "#888"
                        : "#111"
                    }
                  />

                  <View
                    style={
                      styles.staffTextBox
                    }
                  >
                    <Text
                      style={[
                        styles.staffName,
                        unavailable &&
                          styles.unavailableText,
                      ]}
                    >
                      {staffMember.name}
                    </Text>

                    <Text
                      style={[
                        styles.staffRole,
                        unavailable &&
                          styles.unavailableText,
                      ]}
                    >
                      {staffMember.role}
                    </Text>

                    <View
                      style={
                        styles.statusRow
                      }
                    >
                      <View
                        style={[
                          styles.statusDot,
                          unavailable
                            ? styles.unavailableDot
                            : styles.availableDot,
                        ]}
                      />

                      <Text
                        style={[
                          styles.statusText,
                          unavailable
                            ? styles.statusUnavailable
                            : styles.statusAvailable,
                        ]}
                      >
                        {unavailable
                          ? "Not available"
                          : "Available"}
                      </Text>
                    </View>
                  </View>

                  {unavailable ? (
                    <Ionicons
                      name="close-circle"
                      size={23}
                      color="#8F8F8F"
                    />
                  ) : (
                    <View
                      style={[
                        styles.radio,
                        active &&
                          styles.radioActive,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            }
          )}

          {realStaffList.length >
            0 &&
            !anyStaffAvailable && (
              <View
                style={
                  styles.noAvailabilityBox
                }
              >
                <Ionicons
                  name="calendar-clear-outline"
                  size={26}
                  color="#D62828"
                />

                <Text
                  style={
                    styles.noAvailabilityTitle
                  }
                >
                  No staff available
                </Text>

                <Text
                  style={
                    styles.noAvailabilityText
                  }
                >
                  Please return and
                  select another date
                  or time.
                </Text>
              </View>
            )}
        </ScrollView>
      )}

      <View style={styles.bottom}>
        <TouchableOpacity
          disabled={
            !selectedStaffId ||
            creatingHold ||
            checkingAvailability ||
            loadingStaff
          }
          style={[
            styles.continue,
            (!selectedStaffId ||
              creatingHold ||
              checkingAvailability ||
              loadingStaff) &&
              styles.disabledButton,
          ]}
          onPress={
            createTemporaryHold
          }
        >
          {creatingHold ? (
            <View
              style={
                styles.loadingButtonRow
              }
            >
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />

              <Text
                style={
                  styles.continueText
                }
              >
                Reserving slot...
              </Text>
            </View>
          ) : (
            <Text
              style={styles.continueText}
            >
              Continue
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.holdNote}>
          Your selected slot will be
          held for 10 minutes after
          continuing.
        </Text>
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
    color: "#111",
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

  detailsBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 13,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
    marginRight: 8,
  },

  detailText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
  },

  loaderBox: {
    marginTop: 50,
    alignItems: "center",
  },

  loaderText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },

  scrollContent: {
    paddingBottom: 160,
  },

  staffCard: {
    backgroundColor: "#D86B91",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 105,
    borderWidth: 2,
    borderColor: "transparent",
  },

  staffActive: {
    backgroundColor: "#FF2D55",
    borderColor: "#B90943",
  },

  staffUnavailable: {
    backgroundColor: "#E4E4E4",
    borderColor: "#CCCCCC",
    opacity: 0.82,
  },

  staffTextBox: {
    flex: 1,
    marginLeft: 20,
    alignItems: "center",
  },

  staffName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  staffRole: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    marginTop: 2,
  },

  unavailableText: {
    color: "#666666",
  },

  statusRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  availableDot: {
    backgroundColor: "#0C8F3E",
  },

  unavailableDot: {
    backgroundColor: "#D62828",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  statusAvailable: {
    color: "#E8FFF0",
  },

  statusUnavailable: {
    color: "#D62828",
  },

  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E5E5E5",
  },

  radioActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: "#FF2D55",
  },

  noAvailabilityBox: {
    marginTop: 18,
    padding: 20,
    borderRadius: 14,
    backgroundColor: "#FFF1F1",
    alignItems: "center",
  },

  noAvailabilityTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#D62828",
  },

  noAvailabilityText: {
    marginTop: 5,
    color: "#666",
    textAlign: "center",
    lineHeight: 19,
  },

  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 12,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 8,
  },

  continue: {
    backgroundColor: "#FF2D55",
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.5,
  },

  loadingButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  continueText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  holdNote: {
    marginTop: 8,
    textAlign: "center",
    color: "#888",
    fontSize: 11,
  },
});