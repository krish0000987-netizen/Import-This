import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@/components/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import Colors from "@/constants/colors";

interface LogoutModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function LogoutModal({ visible, onCancel, onConfirm, loading }: LogoutModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              marginBottom: Platform.OS === "web" ? 0 : 0,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: "#E74C3C18" }]}>
            <Ionicons name="log-out-outline" size={32} color="#E74C3C" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Log Out?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            You'll be returned to the welcome screen. Your data is safely saved.
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.btnRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                { backgroundColor: isDark ? "#2A2A2A" : "#F0F0F0", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={({ pressed }) => [styles.confirmBtnWrapper, { opacity: pressed || loading ? 0.8 : 1 }]}
            >
              <LinearGradient
                colors={["#E74C3C", "#C0392B"]}
                style={styles.confirmBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="log-out-outline" size={17} color="#fff" />
                <Text style={styles.confirmText}>
                  {loading ? "Logging out…" : "Log Out"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  divider: { height: 1, width: "100%", marginVertical: 4 },
  btnRow: { flexDirection: "row", gap: 12, width: "100%", marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  confirmBtnWrapper: { flex: 1, borderRadius: 14, overflow: "hidden" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  confirmText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#fff" },
});
