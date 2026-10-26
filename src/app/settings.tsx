import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getProfile, updateProfile, logout } from '@/services/user';
import { requestAccountDeletion, deleteAccount } from '@/services/auth';
import { useAuth } from '@/store/auth-context';
import { UserResponse } from '@/types/user';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Account deletion (OTP + password)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteSending, setDeleteSending] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
    } catch (error) {
      console.log('Profile error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Password change requires both fields
    const wantsPassword = newPassword.trim().length > 0;
    if (wantsPassword) {
      if (currentPassword.trim().length === 0) {
        Alert.alert('Current password required', 'Enter your current password to set a new one.');
        return;
      }
      if (newPassword.trim().length < 8) {
        Alert.alert('Weak password', 'New password must be at least 8 characters.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const updated = await updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        currentPassword: wantsPassword ? currentPassword : undefined,
        newPassword: wantsPassword ? newPassword : undefined,
      });
      setProfile(updated);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Could not update your profile.';
      Alert.alert('Update failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            // Even if server logout fails, clear local token
          }
          await signOut();
        },
      },
    ]);
  };

  const startAccountDeletion = () => {
    Alert.alert(
      'Delete account?',
      'This permanently erases all your domains, logs, tasks and progress. This cannot be undone. We\'ll email you a code to confirm.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            setDeleteSending(true);
            try {
              await requestAccountDeletion();
              setDeleteModalOpen(true);
            } catch (error: any) {
              const msg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                'Could not start account deletion. Try again later.';
              Alert.alert('Failed', msg);
            } finally {
              setDeleteSending(false);
            }
          },
        },
      ],
    );
  };

  const confirmAccountDeletion = async () => {
    if (deleteCode.trim().length === 0 || deletePassword.trim().length === 0) {
      Alert.alert('Missing info', 'Enter both the code from your email and your password.');
      return;
    }
    setDeleteConfirming(true);
    try {
      await deleteAccount(deleteCode.trim(), deletePassword);
      setDeleteModalOpen(false);
      Alert.alert('Account deleted', 'Your account and data have been deleted.', [
        { text: 'OK', onPress: async () => { await signOut(); } },
      ]);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Could not delete your account.';
      Alert.alert('Failed', msg);
    } finally {
      setDeleteConfirming(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Account */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              <View style={styles.card}>
                <View style={styles.profileRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {profile?.firstName?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{profile?.firstName || 'User'}</Text>
                    <Text style={styles.profileEmail}>{profile?.email || ''}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Edit profile */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Edit Profile</Text>
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>First name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="#64748b"
                />
                <Text style={styles.fieldLabel}>Last name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>

            {/* Change password */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Current password</Text>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                />
                <Text style={styles.fieldLabel}>New password</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password (min 8 chars)"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                />
                <Text style={styles.helperText}>Leave blank to keep your current password.</Text>
              </View>
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save changes</Text>
              )}
            </TouchableOpacity>

            {/* Sign out */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            {/* Delete account — understated, below sign out */}
            <TouchableOpacity
              style={styles.deleteLink}
              onPress={startAccountDeletion}
              disabled={deleteSending}
            >
              {deleteSending ? (
                <ActivityIndicator size="small" color="#64748b" />
              ) : (
                <Text style={styles.deleteLinkText}>Delete account</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Delete-account confirmation (OTP + password) */}
        <Modal
          visible={deleteModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setDeleteModalOpen(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalRoot}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirm deletion</Text>
                <TouchableOpacity
                  onPress={() => setDeleteModalOpen(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalBody}>
                Enter the 6-digit code we emailed you and your password. This permanently deletes
                your account and all data.
              </Text>
              <TextInput
                style={styles.input}
                value={deleteCode}
                onChangeText={setDeleteCode}
                placeholder="6-digit code"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                maxLength={6}
              />
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Your password"
                placeholderTextColor="#64748b"
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.deleteConfirmButton, deleteConfirming && styles.saveButtonDisabled]}
                onPress={confirmAccountDeletion}
                disabled={deleteConfirming}
              >
                {deleteConfirming ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.deleteConfirmText}>Delete my account</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f8fafc',
  },
  profileEmail: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f8fafc',
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  deleteLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 28,
  },
  deleteLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    textDecorationLine: 'underline',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  modalBody: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteConfirmButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
