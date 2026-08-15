import { useEffect, useState, useCallback, useRef } from 'react';
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
import { getDashboard } from '@/services/dashboard';
import {
  DashboardResponse,
  TaskResponse,
  StreakResponse,
  WeeklyStatResponse,
  AiNudgeResponse,
} from '@/types/dashboard';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasFetched = useRef(false);

  const loadDashboard = async () => {
    try {
      const data = await getDashboard();
      setDashboard(data);
    } catch (error) {
      console.log('Dashboard error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      loadDashboard();
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Could not load dashboard</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboard}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const streaks = Object.values(dashboard.streaks);
  const todayDate = new Date(dashboard.date).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {/* Greeting header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{dashboard.greeting}</Text>
            <Text style={styles.dateText}>
              {todayDate} · {dashboard.todayFocus.length} things planned
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Today's focus — always show, even if empty */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's focus</Text>
          {dashboard.todayFocus.length > 0 ? (
            dashboard.todayFocus.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                domainName={task.domainId ? dashboard.streaks[task.domainId]?.domainName : undefined}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No tasks for today. Enjoy your rest! 🎉</Text>
            </View>
          )}
        </View>

        {/* Streaks — evenly spread */}
        {streaks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Streaks</Text>
            <View style={styles.streakGrid}>
              {streaks.map((streak) => (
                <StreakCard key={streak.domainId} streak={streak} />
              ))}
            </View>
          </View>
        )}

        {/* AI Nudge */}
        {dashboard.aiNudge && <NudgeCard nudge={dashboard.aiNudge} />}

        {/* Weekly stats — grouped by domain */}
        {dashboard.weeklyStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly snapshot</Text>
            {Object.entries(
              dashboard.weeklyStats.reduce((acc, stat) => {
                const name = stat.domainName;
                if (!acc[name]) acc[name] = [];
                acc[name].push(stat);
                return acc;
              }, {} as Record<string, WeeklyStatResponse[]>)
            ).map(([domainName, stats]) => (
              <View key={domainName} style={styles.domainStatsGroup}>
                <Text style={styles.domainGroupLabel}>{domainName}</Text>
                <View style={styles.statsGrid}>
                  {stats.map((stat, index) => (
                    <StatCard key={index} stat={stat} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Progress bars — weekly stats with targets */}
        {dashboard.weeklyStats.filter((s) => s.target).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This week vs target</Text>
            {dashboard.weeklyStats
              .filter((s) => s.target)
              .map((stat, index) => (
                <ProgressBar key={index} stat={stat} />
              ))}
          </View>
        )}

        {/* Upcoming tasks */}
        {dashboard.upcomingTasks && dashboard.upcomingTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {dashboard.upcomingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                domainName={task.domainId ? dashboard.streaks[task.domainId]?.domainName : undefined}
              />
            ))}
          </View>
        )}

        {/* Quick log button */}
        <TouchableOpacity style={styles.quickLogButton} onPress={() => router.push('/(tabs)/log')}>
          <Ionicons name="add-circle" size={22} color="#ffffff" />
          <Text style={styles.quickLogText}>Quick Log</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// --- Sub-components ---

function TaskCard({ task, domainName }: { task: TaskResponse; domainName?: string }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    TODO: { bg: '#fef3c7', text: '#92400e' },
    IN_PROGRESS: { bg: '#dbeafe', text: '#1e40af' },
    DONE: { bg: '#d1fae5', text: '#065f46' },
  };
  const statusLabels: Record<string, string> = {
    TODO: 'Pending',
    IN_PROGRESS: 'Active',
    DONE: 'Done',
  };
  const colors = statusColors[task.status] || statusColors.TODO;

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <View style={styles.taskMeta}>
          {domainName && <Text style={styles.taskDomain}>{domainName}</Text>}
          {task.dueDate && (
            <Text style={styles.taskDue}>{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          )}
        </View>
      </View>
      <View style={[styles.statusPill, { backgroundColor: colors.bg }]}>
        <Text style={[styles.statusText, { color: colors.text }]}>
          {statusLabels[task.status] || task.status}
        </Text>
      </View>
    </View>
  );
}

function StreakCard({ streak }: { streak: StreakResponse }) {
  return (
    <View style={styles.streakCard}>
      <Ionicons name="flame" size={20} color="#f97316" />
      <Text style={styles.streakCount}>{streak.currentStreak}d</Text>
      <Text style={styles.streakName}>{streak.domainName}</Text>
    </View>
  );
}

function NudgeCard({ nudge }: { nudge: AiNudgeResponse }) {
  return (
    <View style={styles.nudgeCard}>
      <View style={styles.nudgeHeader}>
        <Ionicons name="sparkles" size={16} color="#a78bfa" />
        <Text style={styles.nudgeLabel}>AI nudge</Text>
      </View>
      <Text style={styles.nudgeMessage}>{nudge.message}</Text>
    </View>
  );
}

function StatCard({ stat }: { stat: WeeklyStatResponse }) {
  const displayValue = stat.value % 1 === 0 ? stat.value.toString() : stat.value.toFixed(1);

  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{stat.label}</Text>
      <Text style={styles.statValue}>
        {displayValue}
        <Text style={styles.statUnit}> {stat.unit}</Text>
      </Text>
    </View>
  );
}

function ProgressBar({ stat }: { stat: WeeklyStatResponse }) {
  const progress = stat.target ? Math.min(stat.value / stat.target, 1) : 0;
  const displayValue = stat.value % 1 === 0 ? stat.value.toString() : stat.value.toFixed(1);
  const displayTarget = stat.target ? (stat.target % 1 === 0 ? stat.target.toString() : stat.target.toFixed(1)) : '';

  return (
    <View style={styles.progressItem}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{stat.domainName} {stat.label.toLowerCase()}</Text>
        <Text style={styles.progressValue}>
          {displayValue}{stat.unit} / {displayTarget}{stat.unit}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

// --- Styles ---

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
  errorText: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  retryText: {
    color: '#3b82f6',
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 14,
    color: '#64748b',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 14,
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },

  // Task cards
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  taskContent: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 15,
    color: '#f8fafc',
    fontWeight: '500',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  taskDomain: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  taskDue: {
    fontSize: 12,
    color: '#64748b',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Streaks — evenly spread grid
  streakGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  streakCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexGrow: 1,
    flexBasis: '30%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  streakCount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 6,
  },
  streakName: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Nudge
  nudgeCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  nudgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a78bfa',
  },
  nudgeMessage: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 21,
  },

  // Stats grid
  domainStatsGroup: {
    marginBottom: 16,
  },
  domainGroupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },

  // Progress bars
  progressItem: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 13,
    color: '#64748b',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },

  // Quick log button
  quickLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginTop: 4,
  },
  quickLogText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
