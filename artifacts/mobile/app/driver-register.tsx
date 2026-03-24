import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import Animated, { FadeInRight, FadeOutLeft, FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

type DocStatus = "pending" | "uploaded";

interface DocItem {
  key: string;
  label: string;
  icon: string;
  required: boolean;
  status: DocStatus;
  number: string;
  expiry: string;
  uri: string;
}

const STEPS = [
  { id: 1, label: "Basic Info", icon: "person-outline" },
  { id: 2, label: "Vehicle", icon: "car-outline" },
  { id: 3, label: "Documents", icon: "document-text-outline" },
  { id: 4, label: "Review", icon: "checkmark-circle-outline" },
];

export default function DriverRegisterScreen() {
  const insets = useSafeAreaInsets();
  const { registerDriver } = useAuth() as any;
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [vehicle, setVehicle] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<"sedan" | "suv">("sedan");

  const [docs, setDocs] = useState<DocItem[]>([
    { key: "driving_license", label: "Driving License (DL)", icon: "card-outline", required: true, status: "pending", number: "", expiry: "", uri: "" },
    { key: "aadhaar", label: "Aadhaar Card", icon: "finger-print-outline", required: true, status: "pending", number: "", expiry: "", uri: "" },
    { key: "pan", label: "PAN Card", icon: "id-card-outline", required: true, status: "pending", number: "", expiry: "", uri: "" },
    { key: "rc", label: "Vehicle RC (Registration)", icon: "document-outline", required: true, status: "pending", number: "", expiry: "", uri: "" },
    { key: "photo", label: "Profile / Selfie Photo", icon: "camera-outline", required: true, status: "pending", number: "", expiry: "", uri: "" },
    { key: "insurance", label: "Vehicle Insurance", icon: "shield-checkmark-outline", required: false, status: "pending", number: "", expiry: "", uri: "" },
  ]);

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const vehicleRef = useRef<TextInput>(null);
  const vehicleNumRef = useRef<TextInput>(null);

  const bg = isDark ? "#0A0A0A" : "#FAFAF8";
  const inputBg = isDark ? "#1A1A1A" : "#F0EDE6";

  const step1Valid = name.trim() && email.trim() && phone.trim() && password.length >= 6 && acceptedTerms;
  const step2Valid = vehicle.trim() && vehicleNumber.trim();
  const requiredDocs = docs.filter((d) => d.required);
  const step3Valid = requiredDocs.every((d) => d.status === "uploaded" && d.number.trim());

  const nextStep = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep((s) => s + 1);
  };
  const prevStep = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s - 1);
  };

  const updateDoc = (key: string, field: "number" | "expiry" | "status" | "uri", value: string) => {
    setDocs((prev) => prev.map((d) => d.key === key ? { ...d, [field]: value } : d));
  };

  const pickImage = async (key: string, fromCamera = false) => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (fromCamera) {
        const camPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!camPerm.granted) {
          Alert.alert("Camera Access Required", "Please allow camera access in your device settings.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libPerm.granted) {
          Alert.alert("Photo Library Access Required", "Please allow photo library access in your device settings.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setDocs((prev) =>
          prev.map((d) =>
            d.key === key ? { ...d, uri, status: "uploaded" as DocStatus } : d
          )
        );
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert("Upload Failed", "Could not pick image. Please try again.");
    }
  };

  const showUploadOptions = (key: string, isPhoto: boolean) => {
    if (Platform.OS === "web") {
      pickImage(key, false);
      return;
    }
    if (isPhoto) {
      Alert.alert("Upload Photo", "Choose how to upload your photo", [
        { text: "Take a Selfie", onPress: () => pickImage(key, true) },
        { text: "Choose from Gallery", onPress: () => pickImage(key, false) },
        { text: "Cancel", style: "cancel" },
      ]);
    } else {
      Alert.alert("Upload Document", "Choose how to upload your document", [
        { text: "Take a Photo", onPress: () => pickImage(key, true) },
        { text: "Choose from Gallery", onPress: () => pickImage(key, false) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleSubmit = async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    try {
      const docPayload = docs.map((d) => ({
        type: d.key,
        label: d.label,
        status: d.status === "uploaded" ? "pending" as const : "pending" as const,
        uploadDate: new Date().toISOString().split("T")[0],
        expiryDate: d.expiry || undefined,
        documentNumber: d.number || undefined,
      }));

      await registerDriver({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        vehicle: vehicle.trim(),
        vehicleNumber: vehicleNumber.trim(),
        vehicleType,
        documents: docPayload,
      });

      router.replace("/driver");
    } catch (e) {
      console.error("Registration failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={step === 1 ? () => router.back() : prevStep}
            style={[styles.backBtn, { backgroundColor: Colors.gold + "18" }]}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.gold} />
          </Pressable>

          <Text style={[styles.screenTitle, { color: colors.text }]}>Driver Registration</Text>
          <Text style={[styles.screenSub, { color: colors.textSecondary }]}>
            Complete all steps to start earning
          </Text>

          <View style={styles.stepsRow}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle,
                    {
                      backgroundColor: step > s.id ? "#2ECC71" : step === s.id ? Colors.gold : (isDark ? "#2A2A2A" : "#E8E4DC"),
                      borderColor: step >= s.id ? (step > s.id ? "#2ECC71" : Colors.gold) : "transparent",
                    },
                  ]}>
                    {step > s.id
                      ? <Ionicons name="checkmark" size={14} color="#fff" />
                      : <Text style={[styles.stepNum, { color: step === s.id ? "#0A0A0A" : colors.textTertiary }]}>{s.id}</Text>
                    }
                  </View>
                  <Text style={[styles.stepLabel, { color: step === s.id ? Colors.gold : colors.textTertiary, fontSize: 9 }]}>{s.label}</Text>
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, { backgroundColor: step > s.id ? "#2ECC71" : (isDark ? "#2A2A2A" : "#E8E4DC") }]} />
                )}
              </React.Fragment>
            ))}
          </View>

          {step === 1 && (
            <Animated.View entering={FadeInRight.duration(400)} style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Basic Information</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Your personal details for the account</Text>

              <Field label="Full Name" icon="person-outline" colors={colors} inputBg={inputBg} isDark={isDark}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={isDark ? "#555" : "#B0A89E"}
                  value={name} onChangeText={setName}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </Field>

              <Field label="Email Address" icon="mail-outline" colors={colors} inputBg={inputBg} isDark={isDark}>
                <TextInput
                  ref={emailRef}
                  style={[styles.input, { color: colors.text }]}
                  placeholder="you@example.com"
                  placeholderTextColor={isDark ? "#555" : "#B0A89E"}
                  value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
              </Field>

              <Field label="Phone Number" icon="call-outline" colors={colors} inputBg={inputBg} isDark={isDark}>
                <TextInput
                  ref={phoneRef}
                  style={[styles.input, { color: colors.text }]}
                  placeholder="+91 XXXXX XXXXX"
                  placeholderTextColor={isDark ? "#555" : "#B0A89E"}
                  value={phone} onChangeText={setPhone}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => passRef.current?.focus()}
                />
              </Field>

              <Field label="Password" icon="lock-closed-outline" colors={colors} inputBg={inputBg} isDark={isDark}
                suffix={
                  <Pressable onPress={() => setShowPass(!showPass)}>
                    <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textSecondary} />
                  </Pressable>
                }
              >
                <TextInput
                  ref={passRef}
                  style={[styles.input, { color: colors.text, flex: 1 }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={isDark ? "#555" : "#B0A89E"}
                  value={password} onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                />
              </Field>

              {password.length > 0 && password.length < 6 && (
                <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: "#E74C3C", marginTop: -8, marginBottom: 8 }}>
                  Password must be at least 6 characters
                </Text>
              )}

              <Pressable
                onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAcceptedTerms(!acceptedTerms); }}
                style={styles.termsRow}
              >
                <View style={[styles.checkbox, { borderColor: acceptedTerms ? Colors.gold : colors.textTertiary, backgroundColor: acceptedTerms ? Colors.gold : "transparent" }]}>
                  {acceptedTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                  I agree to the{" "}
                  <Text style={{ color: Colors.gold }} onPress={(e) => { e.stopPropagation(); router.push("/terms"); }}>Terms & Conditions</Text>
                  {" "}and{" "}
                  <Text style={{ color: Colors.gold }} onPress={(e) => { e.stopPropagation(); router.push("/driver-agreement"); }}>Driver Agreement</Text>
                </Text>
              </Pressable>

              <PrimaryButton label="Continue" onPress={nextStep} disabled={!step1Valid} />
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeInRight.duration(400)} style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Vehicle Details</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Tell us about your vehicle</Text>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Vehicle Type</Text>
              <View style={styles.vehicleTypeRow}>
                {(["sedan", "suv"] as const).map((vt) => (
                  <Pressable
                    key={vt}
                    onPress={() => setVehicleType(vt)}
                    style={[
                      styles.vehicleTypeCard,
                      {
                        backgroundColor: vehicleType === vt ? Colors.gold + "18" : inputBg,
                        borderColor: vehicleType === vt ? Colors.gold : "transparent",
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Ionicons
                      name={vt === "sedan" ? "car-outline" : "car-sport-outline"}
                      size={28}
                      color={vehicleType === vt ? Colors.gold : colors.textSecondary}
                    />
                    <Text style={[styles.vehicleTypeLabel, { color: vehicleType === vt ? Colors.gold : colors.text }]}>
                      {vt === "sedan" ? "Sedan" : "SUV / MUV"}
                    </Text>
                    <Text style={[styles.vehicleTypeSub, { color: colors.textSecondary }]}>
                      {vt === "sedan" ? "4 seats" : "6–7 seats"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Field label="Vehicle Make & Model" icon="car-outline" colors={colors} inputBg={inputBg} isDark={isDark}>
                <TextInput
                  ref={vehicleRef}
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. Toyota Innova Crysta"
                  placeholderTextColor={isDark ? "#555" : "#B0A89E"}
                  value={vehicle} onChangeText={setVehicle}
                  returnKeyType="next"
                  onSubmitEditing={() => vehicleNumRef.current?.focus()}
                />
              </Field>

              <Field label="Vehicle Registration Number" icon="barcode-outline" colors={colors} inputBg={inputBg} isDark={isDark}>
                <TextInput
                  ref={vehicleNumRef}
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. MH 12 AB 1234"
                  placeholderTextColor={isDark ? "#555" : "#B0A89E"}
                  value={vehicleNumber} onChangeText={setVehicleNumber}
                  autoCapitalize="characters"
                  returnKeyType="done"
                />
              </Field>

              <PrimaryButton label="Continue" onPress={nextStep} disabled={!step2Valid} />
            </Animated.View>
          )}

          {step === 3 && (
            <Animated.View entering={FadeInRight.duration(400)} style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Upload Documents</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                Required for identity & safety verification
              </Text>

              {docs.map((doc) => (
                <Animated.View
                  key={doc.key}
                  entering={FadeInDown.delay(50).duration(400)}
                  style={[
                    styles.docCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: doc.status === "uploaded" ? "#2ECC7140" : colors.border,
                      borderWidth: doc.status === "uploaded" ? 1.5 : 1,
                    },
                  ]}
                >
                  {/* Header row */}
                  <View style={styles.docHeader}>
                    <View
                      style={[
                        styles.docIconWrap,
                        { backgroundColor: doc.status === "uploaded" ? "#2ECC7120" : Colors.gold + "18" },
                      ]}
                    >
                      <Ionicons
                        name={doc.icon as any}
                        size={20}
                        color={doc.status === "uploaded" ? "#2ECC71" : Colors.gold}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docLabel, { color: colors.text }]}>{doc.label}</Text>
                      {!doc.required && (
                        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: colors.textTertiary }}>
                          Optional
                        </Text>
                      )}
                    </View>
                    {doc.status === "uploaded" ? (
                      <Pressable
                        onPress={() => showUploadOptions(doc.key, doc.key === "photo")}
                        style={styles.reUploadBtn}
                      >
                        <Ionicons name="refresh-outline" size={14} color="#2ECC71" />
                        <Text style={styles.reUploadText}>Re-upload</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => showUploadOptions(doc.key, doc.key === "photo")}
                        style={[styles.uploadBtn, { backgroundColor: Colors.gold + "20" }]}
                      >
                        <Ionicons name="cloud-upload-outline" size={16} color={Colors.gold} />
                        <Text style={styles.uploadBtnText}>Upload</Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Uploaded image preview */}
                  {doc.status === "uploaded" && doc.uri ? (
                    <View style={styles.previewWrap}>
                      <Image
                        source={{ uri: doc.uri }}
                        style={styles.previewImage}
                        contentFit="cover"
                      />
                      <View style={styles.previewBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#fff" />
                        <Text style={styles.previewBadgeText}>Uploaded</Text>
                      </View>
                    </View>
                  ) : doc.status === "uploaded" ? (
                    <View style={[styles.uploadedBadge, { marginTop: 10 }]}>
                      <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
                      <Text style={styles.uploadedText}>Document uploaded</Text>
                    </View>
                  ) : null}

                  {/* Document number / expiry inputs (shown after upload, not for photo) */}
                  {doc.status === "uploaded" && doc.key !== "photo" && (
                    <View style={styles.docInputRow}>
                      <View
                        style={[
                          styles.docInputWrap,
                          { backgroundColor: isDark ? "#0A0A0A" : "#F5F3EE", flex: 2 },
                        ]}
                      >
                        <TextInput
                          style={[styles.docInput, { color: colors.text }]}
                          placeholder="Document number"
                          placeholderTextColor={isDark ? "#555" : "#B0A89E"}
                          value={doc.number}
                          onChangeText={(v) => updateDoc(doc.key, "number", v)}
                          autoCapitalize="characters"
                        />
                      </View>
                      {(doc.key === "driving_license" ||
                        doc.key === "rc" ||
                        doc.key === "insurance") && (
                        <View
                          style={[
                            styles.docInputWrap,
                            { backgroundColor: isDark ? "#0A0A0A" : "#F5F3EE", flex: 1.5 },
                          ]}
                        >
                          <TextInput
                            style={[styles.docInput, { color: colors.text }]}
                            placeholder="Expiry YYYY-MM"
                            placeholderTextColor={isDark ? "#555" : "#B0A89E"}
                            value={doc.expiry}
                            onChangeText={(v) => updateDoc(doc.key, "expiry", v)}
                          />
                        </View>
                      )}
                    </View>
                  )}
                </Animated.View>
              ))}

              <View style={[styles.infoBox, { backgroundColor: isDark ? "#1A1000" : "#FFF8E1", borderColor: Colors.gold + "40" }]}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.gold} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Documents are reviewed within 24–48 hours. You'll be notified once approved.
                </Text>
              </View>

              <PrimaryButton label="Continue to Review" onPress={nextStep} disabled={!step3Valid} />
            </Animated.View>
          )}

          {step === 4 && (
            <Animated.View entering={FadeInRight.duration(400)} style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Review & Submit</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Confirm your details before submitting</Text>

              <ReviewCard title="Personal Details" icon="person" colors={colors} isDark={isDark}>
                <ReviewRow label="Name" value={name} colors={colors} />
                <ReviewRow label="Email" value={email} colors={colors} />
                <ReviewRow label="Phone" value={phone} colors={colors} />
              </ReviewCard>

              <ReviewCard title="Vehicle Details" icon="car" colors={colors} isDark={isDark}>
                <ReviewRow label="Type" value={vehicleType === "sedan" ? "Sedan" : "SUV / MUV"} colors={colors} />
                <ReviewRow label="Model" value={vehicle} colors={colors} />
                <ReviewRow label="Reg. Number" value={vehicleNumber.toUpperCase()} colors={colors} />
              </ReviewCard>

              <ReviewCard title="Documents" icon="document-text" colors={colors} isDark={isDark}>
                {docs.map((doc) => (
                  <ReviewRow
                    key={doc.key}
                    label={doc.label}
                    value={doc.status === "uploaded" ? "✓ Uploaded" : "Not uploaded"}
                    valueColor={doc.status === "uploaded" ? "#2ECC71" : (doc.required ? "#E74C3C" : colors.textTertiary)}
                    colors={colors}
                  />
                ))}
              </ReviewCard>

              <View style={[styles.infoBox, { backgroundColor: isDark ? "#001A0A" : "#E8F5E9", borderColor: "#2ECC7140" }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#2ECC71" />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Your profile will be sent for admin review. Once approved, you can start accepting rides.
                </Text>
              </View>

              <PrimaryButton label={loading ? "Submitting…" : "Submit Application"} onPress={handleSubmit} loading={loading} />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, icon, children, suffix, colors, inputBg, isDark }: any) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: inputBg }]}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} />
        {children}
        {suffix}
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled, loading }: any) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.primaryBtn, { opacity: (disabled || loading) ? 0.5 : pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={[Colors.gold, Colors.goldDark]}
        style={styles.primaryBtnGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {loading
          ? <ActivityIndicator color="#0A0A0A" />
          : <Text style={styles.primaryBtnText}>{label}</Text>
        }
      </LinearGradient>
    </Pressable>
  );
}

function ReviewCard({ title, icon, children, colors, isDark }: any) {
  return (
    <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.reviewCardHeader}>
        <Ionicons name={icon} size={16} color={Colors.gold} />
        <Text style={[styles.reviewCardTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ReviewRow({ label, value, valueColor, colors }: any) {
  return (
    <View style={styles.reviewRow}>
      <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: valueColor ?? colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  screenTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, marginBottom: 4 },
  screenSub: { fontFamily: "Poppins_400Regular", fontSize: 14, marginBottom: 28 },
  stepsRow: { flexDirection: "row", alignItems: "center", marginBottom: 32 },
  stepItem: { alignItems: "center", gap: 4 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  stepNum: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  stepLabel: { fontFamily: "Poppins_400Regular", textAlign: "center", width: 52 },
  stepLine: { flex: 1, height: 2, marginBottom: 14 },
  stepContent: { gap: 4 },
  stepTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, marginBottom: 2 },
  stepDesc: { fontFamily: "Poppins_400Regular", fontSize: 13, marginBottom: 20 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontFamily: "Poppins_500Medium", fontSize: 13, marginBottom: 8 },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 15, borderRadius: 14,
  },
  input: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: 15, padding: 0 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 4, marginBottom: 20, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  termsText: { fontFamily: "Poppins_400Regular", fontSize: 13, flex: 1, lineHeight: 20 },
  primaryBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  primaryBtnGradient: { paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 17, color: "#0A0A0A" },
  vehicleTypeRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  vehicleTypeCard: { flex: 1, alignItems: "center", padding: 18, borderRadius: 14, gap: 6 },
  vehicleTypeLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  vehicleTypeSub: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  docCard: { borderRadius: 14, padding: 14, marginBottom: 12, gap: 10 },
  docHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  docIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  docLabel: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  uploadedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  uploadedText: { fontFamily: "Poppins_500Medium", fontSize: 12, color: "#2ECC71" },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  uploadBtnText: { fontFamily: "Poppins_500Medium", fontSize: 12, color: Colors.gold },
  docInputRow: { flexDirection: "row", gap: 8 },
  docInputWrap: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  docInput: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  infoBox: {
    flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1,
    alignItems: "flex-start", marginTop: 8, marginBottom: 8,
  },
  infoText: { fontFamily: "Poppins_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },
  reviewCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14, gap: 10 },
  reviewCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  reviewCardTitle: { fontFamily: "Poppins_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewLabel: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  reviewValue: { fontFamily: "Poppins_600SemiBold", fontSize: 13, maxWidth: "55%" },
  reUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2ECC7150",
    backgroundColor: "#2ECC7112",
  },
  reUploadText: { fontFamily: "Poppins_500Medium", fontSize: 11, color: "#2ECC71" },
  previewWrap: {
    borderRadius: 10,
    overflow: "hidden",
    height: 120,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 120,
    borderRadius: 10,
  },
  previewBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2ECC71cc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  previewBadgeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#fff",
  },
});
