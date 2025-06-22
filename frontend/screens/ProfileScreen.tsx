import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import {
  Text,
  Button,
  Avatar,
  ActivityIndicator,
  IconButton,
} from "react-native-paper";
import { useAuthStore } from "../state/authStore";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  useIsFocused,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api, {
  API_URL,
  getFullImageUrl,
  mapPostFromApi,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  likePost,
  gotItPost,
  commentPost,
  deletePost,
  hidePost,
  unhidePost,
  getPostHiddenStatus,
} from "../services/api";
import { Post, User } from "../types";
import PostCard from "../components/PostCard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import UserListItem from "~/components/UserListItem";
import { RootStackParamList } from "../navigation/AppNavigator";
import { RouteProp } from "@react-navigation/native";

type ProfileScreenRouteProp = RouteProp<RootStackParamList, "UserProfile">;

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const route = useRoute<ProfileScreenRouteProp>();
  const isFocused = useIsFocused();
  const {
    user,
    logout,
    following,
    fetchFollowing,
    follow,
    unfollow,
  } = useAuthStore();

  // Get the viewingUserId from route params, but reset to own profile if accessed via tab
  const viewingUserId = route.params?.userId;
  const isOwnProfile = !viewingUserId || viewingUserId === user?.id;
  const [viewedUser, setViewedUser] = useState<User | null>(
    isOwnProfile ? user : null
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    posts: number;
    gotIt: number;
    gave: number;
  }>({ posts: 0, gotIt: 0, gave: 0 });
  const [likedPostIds, setLikedPostIds] = useState<number[]>([]);
  const [gotItPostIds, setGotItPostIds] = useState<number[]>([]);
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<number>>(new Set());

  // State for the modals
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingFollows, setLoadingFollows] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'stats'>('posts');

  const fetchAllProfileData = async () => {
    const userIdToFetch = viewingUserId || user?.id;
    if (!userIdToFetch) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user, posts, and stats in parallel
      const [
        userResponse,
        postsResponse,
        followersResponse,
        followingResponse,
      ] = await Promise.all([
        api.get(`/users/${userIdToFetch}`),
        api.get(`/users/${userIdToFetch}/posts`),
        api.get(`/users/${userIdToFetch}/followers`),
        api.get(`/users/${userIdToFetch}/following`),
      ]);

      const fetchedUser = userResponse.data;
      setViewedUser(fetchedUser);
      setPosts(postsResponse.data.map(mapPostFromApi));
      setFollowersList(followersResponse.data);
      setFollowingList(followingResponse.data);

      if (fetchedUser.stats) {
        setStats({
          posts: fetchedUser.stats.posts,
          gotIt: fetchedUser.stats.got_it,
          gave: fetchedUser.stats.gave,
        });
      }

      // Ensure the logged-in user's following list is fresh for the button state
      if (user?.id && typeof fetchFollowing === 'function') {
        fetchFollowing(user.id);
      }

      // Fetch like/got-it status for posts
      if (user) {
        const likedIds: number[] = [];
        const gotItIds: number[] = [];
        const hiddenIds: number[] = [];
        
        await Promise.all(
          postsResponse.data.map(async (post: any) => {
            const likesRes = await api.get(`/posts/${post.id}/likes`);
            if (likesRes.data.some((u: any) => u.id === user.id))
              likedIds.push(post.id);
            const gotItRes = await api.get(`/posts/${post.id}/got-it`);
            if (gotItRes.data.some((u: any) => u.id === user.id))
              gotItIds.push(post.id);
            
            // Check hidden status for all posts (both own and others' posts)
            try {
              const hiddenRes = await getPostHiddenStatus(post.id);
              if (hiddenRes.data.is_hidden) {
                hiddenIds.push(post.id);
              }
            } catch (error) {
              // Post might not be hidden, continue
            }
          })
        );
        setLikedPostIds(likedIds);
        setGotItPostIds(gotItIds);
        setHiddenPostIds(new Set(hiddenIds));
      }
    } catch (err) {
      setError("Failed to load profile data. Please pull down to refresh.");
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingFollows(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      setShowSearchResults(true);

      // Search for users by username or display name
      const response = await api.get(
        `/users/search?q=${encodeURIComponent(query.trim())}&limit=10`
      );
      setSearchResults(response.data);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = (query: string) => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set a new timeout to search after 500ms of no typing
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query);
    }, 500);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllProfileData();
    setRefreshing(false);
  };

  useEffect(() => {
    // Initial load and when the viewed user changes
    fetchAllProfileData();
  }, [viewingUserId]);

  // This effect handles resetting to the user's own profile when they tap the tab icon
  useFocusEffect(
    React.useCallback(() => {
      // Refresh data when the screen comes into focus.
      fetchAllProfileData();

      if (isFocused && !route.params?.userId && user) {
        // If we are focused on the screen, there's no userId param, and we are logged in,
        // it means the user tapped the "Profile" tab. We should show their own profile.
        // We check if the viewedUser is already the logged-in user to prevent unnecessary re-renders.
        if (viewedUser?.id !== user.id) {
          navigation.setParams({ userId: undefined }); // Force a re-render for the user's own profile
        }
      }
    }, [isFocused, route.params, user, viewingUserId]) // Re-run when focus or user changes
  );

  useEffect(() => {
    if (viewedUser?.profile_picture_url) {
      console.log("==================================================");
      console.log("Profile Screen - User Data:");
      console.log("User ID:", viewedUser.id);
      console.log("Username:", viewedUser.username);
      console.log("Profile Picture URL:", viewedUser.profile_picture_url);
      console.log("==================================================");
    }
  }, [viewedUser?.profile_picture_url]);

  useEffect(() => {
    if (isOwnProfile && user) {
      setViewedUser(user);
      if (user.stats) {
        setStats({
          posts: user.stats.posts,
          gotIt: (user.stats as any).got_it,
          gave: user.stats.gave,
        });
      }
    }
  }, [isOwnProfile, user]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleLike = async (postId: number) => {
    try {
      await likePost(postId);
      const response = await api.get(`/posts/${postId}`);
      const updatedPost = mapPostFromApi(response.data);
      setPosts(posts.map(p => p.id === postId ? updatedPost : p));
      setLikedPostIds(prev => 
        prev.includes(postId) 
          ? prev.filter(id => id !== postId) 
          : [...prev, postId]
      );
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  };

  const handleGotIt = async (postId: number) => {
    try {
      await gotItPost(postId);
      const response = await api.get(`/posts/${postId}`);
      const updatedPost = mapPostFromApi(response.data);
      setPosts(posts.map(p => p.id === postId ? updatedPost : p));
      setGotItPostIds(prev => 
        prev.includes(postId) 
          ? prev.filter(id => id !== postId) 
          : [...prev, postId]
      );
    } catch (error) {
      console.error("Failed to mark as got it:", error);
    }
  };

  const handleComment = async (postId: number) => {
    (navigation as any).navigate("PostDetail", { postId });
  };

  const handleDelete = async (postId: number) => {
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
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
      setHiddenPostIds(prev => new Set([...prev, postId]));
    } catch (error) {
      console.error("Failed to hide post:", error);
    }
  };

  const handleUnhide = async (postId: number) => {
    try {
      await unhidePost(postId);
      setHiddenPostIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } catch (error) {
      console.error("Failed to unhide post:", error);
    }
  };

  const handleReportGone = (post: Post) => {
    navigation.navigate("ReportGone", { post });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon={() => (
            <Ionicons name="settings-outline" size={24} color="#000" />
          )}
          onPress={() => navigation.navigate("Settings")}
        />
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Profile
        </Text>
        <IconButton
          icon={() => (
            <Ionicons name="log-out-outline" size={24} color="#000" />
          )}
          onPress={logout}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.trim().length >= 2) {
                debouncedSearch(text);
              } else {
                setSearchResults([]);
                setShowSearchResults(false);
              }
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) {
                setShowSearchResults(true);
              }
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
                setShowSearchResults(false);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            {isSearching ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.searchLoadingText}>Searching...</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => {
                      setShowSearchResults(false);
                      setSearchQuery("");
                      navigation.navigate("UserProfile", { userId: item.id });
                    }}
                  >
                    <View style={styles.searchResultUserInfo}>
                      {item.profile_picture_url ? (
                        <Image
                          source={{
                            uri: getFullImageUrl(item.profile_picture_url),
                          }}
                          style={styles.searchResultAvatar}
                        />
                      ) : (
                        <Avatar.Text
                          size={40}
                          label={
                            item.username?.substring(0, 2).toUpperCase() || "?"
                          }
                          style={styles.searchResultAvatar}
                        />
                      )}
                      <View style={styles.searchResultTextContainer}>
                        <Text
                          variant="titleMedium"
                          style={styles.searchResultDisplayName}
                        >
                          {item.display_name || item.username}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={styles.searchResultUsername}
                        >
                          @{item.username}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.searchResultsList}
                nestedScrollEnabled={true}
              />
            )}
          </View>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshData} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Section (avatar, name, bio, stats, buttons) */}
          <View style={styles.profileSection}>
            <View style={styles.profileHeader}>
              {/* Left side - User info */}
              <View style={styles.userInfoSection}>
                <TouchableOpacity
                  onPress={() => isOwnProfile && navigation.navigate("EditProfile")}
                >
                  {viewedUser?.profile_picture_url ? (
                    <Image
                      source={{
                        uri:
                          getFullImageUrl(viewedUser.profile_picture_url) +
                          `?t=${Date.now()}`,
                      }}
                      style={[styles.avatarImage, { backgroundColor: "#f0f0f0" }]}
                      onError={(error) => {
                        console.log(
                          "=================================================="
                        );
                        console.log("Image Loading Error:");
                        console.log("URL:", viewedUser.profile_picture_url);
                        console.log("Error:", error.nativeEvent);
                        console.log(
                          "=================================================="
                        );
                      }}
                      onLoad={() => {
                        console.log(
                          "=================================================="
                        );
                        console.log("Image Loaded Successfully:");
                        console.log(
                          "URL:",
                          getFullImageUrl(viewedUser.profile_picture_url)
                        );
                        console.log(
                          "=================================================="
                        );
                      }}
                    />
                  ) : (
                    <Avatar.Text
                      size={100}
                      label={
                        viewedUser?.username.substring(0, 2).toUpperCase() || ""
                      }
                      style={styles.avatar}
                    />
                  )}
                </TouchableOpacity>
                <View style={styles.userInfo}>
                  <View style={styles.nameContainer}>
                    <Text variant="bodySmall" style={styles.username}>
                      @{viewedUser?.username}
                    </Text>
                    <View style={styles.nameAndLevel}>
                      <Text variant="displaySmall" style={styles.displayName}>
                        {viewedUser?.display_name || "No display name"}
                      </Text>
                      {viewedUser?.level_info?.level === 10 && (
                        <Text style={{ marginLeft: 8, fontSize: 28 }}>🏆</Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.statsContainer}>
                    <TouchableOpacity
                      style={styles.statItem}
                      onPress={() => {
                        setShowFollowersModal(true);
                      }}
                    >
                      <Text variant="bodyMedium" style={styles.statLabel}>
                        Followers
                      </Text>
                      <Text variant="headlineSmall" style={styles.statNumber}>
                        {followersList?.length || 0}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.statItem}
                      onPress={() => {
                        setShowFollowingModal(true);
                      }}
                    >
                      <Text variant="bodyMedium" style={styles.statLabel}>
                        Following
                      </Text>
                      <Text variant="headlineSmall" style={styles.statNumber}>
                        {followingList?.length || 0}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Bio section */}
            {viewedUser?.bio && (
              <Text variant="bodyMedium" style={styles.bio}>
                {viewedUser.bio}
              </Text>
            )}

            {/* Follow/Edit Profile Button */}
            {!isOwnProfile && (
              <Button
                mode={
                  following?.some((u) => u.id === viewingUserId)
                    ? "outlined"
                    : "contained"
                }
                onPress={() => {
                  if (following?.some((u) => u.id === viewingUserId)) {
                    unfollow?.(viewingUserId);
                  } else {
                    follow?.(viewingUserId);
                  }
                }}
                style={styles.editButton}
              >
                {following?.some((u) => u.id === viewingUserId)
                  ? "Unfollow"
                  : "Follow"}
              </Button>
            )}
            {isOwnProfile && (
              <Button
                mode="contained"
                onPress={() => navigation.navigate("EditProfile")}
                style={styles.editButton}
              >
                Edit Profile
              </Button>
            )}

            {/* Other stats - moved to stats tab */}
            {/* <View style={styles.otherStatsContainer}>
              <View style={styles.statItem}>
                <Text variant="headlineSmall" style={styles.statNumber}>
                  {stats.posts || 0}
                </Text>
                <Text variant="bodyMedium" style={styles.statLabel}>
                  Posts
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text variant="headlineSmall" style={styles.statNumber}>
                  {stats.gotIt || 0}
                </Text>
                <Text variant="bodyMedium" style={styles.statLabel}>
                  Got It
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text variant="headlineSmall" style={styles.statNumber}>
                  {stats.gave || 0}
                </Text>
                <Text variant="bodyMedium" style={styles.statLabel}>
                  Gave
                </Text>
              </View>
            </View> */}
          </View>

          {/* Tabs (if any) */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
              onPress={() => setActiveTab('posts')}
            >
              <Ionicons name="grid-outline" size={24} color={activeTab === 'posts' ? "#000" : "#666"} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
              onPress={() => setActiveTab('stats')}
            >
              <Ionicons name="stats-chart-outline" size={24} color={activeTab === 'stats' ? "#000" : "#666"} />
            </TouchableOpacity>
          </View>

          {/* Content based on active tab */}
          {activeTab === 'posts' && (
            <>
              {/* Posts */}
              {posts.map((item) => (
                <PostCard
                  key={item.id.toString()}
                  post={item}
                  onLike={handleLike}
                  onGotIt={handleGotIt}
                  onComment={handleComment}
                  currentUserId={user?.id}
                  likedPostIds={likedPostIds}
                  gotItPostIds={gotItPostIds}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onHide={handleHide}
                  onUnhide={handleUnhide}
                  onReportGone={handleReportGone}
                  isHidden={hiddenPostIds.has(item.id)}
                  isOwnProfile={isOwnProfile}
                />
              ))}
              {posts.length === 0 && (
                <View style={styles.centered}>
                  <Text>No posts yet</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'stats' && (
            <View style={styles.statsTabContainer}>
              <View style={styles.statsHeader}>
              </View>
              
              {viewedUser?.level_info && (
                <View style={styles.levelStatsContainer}>
                  <View style={styles.levelDisplay}>
                    <Text style={styles.levelBadgeLarge}>
                      {viewedUser.level_info.badge}
                    </Text>
                    <Text variant="titleLarge" style={styles.levelTitleLarge}>
                      Level {viewedUser.level_info.level}
                    </Text>
                    <Text variant="bodyMedium" style={styles.levelTitleText}>
                      {viewedUser.level_info.title}
                    </Text>
                  </View>
                  
                  <View style={styles.statsRow}>
                    <View style={styles.statsTabItem}>
                      <Text variant="displaySmall" style={styles.statsTabNumber}>
                        {stats.posts || 0}
                      </Text>
                      <Text variant="titleMedium" style={styles.statsTabLabel}>
                        Posts
                      </Text>
                    </View>

                    <View style={styles.statsTabItem}>
                      <Text variant="displaySmall" style={styles.statsTabNumber}>
                        {stats.gotIt || 0}
                      </Text>
                      <Text variant="titleMedium" style={styles.statsTabLabel}>
                        Got It
                      </Text>
                    </View>
                    
                    <View style={styles.statsTabItem}>
                      <Text variant="displaySmall" style={styles.statsTabNumber}>
                        {stats.gave || 0}
                      </Text>
                      <Text variant="titleMedium" style={styles.statsTabLabel}>
                        Gave
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.badgesSystemContainer}>
                    <TouchableOpacity 
                      style={styles.badgesSystemContainer}
                      onPress={() => setShowBadgesModal(true)}
                    >
                      <Text variant="titleMedium" style={styles.badgesSystemTitle}>
                        Badges Acquired
                      </Text>
                      <View style={styles.badgesGrid}>
                        {[
                          { level: 1, min_score: 0, badge: "🌱", title: "Newcomer" },
                          { level: 2, min_score: 5, badge: "🍃", title: "Helper" },
                          { level: 3, min_score: 15, badge: "🌿", title: "Contributor" },
                          { level: 4, min_score: 30, badge: "🌳", title: "Supporter" },
                          { level: 5, min_score: 50, badge: "🌲", title: "Community Member" },
                          { level: 6, min_score: 75, badge: "🌴", title: "Active Helper" },
                          { level: 7, min_score: 100, badge: "🌵", title: "Generous Soul" },
                          { level: 8, min_score: 150, badge: "🎋", title: "Sharing Champion" },
                          { level: 9, min_score: 200, badge: "🎍", title: "Community Hero" },
                          { level: 10, min_score: 300, badge: "🏆", title: "Freebie Legend" }
                        ]
                        .filter(badge => (viewedUser?.level_info?.level || 0) >= badge.level)
                        .map((badge, index) => (
                          <View 
                            key={index} 
                            style={styles.badgeItem}
                          >
                            <Text style={styles.badgeIcon}>
                              {badge.badge}
                            </Text>
                            <Text style={styles.badgeLevel}>Level {badge.level}</Text>
                            <Text style={styles.badgeTitle}>{badge.title}</Text>
                            <Text style={styles.badgeRequirement}>{badge.min_score} points</Text>
                          </View>
                        ))}
                      </View>
                    </TouchableOpacity>
                  </View>

                  {viewedUser.level_info.next_level && (
                    <View style={styles.progressContainer}>
                      <Text variant="bodySmall" style={styles.progressText}>
                        Progress to Level {viewedUser.level_info.next_level}: {Math.round(viewedUser.level_info.progress)}%
                      </Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${viewedUser.level_info.progress}%` }]} />
                      </View>
                      <Text variant="bodySmall" style={styles.nextLevelText}>
                        Next: {viewedUser.level_info.next_title}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Followers Modal */}
      <Modal
        visible={showFollowersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFollowersModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <IconButton
              icon="close"
              onPress={() => setShowFollowersModal(false)}
            />
            <Text variant="headlineSmall" style={styles.modalTitle}>
              Followers ({followersList.length})
            </Text>
            <View style={{ width: 48 }} />
          </View>

          {loadingFollows ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <FlatList
              data={followersList}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <UserListItem
                  user={item}
                  currentUserId={user?.id}
                  isFollowing={!!following?.some((u) => u.id === item.id)}
                  onFollow={follow}
                  onUnfollow={unfollow}
                  onPress={() => {
                    setShowFollowersModal(false);
                    navigation.navigate("UserProfile", { userId: item.id });
                  }}
                />
              )}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Text>No followers yet</Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Following Modal */}
      <Modal
        visible={showFollowingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFollowingModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <IconButton
              icon="close"
              onPress={() => setShowFollowingModal(false)}
            />
            <Text variant="headlineSmall" style={styles.modalTitle}>
              Following ({followingList.length})
            </Text>
            <View style={{ width: 48 }} />
          </View>

          {loadingFollows ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <FlatList
              data={followingList}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <UserListItem
                  user={item}
                  currentUserId={user?.id}
                  isFollowing={true}
                  onFollow={follow}
                  onUnfollow={unfollow}
                  onPress={() => {
                    setShowFollowingModal(false);
                    navigation.navigate("UserProfile", { userId: item.id });
                  }}
                />
              )}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Text>Not following anyone yet</Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Badges Modal */}
      <Modal
        visible={showBadgesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBadgesModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <IconButton
              icon="close"
              onPress={() => setShowBadgesModal(false)}
            />
            <Text variant="headlineSmall" style={styles.modalTitle}>
              All Badges
            </Text>
            <View style={{ width: 48 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.allBadgesGrid}>
              {[
                { level: 1, min_score: 0, badge: "🌱", title: "Newcomer" },
                { level: 2, min_score: 5, badge: "🍃", title: "Helper" },
                { level: 3, min_score: 15, badge: "🌿", title: "Contributor" },
                { level: 4, min_score: 30, badge: "🌳", title: "Supporter" },
                { level: 5, min_score: 50, badge: "🌲", title: "Community Member" },
                { level: 6, min_score: 75, badge: "🌴", title: "Active Helper" },
                { level: 7, min_score: 100, badge: "🌵", title: "Generous Soul" },
                { level: 8, min_score: 150, badge: "🎋", title: "Sharing Champion" },
                { level: 9, min_score: 200, badge: "🎍", title: "Community Hero" },
                { level: 10, min_score: 300, badge: "🏆", title: "Freebie Legend" }
              ].map((badge, index) => {
                const isEarned = (viewedUser?.level_info?.level || 0) >= badge.level;
                return (
                  <View 
                    key={index} 
                    style={[
                      styles.modalBadgeItem,
                      isEarned && styles.modalBadgeItemEarned
                    ]}
                  >
                    <Text style={[
                      styles.modalBadgeIcon,
                      isEarned && styles.modalBadgeIconEarned
                    ]}>
                      {badge.badge}
                    </Text>
                    <Text style={styles.modalBadgeLevel}>Level {badge.level}</Text>
                    <Text style={styles.modalBadgeTitle}>{badge.title}</Text>
                    <Text style={styles.modalBadgeRequirement}>{badge.min_score} points</Text>
                    {isEarned && (
                      <Text style={styles.modalBadgeEarned}>✓ Earned</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontWeight: "600",
  },
  profileSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileHeader: {
    width: "100%",
    marginBottom: 16,
  },
  userInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  avatarImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    marginRight: 12 
  },
  userInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginLeft: 28,
  },
  username: {
    color: "#666",
  },
  displayName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  bio: {
    textAlign: "left",
    marginBottom: 16,
    color: "#444",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    minWidth: 180,
    gap: 40,
    marginLeft: 30,
    marginTop: 15,
  },
  statItem: {
    alignItems: "center",
    minWidth: "18%",
  },
  statNumber: {
    fontWeight: "600",
    fontSize: 18,
  },
  statLabel: {
    color: "#666",
    marginBottom: 4,
    fontSize: 12,
    textAlign: "center",
  },
  editButton: {
    marginTop: 16,
    width: "100%",
    borderRadius: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#000",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    margin: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchResultsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  searchLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  searchResultItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchResultUserInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchResultAvatar: {
    marginRight: 12,
  },
  searchResultTextContainer: {
    flex: 1,
  },
  searchResultDisplayName: {
    fontWeight: "600",
    marginBottom: 2,
  },
  searchResultUsername: {
    color: "#666",
    fontSize: 14,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  statsTabContainer: {
    paddingVertical: 16,
    width: "100%",
  },
  statsTabItem: {
    alignItems: "center",
    flex: 1,
  },
  statsTabNumber: {
    fontWeight: "600",
    fontSize: 18,
  },
  statsTabLabel: {
    color: "#666",
    marginBottom: 4,
    fontSize: 12,
    textAlign: "center",
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
  },
  nameAndLevel: {
    flexDirection: "row",
    alignItems: "center",
  },
  levelInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  levelBadge: {
    backgroundColor: "#fff",
    color: "#000",
    padding: 4,
    borderRadius: 4,
    marginLeft: 8,
    fontSize: 20,
    marginTop: -4,
  },
  levelTitle: {
    color: "#666",
    marginLeft: 8,
  },
  levelStatsContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  levelDisplay: {
    alignItems: "center",
    marginBottom: 8,
  },
  levelBadgeLarge: {
    backgroundColor: "#fff",
    color: "#000",
    padding: 0,
    borderRadius: 8,
    marginBottom: 4,
    fontSize: 50,
    marginTop: -27,
  },
  levelTitleLarge: {
    fontWeight: "600",
    marginBottom: 4,
  },
  levelTitleText: {
    color: "#666",
  },
  progressContainer: {
    alignItems: "center",
    marginTop: 16,
    width: "100%",
  },
  progressText: {
    color: "#666",
    marginBottom: 8,
  },
  progressBar: {
    backgroundColor: "#eee",
    height: 12,
    borderRadius: 6,
    width: "100%",
    marginBottom: 8,
  },
  progressFill: {
    backgroundColor: "#666",
    height: "100%",
    borderRadius: 6,
  },
  nextLevelText: {
    color: "#666",
  },
  badgesSystemContainer: {
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fafafa",
    width: "100%",
    alignSelf: "stretch",
    marginHorizontal: 0,
  },
  badgesSystemTitle: {
    fontWeight: "600",
    marginBottom: 8,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
  },
  badgeItem: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 8,
    margin: 4,
    alignItems: "center",
    width: 80,
  },
  badgeIcon: {
    fontSize: 24,
    marginBottom: 4,
    textAlign: "center",
  },
  badgeLevel: {
    fontWeight: "600",
    marginBottom: 2,
    fontSize: 10,
    textAlign: "center",
  },
  badgeTitle: {
    fontWeight: "600",
    marginBottom: 2,
    fontSize: 10,
    textAlign: "center",
  },
  badgeRequirement: {
    color: "#666",
    fontSize: 8,
    textAlign: "center",
  },
  modalContent: {
    padding: 16,
  },
  allBadgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
  },
  modalBadgeItem: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 8,
    margin: 4,
    alignItems: "center",
    width: 80,
  },
  modalBadgeItemEarned: {
    backgroundColor: "#e0e0e0",
  },
  modalBadgeIcon: {
    fontSize: 24,
    marginBottom: 4,
    textAlign: "center",
  },
  modalBadgeIconEarned: {
    color: "#000",
  },
  modalBadgeLevel: {
    fontWeight: "600",
    marginBottom: 2,
    fontSize: 10,
    textAlign: "center",
  },
  modalBadgeTitle: {
    fontWeight: "600",
    marginBottom: 2,
    fontSize: 10,
    textAlign: "center",
  },
  modalBadgeRequirement: {
    color: "#666",
    fontSize: 8,
    textAlign: "center",
  },
  modalBadgeEarned: {
    color: "#000",
    fontWeight: "600",
    marginTop: 4,
  },
});
