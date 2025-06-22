import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuthStore } from "../state/authStore";
import { IconButton } from "react-native-paper";
import Header from "../components/Header";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Post } from "../types";

// Import screens (we'll create these next)
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import FeedScreen from "../screens/FeedScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import ProfileScreen from "../screens/ProfileScreen";
import InboxScreen from "../screens/InboxScreen";
import MapScreen from "../screens/MapScreen";
import PostDetailScreen from "../screens/PostDetailScreen";
import UserSearchScreen from "../screens/UserSearchScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import EditPostScreen from "../screens/EditPostScreen";
import ReportGoneScreen from "../screens/ReportGoneScreen";
import PostInteractionsScreen from "../screens/PostInteractionsScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: number };
  UserSearch: undefined;
  EditProfile: undefined;
  Settings: undefined;
  EditPost: { post: Post };
  ReportGone: { post: Post };
  PostInteractions: { postId: number; interactionType: 'likes' | 'got-it'; postTitle: string };
  Create: undefined;
  Map:
    | {
        latitude: number;
        longitude: number;
        title: string;
      }
    | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function FloatingActionButton() {
  const navigation = useNavigation();
  
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => {
        navigation.navigate('Create' as never);
      }}
    >
      <Ionicons name="add" size={24} color="gray" />
    </TouchableOpacity>
  );
}

function MainTabs() {
  const { unreadCount, fetchUnreadCount } = useAuthStore();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          header: ({ navigation, route, options }) => (
            <Header
              title={route.name}
              showBack={false}
            />
          ),
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;
            if (route.name === "Feed") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "Map") {
              iconName = focused ? "map" : "map-outline";
            } else if (route.name === "Inbox") {
              iconName = focused ? "chatbubbles" : "chatbubbles-outline";
            } else if (route.name === "Profile") {
              iconName = focused ? "person" : "person-outline";
            } else {
              iconName = "ellipse-outline";
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "tomato",
          tabBarInactiveTintColor: "gray",
          tabBarStyle: {
            height: 80,
            paddingHorizontal: 20,
            paddingBottom: 20,
          },
          tabBarItemStyle: {
            paddingVertical: 8,
          },
        })}
      >
        <Tab.Screen 
          name="Feed" 
          component={FeedScreen}
          options={{
            tabBarItemStyle: {
              paddingVertical: 8,
              marginRight: 30,
            },
          }}
        />
        <Tab.Screen 
          name="Map" 
          component={MapScreen}
          options={{
            tabBarItemStyle: {
              paddingVertical: 8,
              marginRight: 50,
            },
          }}
        />
        <Tab.Screen
          name="Inbox"
          component={InboxScreen}
          options={{ 
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarItemStyle: {
              paddingVertical: 8,
              marginLeft: 70,
            },
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            tabBarItemStyle: {
              paddingVertical: 8,
              marginLeft: 30,
            },
          }}
        />
      </Tab.Navigator>
      
      <FloatingActionButton />
    </View>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="UserProfile" component={ProfileScreen} />
      <Stack.Screen name="UserSearch" component={UserSearchScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditPost" component={EditPostScreen} />
      <Stack.Screen name="ReportGone" component={ReportGoneScreen} />
      <Stack.Screen name="PostInteractions" component={PostInteractionsScreen} />
      <Stack.Screen name="Create" component={CreatePostScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user } = useAuthStore();

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 40,
    backgroundColor: 'white',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'gray',
  },
});
