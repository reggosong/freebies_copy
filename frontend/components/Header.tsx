import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  title: string;
  showBack?: boolean;
  showSettings?: boolean;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
};

export default function Header({ title, showBack = false, showSettings = false, leftAction, rightAction }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {leftAction}
        {showBack && !leftAction && (
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
        )}
      </View>
      
      <Text variant="headlineSmall" style={styles.title}>{title}</Text>
      
      <View style={styles.rightContainer}>
        {rightAction}
        {showSettings && !rightAction && (
          <IconButton
            icon="cog"
            size={24}
            onPress={() => navigation.navigate('Settings')}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  leftContainer: {
    width: 48,
    alignItems: 'center',
  },
  rightContainer: {
    width: 48,
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
}); 