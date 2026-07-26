import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getDomains } from '@/services/domains';
import { DomainResponse } from '@/types/domain';
import { DOMAIN_TYPES } from '@/constants/domains';

export default function SetupReviewScreen() {
  const router = useRouter();
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
    // Show customName as qualifier: "Language — Spanish" or just "Photography" for CUSTOM
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
        <Text style={styles.loadingText}>AI is building your system...</Text>
        <Text style={styles.loadingSubtext}>This may take a moment</Text>
      </View>
    );
  }

  if (domains.length === 0) {
    router.replace('/(tabs)');
    return null;
  }

  const domain = domains[currentIndex];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your system is ready</Text>
          <Text style={styles.subtitle}>
            {currentIndex + 1} of {domains.length}
          </Text>
        </View>

        {/* Domain card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>{getDomainIcon(domain.domainType)}</Text>
            <Text style={styles.cardTitle}>{getDomainLabel(domain)}</Text>
            <View style={styles.skillBadge}>
              <Text style={styles.skillBadgeText}>{domain.skillLevel}</Text>
            </View>
          </View>

          {/* Plan */}
          {domain.planDescription && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Plan</Text>
              <Text style={styles.sectionText}>{domain.planDescription}</Text>
            </View>
          )}

          {/* Schedule */}
          {domain.weeklySchedule && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Schedule</Text>
              <View style={styles.dayTags}>
                {domain.weeklySchedule.split(',').map((day, index) => (
                  <View key={index} style={styles.dayTag}>
                    <Text style={styles.dayTagText}>{day.trim()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Linked resource */}
          {domain.linkedResourceUrl && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Resource</Text>
              <Text style={styles.resourceLink}>
                {domain.linkedResourceTitle || domain.linkedResourceUrl}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer navigation */}
      <View style={styles.footer}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            onPress={goPrev}
            disabled={currentIndex === 0}
          >
            <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
              ← Prev
            </Text>
          </TouchableOpacity>

          {currentIndex < domains.length - 1 ? (
            <TouchableOpacity style={styles.navButton} onPress={goNext}>
              <Text style={styles.navButtonText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>

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
    padding: 24,
    paddingTop: 60,
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
  loadingSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
  },
  skillBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  dayTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayTag: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  dayTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#cbd5e1',
  },
  resourceLink: {
    fontSize: 14,
    color: '#60a5fa',
  },
  footer: {
    padding: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
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
    marginBottom: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
