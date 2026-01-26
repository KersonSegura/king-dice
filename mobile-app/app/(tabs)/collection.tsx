/**
 * Collection screen
 */

import { View, Text, StyleSheet } from 'react-native';

export default function CollectionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Collection</Text>
      <Text style={styles.description}>Your game collection will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
  },
});
