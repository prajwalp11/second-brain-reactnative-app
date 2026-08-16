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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDomains } from '@/services/domains';
import { getMetricsForDomain, createSessionLog } from '@/services/sessions';
import { DomainResponse } from '@/types/domain';
import { MetricDefinitionResponse, FeelLabel, CreateSessionLogRequest } from '@/types/session';
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

  // Load domains on mount
  useEffect(() => {
    async function loadDomains() {
      try {
        const data = await getDomains();
        setDomains(data.filter((d) => d.status === 'ACTIVE'));
      } catch (error) {
        console.log('Failed to load domains:', error);
      } finally {
        setIsLoadingDomains(false);
      }
    }
    loadDomains();
  }, []);

  // Load metrics when domain changes
  useEffect(() => {
    if (!selectedDomainId) {
      setMetrics([]);
      setMetricValues({});
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
  }, [selectedDomainId]);

  const getDomainIcon = (domainType: string): string => {
    return DOMAIN_TYPES.find((d) => d.type === domainType)?.icon || '📋';
  };

  const getDomainLabel = (domain: DomainResponse): string => {
    return domain.customName || DOMAIN_TYPES.find((d) => d.type === domain.domainType)?.label || domain.domainType;
  };

  const resetForm = () => {
    setSelectedDomainId(null);
    setSessionType('');
    setMetricValues({});
    setSelectedFeel(null);
    setNotes('');
    setDurationMinutes('');
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

        {/* Domain selector — horizontal pill row */}
        <View style={styles.section}>
          <Text style={styles.label}>Domain</Text>
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
        </View>

        {/* Session type */}
        {selectedDomainId && (
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
        {selectedDomainId && (
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
        {selectedDomainId && (
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
                    <Text style={styles.metricUnit}>{metric.unit}</Text>
                  </View>
                  <TextInput
                    style={styles.metricInput}
                    placeholder="0"
                    placeholderTextColor="#475569"
                    value={metricValues[metric.metricKey] || ''}
                    onChangeText={(text) =>
                      setMetricValues((prev) => ({ ...prev, [metric.metricKey]: text }))
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              ))
            )}
          </View>
        )}

        {/* Feel selector */}
        {selectedDomainId && (
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
        {selectedDomainId && (
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
        {selectedDomainId && (
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

  // Domain pills
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 20,
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
