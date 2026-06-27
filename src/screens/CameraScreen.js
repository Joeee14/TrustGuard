import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Icon from '../components/Icon';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      scanLineAnim.setValue(0);
    }
  }, [scanning]);

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 268],
  });

  async function handleShutter() {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      navigation.replace('PhotoResult', { imageUri: photo.uri });
    } catch {
      setScanning(false);
      Alert.alert('Error', 'Could not capture photo. Please try again.');
    }
  }

  async function handlePickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload a product image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      navigation.replace('PhotoResult', { imageUri: result.assets[0].uri });
    }
  }

  if (!permission) {
    return (
      <View style={[styles.permContainer, { backgroundColor: '#0A1726' }]}>
        <Text style={styles.permText}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.permContainer, { backgroundColor: '#0A1726' }]} edges={['top', 'bottom']}>
        <Icon name="camera" size={48} color="rgba(255,253,246,0.5)" strokeWidth={1.5} />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permSubtitle}>
          Trust Guard uses your camera to scan product labels and find trusted sellers.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.permBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.permBtnText}>Allow Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.permBackBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.permBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />

      {/* Dark overlay tint */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.camIconBtn}
          activeOpacity={0.7}
        >
          <Icon name="close" size={20} color="#ECE3CC" strokeWidth={2.2} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.flashBtn} activeOpacity={0.7}>
          <Icon name="bolt" size={12} color="#ECE3CC" />
          <Text style={styles.flashText}>Off</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePickFromGallery}
          style={styles.camIconBtn}
          activeOpacity={0.7}
        >
          <Icon name="image" size={18} color="#ECE3CC" strokeWidth={2} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Scan frame */}
      <View style={styles.frameContainer} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          {scanning && (
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanLineTranslate }] },
              ]}
            />
          )}
        </View>
      </View>

      {/* Bottom controls */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Text style={styles.hintTitle}>
          {scanning ? 'Identifying product…' : 'Frame the product clearly'}
        </Text>
        <Text style={styles.hintSub}>
          {scanning
            ? "We'll find trusted sellers in Egypt."
            : 'Center it inside the box, then tap the shutter.'}
        </Text>
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={handlePickFromGallery}
            style={styles.sideBtn}
            activeOpacity={0.7}
          >
            <Icon name="image" size={22} color="#FFFDF6" strokeWidth={1.8} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShutter}
            style={styles.shutter}
            activeOpacity={0.85}
            disabled={scanning}
          >
            <View style={[styles.shutterInner, scanning && styles.shutterScanning]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideBtn} activeOpacity={0.7}>
            <Icon name="refresh" size={20} color="#FFFDF6" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const CORNER_SIZE = 32;
const CORNER_BORDER = 3;
const FRAME_SIZE = 280;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06101C' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,16,28,0.45)',
  },
  permContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permTitle: {
    color: '#FFFDF6',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  permSubtitle: {
    color: 'rgba(255,253,246,0.65)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  permText: { color: 'rgba(255,253,246,0.65)', fontSize: 15 },
  permBtn: {
    backgroundColor: '#7AB1E6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 8,
  },
  permBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  permBackBtn: { marginTop: 4 },
  permBackText: { color: 'rgba(255,253,246,0.5)', fontSize: 14 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  camIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  flashText: { color: '#ECE3CC', fontSize: 12, fontWeight: '600' },
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#ECE3CC',
    borderWidth: CORNER_BORDER,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 3,
    backgroundColor: '#3FA9E8',
    borderRadius: 2,
    shadowColor: '#3FA9E8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomBar: {
    paddingHorizontal: 30,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 6,
  },
  hintTitle: {
    color: '#FFFDF6',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  hintSub: {
    color: 'rgba(255,253,246,0.7)',
    fontSize: 13,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 8,
    paddingBottom: 16,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,253,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: 'rgba(255,253,246,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  shutterScanning: {
    backgroundColor: '#3FA9E8',
    transform: [{ scale: 0.7 }],
  },
});
