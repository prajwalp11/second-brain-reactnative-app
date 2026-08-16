import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDomains, getMilestonesForDomain, MilestoneResponse } from '@/services/domains';
import { DomainResponse } from '@/types/domain';
import { DOMAIN_TYPES } from '@/constants/domains';

interface DomainWithMilestone extends DomainResponse {
  nextMilestone: MilestoneResponse | null;
}

export default function DomainsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [domains, setDomains] = useState<DomainWithMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDomains = async () => {
    try {
      const data = await getDomains();
      const activeDomains = data.filter((d) => d.status !== 'ARCHIVED');

      // Fetch next milestone for each domain
      const domainsWithMilestones: DomainWithMilestone[] = await Promise.all(
        activeDomains.map(async (domain) => {
          try {
            const milestones = await getMilestonesForDomain(domain.id);
            const next = milestones.find((m) => m.status === 'IN_PROGRESS' || m.status === 'UPCOMING') || null;
            return { ...domain, nextMilestone: next };
          } catch {
            return { ...domain, nextMilestone: null };
          }
        })
      );

      setDomains(domainsWithMilestones);
    } catch (error) {
      console.log('Failed to load domains:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDomains();
  }, []);

  const getDomainIcon = (domainType: string): string => {
    return DOMAIN_TYPES.find((d) => d.type === domainType)?.icon || '📋';
  };

  const getDomainLabel = (domain: DomainResponse): string => {
    return domain.customName || DOMAIN_TYPES.find((d) => d.type === domain.domainType)?.label || domain.domainType;
  };

  const getStatusInfo = (domain: DomainResponse): { label: string; color: string } => {
    if (domain.status === 'PAUSED') return { label: 'Paused', color: '#fbbf24' };
    if (domain.currentStreak === 0) return { label: 'Needs log', color: '#f97316' };
    if (domain.currentStreak >= 3) return { label: 'On track', color: '#10b981' };
    return { label: 'Active', color: '#3b82f6' };
  };

  const getScheduleSummary = (domain: DomainResponse): string => {
    if (!domain.weeklySchedule) return '';
    const days = domain.weeklySchedule.split(',').length;
    return `${days}x/week`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        <Text style={styles.title}>My domains</Text>

        {domains.map((domain) => {
          const status = getStatusInfo(domain);
          const scheduleSummary = getScheduleSummary(domain);

          return (
            <TouchableOpacity
              key={domain.id}
              style={styles.domainCard}
              onPress={() => router.push({ pathname: '/domain-detail', params: { domainId: domain.id } })}
              activeOpacity={0.7}
            >
              {/* Top row: icon + name + status */}
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <Text style={styles.domainIcon}>{getDomainIcon(domain.domainType)}</Text>
                  <Text style={styles.domainName}>{getDomainLabel(domain)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>

              {/* Summary line */}
              <Text style={styles.summaryText} numberOfLines={2}>
                {domain.planDescription || 'No plan set'}
              </Text>

              {/* Schedule + streak row */}
              <View style={styles.metaRow}>
                {scheduleSummary ? (
                  <View style={styles.metaTag}>
                    <Ionicons name="calendar-outline" size={11} color="#64748b" />
                    <Text style={styles.metaTagText}>{scheduleSummary}</Text>
                  </View>
                ) : null}
                {domain.currentStreak > 0 ? (
                  <View style={styles.metaTag}>
                    <Ionicons name="flame" size={11} color="#f97316" />
                    <Text style={[styles.metaTagText, { color: '#f97316' }]}>{domain.currentStreak}d streak</Text>
                  </View>
                ) : null}
              </View>

              {/* Next milestone */}
              {domain.nextMilestone && (
                <View style={styles.milestoneRow}>
                  <Ionicons name="flag-outline" size={13} color="#a78bfa" />
                  <Text style={styles.milestoneText}>
                    Next: {domain.nextMilestone.label}
                    {domain.nextMilestone.currentValue != null && domain.nextMilestone.targetValue
                      ? ` (${Math.round((domain.nextMilestone.currentValue / domain.nextMilestone.targetValue) * 100)}%)`
                      : ''}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Add domain button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-domain')}
        >
          <Ionicons name="add" size={20} color="#3b82f6" />
          <Text style={styles.addButtonText}>Add new domain</Text>
        </TouchableOpacity>
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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 20,
  },

  // Domain card
  domainCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  domainIcon: {
    fontSize: 24,
  },
  domainName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f8fafc',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaTagText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  milestoneText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '500',
  },

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderStyle: 'dashed',
    paddingVertical: 16,
    gap: 8,
    marginTop: 4,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
