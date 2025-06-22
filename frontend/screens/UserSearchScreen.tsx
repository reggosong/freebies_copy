import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';
import { searchUserByUsername } from '../services/api';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type User = {
  id: number;
  username: string;
  email: string;
  bio?: string;
};

type Props = NativeStackScreenProps<any>;

export default function UserSearchScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!username.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await searchUserByUsername(username);
      setUser(response.data);
    } catch (err) {
      setError('User not found');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <Text variant="headlineMedium" style={styles.title}>Search User</Text>
          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
          />
          <Button mode="contained" onPress={handleSearch} loading={isLoading} style={styles.button}>
            Search
          </Button>
          {error && <Text style={styles.errorText}>{error}</Text>}
          {user && (
            <View style={styles.userProfile}>
              <Text variant="titleLarge">{user.username}</Text>
              <Text>Email: {user.email}</Text>
              <Text>Bio: {user.bio || 'No bio'}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: user.id })}>
                <Text style={styles.viewProfile}>View Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { textAlign: 'center', marginBottom: 20 },
  input: { marginBottom: 10 },
  button: { marginBottom: 10 },
  errorText: { color: 'red', marginBottom: 10 },
  userProfile: { marginTop: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 4 },
  viewProfile: { color: 'blue', marginTop: 10 }
}); 