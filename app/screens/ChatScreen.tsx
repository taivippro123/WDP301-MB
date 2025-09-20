// @ts-nocheck
import { useNavigation, useRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import ChatListScreen from './ChatListScreen';

const Stack = createStackNavigator();

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams: any = (route.params as any) || {};
  const initialConversationId = routeParams.conversationId || routeParams?.params?.conversationId;
  const peerName = routeParams.peerName || routeParams?.params?.peerName;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="ChatList" 
        component={ChatListScreen}
        initialParams={{ 
          conversationId: initialConversationId, 
          peerName: peerName 
        }}
      />
    </Stack.Navigator>
  );
}