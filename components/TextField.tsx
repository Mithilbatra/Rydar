import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, type } from '@/lib/theme';

export function TextField({ label, secure, ...props }: TextInputProps & { label: string; secure?: boolean }) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={type.label}>{label}</Text>
      <View style={[styles.field, focused && styles.focused]}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          secureTextEntry={secure && hidden}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.text}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={styles.input}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden(!hidden)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textDim} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  focused: { borderColor: 'rgba(255,255,255,0.35)' },
  input: { flex: 1, fontSize: 17, color: colors.text },
});
