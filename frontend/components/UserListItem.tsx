import React from "react";
import { View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Text, Button, Avatar } from "react-native-paper";
import { getFullImageUrl } from "../services/api";

interface UserListItemProps {
  user: any;
  currentUserId?: number;
  isFollowing: boolean;
  onFollow?: (userId: number) => void;
  onUnfollow?: (userId: number) => void;
  onPress: () => void;
}

export default function UserListItem({
  user,
  currentUserId,
  isFollowing,
  onFollow,
  onUnfollow,
  onPress,
}: UserListItemProps) {
  const isOwnProfile = currentUserId === user.id;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.userInfo}>
        {user.profile_picture_url ? (
          <Avatar.Image
            size={50}
            source={{ uri: getFullImageUrl(user.profile_picture_url) }}
            style={styles.avatar}
          />
        ) : (
          <Avatar.Text
            size={50}
            label={user.username?.substring(0, 2).toUpperCase() || "?"}
            style={styles.avatar}
          />
        )}
        <View style={styles.textContainer}>
          <Text variant="titleMedium" style={styles.displayName}>
            {user.display_name || user.username}
          </Text>
          <Text variant="bodyMedium" style={styles.username}>
            @{user.username}
          </Text>
          {user.bio && (
            <Text variant="bodySmall" style={styles.bio} numberOfLines={2}>
              {user.bio}
            </Text>
          )}
        </View>
      </View>
      
      {!isOwnProfile && onFollow && onUnfollow && (
        <Button
          mode={isFollowing ? "outlined" : "contained"}
          onPress={() => {
            if (isFollowing) {
              onUnfollow(user.id);
            } else {
              onFollow(user.id);
            }
          }}
          style={styles.followButton}
          compact
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </Button>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  displayName: {
    fontWeight: "600",
    marginBottom: 2,
  },
  username: {
    color: "#666",
    marginBottom: 4,
  },
  bio: {
    color: "#444",
  },
  followButton: {
    minWidth: 80,
  },
}); 