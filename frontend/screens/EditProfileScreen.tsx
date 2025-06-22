import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text, Button, ActivityIndicator, IconButton, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../state/authStore';
import api, { API_URL, getFullImageUrl } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export default function EditProfileScreen({ navigation }: NativeStackScreenProps<any>) {
  const { user, setUser } = useAuthStore();
  const [image, setImage] = useState<string | null>(user?.profile_picture_url || null);
  const [displayName, setDisplayName] = useState<string>(user?.display_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalImageUri, setOriginalImageUri] = useState<string | null>(
    user?.profile_picture_url ? getFullImageUrl(user.profile_picture_url) || null : null
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Validate display name
    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setError('Display name cannot be empty');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Add display name to form data
      formData.append('display_name', trimmedDisplayName);
      
      // Check if image has been modified (either selected new or cropped existing)
      const hasImageChanged = image !== originalImageUri;
      
      // Add profile picture if it has been modified
      if (image && hasImageChanged) {
        formData.append('profile_picture', {
          uri: image,
          type: 'image/jpeg',
          name: 'profile.jpg',
        } as any);
      }

      console.log('Sending form data:', {
        display_name: trimmedDisplayName,
        has_image: Boolean(image && hasImageChanged),
        image_changed: hasImageChanged,
        original_uri: originalImageUri,
        current_uri: image
      });

      const res = await api.put('/users/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        transformRequest: [(data) => {
          return data;
        }],
        timeout: 10000, // 10 second timeout
      });

      console.log('Profile update response:', res.data);

      if (!res.data) {
        throw new Error('No data received from server');
      }

      // Update the global user state with the response data
      const updatedUser = {
        ...user,
        ...res.data,
        display_name: res.data.display_name || trimmedDisplayName,
        profile_picture_url: res.data.profile_picture_url || user.profile_picture_url
      };

      // Update the global state
      setUser(updatedUser);

      // Navigate back
      navigation.goBack();
    } catch (err: any) {
      console.error('Profile update error:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Get the display URL for the image
  const getDisplayImageUrl = () => {
    if (!image) return undefined;
    // If the image is different from the original, it's a local file URI
    // Otherwise, it's a remote URL that needs to be processed
    return image !== originalImageUri ? image : getFullImageUrl(image);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <IconButton icon={() => <Ionicons name="arrow-back" size={24} color="#000" />} onPress={() => navigation.goBack()} />
            <Text variant="headlineSmall" style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>
          <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
            {image ? (
              <Image 
                source={{ uri: getDisplayImageUrl() }} 
                style={styles.uploadedImage}
                onError={(e) => {
                  console.error('Image loading error:', e.nativeEvent);
                  setError('Failed to load profile image');
                }}
              />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="camera-outline" size={32} color="#666" />
                <Text style={styles.uploadText}>Add Profile Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <TextInput
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
            mode="outlined"
            error={!!error && error.includes('name')}
          />
          {error && (
            <Text style={[styles.errorText, { marginTop: 4 }]}>
              {error}
            </Text>
          )}
          <Button 
            mode="contained" 
            onPress={handleSave} 
            loading={isLoading} 
            style={styles.button}
            disabled={!displayName.trim() || isLoading}
          >
            Save
          </Button>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
  },
  headerTitle: { fontWeight: '600' },
  imageUpload: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f8f8f8',
    alignSelf: 'center',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadedImage: { width: 140, height: 140, borderRadius: 70 },
  uploadPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  uploadText: { marginTop: 8, color: '#666' },
  input: { marginBottom: 16 },
  button: { marginTop: 24, borderRadius: 8 },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 8 },
}); 