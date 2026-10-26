import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen, BRAND_GRADIENT } from '@/components/AuthScreen';
import { GradientButton } from '@/components/GradientButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, space, type } from '@/lib/theme';

const MIN_PASSWORD = 8;

export default function SignUp() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('That email does not look right.');
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for the password.`);
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    const result = await signUp(email, password);
    setBusy(false);
    setError(result.error);
    if (result.needsConfirmation) setCheckInbox(true);
  };

  if (checkInbox) {
    return (
      <AuthScreen title="Check your inbox" subtitle={`We sent a confirmation link to ${email.trim()}.`}>
        <View style={styles.done}>
          <Ionicons name="mail-unread-outline" size={36} color={BRAND_GRADIENT[0]} />
          <Text style={type.body}>Open the link on this phone or any device, then come back and sign in.</Text>
        </View>
        <GradientButton label="Back to sign in" gradient={BRAND_GRADIENT} onPress={() => router.back()} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Create your account" subtitle="Free. Your rides sync to your own Supabase project.">
      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder={`At least ${MIN_PASSWORD} characters`}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Type it again"
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={submit}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
      <View style={styles.actions}>
        <GradientButton label="Create account" gradient={BRAND_GRADIENT} onPress={submit} loading={busy} />
        <GradientButton label="I already have an account" variant="ghost" onPress={() => router.back()} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  actions: { gap: space.md },
  error: { color: colors.danger, fontSize: 14 },
  done: {
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
