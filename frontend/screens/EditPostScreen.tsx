import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  TextInput,
  Button,
  Text,
  IconButton,
  SegmentedButtons,
} from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import api, { getFullImageUrl } from "../services/api";
import { RouteProp, useRoute } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import NominatimAutocomplete from "../components/GooglePlacesInput";
import MapPicker from "../components/MapPicker";
import { Post } from "../types";

const editPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
  address: z.string().min(1, "Please select an address"),
  latitude: z.number(),
  longitude: z.number(),
});

type EditPostFormData = z.infer<typeof editPostSchema>;

type Props = NativeStackScreenProps<any>;

const CATEGORIES = ["leftovers", "new", "restaurant", "home_made"];

export default function EditPostScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<{ params: { post: Post } }>>();
  const { post } = route.params;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(post.photo_url ? getFullImageUrl(post.photo_url) || null : null);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<EditPostFormData>({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      title: post.title,
      description: post.description,
      category: post.category,
      address: post.address || "",
      latitude: post.latitude,
      longitude: post.longitude,
    },
  });

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
  
  const onAddressSelected = (address: string, lat: number, lng: number) => {
    setValue("address", address);
    setValue("latitude", lat);
    setValue("longitude", lng);
  };

  const onMapLocationSelected = (address: string, lat: number, lng: number) => {
    setValue("address", address);
    setValue("latitude", lat);
    setValue("longitude", lng);
  };

  const onSubmit = async (data: EditPostFormData) => {
    try {
      setIsLoading(true);
      setError(null);
  
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("category", data.category);
      formData.append("address", data.address);
      formData.append("latitude", data.latitude.toString());
      formData.append("longitude", data.longitude.toString());
  
      if (image && image !== getFullImageUrl(post.photo_url)) {
        formData.append("photo", {
          uri: image,
          type: "image/jpeg",
          name: "photo.jpg",
        } as any);
      }
  
      await api.put(`/posts/${post.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  
      navigation.goBack();
    } catch (err) {
      setError("Failed to update post");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <Text variant="headlineSmall">Edit Post</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.uploadedImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Text>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Title" value={value} onChangeText={onChange} style={styles.input} />
            )}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Description" value={value} onChangeText={onChange} multiline style={styles.input} />
            )}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description.message}</Text>}

          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, value } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                style={styles.input}
              />
            )}
          />
          {errors.category && <Text style={styles.errorText}>{errors.category.message}</Text>}

          <NominatimAutocomplete
            onAddressSelected={onAddressSelected}
          />

          <Button onPress={() => setMapPickerVisible(true)}>Choose on Map</Button>
          <MapPicker
            visible={mapPickerVisible}
            onClose={() => setMapPickerVisible(false)}
            onLocationSelected={onMapLocationSelected}
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.button}
          >
            Save Edits
          </Button>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  uploadedImage: { width: '100%', height: 200, marginBottom: 16 },
  uploadPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: { marginBottom: 16 },
  button: { marginTop: 16 },
  errorText: { color: 'red', marginBottom: 10 },
}); 