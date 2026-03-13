import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/utils/store/user/use-user-store';
import { RemoveUserToken } from '@/utils/storage/user.auth.storage';

export default function HomePage() {
  const router = useRouter();
  const { user, logout } = useUserStore();

  const handleLogout = async () => {
    logout();
    await RemoveUserToken();
    router.replace('/(auth)/login'); // go to login page
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Home Page!</Text>
      <Text style={styles.subtitle}>Hello, {user?.name || 'Guest'}</Text>

      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>

      <View style={styles.dummySection}>
        <Text style={styles.sectionTitle}>Dummy Content</Text>
        <Text>- This is a placeholder for your dashboard.</Text>
        <Text>- Add charts, stats, or other components here.</Text>
        <Text>- You can navigate to profile/settings pages from here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 24,
    color: '#6b7280',
  },
  button: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  dummySection: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
});