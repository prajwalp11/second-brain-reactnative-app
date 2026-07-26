import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createDomain } from '@/services/domains';
import { DOMAIN_TYPES, SKILL_LEVELS } from '@/constants/domains';
import { DomainType, SkillLevel } from '@/types/domain';

// Placeholder text for the optional specify input per domain
const SPECIFY_PLACEHOLDER: Partial<Record<DomainType, string>> = {
  LANGUAGE: 'e.g. Spanish, Japanese...',
  GUITAR: 'e.g. Acoustic, Electric...',
  READING: 'e.g. Fiction, Technical...',
  SWIMMING: 'e.g. Freestyle, Backstroke...',
  CUSTOM: 'e.g. Photography, Cooking...',
  GYM: 'e.g. Powerlifting, Calisthenics...',
  RUNNING: 'e.g. Marathon, Trail...',
  CHESS: 'e.g. Blitz, Classical...',
  NUTRITION: 'e.g. Keto, Meal prep...',
  SLEEP: 'e.g. Insomnia recovery, Optimization...',
  MEDITATION: 'e.g. Mindfulness, Breathwork...',
};

export default function SetupScreen() {
  const router = useRouter();

  const [selectedDomains, setSelectedDomains] = useState<DomainType[]>([]);
  const [skillLevels, setSkillLevels] = useState<Record<string, SkillLevel>>({});
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const toggleDomain = (type: DomainType) => {
    setSelectedDomains((prev) => {
      if (prev.includes(type)) {
        // Remove domain, its skill level, and custom name
        const { [type]: _skill, ...restSkills } = skillLevels;
        const { [type]: _name, ...restNames } = customNames;
        setSkillLevels(restSkills);
        setCustomNames(restNames);
        return prev.filter((d) => d !== type);
      }
      return [...prev, type];
    });
  };

  const setSkillForDomain = (domain: DomainType, level: SkillLevel) => {
    setSkillLevels((prev) => ({ ...prev, [domain]: level }));
  };

  const setCustomNameForDomain = (domain: DomainType, name: string) => {
    setCustomNames((prev) => ({ ...prev, [domain]: name }));
  };

  const handleContinue = async () => {
    if (selectedDomains.length === 0) {
      Alert.alert('Error', 'Please select at least one domain');
      return;
    }

    const missingSkill = selectedDomains.find((d) => !skillLevels[d]);
    if (missingSkill) {
      const label = DOMAIN_TYPES.find((dt) => dt.type === missingSkill)?.label || missingSkill;
      Alert.alert('Error', `Please select a skill level for ${label}`);
      return;
    }

    // CUSTOM requires a name
    if (selectedDomains.includes('CUSTOM') && !customNames['CUSTOM']?.trim()) {
      Alert.alert('Error', 'Please enter a name for your custom domain');
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all(
        selectedDomains.map((domainType) =>
          createDomain({
            domainType,
            skillLevel: skillLevels[domainType],
            customName: customNames[domainType]?.trim() || undefined,
          })
        )
      );
      router.replace('/(auth)/setup-review');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Tell us about you</Text>
        <Text style={styles.subtitle}>What do you want to track? Pick all that apply.</Text>
      </View>

      {/* Domain grid */}
      <View style={styles.grid}>
        {DOMAIN_TYPES.map((option) => {
          const isSelected = selectedDomains.includes(option.type);
          return (
            <TouchableOpacity
              key={option.type}
              style={[styles.domainCard, isSelected && styles.domainCardSelected]}
              onPress={() => toggleDomain(option.type)}
            >
              <Text style={styles.domainIcon}>{option.icon}</Text>
              <Text style={[styles.domainLabel, isSelected && styles.domainLabelSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Per-domain config: specify + skill level */}
      {selectedDomains.length > 0 && (
        <View style={styles.configSection}>
          <Text style={styles.sectionTitle}>Configure your domains</Text>

          {selectedDomains.map((domainType) => {
            const domainInfo = DOMAIN_TYPES.find((d) => d.type === domainType);
            const placeholder = SPECIFY_PLACEHOLDER[domainType] || 'Specify (optional)';
            const displayName = domainInfo?.label || domainType;

            return (
              <View key={domainType} style={styles.domainConfig}>
                <Text style={styles.configDomainName}>
                  {domainInfo?.icon} {displayName}
                </Text>

                {/* Specify input — optional for all, required for CUSTOM */}
                <TextInput
                  style={styles.specifyInput}
                  value={customNames[domainType] || ''}
                  onChangeText={(text) => setCustomNameForDomain(domainType, text)}
                  placeholder={placeholder}
                  placeholderTextColor="#64748b"
                />

                {/* Skill level pills */}
                <View style={styles.pillRow}>
                  {SKILL_LEVELS.map((level) => {
                    const isActive = skillLevels[domainType] === level.value;
                    return (
                      <TouchableOpacity
                        key={level.value}
                        style={[styles.pill, isActive && styles.pillSelected]}
                        onPress={() => setSkillForDomain(domainType, level.value)}
                      >
                        <Text style={[styles.pillText, isActive && styles.pillTextSelected]}>
                          {level.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Continue button */}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Continue →</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  domainCard: {
    width: '30%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  domainCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a5f',
  },
  domainIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  domainLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  domainLabelSelected: {
    color: '#f8fafc',
  },
  configSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 16,
  },
  domainConfig: {
    marginBottom: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  configDomainName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 10,
  },
  specifyInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
  },
  pillSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a5f',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  pillTextSelected: {
    color: '#f8fafc',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
