import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { verifyEmail, resendVerification } from '@/services/auth';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from your email.');
      return;
    }
    setIsLoading(true);
    try {
      await verifyEmail(email, code.trim());
      Alert.alert('Email verified', 'You can now sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Invalid or expired code.';
      Alert.alert('Verification failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerification(email);
      Alert.alert('Code sent', 'A new verification code has been emailed.');
    } catch {
      Alert.alert('Error', 'Could not resend the code. Try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to {email}. Enter it below to verify your account.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Verification code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="123456"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{isLoading ? 'Verifying...' : 'Verify'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResend} disabled={isLoading}>
            <Text style={styles.resendText}>Didn't get it? Resend code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 30, fontWeight: '700', color: '#f8fafc', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#94a3b8', lineHeight: 21 },
  form: { gap: 14 },
  label: { fontSize: 14, fontWeight: '500', color: '#cbd5e1', marginBottom: 2 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  resendText: { textAlign: 'center', color: '#3b82f6', fontSize: 14, marginTop: 12 },
});
