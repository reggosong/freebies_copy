import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import {
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  IconButton,
  Avatar,
} from "react-native-paper";
import { RouteProp, useRoute, useFocusEffect } from "@react-navigation/native";
import {
  commentPost,
  getFullImageUrl,
  likePost,
  gotItPost,
  deletePost,
  hidePost,
  unhidePost,
  mapPostFromApi,
} from "../services/api";
import api from "../services/api";
import { Post, User } from "../types";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuthStore } from "../state/authStore";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<any>;

const CATEGORY_LABELS: Record<string, string> = {
  leftovers: "Leftovers",
  new: "New",
  restaurant: "Restaurant",
  home_made: "Home Made",
};

const DEFAULT_IMAGE = "https://via.placeholder.com/60x60?text=No+Image";

export default function PostDetailScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<any, any>>();
  const postId = route.params?.postId;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isGotIt, setIsGotIt] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const currentUser = useAuthStore((state: any) => state.user);

  const fetchPost = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/posts/${postId}`);
      const postData = mapPostFromApi(response.data);
      setPost(postData);
      
      // Fetch comments if available
      const commentsRes = await api
        .get(`/posts/${postId}/comments`)
        .catch(() => ({ data: [] }));
      setComments(commentsRes.data);
      
      // Check if current user has liked or got the post
      if (currentUser) {
        const likesRes = await api.get(`/posts/${postId}/likes`);
        setIsLiked(likesRes.data.some((u: any) => u.id === currentUser.id));
        
        const gotItRes = await api.get(`/posts/${postId}/got-it`);
        setIsGotIt(gotItRes.data.some((u: any) => u.id === currentUser.id));
        
        // Check hidden status
        try {
          const hiddenRes = await api.get(`/posts/${postId}/hidden-status`);
          setIsHidden(hiddenRes.data.is_hidden);
        } catch (error) {
          // Post might not be hidden, continue
        }
      }
      
      setError(null);
    } catch (err) {
      setError("Failed to load post");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  // Refresh post data when screen comes into focus (e.g., after reporting as gone)
  useFocusEffect(
    React.useCallback(() => {
      if (postId) {
        fetchPost();
      }
    }, [postId])
  );

  const handleLike = async () => {
    if (!currentUser) return;
    try {
      await likePost(postId);
      setIsLiked(!isLiked);
      // Refresh post data to get updated counts
      const response = await api.get(`/posts/${postId}`);
      const updatedPost = mapPostFromApi(response.data);
      setPost(updatedPost);
    } catch (err) {
      console.error("Failed to like post:", err);
    }
  };

  const handleGotIt = async () => {
    if (!currentUser) return;
    try {
      await gotItPost(postId);
      setIsGotIt(!isGotIt);
      // Refresh post data to get updated counts
      const response = await api.get(`/posts/${postId}`);
      const updatedPost = mapPostFromApi(response.data);
      setPost(updatedPost);
    } catch (err) {
      console.error("Failed to mark as got it:", err);
    }
  };

  const handleDelete = async (postId: number) => {
    try {
      await deletePost(postId);
      navigation.goBack();
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  const handleEdit = (post: Post) => {
    navigation.navigate("EditPost", { post });
  };

  const handleHide = async (postId: number) => {
    try {
      await hidePost(postId);
      setIsHidden(true);
    } catch (error) {
      console.error("Failed to hide post:", error);
    }
  };

  const handleUnhide = async (postId: number) => {
    try {
      await unhidePost(postId);
      setIsHidden(false);
    } catch (error) {
      console.error("Failed to unhide post:", error);
    }
  };

  const handleReportGone = (post: Post) => {
    navigation.navigate("ReportGone", { post });
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      await commentPost(postId, { content: comment });
      setComment("");
      fetchPost();
    } catch (err) {
      setError("Failed to add comment");
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.delete(`/posts/comments/${commentId}`);
      fetchPost();
    } catch (err) {
      setError("Failed to delete comment");
    }
  };

  const handleUsernamePress = () => {
    if (post?.owner?.id) {
      navigation.navigate("UserProfile", {
        userId: post.owner.id,
      });
    }
  };

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }
  if (error || !post) {
    return (
      <Text style={{ color: "red", margin: 20 }}>
        {error || "Post not found"}
      </Text>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.container}>
            {/* Post Card Layout - Matching Feed */}
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
                <View style={styles.headerText}>
                  <Text style={styles.username}>
                    {post.owner?.display_name || post.owner?.username || "Unknown"}
                  </Text>
                  <Text style={styles.date}>
                    {new Date(post.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Image - No longer clickable */}
              <Image
                source={{ uri: post.photo_url || DEFAULT_IMAGE }}
                style={styles.image}
                resizeMode="contain"
              />

              {/* Action Bar - Like, Got It, and Report All Gone */}
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={handleLike}
                  style={styles.actionButton}
                >
                  <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={24}
                    color={isLiked ? "tomato" : "#333"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('PostInteractions', {
                      postId: post.id,
                      interactionType: 'likes',
                      postTitle: post.title
                    });
                  }}
                  style={styles.actionCount}
                >
                  <Text style={styles.actionCountText}>{post.likesCount ?? 0}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleGotIt}
                  style={styles.actionButton}
                >
                  <Ionicons
                    name={isGotIt ? "checkmark-circle" : "checkmark-circle-outline"}
                    size={24}
                    color={isGotIt ? "green" : "#333"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('PostInteractions', {
                      postId: post.id,
                      interactionType: 'got-it',
                      postTitle: post.title
                    });
                  }}
                  style={styles.actionCount}
                >
                  <Text style={styles.actionCountText}>{post.gotItCount ?? 0}</Text>
                </TouchableOpacity>

                {/* Report All Gone Button - Only show if post is not already gone */}
                {!post.is_gone && (
                  <TouchableOpacity
                    onPress={() => handleReportGone(post)}
                    style={styles.reportGoneButton}
                  >
                    <Ionicons name="flag-outline" size={24} color="#666" />
                    <Text style={styles.reportGoneText}>Report All Gone</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Details */}
              <View style={styles.details}>
                <Text style={styles.title}>{post.title}</Text>
                <Text style={styles.description}>
                  {post.description}
                </Text>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.location}>
                  {post.city || "Unknown Location"} •{" "}
                  {CATEGORY_LABELS[post.category] || "General"}
                </Text>
              </View>
            </View>

            {/* Map - Moved to bottom */}
            {post.latitude && post.longitude && (
              <View style={styles.mapContainer}>
                <Text variant="headlineSmall" style={styles.sectionTitle}>
                  Location
                </Text>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: post.latitude,
                    longitude: post.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: post.latitude,
                      longitude: post.longitude,
                    }}
                  />
                </MapView>
              </View>
            )}

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <Text variant="headlineSmall" style={styles.sectionTitle}>
                Comments ({comments.length})
              </Text>
              {comments.length > 0 ? (
                comments.map((item) => (
                  <View style={styles.commentItem} key={item.id}>
                    <TouchableOpacity
                      onPress={() => {
                        if (item.user?.id) {
                          navigation.navigate("UserProfile", {
                            userId: item.user.id,
                          });
                        }
                      }}
                      style={styles.commentUserSection}
                    >
                      {item.user?.profile_picture_url ? (
                        <Avatar.Image
                          size={32}
                          source={{
                            uri: getFullImageUrl(item.user.profile_picture_url),
                          }}
                          style={styles.commentAvatar}
                        />
                      ) : (
                        <Avatar.Text
                          size={32}
                          label={
                            item.user?.username?.substring(0, 2).toUpperCase() ||
                            "???"
                          }
                          style={styles.commentAvatar}
                        />
                      )}
                      <View style={styles.commentContentContainer}>
                        <Text style={styles.commentUser}>
                          {item.user?.display_name ||
                            item.user?.username ||
                            "User"}
                        </Text>
                        <Text style={styles.commentContent}>{item.content}</Text>
                      </View>
                    </TouchableOpacity>
                    {currentUser?.id === item.user_id && (
                      <IconButton
                        icon="delete"
                        size={18}
                        style={{ marginLeft: "auto" }}
                        onPress={() => handleDeleteComment(item.id)}
                        accessibilityLabel="Delete comment"
                      />
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.noComments}>No comments yet.</Text>
              )}
            </View>
          </ScrollView>
          
          {/* Comment Input */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Add a comment..."
              mode="outlined"
              multiline
            />
            <IconButton
              icon="send"
              onPress={handleComment}
              disabled={!comment.trim()}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
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
    position: "relative",
  },
  headerText: {
    flex: 1,
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
    alignItems: "center",
  },
  actionButton: {
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  actionCount: {
    marginRight: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  actionCountText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  details: {
    paddingHorizontal: 12,
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
  mapContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  commentsSection: {
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  commentUserSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  commentAvatar: {
    marginRight: 10,
  },
  commentContentContainer: {
    flex: 1,
  },
  commentUser: {
    fontWeight: "bold",
    fontSize: 14,
  },
  commentContent: {
    fontSize: 14,
    color: "#333",
  },
  noComments: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
    marginBottom: 20,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  commentInput: {
    flex: 1,
    marginRight: 8,
  },
  reportGoneButton: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  reportGoneText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
});

