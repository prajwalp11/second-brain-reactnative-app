import { View, Text, StyleSheet } from 'react-native';

export default function DomainsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Domains</Text>
      <Text style={styles.subtext}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
});
