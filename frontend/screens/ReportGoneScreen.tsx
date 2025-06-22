import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Button, Text, ActivityIndicator, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Post } from '../types';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from 'expo-location';

type Props = NativeStackScreenProps<any>;

export default function ReportGoneScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<{ params: { post: Post } }>>();
  const { post } = route.params;
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      setError("Please upload a photo to confirm the item is gone.");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Get user's current location
    let location;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError("Location permission is required to report an item as gone.");
        setIsLoading(false);
        return;
      }
      location = await Location.getCurrentPositionAsync({});
    } catch (error) {
      setError("Failed to get your location. Please try again.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('latitude', location.coords.latitude.toString());
    formData.append('longitude', location.coords.longitude.toString());
    formData.append('photo', {
      uri: image,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    try {
      await api.post(`/posts/${post.id}/report-gone`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigation.goBack();
    } catch (err) {
      setError('Failed to report post as gone.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineSmall">Report All Gone</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.infoText}>
          To report this item as gone, please upload a photo of the empty location.
        </Text>

        <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="camera-outline" size={32} color="#666" />
              <Text style={styles.uploadText}>Add Confirmation Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={!image || isLoading}
          style={styles.button}
        >
          Confirm and Report
        </Button>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  infoText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  imageUpload: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 20,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  uploadPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 8,
    color: '#666',
  },
  button: {
    width: '100%',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  },
}); 