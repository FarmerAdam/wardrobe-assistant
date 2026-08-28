import { Pressable, StyleSheet, Text } from 'react-native';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, styles[variant], disabled && styles.disabled]}
    >
      <Text style={[styles.text, variant === 'secondary' && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 12,
  },
  primary: { backgroundColor: '#222' },
  secondary: { backgroundColor: '#eee' },
  danger: { backgroundColor: '#c0392b' },
  disabled: { opacity: 0.5 },
  text: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryText: { color: '#222' },
});
