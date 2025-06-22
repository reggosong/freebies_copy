import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
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
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import api from "../services/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import NominatimAutocomplete from "../components/GooglePlacesInput";
import MapPicker from "../components/MapPicker";
import * as Location from "expo-location";

const createPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
  address: z.string().min(1, "Please select an address"),
  latitude: z.number(),
  longitude: z.number(),
});

type CreatePostFormData = z.infer<typeof createPostSchema>;

type Props = NativeStackScreenProps<any>;

const CATEGORIES = ["leftovers", "new", "restaurant", "home_made"];

const CATEGORY_LABELS = {
  leftovers: "Leftovers",
  new: "New",
  restaurant: "Restaurant",
  home_made: "Home Made",
};

// Persisted state for CreatePostScreen
let persistedFormState: Partial<CreatePostFormData> | null = null;
let persistedImage: string | null = null;

export default function CreatePostScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(persistedImage);
  const [detectedAddress, setDetectedAddress] = useState<string>("");
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: persistedFormState || {
      title: '',
      description: '',
      category: 'Other',
      address: '',
      latitude: 0,
      longitude: 0,
    },
  });

  // Persist form and image state on change
  useEffect(() => {
    const subscription = watch((values) => {
      persistedFormState = values;
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    persistedImage = image;
  }, [image]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      // Reverse geocode with Nominatim
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.coords.latitude}&lon=${loc.coords.longitude}`);
        const data = await res.json();
        if (data.display_name) {
          setDetectedAddress(data.display_name);
          setValue("address", data.display_name);
          setValue("latitude", loc.coords.latitude);
          setValue("longitude", loc.coords.longitude);
        }
      } catch {}
    })();
  }, []);

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

  const onSubmit = async (data: CreatePostFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // If address is empty but detectedAddress is set, use detectedAddress
      let addressToSave = data.address;
      let latitudeToSave = data.latitude;
      let longitudeToSave = data.longitude;
      if (!addressToSave && detectedAddress) {
        addressToSave = detectedAddress;
        // Try to use the last detected coordinates
        const loc = await Location.getCurrentPositionAsync({});
        latitudeToSave = loc.coords.latitude;
        longitudeToSave = loc.coords.longitude;
      }

      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("category", data.category);
      formData.append("address", addressToSave);
      formData.append("latitude", latitudeToSave.toString());
      formData.append("longitude", longitudeToSave.toString());

      if (image) {
        formData.append("photo", {
          uri: image,
          type: "image/jpeg",
          name: "photo.jpg",
        } as any);
      }

      await api.post("/posts/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Reset form and image state after successful post
      reset({
        title: '',
        description: '',
        category: 'Other',
        address: '',
        latitude: 0,
        longitude: 0,
      });
      setImage(null);
      persistedFormState = null;
      persistedImage = null;
      navigation.goBack();
    } catch (err) {
      setError("Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="close" size={24} color="#000" />}
            onPress={() => navigation.goBack()}
          />
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Create Post
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.uploadedImage} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color="#666" />
                    <Text style={styles.uploadText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Title"
                    value={value}
                    onChangeText={onChange}
                    error={!!errors.title}
                    style={styles.input}
                    mode="outlined"
                  />
                )}
              />
              {errors.title && (
                <Text style={styles.errorText}>{errors.title.message}</Text>
              )}

              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Description"
                    value={value}
                    onChangeText={onChange}
                    error={!!errors.description}
                    style={styles.input}
                    multiline
                    numberOfLines={4}
                    mode="outlined"
                  />
                )}
              />
              {errors.description && (
                <Text style={styles.errorText}>{errors.description.message}</Text>
              )}

              <Controller
                control={control}
                name="category"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.categoryContainer}>
                    <Text style={styles.categoryLabel}>Category</Text>
                    <SegmentedButtons
                      value={value}
                      onValueChange={onChange}
                      buttons={CATEGORIES.map((cat) => ({
                        value: cat,
                        label: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS],
                      }))}
                      style={styles.categoryButtons}
                    />
                  </View>
                )}
              />
              {errors.category && (
                <Text style={styles.errorText}>{errors.category.message}</Text>
              )}

              {/* Address Section */}
              <View style={styles.addressSection}>
                <Text style={styles.sectionLabel}>Location</Text>
                
                <Controller
                  control={control}
                  name="address"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Address"
                      value={value}
                      onChangeText={onChange}
                      style={styles.input}
                      mode="outlined"
                      placeholder="Enter or search for address"
                    />
                  )}
                />
                
                <View style={styles.addressOptions}>
                  <Button
                    mode="outlined"
                    onPress={() => setMapPickerVisible(true)}
                    style={styles.mapButton}
                    icon={() => <Ionicons name="map-outline" size={20} color="#666" />}
                  >
                    Pick on Map
                  </Button>
                </View>

                {detectedAddress && !watch('address') && (
                  <Text style={styles.detectedAddress}>Detected: {detectedAddress}</Text>
                )}
                
                <NominatimAutocomplete onAddressSelected={onAddressSelected} />
                
                {errors.address && (
                  <Text style={styles.errorText}>{errors.address.message}</Text>
                )}
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                disabled={!watch('address')}
              >
                Post
              </Button>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>

      <MapPicker
        visible={mapPickerVisible}
        onClose={() => setMapPickerVisible(false)}
        onLocationSelected={onMapLocationSelected}
      />
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageUpload: {
    width: "100%",
    height: 200,
    backgroundColor: "#f8f8f8",
    marginBottom: 20,
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: {
    marginTop: 8,
    color: "#666",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryLabel: {
    marginBottom: 8,
    color: "#666",
  },
  categoryButtons: {
    marginBottom: 8,
  },
  button: {
    marginVertical: 24,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  errorText: {
    color: "red",
    marginBottom: 8,
  },
  detectedAddress: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  addressSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  addressOptions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  mapButton: {
    marginBottom: 8,
  },
});
