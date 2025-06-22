import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Image, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { ActivityIndicator, Text, Button as PaperButton } from 'react-native-paper';
import * as Location from 'expo-location';
import api from '../services/api';
import { Post } from '../types';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { RouteProp } from '@react-navigation/native';

type MapScreenRouteProp = RouteProp<RootStackParamList, "Map">;

export default function MapScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [region, setRegion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<MapScreenRouteProp>();

  // Check for single post location from route params
  const singleLocation = route.params;

  const DEFAULT_IMAGE = 'https://via.placeholder.com/200x80?text=No+Image';

  const fetchMapData = async () => {
    try {
      setIsLoading(true);
      if (singleLocation?.latitude && singleLocation?.longitude) {
        // If a single location is passed, just set the region and a single post marker
        setRegion({
          latitude: singleLocation.latitude,
          longitude: singleLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setPosts([
          {
            id: 1,
            latitude: singleLocation.latitude,
            longitude: singleLocation.longitude,
            title: singleLocation.title || "Selected Location",
            description: "",
            category: "new",
            photo_url: "",
            owner_id: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            owner: {
              id: 0,
              username: "",
              email: "",
            },
            likesCount: 0,
            commentsCount: 0,
            gotItCount: 0,
            address: "",
            city: "",
            is_gone: false,
          },
        ]);
      } else {
        // Otherwise, fetch all posts
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          setIsLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        const response = await api.get<Post[]>('/posts/');
        setPosts(response.data);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load map or posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, [singleLocation]);

  useFocusEffect(
    React.useCallback(() => {
      // Don't refetch if we're showing a single location
      if (!singleLocation) {
        fetchMapData();
      }
    }, [singleLocation])
  );

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }
  if (error) {
    return <Text style={{ color: 'red', margin: 20 }}>{error}</Text>;
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ flexDirection: 'row', justifyContent: 'center', margin: 8 }} style={{ maxHeight: 48 + 8, minHeight: 48 + 8 }} indicatorStyle="black">
        {['', 'leftovers', 'new', 'restaurant', 'home_made'].map(cat => (
          <PaperButton key={cat} mode={category === cat ? 'contained' : 'outlined'} onPress={() => setCategory(cat)} style={{ marginHorizontal: 2 }}>
            {cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'All'}
          </PaperButton>
        ))}
      </ScrollView>
      {region && (
        <MapView
          style={styles.map}
          initialRegion={region}
          showsUserLocation
        >
          {posts
            .filter(
              (post) =>
                !post.is_gone &&
                typeof post.latitude === "number" &&
                typeof post.longitude === "number" &&
                (!category || post.category === category || !!singleLocation)
            )
            .map((post) => (
              <Marker
                key={post.id}
                coordinate={{
                  latitude: post.latitude,
                  longitude: post.longitude,
                }}
                title={post.title}
                description={post.description}
              >
                {!singleLocation && (
                  <Callout
                    tooltip
                    onPress={() =>
                      navigation.navigate("PostDetail", {
                        postId: post.id.toString(),
                      })
                    }
                  >
                    <View
                      style={{
                        width: 200,
                        padding: 8,
                        backgroundColor: "#fff",
                        borderRadius: 8,
                      }}
                    >
                      <Image
                        source={{ uri: post.photo_url || DEFAULT_IMAGE }}
                        style={{
                          width: "100%",
                          height: 80,
                          borderRadius: 6,
                          marginBottom: 4,
                        }}
                      />
                      <Text style={{ fontWeight: "bold", marginBottom: 2 }}>
                        {post.title}
                      </Text>
                      <Text numberOfLines={2} style={{ color: "#666" }}>
                        {post.address || ""}
                      </Text>
                    </View>
                  </Callout>
                )}
              </Marker>
            ))}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
}); 