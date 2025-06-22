import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
} from "react-native";
import {
  ActivityIndicator,
  Text,
  IconButton,
  Button,
  Menu,
  Avatar,
  FAB,
} from "react-native-paper";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  getFullImageUrl,
  mapPostFromApi,
  likePost,
  gotItPost,
  commentPost,
  deletePost,
  hidePost,
  unhidePost,
  getPostHiddenStatus,
} from "../services/api";
import api from "../services/api";
import { Post } from "../types";
import PostCard from "../components/PostCard";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuthStore } from "../state/authStore";
import Header from "../components/Header";
import Slider from "@react-native-community/slider";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "leftovers", label: "Leftovers" },
  { key: "new", label: "New" },
  { key: "restaurant", label: "Restaurant" },
  { key: "home_made", label: "Home Made" },
];

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distance, setDistance] = useState<number>(10); // km
  const [sliderValue, setSliderValue] = useState<number>(10); // for UI only
  const navigation = useNavigation();
  const { following, user } = useAuthStore();
  const [likedPostIds, setLikedPostIds] = useState<number[]>([]);
  const [gotItPostIds, setGotItPostIds] = useState<number[]>([]);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<number>>(new Set());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {}
  };

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      let url = "/posts/?";
      if (category) url += `category=${category}&`;
      if (location)
        url += `latitude=${location.latitude}&longitude=${location.longitude}&radius=${distance}&`;
      const response = await api.get<Post[]>(url);
      let filtered = response.data;
      if (showFollowedOnly && following && following.length > 0) {
        const followedIds = following.map((u) => u.id);
        filtered = filtered.filter((post) =>
          followedIds.includes(post.owner.id)
        );
      }
      const mappedPosts = filtered.map(mapPostFromApi);
      setPosts(mappedPosts);
      setError(null);
      if (user) {
        const likedIds: number[] = [];
        const gotItIds: number[] = [];
        const hiddenIds: number[] = [];
        
        await Promise.all(
          mappedPosts.map(async (post: any) => {
            const likesRes = await api.get(`/posts/${post.id}/likes`);
            if (likesRes.data.some((u: any) => u.id === user.id))
              likedIds.push(post.id);
            const gotItRes = await api.get(`/posts/${post.id}/got-it`);
            if (gotItRes.data.some((u: any) => u.id === user.id))
              gotItIds.push(post.id);
            
            // Check hidden status for all posts
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
      setError("Failed to load posts");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPostsSilent = async () => {
    try {
      let url = "/posts/?";
      if (category) url += `category=${category}&`;
      if (location)
        url += `latitude=${location.latitude}&longitude=${location.longitude}&radius=${distance}&`;
      const response = await api.get<Post[]>(url);
      let filtered = response.data;
      if (showFollowedOnly && following && following.length > 0) {
        const followedIds = following.map((u) => u.id);
        filtered = filtered.filter((post) =>
          followedIds.includes(post.owner.id)
        );
      }
      const mappedPosts = filtered.map(mapPostFromApi);
      setPosts(mappedPosts);
      setError(null);
      if (user) {
        const likedIds: number[] = [];
        const gotItIds: number[] = [];
        const hiddenIds: number[] = [];
        
        await Promise.all(
          mappedPosts.map(async (post: any) => {
            const likesRes = await api.get(`/posts/${post.id}/likes`);
            if (likesRes.data.some((u: any) => u.id === user.id))
              likedIds.push(post.id);
            const gotItRes = await api.get(`/posts/${post.id}/got-it`);
            if (gotItRes.data.some((u: any) => u.id === user.id))
              gotItIds.push(post.id);
            
            // Check hidden status for all posts
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
      setError("Failed to load posts");
    }
  };

  const searchPosts = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      setShowSearchResults(true);

      // Search for posts by title or description
      const response = await api.get(
        `/posts/search?q=${encodeURIComponent(query.trim())}&limit=10`
      );
      setSearchResults(response.data.map(mapPostFromApi));
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
      searchPosts(query);
    }, 500);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [category, showFollowedOnly, location, distance, following]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchPosts();
    }, [])
  );

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

  const handleComment = (postId: number) => {
    navigation.navigate("PostDetail", { postId });
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
      setPosts((prev) => prev.filter((p) => p.id !== postId));
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
      // Refetch posts to show the unhidden post
      fetchPosts();
    } catch (error) {
      console.error("Failed to unhide post:", error);
    }
  };

  const handleReportGone = (post: Post) => {
    navigation.navigate("ReportGone", { post });
  };

  // When distance changes, update sliderValue too (for initial sync)
  useEffect(() => {
    setSliderValue(distance);
  }, [distance]);

  const handleApplyFilters = () => {
    setFilterModalVisible(false);
    fetchPosts();
  };

  const renderHeader = () => {
    if (isSearchMode) {
      return (
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
              placeholder="Search posts..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                debouncedSearch(text);
              }}
              onFocus={() => setShowSearchResults(true)}
              autoFocus
            />
          </View>
          <Button onPress={() => setIsSearchMode(false)}>Cancel</Button>
        </View>
      );
    }
    return null;
  };

  const renderContent = () => {
    if (isLoading && !posts.length) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button onPress={() => fetchPosts()}>Try Again</Button>
        </View>
      );
    }

    if (posts.length === 0) {
      return (
        <View style={styles.centered}>
          <Text>No posts found. Try adjusting your filters!</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PostCard
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
            isOwnProfile={false}
          />
        )}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text>No posts found. Be the first to share!</Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Freebies</Text>
        <View style={styles.searchBarContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search Freebies"
            style={styles.searchBar}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              debouncedSearch(text);
            }}
            onFocus={() => {
              setShowSearchResults(true);
            }}
          />
          <IconButton
            icon="filter-variant"
            size={20}
            onPress={() => setFilterModalVisible(true)}
            style={styles.filterButton}
          />
        </View>
      </View>

      {showSearchResults && searchQuery.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <PostCard
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
              isOwnProfile={false}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text>No results found for "{searchQuery}"</Text>
            </View>
          }
        />
      ) : (
        renderContent()
      )}

      <Modal
        visible={isFilterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <IconButton
              icon="close"
              onPress={() => setFilterModalVisible(false)}
            />
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.filterLabel}>Category</Text>
            <View style={styles.categoryContainer}>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.key}
                  mode={category === cat.key ? "contained" : "outlined"}
                  onPress={() => setCategory(cat.key)}
                  style={styles.categoryButton}
                  labelStyle={styles.categoryButtonLabel}
                >
                  {cat.label}
                </Button>
              ))}
            </View>

            <Text style={styles.filterLabel}>
              Distance: {Math.round(sliderValue)} km
            </Text>
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={1}
              maximumValue={50}
              minimumTrackTintColor="#1976d2"
              maximumTrackTintColor="#000000"
              step={1}
              value={sliderValue}
              onValueChange={setSliderValue}
            />
            <Button mode="contained" onPress={handleApplyFilters}>
              Apply Filters
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    height: 40,
    backgroundColor: "transparent",
  },
  filterButton: {
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "red",
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalContent: {
    padding: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
  },
  categoryButton: {
    margin: 4,
  },
  categoryButtonLabel: {
    fontSize: 12,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
  },
  searchInput: {
    flex: 1,
  },
});
