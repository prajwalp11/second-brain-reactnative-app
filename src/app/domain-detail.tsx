import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDomains, getPRsForDomain, getMilestonesForDomain, pauseDomain, resumeDomain, archiveDomain, MilestoneResponse } from '@/services/domains';
import { DomainResponse } from '@/types/domain';
import { PersonalRecordResponse } from '@/types/session';
import { DOMAIN_TYPES } from '@/constants/domains';

export default function DomainDetailModal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { domainId } = useLocalSearchParams<{ domainId: string }>();

  const [domain, setDomain] = useState<DomainResponse | null>(null);
  const [prs, setPrs] = useState<PersonalRecordResponse[]>([]);
  const [milestones, setMilestones] = useState<MilestoneResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDetail() {
      try {
        const [domains, prData, milestoneData] = await Promise.all([
          getDomains(),
          getPRsForDomain(domainId),
          getMilestonesForDomain(domainId),
        ]);
        const found = domains.find((d) => d.id === domainId) || null;
        setDomain(found);
        setPrs(prData);
        setMilestones(milestoneData);
      } catch (error) {
        console.log('Failed to load domain detail:', error);
      } finally {
        setIsLoading(false);
      }
    }
    if (domainId) loadDetail();
  }, [domainId]);

  const getDomainIcon = (domainType: string): string => {
    return DOMAIN_TYPES.find((d) => d.type === domainType)?.icon || '📋';
  };

  const getDomainLabel = (d: DomainResponse): string => {
    return d.customName || DOMAIN_TYPES.find((dt) => dt.type === d.domainType)?.label || d.domainType;
  };

  const parseDayTags = (schedule: string | null): string[] => {
    if (!schedule) return [];
    return schedule.split(',').map((d) => d.trim());
  };

  if (isLoading || !domain) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const days = parseDayTags(domain.weeklySchedule);
  const activeMilestones = milestones.filter((m) => m.status === 'IN_PROGRESS' || m.status === 'UPCOMING');
  const completedMilestones = milestones.filter((m) => m.status === 'DONE');

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>{getDomainIcon(domain.domainType)}</Text>
            <View>
              <Text style={styles.headerTitle}>{getDomainLabel(domain)}</Text>
              <Text style={styles.headerSub}>
                {domain.currentStreak}d streak · Best: {domain.longestStreak}d
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* PRs grid */}
        {prs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Records</Text>
            <View style={styles.prGrid}>
              {prs.map((pr, idx) => (
                <View key={idx} style={styles.prCard}>
                  <Text style={styles.prValue}>
                    {pr.value % 1 === 0 ? pr.value : pr.value.toFixed(1)}
                    <Text style={styles.prUnit}> {pr.unit}</Text>
                  </Text>
                  <Text style={styles.prLabel}>{pr.label || pr.metricKey}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Milestones */}
        {activeMilestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Milestones</Text>
            {activeMilestones.map((m) => {
              const progress = m.currentValue && m.targetValue
                ? Math.min(m.currentValue / m.targetValue, 1)
                : 0;
              return (
                <View key={m.id} style={styles.milestoneCard}>
                  <View style={styles.milestoneHeader}>
                    <Text style={styles.milestoneLabel}>{m.label}</Text>
                    <Text style={styles.milestoneProgress}>
                      {m.currentValue != null ? (m.currentValue % 1 === 0 ? m.currentValue : m.currentValue.toFixed(1)) : '0'}
                      /{m.targetValue}{m.unit}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Plan */}
        {domain.planDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Plan</Text>
            <Text style={styles.planText}>{domain.planDescription}</Text>
            {days.length > 0 && (
              <View style={styles.dayTags}>
                {days.map((day) => (
                  <View key={day} style={styles.dayTag}>
                    <Text style={styles.dayTagText}>{day}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Completed milestones */}
        {completedMilestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed ({completedMilestones.length})</Text>
            {completedMilestones.map((m) => (
              <View key={m.id} style={styles.completedRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.completedText}>{m.label} — {m.targetValue}{m.unit}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              router.back();
              // Navigate to AI tab with domain pre-selected in ADJUST_PLAN mode
              setTimeout(() => {
                router.push({
                  pathname: '/(tabs)/ai',
                  params: { domainId, chatMode: 'ADJUST_PLAN' },
                });
              }, 300);
            }}
          >
            <Ionicons name="sparkles-outline" size={18} color="#a78bfa" />
            <Text style={[styles.actionButtonText, { color: '#a78bfa' }]}>Edit plan with AI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (domain.status === 'PAUSED') {
                Alert.alert(
                  'Resume domain?',
                  'Tasks and nudges will start generating again.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Resume',
                      onPress: async () => {
                        try {
                          await resumeDomain(domainId);
                          Alert.alert('Resumed', 'Domain is active again.');
                          router.back();
                        } catch (e) {
                          Alert.alert('Error', 'Failed to resume domain.');
                        }
                      },
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Pause domain?',
                  'Tasks and nudges will stop. You can resume anytime.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Pause',
                      onPress: async () => {
                        try {
                          await pauseDomain(domainId);
                          Alert.alert('Paused', 'Domain paused. No tasks or nudges will be generated.');
                          router.back();
                        } catch (e) {
                          Alert.alert('Error', 'Failed to pause domain.');
                        }
                      },
                    },
                  ]
                );
              }
            }}
          >
            <Ionicons
              name={domain.status === 'PAUSED' ? 'play-circle-outline' : 'pause-circle-outline'}
              size={18}
              color={domain.status === 'PAUSED' ? '#10b981' : '#fbbf24'}
            />
            <Text style={[styles.actionButtonText, { color: domain.status === 'PAUSED' ? '#10b981' : '#fbbf24' }]}>
              {domain.status === 'PAUSED' ? 'Resume domain' : 'Pause domain'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Alert.alert(
                'Delete domain?',
                'This will permanently remove this domain and all its data from your dashboard.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await archiveDomain(domainId);
                        router.back();
                      } catch (e) {
                        Alert.alert('Error', 'Failed to delete domain.');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete domain</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 36,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSub: {
    fontSize: 13,
    color: '#f97316',
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // PRs
  prGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  prCard: {
    width: '47%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  prValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
  },
  prUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  prLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },

  // Milestones
  milestoneCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e2e8f0',
    flex: 1,
  },
  milestoneProgress: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#a78bfa',
    borderRadius: 3,
  },

  // Plan
  planText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
    marginBottom: 12,
  },
  dayTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayTag: {
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },

  // Resource
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    lineHeight: 18,
  },
  resourceUrl: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
  },

  // Completed milestones
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  completedText: {
    fontSize: 13,
    color: '#64748b',
  },

  // Actions
  actionsSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 20,
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
