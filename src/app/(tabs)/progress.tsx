import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { getDomains } from '@/services/domains';
import {
  getMetricProgress,
  getMilestonesForDomain,
  getTasks,
  getMetricsForDomain,
  MilestoneResponse,
  TimeSeriesPoint,
} from '@/services/progress';
import { getPRsForDomain } from '@/services/domains';
import { DomainResponse } from '@/types/domain';
import { TaskResponse, TaskStatus } from '@/types/dashboard';
import { MetricDefinitionResponse, PersonalRecordResponse } from '@/types/session';
import { DOMAIN_TYPES } from '@/constants/domains';

// ─── Constants ───────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 64;

const COLORS = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  primary: '#3b82f6',
  primaryDim: '#1d4ed8',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  text: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  progressBg: '#1e3a5f',
  prGold: '#fbbf24',
} as const;

const TASK_STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  TODO: { label: 'To Do', color: COLORS.primary, icon: 'ellipse-outline' },
  IN_PROGRESS: { label: 'In Progress', color: COLORS.warning, icon: 'time-outline' },
  DONE: { label: 'Done', color: COLORS.success, icon: 'checkmark-circle' },
};

const MILESTONE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  UPCOMING: { label: 'Upcoming', color: COLORS.textDim },
  IN_PROGRESS: { label: 'In Progress', color: COLORS.warning },
  DONE: { label: 'Done', color: COLORS.success },
  MISSED: { label: 'Missed', color: COLORS.error },
};

const CHART_CONFIG = {
  backgroundColor: 'transparent',
  backgroundGradientFrom: '#1e293b',
  backgroundGradientTo: '#1e293b',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
  barPercentage: 0.6,
  propsForBackgroundLines: {
    strokeDasharray: '4 4',
    stroke: '#334155',
    strokeWidth: 1,
  },
  propsForLabels: {
    fontSize: 10,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDomainIcon(domainType: string): string {
  return DOMAIN_TYPES.find((d) => d.type === domainType)?.icon ?? '📌';
}

function getDomainLabel(domain: DomainResponse): string {
  return domain.customName || DOMAIN_TYPES.find((d) => d.type === domain.domainType)?.label || domain.domainType;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [domains, setDomains] = useState<DomainResponse[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);

  // Metrics + Chart
  const [metrics, setMetrics] = useState<MetricDefinitionResponse[]>([]);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null);
  const [chartData, setChartData] = useState<TimeSeriesPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // PRs
  const [prs, setPrs] = useState<PersonalRecordResponse[]>([]);

  // Milestones
  const [milestones, setMilestones] = useState<MilestoneResponse[]>([]);

  // Tasks
  const [tasks, setTasks] = useState<TaskResponse[]>([]);

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadDomains = async () => {
    try {
      const data = await getDomains();
      const active = data.filter((d) => d.status === 'ACTIVE');
      setDomains(active);
      if (active.length > 0 && !selectedDomainId) {
        setSelectedDomainId(active[0].id);
      }
    } catch (err) {
      console.error('[Progress] Failed to load domains:', err);
    }
  };

  const loadMetricsForDomain = async (domainId: string) => {
    try {
      const data = await getMetricsForDomain(domainId);
      setMetrics(data);
      const prMetric = data.find((m) => m.isPR);
      const tracked = data.find((m) => m.isTrackedPerSession);
      setSelectedMetricKey(prMetric?.metricKey ?? tracked?.metricKey ?? data[0]?.metricKey ?? null);
    } catch (err) {
      console.error('[Progress] Failed to load metrics:', err);
      setMetrics([]);
      setSelectedMetricKey(null);
    }
  };

  const loadChartData = async (domainId: string, metricKey: string) => {
    setChartLoading(true);
    try {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 60);

      const data = await getMetricProgress(domainId, metricKey, formatLocalDate(from), formatLocalDate(to));
      setChartData(data.timeSeries ?? []);
    } catch (err) {
      console.error('[Progress] Failed to load chart data:', err);
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  const loadPRs = async (domainId: string) => {
    try {
      const data = await getPRsForDomain(domainId);
      setPrs(data);
    } catch (err) {
      console.error('[Progress] Failed to load PRs:', err);
      setPrs([]);
    }
  };

  const loadMilestones = async (domainId: string) => {
    try {
      const data = await getMilestonesForDomain(domainId);
      setMilestones(data);
    } catch (err) {
      console.error('[Progress] Failed to load milestones:', err);
      setMilestones([]);
    }
  };

  const loadTasks = async (domainId: string) => {
    try {
      const data = await getTasks({ domainId });
      setTasks(data);
    } catch (err) {
      console.error('[Progress] Failed to load tasks:', err);
      setTasks([]);
    }
  };

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedDomainId) {
      loadMetricsForDomain(selectedDomainId);
      loadPRs(selectedDomainId);
      loadMilestones(selectedDomainId);
      loadTasks(selectedDomainId);
    }
  }, [selectedDomainId]);

  useEffect(() => {
    if (selectedDomainId && selectedMetricKey) {
      loadChartData(selectedDomainId, selectedMetricKey);
    }
  }, [selectedDomainId, selectedMetricKey]);

  const loadInitial = async () => {
    setIsLoading(true);
    await loadDomains();
    setIsLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDomains();
    if (selectedDomainId) {
      await Promise.all([
        loadMetricsForDomain(selectedDomainId),
        loadPRs(selectedDomainId),
        loadMilestones(selectedDomainId),
        loadTasks(selectedDomainId),
      ]);
      if (selectedMetricKey) {
        await loadChartData(selectedDomainId, selectedMetricKey);
      }
    }
    setRefreshing(false);
  }, [selectedDomainId, selectedMetricKey]);

  // ─── Derived Data ──────────────────────────────────────────────────────────

  const selectedDomain = domains.find((d) => d.id === selectedDomainId);
  const selectedMetric = metrics.find((m) => m.metricKey === selectedMetricKey);
  const trackableMetrics = metrics.filter((m) => m.isPR || m.isTrackedPerSession);

  const tasksByStatus = TASK_STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, TaskResponse[]>,
  );

  const activeMilestones = milestones.filter((m) => m.status !== 'DONE');
  const doneMilestones = milestones.filter((m) => m.status === 'DONE');

  // Prepare bar chart data — last 8 sessions
  const recentChartData = chartData.slice(-8);
  const barChartData = {
    labels: recentChartData.map((p) => {
      const d = new Date(p.date + 'T00:00:00');
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    datasets: [{ data: recentChartData.map((p) => p.value) }],
  };

  // ─── Loading / Empty States ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (domains.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="analytics-outline" size={48} color={COLORS.textDim} />
        <Text style={styles.emptyTitle}>No active domains</Text>
        <Text style={styles.emptySubtext}>Add a domain to start tracking progress</Text>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ─── Domain Filter Pills ──────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
          {domains.map((domain) => {
            const isSelected = domain.id === selectedDomainId;
            return (
              <TouchableOpacity
                key={domain.id}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => setSelectedDomainId(domain.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.pillIcon}>{getDomainIcon(domain.domainType)}</Text>
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {getDomainLabel(domain)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── Bar Chart Section ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedMetric?.label ?? 'Performance'} — last {recentChartData.length} sessions
          </Text>

          {/* Metric selector pills */}
          {trackableMetrics.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricPillRow}>
              {trackableMetrics.map((metric) => (
                <TouchableOpacity
                  key={metric.metricKey}
                  style={[
                    styles.metricPill,
                    metric.metricKey === selectedMetricKey && styles.metricPillActive,
                  ]}
                  onPress={() => setSelectedMetricKey(metric.metricKey)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.metricPillText,
                      metric.metricKey === selectedMetricKey && styles.metricPillTextActive,
                    ]}
                  >
                    {metric.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Chart Card */}
          <View style={styles.chartCard}>
            {chartLoading ? (
              <View style={styles.chartPlaceholder}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : recentChartData.length < 2 ? (
              <View style={styles.chartPlaceholder}>
                <Ionicons name="bar-chart-outline" size={32} color={COLORS.textDim} />
                <Text style={styles.chartPlaceholderText}>
                  Log more sessions to see chart data
                </Text>
              </View>
            ) : (
              <>
                <BarChart
                  data={barChartData}
                  width={CHART_WIDTH}
                  height={180}
                  yAxisSuffix={selectedMetric?.unit ? ` ${selectedMetric.unit}` : ''}
                  yAxisLabel=""
                  chartConfig={CHART_CONFIG}
                  style={styles.chart}
                  fromZero
                  showValuesOnTopOfBars
                  withInnerLines
                />
                {/* Trend summary */}
                {recentChartData.length >= 2 && (
                  <ChartTrend data={recentChartData} unit={selectedMetric?.unit ?? ''} />
                )}
              </>
            )}
          </View>
        </View>

        {/* ─── Personal Records Section ─────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithIcon}>
            <Ionicons name="trophy" size={18} color={COLORS.prGold} />
            <Text style={styles.sectionTitle}>Personal Records</Text>
          </View>

          {prs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No PRs yet — keep logging!</Text>
            </View>
          ) : (
            <View style={styles.prGrid}>
              {prs.map((pr) => (
                <PRCard key={`${pr.metricKey}-${pr.domainId}`} pr={pr} />
              ))}
            </View>
          )}
        </View>

        {/* ─── Milestones Section ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Milestones</Text>

          {milestones.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No milestones yet</Text>
            </View>
          ) : (
            <>
              {activeMilestones.map((m) => (
                <MilestoneCard key={m.id} milestone={m} />
              ))}
              {doneMilestones.length > 0 && (
                <Text style={styles.completedLabel}>Completed</Text>
              )}
              {doneMilestones.map((m) => (
                <MilestoneCard key={m.id} milestone={m} />
              ))}
            </>
          )}
        </View>

        {/* ─── Tasks Section ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks</Text>

          {tasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No tasks for this domain</Text>
            </View>
          ) : (
            TASK_STATUS_ORDER.map((status) => {
              const statusTasks = tasksByStatus[status];
              if (statusTasks.length === 0) return null;
              const config = STATUS_CONFIG[status];
              return (
                <View key={status} style={styles.taskGroup}>
                  <View style={styles.taskGroupHeader}>
                    <Ionicons name={config.icon as any} size={16} color={config.color} />
                    <Text style={[styles.taskGroupLabel, { color: config.color }]}>
                      {config.label}
                    </Text>
                    <View style={[styles.taskCountBadge, { backgroundColor: config.color + '20' }]}>
                      <Text style={[styles.taskCountText, { color: config.color }]}>
                        {statusTasks.length}
                      </Text>
                    </View>
                  </View>
                  {statusTasks.map((task) => (
                    <TaskCard key={task.id} task={task} domains={domains} />
                  ))}
                </View>
              );
            })
          )}
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Chart Trend Component ───────────────────────────────────────────────────

function ChartTrend({ data, unit }: { data: TimeSeriesPoint[]; unit: string }) {
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const diff = last - first;
  const isUp = diff >= 0;
  const diffDisplay = Math.abs(diff) % 1 === 0 ? Math.abs(diff) : Math.abs(diff).toFixed(1);

  return (
    <View style={styles.trendRow}>
      <Ionicons
        name={isUp ? 'trending-up' : 'trending-down'}
        size={18}
        color={isUp ? COLORS.success : COLORS.error}
      />
      <Text style={[styles.trendText, { color: isUp ? COLORS.success : COLORS.error }]}>
        {isUp ? '+' : '-'}{diffDisplay}{unit ? ` ${unit}` : ''}
      </Text>
      <Text style={styles.trendSubtext}>
        {first}{unit} → {last}{unit} over {data.length} sessions
      </Text>
    </View>
  );
}

// ─── PR Card Component ───────────────────────────────────────────────────────

function PRCard({ pr }: { pr: PersonalRecordResponse }) {
  const delta = pr.delta != null ? pr.delta : null;
  const deltaDisplay = delta != null ? (delta > 0 ? `+${delta}` : `${delta}`) : null;

  return (
    <View style={styles.prCard}>
      <View style={styles.prCardHeader}>
        <Ionicons name="trophy" size={14} color={COLORS.prGold} />
        <Text style={styles.prLabel} numberOfLines={1}>{pr.label}</Text>
      </View>
      <Text style={styles.prValue}>
        {pr.value}{pr.unit ? ` ${pr.unit}` : ''}
      </Text>
      <View style={styles.prFooter}>
        {deltaDisplay && (
          <Text style={[styles.prDelta, { color: (delta ?? 0) > 0 ? COLORS.success : COLORS.error }]}>
            {deltaDisplay}{pr.unit}
          </Text>
        )}
        <Text style={styles.prDate}>{formatDate(pr.achievedAt)}</Text>
      </View>
    </View>
  );
}

// ─── Milestone Card Component ────────────────────────────────────────────────

function MilestoneCard({ milestone }: { milestone: MilestoneResponse }) {
  const config = MILESTONE_STATUS_CONFIG[milestone.status] ?? MILESTONE_STATUS_CONFIG.UPCOMING;
  const progress = milestone.progressPercent != null ? Math.min(milestone.progressPercent, 100) : 0;
  const currentDisplay = milestone.currentValue != null ? milestone.currentValue : 0;

  return (
    <View style={styles.milestoneCard}>
      <View style={styles.milestoneHeader}>
        <Text style={styles.milestoneLabel} numberOfLines={1}>
          {milestone.label}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: config.color + '20' }]}>
          <Text style={[styles.statusPillText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progress}%`, backgroundColor: config.color },
          ]}
        />
      </View>

      {/* Values */}
      <View style={styles.milestoneValues}>
        <Text style={styles.milestoneValueText}>
          {currentDisplay} / {milestone.targetValue}{milestone.unit ? ` ${milestone.unit}` : ''}
        </Text>
        {milestone.deadline && (
          <Text style={styles.milestoneDeadline}>Due {formatDate(milestone.deadline)}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Task Card Component ─────────────────────────────────────────────────────

function TaskCard({ task, domains }: { task: TaskResponse; domains: DomainResponse[] }) {
  const domain = domains.find((d) => d.id === task.domainId);
  const domainLabel = domain ? getDomainLabel(domain) : '';
  const domainIcon = domain ? getDomainIcon(domain.domainType) : '';
  const isDone = task.status === 'DONE';

  return (
    <View style={[styles.taskCard, isDone && styles.taskCardDone]}>
      <View style={styles.taskCardContent}>
        <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          {domain && (
            <View style={styles.taskDomainTag}>
              <Text style={styles.taskDomainIcon}>{domainIcon}</Text>
              <Text style={styles.taskDomainText}>{domainLabel}</Text>
            </View>
          )}
          {task.dueDate && (
            <Text style={styles.taskDueDate}>{formatDate(task.dueDate)}</Text>
          )}
        </View>
      </View>
      {isDone && <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textDim,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // ─── Domain Pills ──────────────────────────────────────────────
  pillRow: {
    marginBottom: 20,
    flexGrow: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  pillIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  pillTextActive: {
    color: COLORS.primary,
  },

  // ─── Sections ──────────────────────────────────────────────────
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
  },
  completedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDim,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ─── Metric Pills ─────────────────────────────────────────────
  metricPillRow: {
    flexGrow: 0,
    marginBottom: 12,
  },
  metricPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  metricPillActive: {
    backgroundColor: COLORS.primaryDim + '30',
    borderColor: COLORS.primary,
  },
  metricPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  metricPillTextActive: {
    color: COLORS.primary,
  },

  // ─── Chart ─────────────────────────────────────────────────────
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  chartPlaceholder: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  chartPlaceholderText: {
    fontSize: 13,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  trendText: {
    fontSize: 14,
    fontWeight: '700',
  },
  trendSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // ─── PRs ───────────────────────────────────────────────────────
  prGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  prCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    width: (SCREEN_WIDTH - 32 - 10) / 2,
  },
  prCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  prLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    flex: 1,
  },
  prValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  prFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prDelta: {
    fontSize: 11,
    fontWeight: '700',
  },
  prDate: {
    fontSize: 10,
    color: COLORS.textDim,
  },

  // ─── Milestones ────────────────────────────────────────────────
  milestoneCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  milestoneLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.progressBg,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  milestoneValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneValueText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  milestoneDeadline: {
    fontSize: 11,
    color: COLORS.textDim,
  },

  // ─── Tasks ─────────────────────────────────────────────────────
  taskGroup: {
    marginBottom: 16,
  },
  taskGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  taskGroupLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  taskCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  taskCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCardDone: {
    opacity: 0.6,
  },
  taskCardContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskDomainTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.border + '60',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  taskDomainIcon: {
    fontSize: 11,
  },
  taskDomainText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  taskDueDate: {
    fontSize: 11,
    color: COLORS.textDim,
  },

  // ─── Empty Card ────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 13,
    color: COLORS.textDim,
  },
});
