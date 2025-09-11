import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import AuthProvider, { useAuth } from './AuthContext';
import AccountScreen from './screens/AccountScreen';
import ChatScreen from './screens/ChatScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import ManageListingsScreen from './screens/ManageListingsScreen';
import NotificationScreen from './screens/NotificationScreen';
import PostListingScreen from './screens/PostListingScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import RegisterScreen from './screens/RegisterScreen';
import TopUpScreen from './screens/TopUpScreen';
import WishlistScreen from './screens/WishlistScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Create a stack navigator for Chat that can hide bottom tabs
function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatList" component={ChatScreen} />
    </Stack.Navigator>
  );
}

// Create a stack navigator for Home that includes ProductDetail, Wishlist, and Notification
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Wishlist">
        {({ navigation }) => (
          <ProtectedScreen screenName="Wishlist" navigation={navigation}>
            <WishlistScreen />
          </ProtectedScreen>
        )}
      </Stack.Screen>
      <Stack.Screen name="Notification">
        {({ navigation }) => (
          <ProtectedScreen screenName="Notification" navigation={navigation}>
            <NotificationScreen />
          </ProtectedScreen>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// Protected route wrapper  
function ProtectedScreen({ children, screenName, navigation }: { children: React.ReactNode; screenName: string; navigation: any }) {
  const { isAuthenticated, login } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) {
      // Hide bottom tab bar when showing login/register
      navigation.setOptions({
        tabBarStyle: { display: 'none' }
      });
    } else {
      // Show bottom tab bar when authenticated
      navigation.setOptions({
        tabBarStyle: {
          backgroundColor: 'white',
          height: 90,
          paddingBottom: 2,
          paddingTop: 10,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 1,
          borderTopColor: '#E5E5E7',
        }
      });
    }
  }, [isAuthenticated, navigation]);

  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <RegisterScreen 
          onRegister={() => {
            setShowRegister(false);
            Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng đăng nhập.');
          }}
          onBackToLogin={() => setShowRegister(false)}
        />
      );
    }
    return (
      <LoginScreen 
        onLogin={login} 
        onNavigateToRegister={() => setShowRegister(true)}
        onBackToHome={() => navigation.navigate('Trang chủ')}
        showBackButton={true}
      />
    );
  }

  return children;
}

// Main App with Authentication
function AppContent() {
  const { isAuthenticated, login, logout } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          
          if (route.name === 'Trang chủ') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Quản lí tin') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Đăng tin') {
            iconName = 'add';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Tài khoản') {
            iconName = focused ? 'person' : 'person-outline';
          }

          if (route.name === 'Đăng tin') {
            return <Ionicons name={iconName} size={30} color="white" />;
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: 'white',
          height: 90,
          paddingBottom: 2,
          paddingTop: 10,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 1,
          borderTopColor: '#E5E5E7',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 5,
        },
        tabBarButton: (props) => (
          route.name === 'Đăng tin' ? (
            <View style={{
              top: -30,
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
            }}>
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#FFD700',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                shadowOpacity: 0.3,
                shadowRadius: 4.65,
                elevation: 8,
                marginBottom: 5,
              }}>
                <TouchableOpacity 
                  {...(props as any)} 
                  style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                />
              </View>
              <Text style={{
                fontSize: 12,
                fontWeight: '500',
                color: '#FFD700',
                marginTop: 8,
              }}>Đăng tin</Text>
            </View>
          ) : (
            <TouchableOpacity {...props as any} />
          )
        ),
      })}
    >
      <Tab.Screen name="Trang chủ" component={HomeStack} />
      <Tab.Screen name="Quản lí tin">
        {({ navigation }) => (
          <ProtectedScreen screenName="Quản lí tin" navigation={navigation}>
            <ManageListingsScreen />
          </ProtectedScreen>
        )}
      </Tab.Screen>
      <Tab.Screen name="Đăng tin" options={{ tabBarLabel: () => null }}>
        {({ navigation }) => (
          <ProtectedScreen screenName="Đăng tin" navigation={navigation}>
            <PostListingScreen />
          </ProtectedScreen>
        )}
      </Tab.Screen>
      <Tab.Screen name="Chat">
        {({ navigation }) => (
          <ProtectedScreen screenName="Chat" navigation={navigation}>
            <ChatStack />
          </ProtectedScreen>
        )}
      </Tab.Screen>
      <Tab.Screen name="Tài khoản">
        {({ navigation }) => (
          <ProtectedScreen screenName="Tài khoản" navigation={navigation}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="AccountMain">
                {() => <AccountScreen onLogout={logout} />}
              </Stack.Screen>
              <Stack.Screen name="TopUp" component={TopUpScreen} />
            </Stack.Navigator>
          </ProtectedScreen>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AppContent />
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

