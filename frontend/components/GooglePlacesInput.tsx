import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';

interface Props {
  onAddressSelected: (address: string, lat: number, lon: number) => void;
}

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  distance?: number;
}

export default function NominatimAutocomplete({ onAddressSelected }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

  // Get user's current location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const search = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=10`);
      const data = await res.json();
      
      // Add distance to each result if user location is available
      let resultsWithDistance = data.map((item: SearchResult) => {
        if (userLocation) {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(item.lat),
            parseFloat(item.lon)
          );
          return { ...item, distance };
        }
        return item;
      });

      // Sort by distance if user location is available, otherwise keep original order
      if (userLocation) {
        resultsWithDistance.sort((a: SearchResult, b: SearchResult) => {
          if (a.distance && b.distance) {
            return a.distance - b.distance;
          }
          return 0;
        });
      }

      setResults(resultsWithDistance);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search for address"
        value={query}
        onChangeText={search}
      />
      {loading && <ActivityIndicator size="small" style={styles.loader} />}
      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={item => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => {
                  setQuery(item.display_name);
                  setResults([]);
                  onAddressSelected(item.display_name, parseFloat(item.lat), parseFloat(item.lon));
                }}
              >
                <View style={styles.resultContent}>
                  <Text style={styles.resultText} numberOfLines={2}>{item.display_name}</Text>
                  {item.distance && (
                    <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            style={styles.resultsList}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    height: 44,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  loader: {
    marginVertical: 8,
  },
  resultsContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultText: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
    marginRight: 8,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
}); 