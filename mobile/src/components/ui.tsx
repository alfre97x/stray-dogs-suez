// mobile/src/components/ui.tsx
// Core design-system components used across all screens

import React from "react";
import {
  View, Text, TouchableOpacity, TextInput, Switch,
  ActivityIndicator, Image, StyleSheet, ViewStyle, TextStyle,
} from "react-native";
import { Colors, Typography, Spacing, Radius, Shadows } from "../utils/theme";
import { useTranslation } from "react-i18next";

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: string;
}

export function Button({ onPress, label, variant = "primary", loading, disabled, style, icon }: ButtonProps) {
  const bg = {
    primary:   Colors.primary,
    secondary: Colors.surface,
    danger:    Colors.dangerBg,
    ghost:     Colors.transparent,
  }[variant];

  const textColor = {
    primary:   Colors.white,
    secondary: Colors.textSecondary,
    danger:    Colors.danger,
    ghost:     Colors.primary,
  }[variant];

  const borderColor = {
    primary:   Colors.transparent,
    secondary: Colors.border,
    danger:    Colors.dangerBorder,
    ghost:     Colors.transparent,
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.btnText, { color: textColor }]}>
          {icon ? `${icon}  ` : ""}{label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export function Input({
  value, onChangeText, placeholder, label, error, multiline, numberOfLines,
  keyboardType, secureTextEntry, autoCapitalize,
}: InputProps) {
  return (
    <View style={styles.inputGroup}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textDisabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? "sentences"}
        style={[
          styles.input,
          multiline && { height: numberOfLines ? numberOfLines * 24 + 24 : 80, textAlignVertical: "top" },
          error && { borderColor: Colors.danger },
        ]}
      />
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: string;
}

export function ToggleRow({ label, value, onChange, icon }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{icon ? `${icon}  ` : ""}{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  color: string;
  bg: string;
  border?: string;
}

export function Badge({ label, color, bg, border }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border ?? bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
    </View>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

export function StatPill({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statNum, { color: color ?? Colors.textPrimary }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, message, cta, onCta }: {
  icon: string; message: string; cta?: string; onCta?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {cta && onCta && (
        <Button onPress={onCta} label={cta} style={{ marginTop: Spacing.md }} />
      )}
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  btn: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
  },
  btnText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.2,
  },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: Typography.sizes.md,
    color: Colors.textPrimary,
    minHeight: 48,
  },
  inputError: {
    fontSize: Typography.sizes.xs,
    color: Colors.danger,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    minHeight: 52,
  },
  toggleLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.textPrimary,
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: 4,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  sectionHeader: { padding: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  sectionSub: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  statPill: { flex: 1, alignItems: "center", paddingVertical: Spacing.sm },
  statNum: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black },
  statLabel: { fontSize: 9, color: Colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  emptyState: { alignItems: "center", paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 52, marginBottom: Spacing.md },
  emptyMessage: { fontSize: Typography.sizes.md, color: Colors.textTertiary, textAlign: "center" },
  avatarFallback: { backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  avatarText: { color: Colors.primary, fontWeight: Typography.weights.bold },
});
