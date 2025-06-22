import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, ActivityIndicator, Avatar } from 'react-native-paper';
import { getNotifications, markAllNotificationsAsRead, getFullImageUrl } from '../services/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../state/authStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function InboxScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { fetchUnreadCount } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAndMarkRead = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      await markAllNotificationsAsRead();
      fetchUnreadCount();
    } catch (err) {
      setError('Failed to load notifications');
    }
  };

  const fetchNotificationsOnly = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      fetchUnreadCount();
    } catch (err) {
      // Don't set error for background refresh
      console.log('Background refresh failed:', err);
    }
  };

  // Initial load
  useFocusEffect(
    React.useCallback(() => {
      setIsLoading(true);
      fetchAndMarkRead().finally(() => setIsLoading(false));
    }, [])
  );

  // Set up polling for real-time updates
  useEffect(() => {
    // Poll every 5 seconds for new notifications
    intervalRef.current = setInterval(() => {
      fetchNotificationsOnly();
    }, 5000);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Clear interval when screen loses focus and restart when it gains focus
  useFocusEffect(
    React.useCallback(() => {
      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start new interval
      intervalRef.current = setInterval(() => {
        fetchNotificationsOnly();
      }, 5000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [])
  );

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }
  if (error) {
    if (error.includes('404')) {
      return <Text style={{ color: '#999', margin: 20, textAlign: 'center' }}>Notifications are not enabled on this server.</Text>;
    }
    return <Text style={{ color: 'red', margin: 20 }}>{error}</Text>;
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Inbox</Text>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => {
          const isFollow = item.type === "follow";
          const actor = item.actor;
          const post = item.post;

          const handlePress = () => {
            if (isFollow) {
              navigation.navigate('UserProfile', { userId: actor.id });
            } else if (post?.id) {
              navigation.navigate('PostDetail', { postId: post.id.toString() });
            }
          };

          const handleAvatarPress = () => {
            if (actor?.id) {
              navigation.navigate('UserProfile', { userId: actor.id });
            }
          };

          return (
            <TouchableOpacity
              style={styles.notificationItem}
              onPress={handlePress}
              activeOpacity={0.7}
            >
              <TouchableOpacity
                onPress={handleAvatarPress}
                activeOpacity={0.7}
                style={styles.avatarContainer}
              >
                {actor?.profile_picture_url ? (
                  <Avatar.Image 
                    size={48} 
                    source={{ uri: getFullImageUrl(actor.profile_picture_url) }} 
                    style={styles.avatar}
                  />
                ) : (
                  <Avatar.Text
                    size={48}
                    label={actor?.username?.substring(0, 2).toUpperCase() || '??'}
                    style={styles.avatar}
                  />
                )}
              </TouchableOpacity>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationText} numberOfLines={2}>
                  {item.message}
                </Text>
                <Text style={styles.notificationDate}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
              {post?.photo_url && !isFollow && (
                <Image source={{ uri: post.photo_url }} style={styles.postImage} />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.noNotifications}>No notifications yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { marginBottom: 16, paddingHorizontal: 16, paddingTop: 16 },
  notificationItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    // marginRight is now handled by avatarContainer
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: { fontSize: 16, marginBottom: 4 },
  notificationDate: { color: '#999', fontSize: 12 },
  postImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginLeft: 12,
    backgroundColor: '#eee',
  },
  noNotifications: { color: '#999', marginTop: 32, textAlign: 'center' },
}); 