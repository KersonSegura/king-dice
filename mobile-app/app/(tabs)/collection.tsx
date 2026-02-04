/**
 * My Collection (website) – matches mobile nav.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import WebViewScreen from '../../components/WebViewScreen';

export default function CollectionScreen() {
  const { user } = useAuth();
  if (!user?.username) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>My Collection</Text>
        <Text style={styles.description}>Please log in to view your collection.</Text>
      </View>
    );
  }
  return (
    <WebViewScreen path={`/collection/${user.username}`} title="My Collection" showHeader={false} hideWebHeader />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
