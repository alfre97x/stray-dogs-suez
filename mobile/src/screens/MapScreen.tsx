// mobile/src/screens/MapScreen.tsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator,
} from "react-native";
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { useAppStore, useAuthStore } from "../store";
import { Colors, Spacing, Typography, Radius, Shadows } from "../utils/theme";
import { URGENCY_CONFIG } from "../utils/theme";
import { ZONES } from "../utils/zones";
import type { Dog, Sighting } from "../services/supabase";

type Filter = "all" | "tnr" | "needs_tnr" | "injured";

const SUEZ_REGION = {
  latitude: 29.965, longitude: 32.548,
  latitudeDelta: 0.08, longitudeDelta: 0.08,
};

// Google Maps dark style
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a1209" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1209" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a08060" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a1f0e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#4a3520" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#806040" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1520" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a6080" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

export default function MapScreen() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const { dogs, sightings } = useAppStore();
  const mapRef = useRef<MapView>(null);

  const [filter, setFilter]         = useState<Filter>("all");
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading]       = useState(true);

  // Get user location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      }
      setLoading(false);
    })();
  }, []);

  const filteredDogs = dogs.filter(d => {
    if (d.is_deceased) return false;
    if (filter === "tnr")       return d.tnr_done;
    if (filter === "needs_tnr") return !d.tnr_done;
    if (filter === "injured")   return d.is_injured;
    return true;
  });

  const getDogMarkerColor = (dog: Dog): string => {
    if (dog.is_injured)                return Colors.danger;
    if (dog.tnr_done && dog.vaccinated) return Colors.success;
    if (dog.tnr_done)                  return Colors.info;
    return Colors.primary;
  };

  const centerOnUser = useCallback(async () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02,
      }, 600);
    }
  }, [userLocation]);

  const goToAddDog = useCallback(() => {
    if (!profile) {
      router.push("/auth");
      return;
    }
    router.push("/add-dog");
  }, [profile]);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={SUEZ_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        loadingEnabled
        loadingBackgroundColor={Colors.background}
        loadingIndicatorColor={Colors.primary}
      >
        {/* Dog markers */}
        {filteredDogs.map(dog => (
          <Marker
            key={dog.id}
            coordinate={{ latitude: dog.lat, longitude: dog.lng }}
            onPress={() => setSelectedDog(dog)}
          >
            {/* Custom marker view */}
            <View style={[styles.markerContainer, { borderColor: getDogMarkerColor(dog) }]}>
              <Text style={styles.markerEmoji}>🐕</Text>
            </View>
            <Callout tooltip onPress={() => router.push({ pathname: "/dog-detail", params: { dog: JSON.stringify(dog) } })}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{dog.name || t("unnamed_dog")}</Text>
                <Text style={styles.calloutZone}>
                  📍 {ZONES.find(z => z.id === dog.zone_id)?.name_en}
                </Text>
                <View style={styles.calloutBadges}>
                  {dog.tnr_done && <Text style={styles.calloutBadge}>✂️ TNR</Text>}
                  {dog.vaccinated && <Text style={styles.calloutBadge}>💉 Vacc</Text>}
                  {dog.is_injured && <Text style={[styles.calloutBadge, { color: Colors.danger }]}>🩹 Injured</Text>}
                </View>
                <Text style={styles.calloutCta}>Tap to open →</Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Sighting markers */}
        {sightings.filter(s => !s.resolved).map(s => {
          const urgencyConf = URGENCY_CONFIG[s.urgency];
          return (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.lat ?? ZONES.find(z => z.id === s.zone_id)?.lat ?? 29.965, longitude: s.lng ?? ZONES.find(z => z.id === s.zone_id)?.lng ?? 32.548 }}
            >
              <View style={[styles.sightingMarker, { borderColor: urgencyConf.color }]}>
                <Text style={styles.sightingEmoji}>{urgencyConf.emoji}</Text>
              </View>
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={[styles.calloutName, { color: urgencyConf.color }]}>
                    {urgencyConf.emoji} Sighting — {s.count} dog(s)
                  </Text>
                  <Text style={styles.calloutZone}>
                    📍 {ZONES.find(z => z.id === s.zone_id)?.name_en}
                  </Text>
                  {s.description && (
                    <Text style={styles.calloutDesc} numberOfLines={2}>{s.description}</Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        {(["all", "needs_tnr", "tnr", "injured"] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === "all"      ? t("filter_all")      :
               f === "tnr"     ? t("filter_tnr")      :
               f === "needs_tnr" ? t("filter_needs_tnr") :
               t("filter_injured")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Dog count badge */}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>🐕 {filteredDogs.length}</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend</Text>
        {[
          { color: Colors.success, label: "TNR + Vaccinated" },
          { color: Colors.info,    label: "TNR only" },
          { color: Colors.primary, label: "Not TNR'd" },
          { color: Colors.danger,  label: "Injured" },
        ].map(({ color, label }) => (
          <View key={label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* FABs */}
      <View style={styles.fabs}>
        <TouchableOpacity style={[styles.fab, styles.fabSecondary]} onPress={centerOnUser} activeOpacity={0.8}>
          <Text style={styles.fabSecondaryIcon}>📍</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, styles.fabPrimary]} onPress={goToAddDog} activeOpacity={0.85}>
          <Text style={styles.fabPrimaryText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },

  filterBar: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", gap: 6, justifyContent: "center" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.semibold },
  filterChipTextActive: { color: Colors.white },

  countBadge: { position: "absolute", top: 56, right: 12, backgroundColor: Colors.surface, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 6, ...Shadows.sm },
  countText: { fontSize: Typography.sizes.sm, color: Colors.textPrimary, fontWeight: Typography.weights.bold },

  legend: { position: "absolute", bottom: 100, left: 12, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 10, ...Shadows.sm },
  legendTitle: { fontSize: 10, color: Colors.textSecondary, fontWeight: Typography.weights.semibold, textTransform: "uppercase", marginBottom: 4 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, color: Colors.textSecondary },

  fabs: { position: "absolute", bottom: 24, right: 16, gap: 10, alignItems: "center" },
  fab: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", ...Shadows.md },
  fabPrimary: { backgroundColor: Colors.primary },
  fabPrimaryText: { color: Colors.white, fontSize: 28, fontWeight: Typography.weights.bold, lineHeight: 32 },
  fabSecondary: { backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.primary, width: 44, height: 44, borderRadius: 22 },
  fabSecondaryIcon: { fontSize: 20 },

  markerContainer: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, borderWidth: 3, alignItems: "center", justifyContent: "center", ...Shadows.sm },
  markerEmoji: { fontSize: 18 },
  sightingMarker: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  sightingEmoji: { fontSize: 14 },

  callout: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12, minWidth: 180, maxWidth: 240, borderWidth: 1, borderColor: Colors.border },
  calloutName: { fontSize: 14, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: 4 },
  calloutZone: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  calloutBadges: { flexDirection: "row", gap: 4, flexWrap: "wrap", marginBottom: 6 },
  calloutBadge: { fontSize: 11, color: Colors.success },
  calloutDesc: { fontSize: 11, color: Colors.textSecondary, fontStyle: "italic", marginBottom: 4 },
  calloutCta: { fontSize: 11, color: Colors.primary, fontWeight: Typography.weights.semibold, textAlign: "right" },
});
