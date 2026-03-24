import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

const transactions = [
  { id: "t1", type: "credit", label: "Cashback — Varanasi Trip", amount: 150, date: "Today, 2:30 PM" },
  { id: "t2", type: "debit", label: "Booking — Ayodhya", amount: 1608, date: "Yesterday, 11:00 AM" },
  { id: "t3", type: "credit", label: "Added via UPI", amount: 500, date: "Mar 15, 10:20 AM" },
  { id: "t4", type: "debit", label: "Booking — Agra", amount: 2400, date: "Mar 12, 9:15 AM" },
  { id: "t5", type: "credit", label: "Referral Bonus", amount: 200, date: "Mar 10, 6:00 PM" },
  { id: "t6", type: "debit", label: "Booking — Lucknow Local", amount: 320, date: "Mar 8, 3:45 PM" },
];

const addAmounts = [100, 200, 500, 1000, 2000, 5000];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [addMoneyVisible, setAddMoneyVisible] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const balance = user?.walletBalance ?? 0;

  const handleAdd = () => {
    const amt = selectedAmount || parseInt(customAmount, 10);
    if (!amt || amt < 1) {
      Alert.alert("Invalid Amount", "Please enter or select a valid amount.");
      return;
    }
    Alert.alert("Add Money", `\u20B9${amt} will be added via your preferred payment method.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Proceed",
        onPress: () => {
          setAddMoneyVisible(false);
          setCustomAmount("");
          setSelectedAmount(null);
          Alert.alert("Success", `\u20B9${amt} added to your wallet!`);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      >
        <View style={[styles.balanceCard, { backgroundColor: Colors.gold }]}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>\u20B9{balance.toLocaleString()}</Text>
          <View style={styles.balanceMeta}>
            <Ionicons name="shield-checkmark" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.balanceMetaText}>Secured by Safar Go</Text>
          </View>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setAddMoneyVisible(true);
            }}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={18} color={Colors.gold} />
            <Text style={styles.addBtnText}>Add Money</Text>
          </Pressable>
        </View>

        <View style={styles.quickAddRow}>
          {[100, 500, 1000].map((amt) => (
            <Pressable
              key={amt}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedAmount(amt);
                setAddMoneyVisible(true);
              }}
              style={[styles.quickAddChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.quickAddText, { color: colors.text }]}>+ \u20B9{amt}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction History</Text>
        {transactions.map((tx) => (
          <View key={tx.id} style={[styles.txRow, { backgroundColor: colors.surface }]}>
            <View style={[styles.txIcon, { backgroundColor: tx.type === "credit" ? "#E8F5E9" : "#FBE9E7" }]}>
              <Ionicons
                name={tx.type === "credit" ? "arrow-down" : "arrow-up"}
                size={18}
                color={tx.type === "credit" ? "#4CAF50" : "#E74C3C"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.txLabel, { color: colors.text }]}>{tx.label}</Text>
              <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.date}</Text>
            </View>
            <Text style={[styles.txAmount, { color: tx.type === "credit" ? "#4CAF50" : "#E74C3C" }]}>
              {tx.type === "credit" ? "+" : "-"}\u20B9{tx.amount.toLocaleString()}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Modal visible={addMoneyVisible} transparent animationType="slide" onRequestClose={() => setAddMoneyVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAddMoneyVisible(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Money to Wallet</Text>
          <View style={styles.amountGrid}>
            {addAmounts.map((amt) => (
              <Pressable
                key={amt}
                onPress={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                style={[
                  styles.amountChip,
                  { borderColor: selectedAmount === amt ? Colors.gold : colors.border, backgroundColor: selectedAmount === amt ? Colors.gold + "15" : colors.background },
                ]}
              >
                <Text style={[styles.amountChipText, { color: selectedAmount === amt ? Colors.gold : colors.text }]}>\u20B9{amt}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.customInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
            placeholder="Or enter custom amount"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            value={customAmount}
            onChangeText={(t) => { setCustomAmount(t); setSelectedAmount(null); }}
          />
          <Pressable onPress={handleAdd} style={styles.proceedBtn}>
            <Text style={styles.proceedText}>Proceed to Pay</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
  },
  balanceLabel: { fontFamily: "Poppins_500Medium", fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 6 },
  balanceAmount: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 42, color: "#fff", marginBottom: 8 },
  balanceMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 20 },
  balanceMetaText: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24,
  },
  addBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: Colors.gold },
  quickAddRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  quickAddChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    alignItems: "center", borderWidth: 1,
  },
  quickAddText: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  sectionTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, marginBottom: 12 },
  txRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, marginBottom: 8,
  },
  txIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  txLabel: { fontFamily: "Poppins_500Medium", fontSize: 14, marginBottom: 2 },
  txDate: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  txAmount: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18, marginBottom: 20, textAlign: "center" },
  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  amountChip: {
    width: "30%", paddingVertical: 12, borderRadius: 12,
    alignItems: "center", borderWidth: 1.5,
  },
  amountChipText: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  customInput: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontFamily: "Poppins_400Regular", fontSize: 15, marginBottom: 16,
  },
  proceedBtn: {
    backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 14, alignItems: "center",
  },
  proceedText: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: "#0A0A0A" },
});
