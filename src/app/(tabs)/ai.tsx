import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDomains } from '@/services/domains';
import {
  sendChatMessage,
  getRemainingMessages,
  applyAction,
  ChatMode,
  AiChatResponse,
  AiActionResponse,
} from '@/services/ai';
import { DomainResponse } from '@/types/domain';
import { DOMAIN_TYPES } from '@/constants/domains';

// ─── Constants ───────────────────────────────────────────────────────────────

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
  userBubble: '#1d4ed8',
  aiBubble: '#1e293b',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: AiActionResponse[];
  timestamp: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDomainIcon(domainType: string): string {
  return DOMAIN_TYPES.find((d) => d.type === domainType)?.icon ?? '📌';
}

function getDomainLabel(domain: DomainResponse): string {
  return domain.customName || DOMAIN_TYPES.find((d) => d.type === domain.domainType)?.label || domain.domainType;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AiScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ domainId?: string; chatMode?: string }>();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [domains, setDomains] = useState<DomainResponse[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(params.domainId ?? null);
  const [chatMode, setChatMode] = useState<ChatMode | null>(
    (params.chatMode as ChatMode) ?? null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [remaining, setRemaining] = useState<number>(3);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Load Data ─────────────────────────────────────────────────────────────

  // Reload domains + remaining count every time the tab gains focus,
  // so newly created domains appear immediately.
  useFocusEffect(
    useCallback(() => {
      loadInitial();
    }, [])
  );

  const loadInitial = async () => {
    try {
      const [domainsData, remainingData] = await Promise.all([
        getDomains(),
        getRemainingMessages(),
      ]);
      setDomains(domainsData.filter((d) => d.status === 'ACTIVE'));
      setRemaining(remainingData);
    } catch (err) {
      console.error('[AI] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [domainsData, remainingData] = await Promise.all([
        getDomains(),
        getRemainingMessages(),
      ]);
      setDomains(domainsData.filter((d) => d.status === 'ACTIVE'));
      setRemaining(remainingData);
    } catch (err) {
      console.error('[AI] Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ─── Send Message ──────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !selectedDomainId || !chatMode || isSending) return;
    if (remaining <= 0) {
      Alert.alert('Daily limit reached', "You've used all your AI questions for today. Come back tomorrow!");
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const response = await sendChatMessage({
        message: userMsg.content,
        conversationId,
        domainId: selectedDomainId,
        chatMode,
      });

      setConversationId(response.conversationId);
      setRemaining((prev) => Math.max(0, prev - 1));

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        actions: response.proposedActions,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: err.response?.data?.message || 'Something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [inputText, selectedDomainId, chatMode, isSending, conversationId, remaining]);

  // ─── Apply Action ──────────────────────────────────────────────────────────

  const handleApplyAction = async (action: AiActionResponse) => {
    try {
      await applyAction(action.type, action.payload);
      Alert.alert('Done', `${action.description}`);
      // Mark action as applied by removing it from the message
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          actions: msg.actions?.filter((a) => a !== action),
        })),
      );
    } catch (err: any) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not apply action');
    }
  };

  // ─── Reset chat when domain/mode changes ───────────────────────────────────

  const selectDomain = (domainId: string) => {
    setSelectedDomainId(domainId);
    setChatMode(null);
    setMessages([]);
    setConversationId(null);
  };

  const selectMode = (mode: ChatMode) => {
    setChatMode(mode);
    setMessages([]);
    setConversationId(null);
  };

  // ─── Derived ───────────────────────────────────────────────────────────────

  const selectedDomain = domains.find((d) => d.id === selectedDomainId);
  const chatReady = selectedDomainId && chatMode;

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>AI Chat</Text>
          <View style={styles.remainingBadge}>
            <Ionicons name="chatbubble-outline" size={12} color={remaining > 0 ? COLORS.primary : COLORS.error} />
            <Text style={[styles.remainingText, { color: remaining > 0 ? COLORS.primary : COLORS.error }]}>
              {remaining} left
            </Text>
          </View>
        </View>
        <Text style={styles.headerSubtext}>
          {selectedDomain
            ? `Talking about: ${getDomainLabel(selectedDomain)}`
            : 'Select a domain to start'}
        </Text>
      </View>

      {/* Domain Picker */}
      {!chatReady && (
        <ScrollView
          style={styles.setupContainer}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {/* Step 1: Domain Selection */}
          <Text style={styles.stepLabel}>1. Choose a domain</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {domains.map((domain) => {
              const isSelected = domain.id === selectedDomainId;
              return (
                <TouchableOpacity
                  key={domain.id}
                  style={[styles.pill, isSelected && styles.pillActive]}
                  onPress={() => selectDomain(domain.id)}
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

          {/* Step 2: Mode Selection */}
          {selectedDomainId && (
            <>
              <Text style={styles.stepLabel}>2. What do you want to do?</Text>
              <View style={styles.modeRow}>
                <TouchableOpacity
                  style={[styles.modeCard, chatMode === 'ADJUST_PLAN' && styles.modeCardActive]}
                  onPress={() => selectMode('ADJUST_PLAN')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="build-outline" size={24} color={chatMode === 'ADJUST_PLAN' ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[styles.modeTitle, chatMode === 'ADJUST_PLAN' && styles.modeTitleActive]}>
                    Adjust Plan
                  </Text>
                  <Text style={styles.modeDesc}>Modify schedule, tasks, milestones</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeCard, chatMode === 'DATA_QUERY' && styles.modeCardActive]}
                  onPress={() => selectMode('DATA_QUERY')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="analytics-outline" size={24} color={chatMode === 'DATA_QUERY' ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[styles.modeTitle, chatMode === 'DATA_QUERY' && styles.modeTitleActive]}>
                    Ask About Data
                  </Text>
                  <Text style={styles.modeDesc}>Analyze trends, PRs, patterns</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Chat Area */}
      {chatReady && (
        <>
          {/* Mode indicator + reset */}
          <View style={styles.chatHeader}>
            <View style={styles.chatModeTag}>
              <Ionicons
                name={chatMode === 'ADJUST_PLAN' ? 'build-outline' : 'analytics-outline'}
                size={14}
                color={COLORS.primary}
              />
              <Text style={styles.chatModeText}>
                {chatMode === 'ADJUST_PLAN' ? 'Adjusting plan' : 'Asking about data'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setChatMode(null); setMessages([]); setConversationId(null); }}>
              <Text style={styles.resetText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={40} color={COLORS.textDim} />
                <Text style={styles.emptyChatText}>
                  {chatMode === 'ADJUST_PLAN'
                    ? `Ask me to adjust your ${getDomainLabel(selectedDomain!)} plan, schedule, or set new goals.`
                    : `Ask me anything about your ${getDomainLabel(selectedDomain!)} progress, trends, or data.`}
                </Text>
                <Text style={styles.emptyChatHint}>
                  Only questions about your {getDomainLabel(selectedDomain!)} data are allowed.
                </Text>
              </View>
            )}

            {messages.map((msg) => (
              <View key={msg.id}>
                <View
                  style={[
                    styles.bubble,
                    msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      msg.role === 'user' ? styles.userBubbleText : styles.aiBubbleText,
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>

                {/* Action Cards */}
                {msg.actions && msg.actions.length > 0 && (
                  <View style={styles.actionsContainer}>
                    {msg.actions.map((action, idx) => (
                      <View key={idx} style={styles.actionCard}>
                        <View style={styles.actionHeader}>
                          <Ionicons name="flash" size={14} color={COLORS.warning} />
                          <Text style={styles.actionType}>{action.type.replace('_', ' ')}</Text>
                        </View>
                        <Text style={styles.actionDesc}>{action.description}</Text>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={styles.applyButton}
                            onPress={() => handleApplyAction(action)}
                          >
                            <Ionicons name="checkmark" size={14} color="#fff" />
                            <Text style={styles.applyButtonText}>Apply</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.dismissButton}
                            onPress={() => {
                              setMessages((prev) =>
                                prev.map((m) => ({
                                  ...m,
                                  actions: m.actions?.filter((a) => a !== action),
                                })),
                              );
                            }}
                          >
                            <Text style={styles.dismissButtonText}>Dismiss</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {isSending && (
              <View style={[styles.bubble, styles.aiBubble]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TextInput
              style={styles.input}
              placeholder={remaining > 0 ? 'Ask about your data...' : 'Daily limit reached'}
              placeholderTextColor={COLORS.textDim}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={remaining > 0}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isSending || remaining <= 0) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending || remaining <= 0}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  remainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // ─── Setup (Domain + Mode) ─────────────────────────────────────
  setupContainer: {
    flex: 1,
    padding: 16,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginTop: 8,
  },
  pillRow: {
    flexGrow: 0,
    marginBottom: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontSize: 16,
    marginRight: 6,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  pillTextActive: {
    color: COLORS.primary,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  modeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  modeTitleActive: {
    color: COLORS.primary,
  },
  modeDesc: {
    fontSize: 11,
    color: COLORS.textDim,
    textAlign: 'center',
  },

  // ─── Chat Header ──────────────────────────────────────────────
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatModeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chatModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  resetText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // ─── Messages ──────────────────────────────────────────────────
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyChatText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyChatHint: {
    fontSize: 12,
    color: COLORS.textDim,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.aiBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userBubbleText: {
    color: '#ffffff',
  },
  aiBubbleText: {
    color: COLORS.textSecondary,
  },

  // ─── Action Cards ──────────────────────────────────────────────
  actionsContainer: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    gap: 8,
    marginTop: 4,
  },
  actionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    padding: 12,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  actionType: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warning,
    textTransform: 'uppercase',
  },
  actionDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  dismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dismissButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },

  // ─── Input ─────────────────────────────────────────────────────
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
