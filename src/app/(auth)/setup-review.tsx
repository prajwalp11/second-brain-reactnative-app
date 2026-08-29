import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDomains } from '@/services/domains';
import { DomainResponse } from '@/types/domain';
import { DOMAIN_TYPES } from '@/constants/domains';

export default function SetupReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [domains, setDomains] = useState<DomainResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const result = await getDomains();
      setDomains(result);
    } catch (error) {
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  };

  const getDomainIcon = (domainType: string) => {
    return DOMAIN_TYPES.find((d) => d.type === domainType)?.icon || '📋';
  };

  const getDomainLabel = (domain: DomainResponse) => {
    const baseLabel = DOMAIN_TYPES.find((d) => d.type === domain.domainType)?.label || domain.domainType;
    if (domain.customName) {
      if (domain.domainType === 'CUSTOM') {
        return domain.customName;
      }
      return `${baseLabel} — ${domain.customName}`;
    }
    return baseLabel;
  };

  const goNext = () => {
    if (currentIndex < domains.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleDone = () => {
    router.replace('/(tabs)');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your system...</Text>
      </View>
    );
  }

  if (domains.length === 0) {
    router.replace('/(tabs)');
    return null;
  }

  const domain = domains[currentIndex];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your system is ready ✨</Text>
          <Text style={styles.subtitle}>
            {currentIndex + 1} of {domains.length}
          </Text>
        </View>

        {/* Domain card header */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{getDomainIcon(domain.domainType)}</Text>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>{getDomainLabel(domain)}</Text>
            <View style={styles.skillBadge}>
              <Text style={styles.skillBadgeText}>{domain.skillLevel}</Text>
            </View>
          </View>
        </View>

        {/* Plan description */}
        {domain.planDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Plan</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.planText}>{domain.planDescription}</Text>
            </View>
          </View>
        )}

        {/* Weekly schedule */}
        {domain.weeklySchedule && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Weekly Schedule</Text>
            <View style={styles.scheduleRow}>
              {domain.weeklySchedule.split(',').map((day, index) => {
                // Normalize to short 3-letter day names
                const trimmed = day.trim();
                const short = trimmed.length > 3 ? trimmed.substring(0, 3) : trimmed;
                return (
                  <View key={index} style={styles.dayTag}>
                    <Text style={styles.dayTagText}>{short}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Linked resource */}
        {domain.linkedResourceUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Resource</Text>
            <TouchableOpacity
              style={styles.resourceCard}
              onPress={() => WebBrowser.openBrowserAsync(domain.linkedResourceUrl!)}
            >
              <Text style={styles.resourceTitle}>
                {domain.linkedResourceTitle || 'Linked Resource'}
              </Text>
              <Text style={styles.resourceUrl} numberOfLines={1}>
                {domain.linkedResourceUrl}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Footer navigation */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {/* Dots indicator */}
        {domains.length > 1 && (
          <View style={styles.dotsRow}>
            {domains.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
            ))}
          </View>
        )}

        {/* Nav buttons */}
        {domains.length > 1 && (
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              onPress={goPrev}
              disabled={currentIndex === 0}
            >
              <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
                ← Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, currentIndex === domains.length - 1 && styles.navButtonDisabled]}
              onPress={goNext}
              disabled={currentIndex === domains.length - 1}
            >
              <Text style={[styles.navButtonText, currentIndex === domains.length - 1 && styles.navButtonTextDisabled]}>
                Next →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Looks good, let's go</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginTop: 20,
  },

  // Header
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 14,
  },
  cardIcon: {
    fontSize: 36,
  },
  cardTitleWrap: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
  },
  skillBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'capitalize',
  },

  // Sections
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  planText: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 23,
  },

  // Schedule
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayTag: {
    backgroundColor: '#1e293b',
    width: 48,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  dayTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },

  // Resource
  resourceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#60a5fa',
    marginBottom: 4,
  },
  resourceUrl: {
    fontSize: 12,
    color: '#64748b',
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  dotActive: {
    backgroundColor: '#3b82f6',
    width: 20,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#60a5fa',
  },
  navButtonTextDisabled: {
    color: '#64748b',
  },
  doneButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
