import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDomains } from '@/services/domains';
import { getMetricsForDomain, createSessionLog, getLogsForDomain } from '@/services/sessions';
import { getTasks } from '@/services/progress';
import { updateTaskStatus } from '@/services/tasks';
import { DomainResponse } from '@/types/domain';
import { TaskResponse } from '@/types/dashboard';
import { MetricDefinitionResponse, FeelLabel, CreateSessionLogRequest, SessionLogResponse } from '@/types/session';
import { DOMAIN_TYPES } from '@/constants/domains';

const FEEL_OPTIONS: { label: string; value: FeelLabel; icon: string }[] = [
  { label: 'Strong', value: 'STRONG', icon: '💪' },
  { label: 'Okay', value: 'OKAY', icon: '👍' },
  { label: 'Tired', value: 'TIRED', icon: '😮‍💨' },
  { label: 'Rough', value: 'ROUGH', icon: '😵' },
];

const SESSION_TYPE_PLACEHOLDERS: Record<string, string> = {
  GYM: 'e.g. Push day, Pull day, Leg day',
  RUNNING: 'e.g. Easy run, Intervals, Long run',
  GUITAR: 'e.g. Scales, Song practice, Theory',
  CHESS: 'e.g. Puzzles, Rapid game, Opening study',
  READING: 'e.g. Fiction, Non-fiction, Textbook',
  LANGUAGE: 'e.g. Vocabulary, Grammar, Conversation',
  SWIMMING: 'e.g. Laps, Drills, Open water',
  MEDITATION: 'e.g. Guided, Breathing, Body scan',
  NUTRITION: 'e.g. Meal prep, Tracking, Fasting',
  SLEEP: 'e.g. Nap, Night sleep, Recovery',
};
const DEFAULT_SESSION_TYPE_PLACEHOLDER = 'e.g. Practice, Study, Drill';

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Data
  const [domains, setDomains] = useState<DomainResponse[]>([]);
  const [metrics, setMetrics] = useState<MetricDefinitionResponse[]>([]);

  // Loading states
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState('');
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [selectedFeel, setSelectedFeel] = useState<FeelLabel | null>(null);
  const [notes, setNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');

  // Task-driven logging: today's open tasks for the selected domain + which one is being logged.
  const [todaysTasks, setTodaysTasks] = useState<TaskResponse[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskChosen, setTaskChosen] = useState(false); // true once user picks a task OR "something else"

  // History overlay
  const [historyDomain, setHistoryDomain] = useState<DomainResponse | null>(null);
  const [historyLogs, setHistoryLogs] = useState<SessionLogResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);

  const pickHistoryDomain = (domain: DomainResponse) => {
    setHistoryPickerOpen(false);
    openHistory(domain);
  };

  const openHistory = async (domain: DomainResponse) => {
    setHistoryDomain(domain);
    setHistoryLoading(true);
    try {
      const logs = await getLogsForDomain(domain.id);
      setHistoryLogs(logs);
    } catch (error) {
      console.log('Failed to load history:', error);
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setHistoryDomain(null);
    setHistoryLogs([]);
  };

  // Reload domains every time the tab is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDomains();
    });
    return unsubscribe;
  }, [navigation]);

  const loadDomains = async () => {
    try {
      const data = await getDomains();
      setDomains(data.filter((d) => d.status === 'ACTIVE'));
    } catch (error) {
      console.log('Failed to load domains:', error);
    } finally {
      setIsLoadingDomains(false);
    }
  };

  // Load metrics when domain changes
  useEffect(() => {
    if (!selectedDomainId) {
      setMetrics([]);
      setMetricValues({});
      setTodaysTasks([]);
      setSelectedTaskId(null);
      setTaskChosen(false);
      return;
    }

    async function loadMetrics() {
      setIsLoadingMetrics(true);
      try {
        const data = await getMetricsForDomain(selectedDomainId!);
        setMetrics(data.sort((a, b) => a.displayOrder - b.displayOrder));
        // Reset metric values when domain changes
        setMetricValues({});
      } catch (error) {
        console.log('Failed to load metrics:', error);
        setMetrics([]);
      } finally {
        setIsLoadingMetrics(false);
      }
    }
    loadMetrics();

    // Fetch today's open tasks for this domain to offer the "which task?" step.
    async function loadTodaysTasks() {
      try {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const all = await getTasks({ domainId: selectedDomainId! });
        const todays = all.filter(
          (t) => t.dueDate === today && (t.status === 'TODO' || t.status === 'IN_PROGRESS'),
        );
        setTodaysTasks(todays);
        setSelectedTaskId(null);
        // If there are no tasks today, skip straight to free-text logging.
        setTaskChosen(todays.length === 0);
      } catch (error) {
        console.log('Failed to load today\'s tasks:', error);
        setTodaysTasks([]);
        setTaskChosen(true);
      }
    }
    loadTodaysTasks();
  }, [selectedDomainId]);

  const getDomainIcon = (domainType: string): string => {
    return DOMAIN_TYPES.find((d) => d.type === domainType)?.icon || '📋';
  };

  const getDomainLabel = (domain: DomainResponse): string => {
    return domain.customName || DOMAIN_TYPES.find((d) => d.type === domain.domainType)?.label || domain.domainType;
  };

  // Clamp metric input to the metric's declared/inferred bounds as the user types,
  // so values can't exceed e.g. 100% (matches server-side clamping).
  const handleMetricChange = (metric: MetricDefinitionResponse, text: string) => {
    let next = text;
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      let clamped = parsed;
      if (metric.maxValue != null && clamped > metric.maxValue) clamped = metric.maxValue;
      if (metric.minValue != null && clamped < metric.minValue) clamped = metric.minValue;
      if (clamped !== parsed) {
        // Keep the field as a clean string (strips the out-of-range digits the user typed)
        next = String(clamped);
      }
    }
    setMetricValues((prev) => ({ ...prev, [metric.metricKey]: next }));
  };

  const resetForm = () => {
    setSelectedDomainId(null);
    setSessionType('');
    setMetricValues({});
    setSelectedFeel(null);
    setNotes('');
    setDurationMinutes('');
    setTodaysTasks([]);
    setSelectedTaskId(null);
    setTaskChosen(false);
  };

  const handleSave = async () => {
    if (!selectedDomainId) {
      Alert.alert('Select a domain', 'Pick which domain this session belongs to.');
      return;
    }

    if (!sessionType.trim()) {
      Alert.alert('What kind?', 'Tell us what type of session this was.');
      return;
    }

    const dur = parseInt(durationMinutes, 10);
    if (!durationMinutes.trim() || isNaN(dur) || dur <= 0) {
      Alert.alert('Duration', 'How long was your session (in minutes)?');
      return;
    }

    // Build metrics map — only include fields with actual values
    const metricsMap: Record<string, number> = {};
    for (const [key, value] of Object.entries(metricValues)) {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        metricsMap[key] = parsed;
      }
    }

    if (Object.keys(metricsMap).length === 0) {
      Alert.alert('Add metrics', 'Fill in at least one metric value.');
      return;
    }

    if (!selectedFeel) {
      Alert.alert('How did it feel?', 'Tap one — it helps the AI understand your progress.');
      return;
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const request: CreateSessionLogRequest = {
      domainId: selectedDomainId,
      logDate: today,
      metrics: metricsMap,
      sessionType: sessionType.trim(),
      durationMinutes: dur,
      feelLabel: selectedFeel,
      feelScore: { STRONG: 4, OKAY: 3, TIRED: 2, ROUGH: 1 }[selectedFeel],
    };

    if (notes.trim()) request.notes = notes.trim();

    setIsSaving(true);
    try {
      const response = await createSessionLog(request);

      // If the user logged against a specific task, mark THAT task done (nothing else).
      if (selectedTaskId) {
        try {
          await updateTaskStatus(selectedTaskId, 'DONE');
        } catch (e) {
          console.log('Failed to complete task:', e);
        }
      }

      // Show PR celebration if any records were broken
      if (response.newPrs && response.newPrs.length > 0) {
        const prLines = response.newPrs.map((pr) => {
          const delta = pr.delta != null ? ` (${pr.delta > 0 ? '+' : ''}${pr.delta}${pr.unit})` : '';
          return `${pr.label}: ${pr.value}${pr.unit}${delta}`;
        });
        Alert.alert(
          '🏆 New Personal Record!',
          prLines.join('\n'),
          [{ text: 'Let\'s go! 🔥', style: 'default' }]
        );
      } else {
        Alert.alert('Session logged! 🎉', 'Your progress has been saved.');
      }

      resetForm();
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Something went wrong.';
      Alert.alert('Failed to save', message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingDomains) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={styles.title}>Log session</Text>
        <Text style={styles.subtitle}>Record what you did today</Text>

        {/* Domain selector */}
        <View style={styles.section}>
          <View style={styles.domainLabelRow}>
            <Text style={styles.label}>Domain</Text>
            {selectedDomainId && (
              <TouchableOpacity
                style={styles.changeDomainBtn}
                onPress={resetForm}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={16} color="#3b82f6" />
                <Text style={styles.changeDomainText}>Change</Text>
              </TouchableOpacity>
            )}
          </View>
          {!selectedDomainId ? (
            <>
              <View style={styles.domainGrid}>
                {domains.map((domain) => (
                  <TouchableOpacity
                    key={domain.id}
                    style={styles.domainGridCard}
                    onPress={() => setSelectedDomainId(domain.id)}
                  >
                    <Text style={styles.domainGridIcon}>{getDomainIcon(domain.domainType)}</Text>
                    <Text style={styles.domainGridLabel}>{getDomainLabel(domain)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {domains.length > 0 && (
                <TouchableOpacity style={styles.historyButton} onPress={() => setHistoryPickerOpen(true)}>
                  <Ionicons name="time-outline" size={18} color="#94a3b8" />
                  <Text style={styles.historyButtonText}>View log history</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {domains.map((domain) => {
                const isSelected = selectedDomainId === domain.id;
                return (
                  <TouchableOpacity
                    key={domain.id}
                    style={[styles.pill, isSelected && styles.pillSelected]}
                    onPress={() => setSelectedDomainId(domain.id)}
                  >
                    <Text style={styles.pillIcon}>{getDomainIcon(domain.domainType)}</Text>
                    <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                      {getDomainLabel(domain)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Which task are you logging? — only when a domain is picked, tasks exist today, and not yet chosen */}
        {selectedDomainId && !taskChosen && todaysTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>What are you logging today?</Text>
            {todaysTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskChoice}
                onPress={() => {
                  setSelectedTaskId(task.id);
                  if (task.title) setSessionType(task.title);
                  setTaskChosen(true);
                }}
              >
                <Ionicons name="ellipse-outline" size={18} color="#3b82f6" />
                <Text style={styles.taskChoiceText}>{task.title}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.taskChoice, styles.taskChoiceOther]}
              onPress={() => {
                setSelectedTaskId(null);
                setTaskChosen(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#94a3b8" />
              <Text style={[styles.taskChoiceText, { color: '#94a3b8' }]}>Something else</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Session type */}
        {selectedDomainId && taskChosen && (
          <View style={styles.section}>
            <Text style={styles.label}>What kind?</Text>
            <TextInput
              style={styles.textInput}
              placeholder={(() => {
                const domain = domains.find((d) => d.id === selectedDomainId);
                if (!domain) return DEFAULT_SESSION_TYPE_PLACEHOLDER;
                return SESSION_TYPE_PLACEHOLDERS[domain.domainType] || DEFAULT_SESSION_TYPE_PLACEHOLDER;
              })()}
              placeholderTextColor="#64748b"
              value={sessionType}
              onChangeText={setSessionType}
            />
          </View>
        )}

        {/* Duration */}
        {selectedDomainId && taskChosen && (
          <View style={styles.section}>
            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 45"
              placeholderTextColor="#64748b"
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Dynamic metric inputs */}
        {selectedDomainId && taskChosen && (
          <View style={styles.section}>
            <Text style={styles.label}>Metrics</Text>
            {isLoadingMetrics ? (
              <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 12 }} />
            ) : metrics.length === 0 ? (
              <Text style={styles.emptyMetrics}>No metrics defined for this domain.</Text>
            ) : (
              metrics.map((metric) => (
                <View key={metric.id} style={styles.metricRow}>
                  <View style={styles.metricLabelRow}>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <Text style={styles.metricUnit}>
                      {metric.unit}
                      {metric.maxValue != null ? `  (max ${metric.maxValue})` : ''}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.metricInput}
                    placeholder="0"
                    placeholderTextColor="#475569"
                    value={metricValues[metric.metricKey] || ''}
                    onChangeText={(text) => handleMetricChange(metric, text)}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))
            )}
          </View>
        )}

        {/* Feel selector */}
        {selectedDomainId && taskChosen && (
          <View style={styles.section}>
            <Text style={styles.label}>How did it feel?</Text>
            <View style={styles.feelRow}>
              {FEEL_OPTIONS.map((feel) => {
                const isSelected = selectedFeel === feel.value;
                return (
                  <TouchableOpacity
                    key={feel.value}
                    style={[styles.feelPill, isSelected && styles.feelPillSelected]}
                    onPress={() => setSelectedFeel(feel.value)}
                  >
                    <Text style={styles.feelIcon}>{feel.icon}</Text>
                    <Text style={[styles.feelText, isSelected && styles.feelTextSelected]}>
                      {feel.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Notes */}
        {selectedDomainId && taskChosen && (
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              placeholder="How was the session? Any observations..."
              placeholderTextColor="#64748b"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Save button */}
        {selectedDomainId && taskChosen && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save session</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ─── Log history overlay ─────────────────────────────── */}
      <Modal
        visible={historyDomain !== null}
        animationType="slide"
        transparent
        onRequestClose={closeHistory}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeHistory} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {historyDomain ? getDomainLabel(historyDomain) : ''} history
              </Text>
              <TouchableOpacity onPress={closeHistory} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
            ) : historyLogs.length === 0 ? (
              <Text style={styles.historyEmpty}>No sessions logged yet.</Text>
            ) : (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {historyLogs.map((log) => (
                  <View key={log.id} style={styles.historyRow}>
                    <View style={styles.historyRowTop}>
                      <Text style={styles.historyDate}>{log.logDate}</Text>
                      {log.durationMinutes != null && (
                        <Text style={styles.historyDuration}>{log.durationMinutes} min</Text>
                      )}
                    </View>
                    {log.sessionType ? (
                      <Text style={styles.historyType}>{log.sessionType}</Text>
                    ) : null}
                    {log.metrics && Object.keys(log.metrics).length > 0 && (
                      <Text style={styles.historyMetrics}>
                        {Object.entries(log.metrics)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join('  ·  ')}
                      </Text>
                    )}
                    {log.feelLabel ? (
                      <Text style={styles.historyFeel}>Felt: {log.feelLabel}</Text>
                    ) : null}
                    {log.notes ? <Text style={styles.historyNotes}>{log.notes}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── History domain picker ─────────────────────────────── */}
      <Modal
        visible={historyPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setHistoryPickerOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setHistoryPickerOpen(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick a domain</Text>
              <TouchableOpacity onPress={() => setHistoryPickerOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {domains.map((domain) => (
                <TouchableOpacity
                  key={domain.id}
                  style={styles.pickerRow}
                  onPress={() => pickHistoryDomain(domain)}
                >
                  <Text style={styles.pickerIcon}>{getDomainIcon(domain.domainType)}</Text>
                  <Text style={styles.pickerLabel}>{getDomainLabel(domain)}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#64748b" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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

  // Header
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 28,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 10,
  },

  // Domain pills (horizontal, after selection)
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 20,
  },

  // Domain grid (vertical, before selection)
  domainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  domainGridCard: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  historyButtonText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  pickerIcon: {
    fontSize: 22,
  },
  pickerLabel: {
    fontSize: 15,
    color: '#f8fafc',
    fontWeight: '500',
  },
  domainLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  changeDomainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 10,
  },
  changeDomainText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  taskChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  taskChoiceText: {
    flex: 1,
    fontSize: 15,
    color: '#f8fafc',
    fontWeight: '500',
  },
  taskChoiceOther: {
    borderStyle: 'dashed',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  historyEmpty: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  historyRow: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 10,
  },
  historyRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
  },
  historyDuration: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  historyType: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  historyMetrics: {
    fontSize: 13,
    color: '#e2e8f0',
    marginTop: 6,
  },
  historyFeel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
  historyNotes: {
    fontSize: 13,
    color: '#cbd5e1',
    marginTop: 6,
    fontStyle: 'italic',
  },
  domainGridIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  domainGridLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  pillSelected: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  pillIcon: {
    fontSize: 16,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  pillTextSelected: {
    color: '#3b82f6',
  },

  // Text inputs
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#f8fafc',
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 14,
  },

  // Metrics
  emptyMetrics: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  metricLabelRow: {
    flex: 1,
    marginRight: 12,
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#f8fafc',
  },
  metricUnit: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  metricInput: {
    width: 90,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    textAlign: 'center',
  },

  // Feel selector
  feelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  feelPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  feelPillSelected: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  feelIcon: {
    fontSize: 20,
  },
  feelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  feelTextSelected: {
    color: '#3b82f6',
  },

  // Save button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
