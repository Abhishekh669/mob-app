import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RestaurantSettings } from '@/utils/types/setting/setting.types';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  accent: "#e8622a",
  accentSoft: "#fff3ee",
  accentMid: "#fde0d2",
  ink: "#1a1410",
  ink2: "#5c4f43",
  ink3: "#9c8d82",
  surface: "#fffcf8",
  card: "#ffffff",
  divider: "#f0ebe4",
  graySoft: "#f5f4f2",
  green: "#1a8f5c",
  greenSoft: "#e8f7f0",
  blue: "#2563b8",
  blueSoft: "#eef4ff",
  amber: "#b45309",
  amberSoft: "#fef9ee",
  red: "#c0392b",
  redSoft: "#fef2f1",
};

interface Props {
  info: RestaurantSettings | undefined;
  isLoading: boolean;
  isError: boolean;
}

export default function SettingRestaurantInfoPage({ info, isLoading, isError}: Props) {
  // Loading skeleton
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.skeletonIcon} />
            <View>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonSubtitle} />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.cardContent}>
            <View style={styles.imageSection}>
              <View style={styles.skeletonImage} />
              <View>
                <View style={styles.skeletonText} />
                <View style={styles.skeletonTextSmall} />
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.skeletonLabel} />
              <View style={styles.skeletonValue} />
            </View>
            <View style={styles.infoRow}>
              <View style={styles.skeletonLabel} />
              <View style={styles.skeletonValue} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: C.redSoft }]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.red} />
        <Text style={[styles.errorText, { color: C.red }]}>
          Failed to load restaurant information
        </Text>
        <Text style={[styles.errorSubtext, { color: C.ink3 }]}>
          Please pull down to refresh
        </Text>
      </View>
    );
  }

  // No data state
  if (!info) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: C.blueSoft }]}>
        <Ionicons name="storefront-outline" size={48} color={C.blue} />
        <Text style={[styles.emptyText, { color: C.blue }]}>
          No restaurant information available
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.headerIcon, { backgroundColor: C.accentSoft }]}>
            <Ionicons name="storefront-outline" size={20} color={C.accent} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>Restaurant Information</Text>
            <Text style={styles.cardDescription}>
              Public-facing details for your restaurant
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardContent}>
          {/* Image Section */}
          <View style={[styles.imageSection, { backgroundColor: C.graySoft, borderColor: C.divider }]}>
            <View style={[styles.imageContainer, { borderColor: C.divider }]}>
              {info.logo_url ? (
                <Image source={{ uri: info.logo_url }} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="restaurant-outline" size={32} color={C.ink3} />
                  <Text style={[styles.imagePlaceholderText, { color: C.ink3 }]}>No Image</Text>
                </View>
              )}
            </View>

            <View style={styles.imageInfo}>
              <Text style={[styles.imageTitle, { color: C.ink }]}>Restaurant Image</Text>
              <Text style={[styles.imageHint, { color: C.ink3 }]}>
                {info.logo_url ? 'Image uploaded' : 'No image uploaded'}
              </Text>
            </View>
          </View>

          {/* Basic Info Section */}
          <View>
            <Text style={[styles.sectionLabel, { color: C.ink3 }]}>BASIC INFO</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="business-outline" size={16} color={C.accent} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: C.ink3 }]}>Restaurant Name</Text>
                  <Text style={[styles.infoValue, { color: C.ink }]}>{info.name || '—'}</Text>
                </View>
              </View>

              {info.slogan && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="chatbubble-outline" size={16} color={C.accent} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: C.ink3 }]}>Slogan</Text>
                    <Text style={[styles.infoValue, { color: C.ink }]}>{info.slogan}</Text>
                  </View>
                </View>
              )}

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="call-outline" size={16} color={C.accent} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: C.ink3 }]}>Phone</Text>
                  <Text style={[styles.infoValue, { color: C.ink }]}>{info.phone || '—'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="mail-outline" size={16} color={C.accent} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: C.ink3 }]}>Email</Text>
                  <Text style={[styles.infoValue, { color: C.ink }]}>{info.email || '—'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Location Section */}
          <View>
            <Text style={[styles.sectionLabel, { color: C.ink3 }]}>LOCATION</Text>
            
            <View style={styles.infoCard}>
              {info.address && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="location-outline" size={16} color={C.accent} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: C.ink3 }]}>Address</Text>
                    <Text style={[styles.infoValue, { color: C.ink }]}>{info.address}</Text>
                  </View>
                </View>
              )}

              <View style={styles.locationRow}>
                {info.country && (
                  <View style={styles.locationItem}>
                    <Text style={[styles.locationLabel, { color: C.ink3 }]}>Country</Text>
                    <Text style={[styles.locationValue, { color: C.ink }]}>{info.country}</Text>
                  </View>
                )}
                {info.state && (
                  <View style={styles.locationItem}>
                    <Text style={[styles.locationLabel, { color: C.ink3 }]}>State</Text>
                    <Text style={[styles.locationValue, { color: C.ink }]}>{info.state}</Text>
                  </View>
                )}
                {info.city && (
                  <View style={styles.locationItem}>
                    <Text style={[styles.locationLabel, { color: C.ink3 }]}>City</Text>
                    <Text style={[styles.locationValue, { color: C.ink }]}>{info.city}</Text>
                  </View>
                )}
              </View>

              {!info.address && !info.country && !info.state && !info.city && (
                <Text style={[styles.noLocationText, { color: C.ink3 }]}>
                  No location information available
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="time-outline" size={12} color={C.ink3} />
            <Text style={[styles.lastUpdated, { color: C.ink3 }]}>
              Last updated: {info.updated_at
                ? new Date(info.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.divider,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: C.ink3,
  },
  divider: {
    height: 1,
    backgroundColor: C.divider,
  },
  cardContent: {
    padding: 18,
    gap: 20,
  },
  imageSection: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.card,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  imagePlaceholderText: {
    fontSize: 10,
    fontWeight: '500',
  },
  imageInfo: {
    flex: 1,
    gap: 4,
  },
  imageTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  imageHint: {
    fontSize: 11,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  infoCard: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    width: 24,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  locationItem: {
    flex: 1,
    minWidth: 80,
    gap: 4,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  locationValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  noLocationText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastUpdated: {
    fontSize: 10,
  },
  // Loading skeletons
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.graySoft,
  },
  skeletonTitle: {
    width: 180,
    height: 16,
    borderRadius: 4,
    backgroundColor: C.graySoft,
    marginBottom: 6,
  },
  skeletonSubtitle: {
    width: 140,
    height: 12,
    borderRadius: 4,
    backgroundColor: C.graySoft,
  },
  skeletonImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: C.graySoft,
  },
  skeletonText: {
    width: 120,
    height: 14,
    borderRadius: 4,
    backgroundColor: C.graySoft,
    marginBottom: 8,
  },
  skeletonTextSmall: {
    width: 160,
    height: 10,
    borderRadius: 4,
    backgroundColor: C.graySoft,
  },
  skeletonLabel: {
    width: 80,
    height: 12,
    borderRadius: 4,
    backgroundColor: C.graySoft,
    marginBottom: 8,
  },
  skeletonValue: {
    width: 200,
    height: 16,
    borderRadius: 4,
    backgroundColor: C.graySoft,
  },
  // Error & Empty states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});