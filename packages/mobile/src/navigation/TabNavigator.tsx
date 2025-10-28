import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TaskListScreen } from '../screens/TaskListScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle:  { backgroundColor: '#4F46E5' },
        headerTintColor: '#FFF',
        tabBarActiveTintColor: '#4F46E5',
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tasks"     component={TaskListScreen}  />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    </Tab.Navigator>
  );
}
