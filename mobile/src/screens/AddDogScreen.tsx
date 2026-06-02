// mobile/src/screens/AddDogScreen.tsx
// Full-featured add/edit dog form with camera, GPS, and validation

import React, { useState, useCallback } from "react";
import {
  View, ScrollView, Text, TouchableOpacity, Image,
  StyleSheet, Alert, Platform, KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import * as Crypto from "expo-crypto";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";

import { supabase, Dog } from "../services/supabase";
import { useAuthStore, useAppStore } from "../store";
import { Colors, Spacing, Typography, Radius } from "../utils/theme";
import { Button, Input, ToggleRow, Badge } from "../components/ui";
import { ZONES } from "../utils/zones";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:           z.string().optional(),
  sex:            z.enum(["male", "female", "unknown"]),
  estimated_age:  z.string().optional(),
  color:          z.string().optional(),
  notes:          z.string().optional(),
  zone_id:        z.string().min(1, "Zone is required"),
  tnr_done:       z.boolean(),
  tnr_date:       z.string().optional(),
  vaccinated:     z.boolean(),
  vacc_date:      z.string().optional(),
  vacc_type:      z.string().optional(),
  is_injured:     z.boolean(),
});

type FormData = z.infer<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddDogScreen() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuthStore();
  const { addDog, updateDog } = useAppStore();
  const params = useLocalSearchParams<{ dog?: string }>();
  const editingDog: Dog | null = params.dog ? JSON.parse(params.dog) : null;
  const isRTL = i18n.language === "ar";

  const [photoUri, setPhotoUri]     = useState<string | null>(editingDog?.thumbnail_url ?? null);
  const [location, setLocation]     = useState<{ lat: number; lng: number } | null>(
    editingDog ? { lat: editingDog.lat, lng: editingDog.lng } : null
  );
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [saving, setSaving]         = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:          editingDog?.name ?? "",
      sex:           editingDog?.sex ?? "unknown",
      estimated_age: editingDog?.estimated_age ?? "",
      color:         editingDog?.color ?? "",
      notes:         editingDog?.notes ?? "",
      zone_id:       editingDog?.zone_id ?? "",
      tnr_done:      editingDog?.tnr_done ?? false,
      tnr_date:      editingDog?.tnr_date ?? "",
      vaccinated:    editingDog?.vaccinated ?? false,
      vacc_date:     editingDog?.vacc_date ?? "",
      vacc_type:     editingDog?.vacc_type ?? "",
      is_injured:    editingDog?.is_injured ?? false,
    },
  });

  const tnrDone   = watch("tnr_done");
  const vaccDone  = watch("vaccinated");

  // ─── Photo ────────────────────────────────────────────────────────────────

  const pickPhoto = useCallback(async (source: "camera" | "library") => {
    const { status } = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo access in settings.");
      return;
    }

    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] });

    if (!result.canceled && result.assets[0]) {
      // Resize to max 1200px for upload
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPhotoUri(manipulated.uri);
    }
  }, []);

  const showPhotoOptions = useCallback(() => {
    Alert.alert(t("photo_add"), "", [
      { text: "📷 " + "Camera",  onPress: () => pickPhoto("camera") },
      { text: "🖼️ " + "Gallery", onPress: () => pickPhoto("library") },
      { text: t("cancel"), style: "cancel" },
    ]);
  }, [pickPhoto, t]);

  // ─── Location ─────────────────────────────────────────────────────────────

  const getLocation = useCallback(async () => {
    setLocationStatus("loading");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationStatus("error");
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLocationStatus("ok");
    } catch {
      setLocationStatus("error");
    }
  }, []);

  // ─── Upload photo ─────────────────────────────────────────────────────────

  const uploadPhoto = async (uri: string, dogId: string): Promise<string | null> => {
    try {
      const ext = "jpg";
      const path = `dogs/${dogId}/${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error } = await supabase.storage.from("dog-photos").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (error) return null;
      const { data } = supabase.storage.from("dog-photos").getPublicUrl(path);
      return data.publicUrl;
    } catch {
      return null;
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    if (!profile) return;
    setSaving(true);

    try {
      // Resolve location — use GPS or zone centre
      const zone = ZONES.find(z => z.id === data.zone_id);
      const finalLoc = location ?? {
        lat: zone!.lat + (Math.random() - 0.5) * 0.004,
        lng: zone!.lng + (Math.random() - 0.5) * 0.004,
      };

      // crypto.randomUUID() is NOT available in React Native (Hermes);
      // expo-crypto provides a real UUID v4 implementation.
      const dogId = editingDog?.id ?? Crypto.randomUUID();

      // Upload photo if new
      let photoUrl: string | null = editingDog?.thumbnail_url ?? null;
      if (photoUri && photoUri !== editingDog?.thumbnail_url) {
        photoUrl = await uploadPhoto(photoUri, dogId);
      }

      const dogPayload = {
        id:             dogId,
        name:           data.name || null,
        sex:            data.sex,
        estimated_age:  data.estimated_age || null,
        color:          data.color || null,
        notes:          data.notes || null,
        zone_id:        data.zone_id,
        lat:            finalLoc.lat,
        lng:            finalLoc.lng,
        tnr_done:       data.tnr_done,
        tnr_date:       data.tnr_done ? (data.tnr_date || new Date().toISOString().split("T")[0]) : null,
        vaccinated:     data.vaccinated,
        vacc_date:      data.vaccinated ? (data.vacc_date || new Date().toISOString().split("T")[0]) : null,
        vacc_type:      data.vacc_type || null,
        is_injured:     data.is_injured,
        photo_urls:     photoUrl ? [photoUrl] : [],
        thumbnail_url:  photoUrl,
        added_by:       profile.id,
        caught_at:      editingDog?.caught_at ?? new Date().toISOString().split("T")[0],
      };

      if (editingDog) {
        const { error } = await supabase.from("dogs").update(dogPayload).eq("id", dogId);
        if (error) throw error;
        updateDog(dogId, dogPayload as Partial<Dog>);

        // Log event
        await supabase.from("dog_events").insert({
          dog_id: dogId, user_id: profile.id, event_type: "updated",
          details: { fields_changed: Object.keys(data) },
        });
      } else {
        const { error } = await supabase.from("dogs").insert(dogPayload);
        if (error) throw error;
        addDog(dogPayload as Dog);

        await supabase.from("dog_events").insert({
          dog_id: dogId, user_id: profile.id, event_type: "created",
          details: { zone: data.zone_id },
        });
      }

      router.back();
    } catch (err) {
      Alert.alert(t("error_save"), String(err));
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>{isRTL ? "→" : "←"}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{editingDog ? t("edit_dog_title") : t("add_dog_title")}</Text>
        </View>

        {/* Photo */}
        <TouchableOpacity style={styles.photoBox} onPress={showPhotoOptions} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoHint}>{t("photo_add")}</Text>
            </View>
          )}
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>{photoUri ? t("photo_change") : "+"}</Text>
          </View>
        </TouchableOpacity>

        {/* Name */}
        <Controller name="name" control={control} render={({ field }) => (
          <Input
            label={t("name_optional")}
            value={field.value ?? ""}
            onChangeText={field.onChange}
            placeholder={t("name_placeholder")}
          />
        )} />

        {/* Zone picker */}
        <Text style={styles.fieldLabel}>{t("zone")}</Text>
        <Controller name="zone_id" control={control} render={({ field }) => (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.zonePicker}>
            {ZONES.map(zone => (
              <TouchableOpacity
                key={zone.id}
                onPress={() => field.onChange(zone.id)}
                style={[
                  styles.zoneChip,
                  field.value === zone.id && styles.zoneChipSelected,
                ]}
              >
                <Text style={[
                  styles.zoneChipText,
                  field.value === zone.id && styles.zoneChipTextSelected,
                ]}>
                  {isRTL ? zone.name_ar : zone.name_en}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )} />
        {errors.zone_id && <Text style={styles.errorText}>{errors.zone_id.message}</Text>}

        {/* Location */}
        <View style={styles.locationSection}>
          <Text style={styles.fieldLabel}>{t("location_pin")}</Text>
          <TouchableOpacity
            style={[
              styles.locationBtn,
              locationStatus === "ok" && styles.locationBtnOk,
              locationStatus === "loading" && styles.locationBtnLoading,
            ]}
            onPress={getLocation}
            disabled={locationStatus === "loading"}
          >
            <Text style={styles.locationBtnIcon}>
              {locationStatus === "ok" ? "✅" : locationStatus === "loading" ? "⏳" : "📍"}
            </Text>
            <Text style={[styles.locationBtnText, locationStatus === "ok" && { color: Colors.success }]}>
              {locationStatus === "ok"
                ? `${t("location_captured")} · ${location?.lat.toFixed(4)}, ${location?.lng.toFixed(4)}`
                : locationStatus === "loading"
                ? "Getting location…"
                : t("use_my_location")}
            </Text>
          </TouchableOpacity>
          {locationStatus === "error" && (
            <Text style={styles.locationError}>{t("location_failed")}</Text>
          )}
        </View>

        {/* Sex */}
        <Text style={styles.fieldLabel}>{t("sex")}</Text>
        <Controller name="sex" control={control} render={({ field }) => (
          <View style={styles.chipRow}>
            {(["male", "female", "unknown"] as const).map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => field.onChange(s)}
                style={[styles.chip, field.value === s && styles.chipSelected]}
              >
                <Text style={[styles.chipText, field.value === s && styles.chipTextSelected]}>
                  {s === "male" ? "♂ " : s === "female" ? "♀ " : "◇ "}{t(`sex_${s}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )} />

        {/* Age */}
        <Text style={styles.fieldLabel}>{t("estimated_age")}</Text>
        <Controller name="estimated_age" control={control} render={({ field }) => (
          <View style={styles.chipRow}>
            {(["age_puppy", "age_young", "age_adult", "age_senior"] as const).map(a => (
              <TouchableOpacity
                key={a}
                onPress={() => field.onChange(a)}
                style={[styles.chip, field.value === a && styles.chipSelected]}
              >
                <Text style={[styles.chipText, field.value === a && styles.chipTextSelected]}>
                  {t(a)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )} />

        {/* Colour */}
        <Controller name="color" control={control} render={({ field }) => (
          <Input label={t("color")} value={field.value ?? ""} onChangeText={field.onChange}
            placeholder="e.g. Brown, black & white, grey…" />
        )} />

        {/* TNR toggle */}
        <Controller name="tnr_done" control={control} render={({ field }) => (
          <ToggleRow label={t("tnr_label")} value={field.value} onChange={field.onChange} icon="✂️" />
        )} />
        {tnrDone && (
          <Controller name="tnr_date" control={control} render={({ field }) => (
            <Input label={t("tnr_date")} value={field.value ?? ""} onChangeText={field.onChange}
              placeholder="YYYY-MM-DD" keyboardType="numeric" />
          )} />
        )}

        {/* Vaccinated toggle */}
        <Controller name="vaccinated" control={control} render={({ field }) => (
          <ToggleRow label={t("vacc_label")} value={field.value} onChange={field.onChange} icon="💉" />
        )} />
        {vaccDone && (
          <>
            <Controller name="vacc_date" control={control} render={({ field }) => (
              <Input label={t("vacc_date")} value={field.value ?? ""} onChangeText={field.onChange}
                placeholder="YYYY-MM-DD" keyboardType="numeric" />
            )} />
            <Controller name="vacc_type" control={control} render={({ field }) => (
              <Input label={t("vacc_type")} value={field.value ?? ""} onChangeText={field.onChange}
                placeholder="e.g. Rabies, 5-in-1…" />
            )} />
          </>
        )}

        {/* Injured toggle */}
        <Controller name="is_injured" control={control} render={({ field }) => (
          <ToggleRow label={t("is_injured")} value={field.value} onChange={field.onChange} icon="🩹" />
        )} />

        {/* Notes */}
        <Controller name="notes" control={control} render={({ field }) => (
          <Input label={t("notes_label")} value={field.value ?? ""} onChangeText={field.onChange}
            placeholder={t("notes_placeholder")} multiline numberOfLines={3} />
        )} />

        {/* Save */}
        <View style={styles.actions}>
          <Button
            onPress={handleSubmit(onSubmit)}
            label={saving ? t("saving") : t("save")}
            loading={saving}
            style={styles.saveBtn}
          />
          <Button
            onPress={() => router.back()}
            label={t("cancel")}
            variant="ghost"
          />
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingBottom: 48 },
  header: { flexDirection: "row", alignItems: "center", padding: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: Spacing.sm, marginRight: Spacing.sm },
  backIcon: { fontSize: 22, color: Colors.primary },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary, flex: 1 },
  photoBox: { margin: Spacing.base, borderRadius: Radius.lg, overflow: "hidden", height: 180, backgroundColor: Colors.surface, borderWidth: 2, borderStyle: "dashed", borderColor: Colors.border, position: "relative" },
  photoPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  photoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  photoIcon: { fontSize: 40 },
  photoHint: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  photoBadge: { position: "absolute", bottom: 10, right: 10, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  photoBadgeText: { color: Colors.white, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold },
  fieldLabel: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.xs, marginHorizontal: Spacing.base },
  zonePicker: { marginBottom: Spacing.base, paddingHorizontal: Spacing.base },
  zoneChip: { backgroundColor: Colors.surface, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginRight: Spacing.xs },
  zoneChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  zoneChipText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  zoneChipTextSelected: { color: Colors.white, fontWeight: Typography.weights.semibold },
  locationSection: { marginHorizontal: Spacing.base, marginBottom: Spacing.md },
  locationBtn: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, backgroundColor: Colors.infoBg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.infoBorder, padding: Spacing.md },
  locationBtnOk: { backgroundColor: Colors.successBg, borderColor: Colors.successBorder },
  locationBtnLoading: { opacity: 0.6 },
  locationBtnIcon: { fontSize: 20 },
  locationBtnText: { fontSize: Typography.sizes.sm, color: Colors.info, fontWeight: Typography.weights.semibold, flex: 1 },
  locationError: { fontSize: Typography.sizes.xs, color: Colors.warning, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs, marginHorizontal: Spacing.base, marginBottom: Spacing.md },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.white, fontWeight: Typography.weights.semibold },
  errorText: { fontSize: Typography.sizes.xs, color: Colors.danger, marginHorizontal: Spacing.base, marginBottom: Spacing.sm },
  actions: { marginHorizontal: Spacing.base, marginTop: Spacing.lg, gap: Spacing.sm },
  saveBtn: { marginBottom: Spacing.xs },
});
