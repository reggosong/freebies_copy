import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { IconButton, Avatar } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { getFullImageUrl } from '../services/api';
import { User } from '../types';
import { useAuthStore } from '../state/authStore';
import UserListItem from '../components/UserListItem';

type RootStackParamList = {
  PostInteractions: {
    postId: number;
    interactionType: 'likes' | 'got-it';
    postTitle: string;
  };
  UserProfile: { userId: number };
};

type PostInteractionsScreenRouteProp = RouteProp<RootStackParamList, 'PostInteractions'>;

export default function PostInteractionsScreen() {
  const route = useRoute<PostInteractionsScreenRouteProp>();
  const navigation = useNavigation();
  const { postId, interactionType, postTitle } = route.params;
  const { user, following, follow, unfollow } = useAuthStore();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = interactionType === 'likes' ? 'likes' : 'got-it';
      const response = await api.get(`/posts/${postId}/${endpoint}`);
      setUsers(response.data);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [postId, interactionType]);

  const handleFollow = async (userId: number) => {
    try {
      if (follow) {
        await follow(userId);
        // Refresh the users list to update follow status
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to follow user:', error);
    }
  };

  const handleUnfollow = async (userId: number) => {
    try {
      if (unfollow) {
        await unfollow(userId);
        // Refresh the users list to update follow status
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to unfollow user:', error);
    }
  };

  const getTitle = () => {
    return interactionType === 'likes' ? 'Likes' : 'Got Its';
  };

  const getIcon = () => {
    return interactionType === 'likes' ? 'heart' : 'checkmark-circle';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          onPress={() => navigation.goBack()}
        />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <UserListItem
              user={item}
              currentUserId={user?.id}
              isFollowing={!!following?.some((u) => u.id === item.id)}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              onPress={() => {
                (navigation as any).navigate('UserProfile', { userId: item.id });
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons 
                name={getIcon()} 
                size={48} 
                color="#ccc" 
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>
                No one has {interactionType === 'likes' ? 'liked' : 'got'} this post yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  postTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
}); 