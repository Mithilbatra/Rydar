import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen, BRAND_GRADIENT } from '@/components/AuthScreen';
import { GradientButton } from '@/components/GradientButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/hooks/useAuth';
import { colors, fonts, radius, space } from '@/lib/theme';

export default function Login() {
  const { signIn, setGuest, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(await signIn(email, password));
    setBusy(false);
  };

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to back up your rides and see them on any phone.">
      {!configured && (
        <View style={styles.notice}>
          <Ionicons name="cloud-offline-outline" size={20} color={colors.warning} />
          <Text style={styles.noticeText}>
            Accounts are off until Supabase keys are added to .env. You can still ride as a guest; rides stay on this phone.
          </Text>
        </View>
      )}
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
          editable={configured}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secure
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
          editable={configured}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
      <View style={styles.actions}>
        <GradientButton label="Sign in" gradient={BRAND_GRADIENT} onPress={submit} loading={busy} disabled={!configured} />
        <GradientButton
          label="Ride as guest"
          variant="ghost"
          onPress={() => setGuest(true)}
          icon={<Ionicons name="flash-outline" size={18} color={colors.text} />}
        />
      </View>
      {configured && (
        <Link href="/signup" style={styles.link}>
          New here? <Text style={styles.linkStrong}>Create an account</Text>
        </Link>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  actions: { gap: space.md },
  error: { color: colors.danger, fontSize: 14 },
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,197,61,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,197,61,0.25)',
  },
  noticeText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  link: { textAlign: 'center', color: colors.textDim, fontSize: 15, paddingVertical: space.sm },
  linkStrong: { color: colors.text, fontFamily: fonts.display, fontSize: 17 },
});
