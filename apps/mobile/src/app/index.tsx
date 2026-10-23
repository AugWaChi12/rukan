import { useTheme } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ApiStatus } from '@/components/api-status';

export default function HomeScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>stuMatch</Text>
      <ApiStatus />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontSize: 36, fontWeight: '600' },
});
