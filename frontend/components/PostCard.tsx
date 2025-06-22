import React from "react";
import { View, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Text, Button } from "react-native-paper";
import { Post } from "../types";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { getFullImageUrl } from "../services/api";
import { Avatar } from "react-native-paper";
import PostMenu from './PostMenu';

interface PostCardProps {
  post: Post;
  onLike?: (postId: number) => void;
  onGotIt?: (postId: number) => void;
  onComment?: (postId: number) => void;
  onDelete: (postId: number) => void;
  onEdit: (post: Post) => void;
  onHide: (postId: number) => void;
  onUnhide: (postId: number) => void;
  onReportGone: (post: Post) => void;
  currentUserId?: number;
  likedPostIds?: number[];
  gotItPostIds?: number[];
  isHidden?: boolean;
  isOwnProfile?: boolean;
}

type RootStackParamList = {
  PostDetail: { postId: string };
  Profile: { userId: number };
  MainTabs: undefined;
  UserSearch: undefined;
  EditProfile: undefined;
  Settings: undefined;
  UserProfile: { userId: number };
  EditPost: { post: Post };
  ReportGone: { post: Post };
  PostInteractions: { postId: number; interactionType: 'likes' | 'got-it'; postTitle: string };
  Create: undefined;
};

const CATEGORY_LABELS = {
  leftovers: "Leftovers",
  new: "New",
  restaurant: "Restaurant",
  home_made: "Home Made",
};

const DEFAULT_IMAGE = "https://via.placeholder.com/60x60?text=No+Image";

export default function PostCard({
  post,
  onLike,
  onGotIt,
  onComment,
  onDelete,
  onEdit,
  onHide,
  onUnhide,
  onReportGone,
  currentUserId,
  likedPostIds,
  gotItPostIds,
  isHidden,
  isOwnProfile,
}: PostCardProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const isLiked = likedPostIds ? likedPostIds.includes(post.id) : false;
  const isGotIt = gotItPostIds ? gotItPostIds.includes(post.id) : false;

  const handlePress = () => {
    navigation.navigate("PostDetail", { postId: post.id.toString() });
  };

  const handleUsernamePress = () => {
    if (post.owner?.id) {
      navigation.navigate("UserProfile", { userId: post.owner.id });
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity onPress={handleUsernamePress} style={styles.header}>
        {post.owner?.profile_picture_url ? (
          <Image
            source={{ uri: getFullImageUrl(post.owner.profile_picture_url) }}
            style={styles.avatar}
          />
        ) : (
          <Avatar.Text
            size={40}
            label={post.owner?.username?.substring(0, 2).toUpperCase() || "?"}
            style={styles.avatar}
          />
        )}
        <View>
          <Text style={styles.username}>
            {post.owner?.display_name || post.owner?.username || "Unknown"}
          </Text>
          <Text style={styles.date}>
            {new Date(post.created_at).toLocaleDateString()}
          </Text>
        </View>
        <PostMenu
          post={post}
          onDelete={onDelete}
          onEdit={onEdit}
          onHide={onHide}
          onUnhide={onUnhide}
          onReportGone={onReportGone}
          isHidden={isHidden}
          isOwnProfile={isOwnProfile}
        />
      </TouchableOpacity>

      {/* Image */}
      <TouchableOpacity onPress={handlePress}>
        <Image
          source={{ uri: post.photo_url || DEFAULT_IMAGE }}
          style={styles.image}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Action Bar */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onLike ? () => onLike(post.id) : undefined}
          style={styles.actionButton}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={24}
            color={isLiked ? "tomato" : "#333"}
          />
          <TouchableOpacity
            onPress={() => {
              (navigation as any).navigate('PostInteractions', {
                postId: post.id,
                interactionType: 'likes',
                postTitle: post.title
              });
            }}
          >
            <Text style={styles.actionCount}>{post.likesCount ?? 0}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onComment ? () => onComment(post.id) : undefined}
          style={styles.actionButton}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#333" />
          <Text style={styles.actionCount}>{post.commentsCount ?? 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onGotIt ? () => onGotIt(post.id) : undefined}
          style={styles.actionButton}
        >
          <Ionicons
            name={isGotIt ? "checkmark-circle" : "checkmark-circle-outline"}
            size={24}
            color={isGotIt ? "green" : "#333"}
          />
          <TouchableOpacity
            onPress={() => {
              (navigation as any).navigate('PostInteractions', {
                postId: post.id,
                interactionType: 'got-it',
                postTitle: post.title
              });
            }}
          >
            <Text style={styles.actionCount}>{post.gotItCount ?? 0}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <TouchableOpacity onPress={handlePress}>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {post.description}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.location}>
          {post.city || "Unknown Location"} •{" "}
          {CATEGORY_LABELS[post.category] || "General"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 0,
    marginVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: {
    fontWeight: "bold",
  },
  date: {
    color: "#666",
    fontSize: 12,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f0f0f0",
  },
  actions: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButton: {
    marginRight: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  details: {
    paddingHorizontal: 12,
  },
  actionCount: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    color: "#333",
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  location: {
    color: "#666",
    fontSize: 12,
  },
});
