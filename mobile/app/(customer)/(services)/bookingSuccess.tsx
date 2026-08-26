import React, { useEffect, useLayoutEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import ConfettiPour from "./ConfettiPour";

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

const formatMoney = (amount: number) =>
  `LKR ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function BookingSuccess() {
  const router = useRouter();
  const navigation = useNavigation();

  // New: this screen represents a completed transaction — there's
  // nothing sensible to go "back" to. Going back would return the
  // user into the payment/confirm flow for a booking that's already
  // paid and saved, risking confusion or an accidental duplicate
  // attempt. This removes every path back:
  //   1. The stack header's back arrow, if one would otherwise show.
  //   2. Android's hardware back button / gesture-nav back action.
  // "Return Home" remains the only way to leave this screen.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      gestureEnabled: false,
      headerLeft: () => null,
    });
  }, [navigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Returning true marks the back press as handled, so the
        // default "go back" behavior never runs. Route them to the
        // same place the button already sends them.
        router.replace("/(customer)/(tabs)/home");
        return true;
      }
    );

    return () => subscription.remove();
  }, [router]);

  const {
    bookingId,
    selectedServices,
    selectedLength,
    selectedDate,
    selectedTime,
    selectedStaff,
    bookingType,
    totalAmount,
    advancePayment,
    amountPaid,
    balancePayment,
    advancePercentage,
    paymentOption,
    paymentMethod,
    paymentStatus,
    transactionReference,
    wantsTrialMakeup,
    trialMakeupDate,
    trialMakeupTime,
  } = useLocalSearchParams();

  const services = safeJsonParse<any[]>(
    selectedServices,
    []
  );

  const hairLength = safeJsonParse<any | null>(
    selectedLength,
    null
  );

  const bookingTypeText = getParamValue(bookingType);
  const nailLengthLabel =
    bookingTypeText.toLowerCase() === "nail" ? "Nail Style" : "Hair Length";

  const staff = safeJsonParse<any | null>(
    selectedStaff,
    null
  );

  const total = Number(getParamValue(totalAmount)) || 0;

  const paidAmount =
    Number(getParamValue(amountPaid)) ||
    Number(getParamValue(advancePayment)) ||
    0;

  const balance =
    getParamValue(balancePayment) !== ""
      ? Number(getParamValue(balancePayment)) || 0
      : Math.max(total - paidAmount, 0);

  const percentage =
    Number(getParamValue(advancePercentage)) || 0;

  const normalizedPaymentOption =
    getParamValue(paymentOption);

  const normalizedPaymentMethod =
    getParamValue(paymentMethod) || "-";

  const normalizedPaymentStatus =
    getParamValue(paymentStatus) ||
    (paidAmount >= total && total > 0
      ? "Paid"
      : paidAmount > 0
        ? "Partially Paid"
        : "Pending");

  const serviceNames =
    services.length > 0
      ? services
          .map((item: any) => item?.name)
          .filter(Boolean)
          .join(" & ")
      : "-";

  const rawDate = getParamValue(selectedDate);

  const formatDate = rawDate
    ? new Date(rawDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";

  const wantsTrialMakeupBool = getParamValue(wantsTrialMakeup) === "true";
  const trialMakeupDateText = getParamValue(trialMakeupDate);
  const trialMakeupTimeText = getParamValue(trialMakeupTime);

  const formatTrialDate = trialMakeupDateText
    ? new Date(trialMakeupDateText).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";

  const getPaymentOptionText = () => {
    if (normalizedPaymentOption === "advance") {
      return percentage > 0
        ? `${percentage}% Advance`
        : "Advance Payment";
    }

    if (normalizedPaymentOption === "full") {
      return "Full Payment";
    }

    if (normalizedPaymentOption === "salon") {
      return "Pay at Salon";
    }

    return "-";
  };

  const statusColor =
    normalizedPaymentStatus === "Paid"
      ? "#167A3E"
      : normalizedPaymentStatus === "Partially Paid"
        ? "#9A5A00"
        : normalizedPaymentStatus === "Failed"
          ? "#B42318"
          : "#555555";

  // New: entrance animation. The checkmark circle scales in with a
  // slight overshoot (spring) and its checkmark glyph fades in right
  // after, followed by the details card sliding up and fading in.
  // Uses React Native's built-in Animated API only — no extra
  // dependency, no impact on bundle size. Purely visual: nothing here
  // blocks interaction, and the "Return Home" button is usable the
  // entire time.
  const iconScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(18)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(checkOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* New: pink particle-pour effect, purely decorative. Sits in
          an absolutely-positioned, pointerEvents="none" overlay so it
          never blocks taps on anything beneath it (the checkmark,
          the card, or the Return Home button). */}
      <ConfettiPour />

      <Animated.View
        style={[
          styles.successIcon,
          { transform: [{ scale: iconScale }] },
        ]}
      >
        {/* Fixed: bookings now start as Pending, not auto-Confirmed —
            the assigned staff member has to actually accept the
            request first (see Booking.js / staffScheduleController.js).
            This screen was claiming "Booking Confirmed" the instant a
            request was submitted, before any staff review happened at
            all. Icon and copy now reflect "request sent," not "done
            deal." */}
        <Animated.View style={{ opacity: checkOpacity }}>
          <Ionicons
            name="hourglass-outline"
            size={64}
            color="#000"
          />
        </Animated.View>
      </Animated.View>

      <Text style={styles.title}>
        Booking Requested
      </Text>

      <Text style={styles.subTitle}>
        Waiting for the salon to confirm
      </Text>

      <Text style={styles.message}>
        Thank you for choosing LimoSalon. We'll notify you as soon as your appointment is
        confirmed.
      </Text>

      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardOpacity,
            transform: [
              { translateY: cardTranslateY },
            ],
          },
        ]}
      >
        <DetailRow
          label="Booking ID"
          value={
            getParamValue(bookingId)
              ? `#${getParamValue(bookingId)
                  .slice(-6)
                  .toUpperCase()}`
              : "-"
          }
        />

        <DetailRow
          label="Services"
          value={serviceNames}
        />

        {hairLength?.name ? (
          <DetailRow
            label={nailLengthLabel}
            value={hairLength.name}
          />
        ) : null}

        <DetailRow
          label="Date"
          value={formatDate}
        />

        <DetailRow
          label="Time"
          value={
            getParamValue(selectedTime) || "-"
          }
        />

        <DetailRow
          label="Stylist"
          value={
            staff?.name ||
            "Any Available Staff"
          }
        />

        {wantsTrialMakeupBool ? (
          <>
            <DetailRow
              label="Trial Date"
              value={formatTrialDate}
            />

            <DetailRow
              label="Trial Time"
              value={trialMakeupTimeText || "-"}
            />
          </>
        ) : null}

        <View style={styles.sectionDivider} />

        <DetailRow
          label="Payment Type"
          value={getPaymentOptionText()}
        />

        <DetailRow
          label="Pay Via"
          value={normalizedPaymentMethod}
        />

        <DetailRow
          label="Total"
          value={formatMoney(total)}
        />

        <DetailRow
          label="Amount Paid"
          value={formatMoney(paidAmount)}
        />

        <DetailRow
          label="Balance"
          value={formatMoney(balance)}
        />

        <View style={styles.row}>
          <Text style={styles.label}>
            Payment Status
          </Text>

          <Text style={styles.colon}>:</Text>

          <Text
            style={[
              styles.value,
              {
                color: statusColor,
                fontWeight: "800",
              },
            ]}
          >
            {normalizedPaymentStatus}
          </Text>
        </View>

        {getParamValue(transactionReference) ? (
          <DetailRow
            label="Reference"
            value={getParamValue(
              transactionReference
            )}
          />
        ) : null}
      </Animated.View>

      <Animated.View
        style={{
          width: "100%",
          opacity: buttonOpacity,
        }}
      >
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() =>
            router.replace(
              "/(customer)/(tabs)/home"
            )
          }
          activeOpacity={0.85}
        >
          <Ionicons
            name="home-outline"
            size={20}
            color="#FFFFFF"
          />

          <Text style={styles.homeText}>
            Return Home
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({
  label,
  value,
}: DetailRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.colon}>:</Text>

      <Text style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },

  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 65,
    paddingHorizontal: 24,
    paddingBottom: 45,
  },

  successIcon: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 8,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000000",
  },

  subTitle: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },

  message: {
    marginTop: 5,
    fontSize: 14,
    color: "#555555",
    textAlign: "center",
  },

  card: {
    width: "100%",
    backgroundColor: "#D86B91",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginTop: 28,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  label: {
    width: 118,
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },

  colon: {
    width: 18,
    fontSize: 14,
    color: "#111111",
  },

  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    lineHeight: 20,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    marginTop: 2,
    marginBottom: 16,
  },

  homeButton: {
    width: "100%",
    minHeight: 56,
    backgroundColor: "#FF2D55",
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    marginTop: 28,
  },

  homeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});