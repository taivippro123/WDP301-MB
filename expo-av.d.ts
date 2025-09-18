declare module 'expo-av' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export type AVPlaybackStatus = any;

  export interface VideoProps extends ViewProps {
    source: { uri: string } | number;
    resizeMode?: any;
    shouldPlay?: boolean;
    isMuted?: boolean;
    isLooping?: boolean;
    useNativeControls?: boolean;
    usePoster?: boolean;
    posterSource?: { uri: string } | number;
    playsInSilentModeIOS?: boolean;
    onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
    onLoadStart?: () => void;
    onLoad?: () => void;
    onError?: (error: any) => void;
  }

  export class Video extends React.Component<VideoProps> {}
}

