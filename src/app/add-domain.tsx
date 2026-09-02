import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createDomain } from '@/services/domains';
import { DOMAIN_TYPES, SKILL_LEVELS } from '@/constants/domains';
import { DomainType, SkillLevel } from '@/types/domain';

const PRESETS = DOMAIN_TYPES;

export default function AddDomainModal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<DomainType | null>(null);
  const [customName, setCustomName] = useState('');
  const [context, setContext] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isCustom = selectedType === 'CUSTOM';
  const canCreate = selectedType && skillLevel && (!isCustom || customName.trim());

  const handleCreate = async () => {
    if (!selectedType || !skillLevel) return;

    setIsCreating(true);
    try {
      await createDomain({
        domainType: selectedType,
        customName: isCustom ? customName.trim() : undefined,
        context: context.trim() || undefined,
        skillLevel,
      });
      Alert.alert(
        '🎉 Domain created!',
        'AI has built you a personalized plan with metrics, milestones, and tasks.',
        [{ text: 'Let\'s go', onPress: () => router.back() }]
      );
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Something went wrong.';
      Alert.alert('Failed to create', msg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Add new domain</Text>
            <Text style={styles.subtitle}>Pick a domain to get started</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Preset grid */}
        <View style={styles.presetGrid}>
          {PRESETS.map((preset) => {
            const isSelected = selectedType === preset.type;
            return (
              <TouchableOpacity
                key={preset.type}
                style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                onPress={() => { setSelectedType(preset.type as DomainType); setCustomName(''); }}
              >
                <Text style={styles.presetIcon}>{preset.icon}</Text>
                <Text style={[styles.presetLabel, isSelected && styles.presetLabelSelected]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom name — only when the Custom button is selected */}
        {isCustom && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Name your domain</Text>
            <TextInput
              style={[styles.textInput, styles.textInputActive]}
              placeholder="e.g. Knitting, Photography, Piano..."
              placeholderTextColor="#64748b"
              value={customName}
              onChangeText={setCustomName}
              autoFocus
            />
          </View>
        )}

        {/* Context — optional extra focus, shown once a type is chosen */}
        {selectedType && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Anything specific? (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Spanish, conversational focus"
              placeholderTextColor="#64748b"
              value={context}
              onChangeText={setContext}
            />
            <Text style={styles.helperText}>
              Helps the AI tailor your plan. Leave blank for a general plan.
            </Text>
          </View>
        )}

        {/* Skill level */}
        {selectedType && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Skill level</Text>
            <View style={styles.skillRow}>
              {SKILL_LEVELS.map((level) => {
                const isSelected = skillLevel === level.value;
                return (
                  <TouchableOpacity
                    key={level.value}
                    style={[styles.skillPill, isSelected && styles.skillPillSelected]}
                    onPress={() => setSkillLevel(level.value as SkillLevel)}
                  >
                    <Text style={[styles.skillText, isSelected && styles.skillTextSelected]}>
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* AI info card */}
        {selectedType && skillLevel && (
          <View style={styles.aiCard}>
            <Ionicons name="sparkles" size={16} color="#a78bfa" />
            <Text style={styles.aiCardText}>
              AI will generate a personalized plan, custom metrics, milestones, and weekly tasks based on your skill level.
            </Text>
          </View>
        )}

        {/* Create button */}
        {selectedType && (
          <TouchableOpacity
            style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={!canCreate || isCreating}
          >
            {isCreating ? (
              <View style={styles.creatingRow}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.createButtonText}>AI is building your system...</Text>
              </View>
            ) : (
              <Text style={styles.createButtonText}>Create domain</Text>
            )}
          </TouchableOpacity>
        )}
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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

  // Preset grid
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  presetCard: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a5f',
  },
  presetIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  presetLabelSelected: {
    color: '#3b82f6',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 10,
  },

  // Text input
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
  textInputActive: {
    borderColor: '#3b82f6',
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  // Skill level
  skillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skillPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  skillPillSelected: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  skillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  skillTextSelected: {
    color: '#3b82f6',
  },

  // AI info card
  aiCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e1b4b',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3730a3',
    gap: 10,
    marginBottom: 24,
  },
  aiCardText: {
    flex: 1,
    fontSize: 13,
    color: '#c4b5fd',
    lineHeight: 18,
  },

  // Create button
  createButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  creatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
