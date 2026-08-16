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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMetricsForDomain, createSessionLog } from '@/services/sessions';
import { MetricDefinitionResponse, FeelLabel, CreateSessionLogRequest } from '@/types/session';

const FEEL_OPTIONS: { label: string; value: FeelLabel; icon: string }[] = [
  { label: 'Strong', value: 'STRONG', icon: '💪' },
  { label: 'Okay', value: 'OKAY', icon: '👍' },
  { label: 'Tired', value: 'TIRED', icon: '😮‍💨' },
  { label: 'Rough', value: 'ROUGH', icon: '😵' },
];

export default function LogModal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { domainId, sessionType: prefillSessionType, domainName } = useLocalSearchParams<{
    domainId: string;
    sessionType: string;
    domainName: string;
  }>();

  const [metrics, setMetrics] = useState<MetricDefinitionResponse[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [sessionType, setSessionType] = useState(prefillSessionType || '');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [selectedFeel, setSelectedFeel] = useState<FeelLabel | null>(null);
  const [notes, setNotes] = useState('');

  // Load metrics for this domain
  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await getMetricsForDomain(domainId);
        setMetrics(data.sort((a, b) => a.displayOrder - b.displayOrder));
      } catch (error) {
        console.log('Failed to load metrics:', error);
      } finally {
        setIsLoadingMetrics(false);
      }
    }
    if (domainId) loadMetrics();
  }, [domainId]);

  const handleSave = async () => {
    if (!sessionType.trim()) {
      Alert.alert('What kind?', 'Tell us what type of session this was.');
      return;
    }

    const dur = parseInt(durationMinutes, 10);
    if (!durationMinutes.trim() || isNaN(dur) || dur <= 0) {
      Alert.alert('Duration', 'How long was your session (in minutes)?');
      return;
    }

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
      domainId,
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

      if (response.newPrs && response.newPrs.length > 0) {
        const prLines = response.newPrs.map((pr) => {
          const delta = pr.delta != null ? ` (${pr.delta > 0 ? '+' : ''}${pr.delta}${pr.unit})` : '';
          return `${pr.label}: ${pr.value}${pr.unit}${delta}`;
        });
        Alert.alert('🏆 New Personal Record!', prLines.join('\n'), [
          { text: 'Let\'s go! 🔥', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Session logged! 🎉', 'Your progress has been saved.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Something went wrong.';
      Alert.alert('Failed to save', message);
    } finally {
      setIsSaving(false);
    }
  };

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
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Log session</Text>
            <Text style={styles.subtitle}>{domainName || 'Record your session'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Session type — prefilled */}
        <View style={styles.section}>
          <Text style={styles.label}>What kind?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Push day, Easy run..."
            placeholderTextColor="#64748b"
            value={sessionType}
            onChangeText={setSessionType}
          />
        </View>

        {/* Duration */}
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

        {/* Metrics */}
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

        {/* Feel selector */}
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

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (optional)</Text>
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

        {/* Save button */}
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 10,
  },
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
