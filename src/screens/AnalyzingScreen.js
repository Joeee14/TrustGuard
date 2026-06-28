import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { TrustGuardMark } from '../components/TrustGuardLogo';
import Icon from '../components/Icon';
import { analyzeUrl } from '../services/api';
import { SCAN_STEPS } from '../data/scanSteps';
import { cardShadow } from '../theme';

const STEP_DURATION = 480;
const RING_SIZE = 132;
const RING_STROKE = 8;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

function useAnimatedRing(target) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValRef = useRef(0);

  useEffect(() => {
    const from = startValRef.current;
    const to = target;
    startTimeRef.current = null;

    function tick(now) {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / STEP_DURATION, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const current = from + (to - from) * eased;
      setProgress(current);
      startValRef.current = current;
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target]);

  return progress;
}

export default function AnalyzingScreen({ navigation, route }) {
  const { t } = useApp();
  const { url } = route.params;
  const [step, setStep] = useState(0);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  const ringProgress = useAnimatedRing(step / SCAN_STEPS.length);
  const strokeDashoffset = RING_CIRC * (1 - ringProgress);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 450, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    let didCancel = false;
    let currentStep = 0;
    let apiResult = null;
    let apiError = null;
    let apiFinished = false;

    // Trigger API request immediately
    analyzeUrl(url)
      .then((res) => {
        apiResult = res;
        apiFinished = true;
      })
      .catch((err) => {
        apiError = err;
        apiFinished = true;
      });

    async function runAnalysis() {
      // Loop until we pass the last step of the progress indicators
      while (currentStep <= SCAN_STEPS.length) {
        if (didCancel) return;

        // If we reached the final complete state
        if (currentStep === SCAN_STEPS.length) {
          if (apiFinished) {
            if (apiError) {
              console.error('[TrustGuard] Analysis error:', apiError.message);
              if (!didCancel) {
                Alert.alert('Analysis failed', apiError.message, [
                  { text: 'OK', onPress: () => navigation.navigate('Home') },
                ]);
              }
            } else if (apiResult) {
              if (!didCancel) {
                navigation.replace('Result', { result: apiResult });
              }
            }
            return;
          } else {
            // API is still loading. Pause at the second-to-last step (Computing Trust Score...)
            setStep(SCAN_STEPS.length - 1);
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }
        }

        setStep(currentStep);

        // If API is already done, fast-forward through the remaining steps.
        // Otherwise, step slowly (2.2s per step) to align with actual load times.
        const delay = apiFinished ? 150 : 2200;
        await new Promise((r) => setTimeout(r, delay));
        currentStep++;
      }
    }

    runAnalysis();
    return () => {
      didCancel = true;
    };
  }, [url]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={[styles.iconBtn, { backgroundColor: t.surface, ...cardShadow(t) }]}
          activeOpacity={0.7}
        >
          <Icon name="close" size={20} color={t.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.ringSection}>
        <View style={styles.ringWrap}>
          <Svg
            width={RING_SIZE}
            height={RING_SIZE}
            style={{ transform: [{ rotate: '-90deg' }] }}
          >
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={t.brandSoft}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={t.brand}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>
          <View style={StyleSheet.absoluteFillObject}>
            <View style={styles.ringInner}>
              <TrustGuardMark size={56} t={t} />
            </View>
          </View>
        </View>

        <View style={styles.labelBlock}>
          <Text style={[styles.analyzingTitle, { color: t.text }]}>Analyzing…</Text>
          <Text style={[styles.urlText, { color: t.textMuted }]} numberOfLines={2}>
            {url}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.stepsList}
        showsVerticalScrollIndicator={false}
      >
        {SCAN_STEPS.map((s, i) => {
          const isDone = i < step;
          const isActive = i === step;
          const isPending = i > step;

          return (
            <View
              key={i}
              style={[
                styles.stepRow,
                {
                  backgroundColor: isActive ? t.surface : 'transparent',
                  borderColor: isActive ? t.border : 'transparent',
                  opacity: isPending ? 0.5 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: isDone ? t.good : isActive ? t.brand : t.bg2 },
                ]}
              >
                {isDone ? (
                  <Icon name="check" size={14} color="#FFFDF6" strokeWidth={2.4} />
                ) : isActive ? (
                  <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
                ) : (
                  <Icon name={s.icon} size={13} color={t.textDim} strokeWidth={2} />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isPending ? t.textMuted : t.text,
                    fontWeight: isActive ? '600' : '500',
                    flex: 1,
                  },
                ]}
              >
                {s.label}
              </Text>
              {isActive && (
                <Text style={[styles.stepWorking, { color: t.textMuted }]}>Working…</Text>
              )}
              {isDone && <Icon name="check" size={14} color={t.good} strokeWidth={2.4} />}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { paddingHorizontal: 18, paddingTop: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ringSection: { paddingTop: 40, paddingHorizontal: 24, paddingBottom: 16, alignItems: 'center', gap: 18 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE },
  ringInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  labelBlock: { alignItems: 'center', gap: 4 },
  analyzingTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.7 },
  urlText: { fontSize: 13, textAlign: 'center', maxWidth: 280 },
  stepsList: { paddingHorizontal: 18, paddingBottom: 24, gap: 8 },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1,
  },
  stepDot: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFDF6' },
  stepLabel: { fontSize: 14 },
  stepWorking: { fontSize: 11, fontWeight: '500' },
});
