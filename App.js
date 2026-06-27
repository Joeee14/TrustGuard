import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './src/context/AppContext';

import HomeScreen from './src/screens/HomeScreen';
import AnalyzingScreen from './src/screens/AnalyzingScreen';
import ResultScreen from './src/screens/ResultScreen';
import CameraScreen from './src/screens/CameraScreen';
import PhotoResultScreen from './src/screens/PhotoResultScreen';
import AlternativeDetailScreen from './src/screens/AlternativeDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { t, themeName } = useApp();

  return (
    <>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: t.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="Analyzing"
            component={AnalyzingScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="Result" component={ResultScreen} />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="PhotoResult" component={PhotoResultScreen} />
          <Stack.Screen name="AlternativeDetail" component={AlternativeDetailScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />

        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
