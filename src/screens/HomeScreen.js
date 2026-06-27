import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { TrustGuardMark, TrustGuardWordmark } from '../components/TrustGuardLogo';
import Icon from '../components/Icon';
import { cardShadow } from '../theme';

export default function HomeScreen({ navigation }) {
  const { t } = useApp();
  const [url, setUrl] = useState('');
  const [focused, setFocused] = useState(false);

  // Clear the input every time Home regains focus (coming back from a
  // result/error) so the user can paste a new link without manually
  // deleting the previous one first.
  useFocusEffect(
    useCallback(() => {
      setUrl('');
    }, []),
  );

  function handleAnalyze() {
    const trimmed = url.trim();
    if (!trimmed) return;
    navigation.navigate('Analyzing', { url: trimmed });
  }

  async function handleUploadImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Trust Guard needs photo library access to analyze product images.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      navigation.navigate('PhotoResult', { imageUri: result.assets[0].uri });
    }
  }

  function handleCamera() {
    navigation.navigate('Camera');
  }

  function handleSettings() {
    navigation.navigate('Settings');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleSettings}
            style={[styles.iconBtn, { backgroundColor: t.surface, ...cardShadow(t) }]}
            activeOpacity={0.7}
          >
            <Icon name="settings" size={20} color={t.text} strokeWidth={1.9} />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <TrustGuardMark size={72} t={t} />
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: t.text }]}>
              Trust<Text style={{ color: t.brand }}>Guard</Text>
            </Text>
            <Text style={[styles.heroSubtitle, { color: t.textMuted }]}>
              Check any product link or scan a photo.{'\n'}We'll tell you if it's worth your trust.
            </Text>
          </View>
        </View>

        {/* URL Input */}
        <View style={styles.inputSection}>
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: t.surface,
                borderColor: focused ? t.brand : t.border,
                shadowColor: t.shadowColor,
                shadowOpacity: focused ? 0.15 : t.shadowOpacity,
                shadowOffset: { width: 0, height: 3 },
                shadowRadius: 12,
                elevation: 4,
              },
            ]}
          >
            <Icon name="link" size={18} color={t.textMuted} />
            <TextInput
              style={[styles.input, { color: t.text }]}
              value={url}
              onChangeText={setUrl}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Paste a product link…"
              placeholderTextColor={t.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleAnalyze}
            />
            <TouchableOpacity
              onPress={handleAnalyze}
              disabled={!url.trim()}
              activeOpacity={0.8}
              style={[
                styles.checkBtn,
                {
                  backgroundColor: url.trim() ? t.brand : t.bg2,
                },
              ]}
            >
              <Text style={[styles.checkBtnText, { color: url.trim() ? '#FFFDF6' : t.textDim }]}>
                Check
              </Text>
              <Icon
                name="arrowRight"
                size={15}
                color={url.trim() ? '#FFFDF6' : t.textDim}
                strokeWidth={2.4}
              />
            </TouchableOpacity>
          </View>

          {!url ? (
            <TouchableOpacity
              onPress={() => setUrl('glowleaf-naturals.shop/products/eco-glow')}
              style={styles.demoBtn}
              activeOpacity={0.6}
            >
              <Icon name="bolt" size={12} color={t.textMuted} />
              <Text style={[styles.demoBtnText, { color: t.textMuted }]}>
                Demo: paste a sample link
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
          <Text style={[styles.dividerText, { color: t.textDim }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
        </View>

        {/* Camera / Upload */}
        <View style={styles.mediaSection}>
          <TouchableOpacity onPress={handleCamera} activeOpacity={0.85} style={styles.scanBtn}>
            <LinearGradient
              colors={[t.brand, t.brandInk]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanBtnGradient}
            >
              <View style={styles.scanBtnIcon}>
                <Icon name="camera" size={22} color="#FFFDF6" strokeWidth={1.9} />
              </View>
              <View style={styles.scanBtnTextBlock}>
                <Text style={styles.scanBtnTitle}>Scan with camera</Text>
                <Text style={styles.scanBtnSub}>We'll find trusted sellers nearby</Text>
              </View>
              <Icon name="chevron" size={18} color="#FFFDF6" strokeWidth={2.2} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleUploadImage}
            activeOpacity={0.85}
            style={[
              styles.uploadBtn,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
                ...cardShadow(t),
              },
            ]}
          >
            <View style={[styles.uploadBtnIcon, { backgroundColor: t.brandSoft }]}>
              <Icon name="image" size={20} color={t.brand} strokeWidth={1.9} />
            </View>
            <View style={styles.scanBtnTextBlock}>
              <Text style={[styles.uploadBtnTitle, { color: t.text }]}>Upload a photo</Text>
              <Text style={[styles.uploadBtnSub, { color: t.textMuted }]}>
                Pick from your gallery
              </Text>
            </View>
            <Icon name="chevron" size={18} color={t.textMuted} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />


        {/* Bottom info card */}
        <View style={styles.infoCardWrap}>
          <View style={[styles.infoCard, { backgroundColor: t.brandSoft, borderColor: t.border }]}>
            <View style={[styles.infoCardIcon, { backgroundColor: t.brand }]}>
              <Icon name="map" size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoCardTitle, { color: t.text }]}>Localized for Egypt</Text>
              <Text style={[styles.infoCardSub, { color: t.textMuted }]}>
                Alternatives match your market — prices in EGP, sellers in country.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
    gap: 16,
  },
  heroText: {
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 34,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  inputSection: {
    paddingHorizontal: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
    minWidth: 0,
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  checkBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  demoBtnText: {
    fontSize: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  mediaSection: {
    paddingHorizontal: 18,
    gap: 10,
  },
  scanBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#11365E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 6,
  },
  scanBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  scanBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,253,246,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnTextBlock: {
    flex: 1,
  },
  scanBtnTitle: {
    color: '#FFFDF6',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  scanBtnSub: {
    color: 'rgba(255,253,246,0.75)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  uploadBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  uploadBtnSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  infoCardWrap: {
    padding: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  infoCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoCardSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
});
