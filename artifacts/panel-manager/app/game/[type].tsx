import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, Alert,
  ActivityIndicator, Platform, Animated, ScrollView, Easing,
  PanResponder,
} from "react-native";
import Svg, { Path, Circle, Text as SvgText, G } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useAd } from "@/context/AdContext";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import * as Haptics from "expo-haptics";

function authHeader(userId: number) {
  return { "x-user-id": String(userId) };
}

const GAME_CONFIG: Record<string, { title: string; desc: string; gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap }> = {
  spin_wheel: { title: "Spin Wheel", desc: "Spin to win TK!", gradient: ["#E2136E", "#9b0a48"], icon: "refresh-circle" },
  scratch_card: { title: "Scratch Card", desc: "Scratch to reveal prize!", gradient: ["#8b5cf6", "#5b21b6"], icon: "card" },
  spin_split: { title: "Spin & Split", desc: "Football prize spin!", gradient: ["#f59e0b", "#b45309"], icon: "disc" },
  lucky_spin: { title: "Lucky Spin 3X", desc: "Match 3 to win big!", gradient: ["#10b981", "#065f46"], icon: "star" },
  fun_quiz: { title: "Fun Quiz", desc: "Test your knowledge!", gradient: ["#3b82f6", "#1d4ed8"], icon: "help-circle" },
};

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  category: string;
};

const LUCKY_SYMBOLS = ["🍎","🍊","🍋","🍇","🍓","🌸","🌺","🦁","🐯","🐸"];
const SEGMENT_COLORS = ["#E2136E","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#0ea5e9","#14b8a6","#f97316","#06b6d4","#84cc16","#ec4899"];

interface Prize { amount: number; pct: number; }

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polarToXY(cx, cy, r, startAngle);
  const e = polarToXY(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M${cx},${cy} L${s.x.toFixed(2)},${s.y.toFixed(2)} A${r},${r},0,${large},1,${e.x.toFixed(2)},${e.y.toFixed(2)} Z`;
}

const WHEEL_SIZE = 280;
const WHEEL_R = WHEEL_SIZE / 2;
const CX = WHEEL_R;
const CY = WHEEL_R;

function SpinWheelSvg({ prizes, spinAnim, isFootball }: { prizes: Prize[]; spinAnim: Animated.Value; isFootball: boolean }) {
  const N = prizes.length;
  const sliceAngle = 360 / N;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
    extrapolate: "extend",
  });

  return (
    <View style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, alignSelf: "center" }}>
      <Animated.View style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, transform: [{ rotate: spin }] }}>
        <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
          {prizes.map((prize, i) => {
            const startAngle = i * sliceAngle;
            const endAngle = (i + 1) * sliceAngle;
            const midAngle = (startAngle + endAngle) / 2;
            const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
            const labelPos = polarToXY(CX, CY, WHEEL_R * 0.62, midAngle);
            const label2Pos = polarToXY(CX, CY, WHEEL_R * 0.40, midAngle);
            return (
              <G key={i}>
                <Path d={slicePath(CX, CY, WHEEL_R - 2, startAngle, endAngle)} fill={color} stroke="#fff" strokeWidth={2} />
                {isFootball ? (
                  <SvgText
                    x={labelPos.x} y={labelPos.y}
                    textAnchor="middle" alignmentBaseline="middle"
                    fontSize={13} fill="#fff" fontWeight="bold"
                  >
                    ⚽
                  </SvgText>
                ) : null}
                <SvgText
                  x={isFootball ? label2Pos.x : labelPos.x}
                  y={isFootball ? label2Pos.y : labelPos.y}
                  textAnchor="middle" alignmentBaseline="middle"
                  fontSize={N > 8 ? 9 : 11} fill="#fff" fontWeight="bold"
                >
                  {prize.amount >= 1 ? `${prize.amount}TK` : `${prize.amount}TK`}
                </SvgText>
              </G>
            );
          })}
          <Circle cx={CX} cy={CY} r={22} fill="#fff" stroke="#ddd" strokeWidth={2} />
          <SvgText x={CX} y={CY} textAnchor="middle" alignmentBaseline="middle" fontSize={14} fontWeight="bold" fill={Colors.primary}>
            {isFootball ? "⚽" : "🎯"}
          </SvgText>
        </Svg>
      </Animated.View>
    </View>
  );
}

const GRID = 6;
const CARD_SIZE = 240;

function ScratchCardGame({ prize, onScratched, scratching }: { prize: number; onScratched: () => void; scratching: boolean }) {
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const cardRef = useRef({ x: 0, y: 0, width: CARD_SIZE, height: CARD_SIZE });
  const completedRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !completedRef.current,
      onMoveShouldSetPanResponder: () => !completedRef.current,
      onPanResponderGrant: (evt) => revealAt(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
      onPanResponderMove: (evt) => revealAt(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
    })
  ).current;

  function revealAt(pageX: number, pageY: number) {
    const relX = pageX - cardRef.current.x;
    const relY = pageY - cardRef.current.y;
    const cellX = Math.floor((relX / cardRef.current.width) * GRID);
    const cellY = Math.floor((relY / cardRef.current.height) * GRID);
    if (cellX < 0 || cellX >= GRID || cellY < 0 || cellY >= GRID) return;
    const key = `${cellX}-${cellY}`;
    setRevealedCells(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      if (!completedRef.current && next.size >= Math.floor(GRID * GRID * 0.55)) {
        completedRef.current = true;
        setDone(true);
        setTimeout(onScratched, 300);
      }
      return next;
    });
  }

  const coveragePercent = Math.round((revealedCells.size / (GRID * GRID)) * 100);

  return (
    <View style={styles.scratchWrapper}>
      <Text style={styles.scratchTitle}>🎴 Scratch the Card!</Text>
      <Text style={styles.scratchHintText}>Use your finger to scratch</Text>

      <View
        style={styles.scratchCardOuter}
        onLayout={e => {
          e.target.measure((_x, _y, w, h, px, py) => {
            cardRef.current = { x: px, y: py, width: w || CARD_SIZE, height: h || CARD_SIZE };
          });
        }}
        {...panResponder.panHandlers}
      >
        <LinearGradient colors={["#ffd700", "#ffb300"]} style={styles.scratchPrizeLayer}>
          <Text style={styles.scratchPrizeText}>🎉</Text>
          <Text style={styles.scratchPrizeAmount}>{prize > 0 ? `${prize.toFixed(2)} TK` : "???"}</Text>
          <Text style={styles.scratchPrizeLabel}>You Win!</Text>
        </LinearGradient>

        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: GRID }, (_, row) =>
            Array.from({ length: GRID }, (_, col) => {
              const key = `${col}-${row}`;
              if (revealedCells.has(key) || done) return null;
              const cellW = CARD_SIZE / GRID;
              const cellH = CARD_SIZE / GRID;
              return (
                <View
                  key={key}
                  style={{
                    position: "absolute",
                    left: col * cellW,
                    top: row * cellH,
                    width: cellW,
                    height: cellH,
                    backgroundColor: col % 2 === row % 2 ? "#9E9E9E" : "#B0B0B0",
                    borderWidth: 0.5,
                    borderColor: "#888",
                  }}
                />
              );
            })
          )}
        </View>

        {!done && (
          <View style={styles.scratchOverlayIcon} pointerEvents="none">
            <Text style={{ fontSize: 36 }}>🤞</Text>
            <Text style={{ color: "#555", fontSize: 12, marginTop: 4, fontFamily: "Inter_500Medium" }}>
              Scratch here!
            </Text>
          </View>
        )}
      </View>

      {!done && (
        <View style={styles.scratchProgress}>
          <View style={[styles.scratchBar, { width: `${Math.min(coveragePercent, 100)}%` }]} />
          <Text style={styles.scratchPct}>{coveragePercent}% scratched</Text>
        </View>
      )}

      {scratching && (
        <View style={styles.scratchLoading}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.scratchLoadingText}>Revealing prize...</Text>
        </View>
      )}
    </View>
  );
}

const REEL_H = 80;
const REEL_VISIBLE = 3;
const REEL_EXTRA = 12;

function LuckyReels({ winSymbols, onDone = () => {} }: { winSymbols: string[]; onDone?: () => void }) {
  const extSymbols = [...Array(REEL_EXTRA)].flatMap(() => LUCKY_SYMBOLS);
  const reelAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const [stopped, setStopped] = useState(false);
  const animated = useRef(false);

  useEffect(() => {
    if (winSymbols.length !== 3 || animated.current) return;
    animated.current = true;
    setStopped(false);
    let doneCount = 0;

    reelAnims.forEach((anim, i) => {
      const finalIdx = extSymbols.lastIndexOf(winSymbols[i]);
      const centerOffset = Math.floor(REEL_VISIBLE / 2) * REEL_H;
      const targetY = -(finalIdx * REEL_H) + centerOffset;
      const startY = targetY + LUCKY_SYMBOLS.length * 6 * REEL_H;
      anim.setValue(startY);
      Animated.timing(anim, {
        toValue: targetY,
        duration: 2200 + i * 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
        delay: i * 250,
      }).start(() => {
        doneCount++;
        if (doneCount === 3) {
          setStopped(true);
          onDone();
        }
      });
    });
  }, [winSymbols.join(",")]);

  useEffect(() => {
    animated.current = false;
    reelAnims.forEach(a => a.setValue(0));
    setStopped(false);
  }, []);

  const isMatch = stopped && winSymbols.length === 3 &&
    winSymbols[0] === winSymbols[1] && winSymbols[1] === winSymbols[2];

  return (
    <View style={{ alignItems: "center" }}>
      <View style={styles.reelsContainer}>
        {reelAnims.map((anim, reelIdx) => (
          <View key={reelIdx} style={styles.reelWindow}>
            <Animated.View style={{ transform: [{ translateY: anim }] }}>
              {extSymbols.map((sym, j) => (
                <View key={j} style={styles.reelCell}>
                  <Text style={styles.reelEmoji}>{sym}</Text>
                </View>
              ))}
            </Animated.View>
          </View>
        ))}
      </View>

      {stopped && (
        <View style={[styles.reelResult, { backgroundColor: isMatch ? Colors.success + "20" : Colors.warning + "20" }]}>
          <Text style={[styles.reelResultText, { color: isMatch ? Colors.success : Colors.warning }]}>
            {isMatch ? "🎉 JACKPOT! 3 Matching!" : "✨ 3 Different — Small Win!"}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function GameScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { user, refreshUser } = useAuth();
  const { showAd } = useAd();
  const insets = useSafeAreaInsets();
  const uid = user?.id ?? 0;
  const game = GAME_CONFIG[type ?? "spin_wheel"];

  const [status, setStatus] = useState<"idle" | "playing" | "done" | "watching_ad">("idle");
  const [reward, setReward] = useState(0);
  const [adWatched, setAdWatched] = useState(false);
  const [todayPlays, setTodayPlays] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [quizCorrect, setQuizCorrect] = useState<boolean | null>(null);
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(null);
  const [quizNumber, setQuizNumber] = useState(0);
  const [quizTotal, setQuizTotal] = useState(15);
  const [quizStartedAt, setQuizStartedAt] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);
  const [scratchPrize, setScratchPrize] = useState(0);
  const [scratchDone, setScratchDone] = useState(false);
  const [winSegment, setWinSegment] = useState(-1);
  const [luckySymbols, setLuckySymbols] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [prizes, setPrizes] = useState<Prize[]>([]);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const rewardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    showAd("game");
    loadGameStatus();
    loadPrizes();
  }, []);

  async function loadPrizes() {
    try {
      const res = await fetch(`${getApiUrl()}api/settings/public`);
      const s = await res.json();
      let key = "spin_wheel_prizes";
      if (type === "spin_split") key = "spin_split_prizes";
      if (type === "scratch_card") key = "scratch_prizes";
      const p: Prize[] = JSON.parse(s[key] || "[]");
      if (p.length > 0) setPrizes(p);
      else {
        if (type === "scratch_card") {
          setPrizes([{amount:0.1,pct:30},{amount:0.2,pct:25},{amount:0.5,pct:20},{amount:1.0,pct:15},{amount:2.0,pct:8},{amount:3.0,pct:2}]);
        } else {
          setPrizes([{amount:0.1,pct:25},{amount:0.2,pct:20},{amount:0.5,pct:20},{amount:1.0,pct:15},{amount:1.5,pct:10},{amount:2.0,pct:6},{amount:2.5,pct:3},{amount:3.0,pct:1}]);
        }
      }
    } catch {
      setPrizes([{amount:0.1,pct:25},{amount:0.5,pct:30},{amount:1.0,pct:25},{amount:2.0,pct:15},{amount:3.0,pct:5}]);
    }
  }

  async function loadGameStatus() {
    try {
      const res = await fetch(`${getApiUrl()}api/games/status?gameType=${type}`, {
        headers: authHeader(uid),
      });
      const data = await res.json();
      setTodayPlays(data.todayPlays ?? 0);
      if (type === "fun_quiz") {
        setQuizTotal(data.questionsPerPlay ?? 15);
      }
    } catch {}
  }

  async function startQuiz() {
    setQuizLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}api/games/quiz/start`, {
        method: "POST",
        headers: { ...authHeader(uid), "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuizSessionId(data.sessionId);
      setQuizQuestion(data.question);
      setQuizNumber(data.questionNumber);
      setQuizTotal(data.totalQuestions);
      setQuizStartedAt(Date.now());
      setSelectedOpt(null);
      setQuizCorrect(null);
    } catch (error) {
      Alert.alert("Quiz unavailable", (error as Error).message);
    } finally {
      setQuizLoading(false);
    }
  }

  async function submitPlay(useAdFlag = false) {
    try {
      const res = await fetch(`${getApiUrl()}api/games/play`, {
        method: "POST",
        headers: { ...authHeader(uid), "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: type, usedAd: useAdFlag }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requireAd) {
          setStatus("idle");
          setSpinning(false);
          Alert.alert("Watch Ad", "Watch an ad to play again!", [
            { text: "Cancel", style: "cancel" },
            { text: "Watch Ad", onPress: watchAdAndPlay },
          ]);
          return;
        }
        throw new Error(data.error);
      }
      return data;
    } catch (err: unknown) {
      setStatus("idle");
      setSpinning(false);
      Alert.alert("Error", (err as Error).message);
      return null;
    }
  }

  async function playSpinWheel(useAdFlag = false) {
    setStatus("playing");
    setSpinning(true);
    setWinSegment(-1);
    const N = prizes.length;
    const sliceAngle = N > 0 ? 360 / N : 45;

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 5,
      duration: 500,
      useNativeDriver: Platform.OS !== "web",
      easing: Easing.linear,
    }).start(async () => {
      const data = await submitPlay(useAdFlag);
      if (!data) return;
      const segIdx = data.segmentIndex ?? 0;
      const targetAngle = 5 * 360 + (360 - (segIdx + 0.5) * sliceAngle);
      spinAnim.stopAnimation();
      Animated.timing(spinAnim, {
        toValue: targetAngle / 360,
        duration: 3000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start(() => {
        spinAnim.setValue((targetAngle / 360) % 1);
        setWinSegment(segIdx);
        setReward(data.reward);
        setTodayPlays(data.playsUsed);
        setSpinning(false);
        setStatus("done");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.spring(rewardAnim, { toValue: 1, useNativeDriver: Platform.OS !== "web", tension: 50 }).start();
        refreshUser();
      });
    });
  }

  async function playScratch(useAdFlag = false) {
    setStatus("playing");
    const data = await submitPlay(useAdFlag);
    if (!data) return;
    setScratchPrize(data.reward);
    setReward(data.reward);
    setTodayPlays(data.playsUsed);
    setStatus("idle");
  }

  async function playLuckySpin(useAdFlag = false) {
    setStatus("playing");
    setSpinning(true);
    setLuckySymbols([]);
    const data = await submitPlay(useAdFlag);
    if (!data) return;
    setReward(data.reward);
    setTodayPlays(data.playsUsed);
    setLuckySymbols(data.symbols ?? []);
    // status is set to "done" via the LuckyReels onDone callback when animations finish
  }

  function playGame(useAdFlag = false) {
    if (type === "scratch_card") {
      playScratch(useAdFlag);
    } else if (type === "lucky_spin") {
      playLuckySpin(useAdFlag);
    } else {
      playSpinWheel(useAdFlag);
    }
  }

  async function watchAdAndPlay() {
    setStatus("watching_ad");
    await new Promise(r => setTimeout(r, 3000));
    setAdWatched(true);
    setStatus("idle");
    await playGame(true);
  }

  function resetGame() {
    setStatus("idle");
    setReward(0);
    setSelectedOpt(null);
    setQuizCorrect(null);
    setQuizSessionId(null);
    setQuizQuestion(null);
    setQuizNumber(0);
    setQuizStartedAt(0);
    setScratchPrize(0);
    setScratchDone(false);
    setWinSegment(-1);
    setLuckySymbols([]);
    setSpinning(false);
    rewardAnim.setValue(0);
    spinAnim.setValue(0);
  }

  async function handleQuizAnswer(optIdx: number) {
    setSelectedOpt(optIdx);
    if (!quizSessionId || !quizQuestion) return;
    setQuizLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}api/games/quiz/answer`, {
        method: "POST",
        headers: { ...authHeader(uid), "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: quizSessionId, answer: optIdx, elapsedMs: Date.now() - quizStartedAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuizCorrect(data.correct);
      Haptics.notificationAsync(data.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      if (data.complete) {
        setReward(data.reward);
        setTodayPlays(1);
        setStatus("done");
        Animated.spring(rewardAnim, { toValue: 1, useNativeDriver: Platform.OS !== "web", tension: 50 }).start();
        refreshUser();
      } else {
        setQuizQuestion(data.next);
        setQuizNumber(data.questionNumber);
        setQuizStartedAt(Date.now());
        setSelectedOpt(null);
        setQuizCorrect(null);
      }
    } catch (error) {
      Alert.alert("Quiz error", (error as Error).message);
    } finally {
      setQuizLoading(false);
    }
  }

  if (!game) return null;

  const isSpinType = type === "spin_wheel" || type === "spin_split";
  const isFootball = type === "spin_split";
  const minPrize = prizes.length > 0 ? Math.min(...prizes.map(p => p.amount)) : 0.1;
  const maxPrize = prizes.length > 0 ? Math.max(...prizes.map(p => p.amount)) : 3;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={game.gradient}
        style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text style={styles.gameSub}>{game.desc}</Text>
          </View>
          <View style={styles.playsBadge}>
            <Ionicons name="play" size={12} color="#fff" />
            <Text style={styles.playsText}>{todayPlays} played</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {status === "done" ? (
          <Animated.View style={[styles.resultCard, {
            transform: [{ scale: rewardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            opacity: rewardAnim,
          }]}>
            <LinearGradient colors={game.gradient} style={styles.resultGradient}>
              <Ionicons name="trophy" size={60} color="#FFD700" />
              <Text style={styles.resultTitle}>You Won!</Text>
              <Text style={styles.resultReward}>+{reward.toFixed(2)} TK</Text>
              <Text style={styles.resultSub}>Added to your balance</Text>
              <View style={styles.resultBtns}>
                <Pressable style={styles.resultBtnPrimary} onPress={resetGame}>
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.resultBtnText}>Play Again</Text>
                </Pressable>
                <Pressable style={styles.resultBtnSecondary} onPress={() => router.back()}>
                  <Text style={styles.resultBtnSecText}>Back to Games</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </Animated.View>
        ) : type === "fun_quiz" && status !== "watching_ad" ? (
          <View style={styles.quizCard}>
            {quizQuestion ? (
              <>
                <View style={styles.quizHeader}>
                  <Ionicons name="help-circle" size={32} color="#3b82f6" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quizTitle}>Fun Quiz</Text>
                    <Text style={styles.quizProgress}>Question {quizNumber} of {quizTotal} · Each answer gets less reward when you wait</Text>
                  </View>
                </View>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, (quizNumber / quizTotal) * 100)}%` }]} /></View>
                <Text style={styles.quizCategory}>{quizQuestion.category}</Text>
                <Text style={styles.questionText}>{quizQuestion.question}</Text>
                {quizQuestion.options.map((opt, i) => (
                  <Pressable
                    key={i}
                    style={[styles.optionBtn, selectedOpt === i && quizCorrect && styles.optionCorrect, selectedOpt === i && quizCorrect === false && styles.optionWrong]}
                    onPress={() => selectedOpt === null && !quizLoading && handleQuizAnswer(i)}
                    disabled={selectedOpt !== null || quizLoading}
                  >
                    <Text style={[styles.optionText, selectedOpt === i && { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>{opt}</Text>
                  </Pressable>
                ))}
                {quizLoading && <ActivityIndicator color="#3b82f6" style={{ marginTop: 8 }} />}
              </>
            ) : (
              <>
                <Ionicons name="school" size={46} color="#3b82f6" style={{ alignSelf: "center", marginBottom: 10 }} />
                <Text style={styles.quizTitle}>Daily Fun Quiz</Text>
                <Text style={styles.quizIntro}>Every play contains {quizTotal} different general-knowledge questions. Users receive a different daily set, and faster answers earn more.</Text>
                <Pressable style={[styles.playBtn, { backgroundColor: "#3b82f6" }]} onPress={startQuiz} disabled={quizLoading || todayPlays > 0}>
                  {quizLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.playBtnText}>{todayPlays > 0 ? "Completed Today" : "Start Today's Quiz"}</Text>}
                </Pressable>
              </>
            )}
          </View>
        ) : type === "scratch_card" && status !== "watching_ad" ? (
          <View>
            {scratchDone ? (
              <View style={styles.scratchDoneCard}>
                <LinearGradient colors={["#ffd700", "#ff9500"]} style={styles.scratchDoneGradient}>
                  <Text style={{ fontSize: 60 }}>🎉</Text>
                  <Text style={styles.scratchDoneTitle}>You Won!</Text>
                  <Text style={styles.scratchDoneAmount}>+{scratchPrize.toFixed(2)} TK</Text>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", fontSize: 13 }}>Added to balance!</Text>
                  <View style={styles.resultBtns}>
                    <Pressable style={[styles.resultBtnPrimary, {backgroundColor:"rgba(255,255,255,0.3)"}]} onPress={resetGame}>
                      <Ionicons name="refresh" size={18} color="#fff" />
                      <Text style={styles.resultBtnText}>Play Again</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </View>
            ) : (
              <ScratchCardGame
                prize={scratchPrize}
                scratching={status === "playing"}
                onScratched={async () => {
                  if (scratchPrize === 0) {
                    await playScratch(adWatched);
                  }
                  setScratchDone(true);
                  setStatus("done");
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  refreshUser();
                }}
              />
            )}
          </View>
        ) : (
          <View style={{ alignItems: "center" }}>
            {status === "watching_ad" ? (
              <View style={styles.adLoadingBox}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.adLoadingText}>Loading rewarded ad...</Text>
                <Text style={styles.adLoadingHint}>Please wait</Text>
              </View>
            ) : (
              <>
                {isSpinType && prizes.length > 0 && (
                  <View style={{ alignItems: "center", marginBottom: 20 }}>
                    <View style={styles.pointerWrapper}>
                      <Text style={styles.pointerArrow}>▼</Text>
                    </View>
                    <SpinWheelSvg prizes={prizes} spinAnim={spinAnim} isFootball={isFootball} />
                    <Text style={styles.prizeRangeText}>
                      {isFootball ? "⚽ " : "🎯 "}{minPrize} TK — {maxPrize} TK
                    </Text>
                  </View>
                )}

                {type === "lucky_spin" && (
                  <View style={{ alignItems: "center", marginBottom: 20 }}>
                    <Text style={styles.luckyTitle}>🎰 Match 3 Symbols to Win Big!</Text>
                    <LuckyReels
                      winSymbols={luckySymbols}
                      onDone={() => {
                        setStatus("done");
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Animated.spring(rewardAnim, { toValue: 1, useNativeDriver: Platform.OS !== "web", tension: 50 }).start();
                        refreshUser();
                      }}
                    />
                    <View style={styles.luckyInfo}>
                      <Text style={styles.luckyInfoText}>🎯 3 Same = Big Prize!</Text>
                      <Text style={styles.luckyInfoText}>✨ 3 Different = Small Prize</Text>
                    </View>
                  </View>
                )}

                {type === "scratch_card" && prizes.length > 0 && (
                  <View style={styles.scratchPrizeHint}>
                    <Text style={styles.scratchPrizeHintTitle}>Possible Prizes:</Text>
                    <View style={styles.scratchPrizeGrid}>
                      {prizes.map((p, i) => (
                        <View key={i} style={[styles.scratchPrizeChip, { backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] + "25", borderColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }]}>
                          <Text style={[styles.scratchPrizeChipText, { color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }]}>
                            {p.amount} TK
                          </Text>
                          <Text style={styles.scratchPrizePct}>{p.pct}%</Text>
                        </View>
                      ))}
                    </View>
                    <Pressable
                      style={[styles.playBtn, { backgroundColor: game.gradient[0] }]}
                      onPress={() => { if (status === "idle") { setScratchPrize(0); setScratchDone(false); playGame(adWatched); } }}
                      disabled={status === "playing"}
                    >
                      {status === "playing" ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="card" size={22} color="#fff" />
                          <Text style={styles.playBtnText}>Get New Card!</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                )}

                {(isSpinType || type === "lucky_spin") && (
                  <View style={{ width: "100%", alignItems: "center" }}>
                    <Pressable
                      style={[styles.playBtn, { backgroundColor: game.gradient[0] }]}
                      onPress={() => status === "idle" && playGame(adWatched)}
                      disabled={status === "playing"}
                    >
                      {status === "playing" ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="play" size={22} color="#fff" />
                          <Text style={styles.playBtnText}>
                            {type === "lucky_spin" ? "Spin Reels!" : "Spin Now!"}
                          </Text>
                        </>
                      )}
                    </Pressable>

                    {todayPlays >= 1 && !adWatched && (
                      <Pressable style={styles.adPlayBtn} onPress={watchAdAndPlay}>
                        <Ionicons name="play-circle" size={18} color={Colors.primary} />
                        <Text style={styles.adPlayBtnText}>Watch Ad for Extra Play</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {prizes.length > 0 && status !== "done" && (isSpinType || type === "lucky_spin") && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="trophy-outline" size={18} color={Colors.warning} />
              <Text style={styles.infoText}>
                {isFootball ? `⚽ Win ${minPrize} – ${maxPrize} TK` : `Win ${minPrize} – ${maxPrize} TK per spin`}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="play-outline" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>1 free play + 1 extra play with ad per day</Text>
            </View>
            {type === "lucky_spin" && (
              <View style={styles.infoRow}>
                <Ionicons name="star-outline" size={18} color={Colors.success} />
                <Text style={styles.infoText}>3 Matching symbols = Jackpot!</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 30, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  gameTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  gameSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)" },
  playsBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 50,
  },
  playsText: { fontFamily: "Inter_500Medium", fontSize: 11, color: "#fff" },
  content: { paddingHorizontal: 16, paddingTop: 16 },

  pointerWrapper: { alignItems: "center", marginBottom: -4, zIndex: 10 },
  pointerArrow: { fontSize: 28, color: Colors.text, lineHeight: 28 },
  prizeRangeText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, marginTop: 12, textAlign: "center" },

  resultCard: { borderRadius: 24, overflow: "hidden", marginBottom: 20 },
  resultGradient: { padding: 40, alignItems: "center" },
  resultTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: "#fff", marginTop: 16 },
  resultReward: { fontFamily: "Inter_700Bold", fontSize: 48, color: "#FFD700", marginVertical: 8 },
  resultSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 24 },
  resultBtns: { flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" },
  resultBtnPrimary: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 50,
  },
  resultBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  resultBtnSecondary: { backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 50 },
  resultBtnSecText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },

  playBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 16, paddingHorizontal: 48, borderRadius: 60,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
    marginBottom: 16, width: "100%",
  },
  playBtnText: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  adPlayBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 50,
  },
  adPlayBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.primary },

  quizCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  quizHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  quizTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  quizProgress: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 3, lineHeight: 16 },
  quizCategory: { alignSelf: "flex-start", backgroundColor: "#3b82f615", color: "#2563eb", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, overflow: "hidden", fontFamily: "Inter_600SemiBold", fontSize: 11, marginBottom: 10 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: "#e5e7eb", overflow: "hidden", marginBottom: 14 },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: "#3b82f6" },
  quizIntro: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, color: Colors.textMuted, textAlign: "center", marginVertical: 14 },
  questionText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text, lineHeight: 24, marginBottom: 20 },
  optionBtn: {
    backgroundColor: "#F8F8F8", borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  optionCorrect: { backgroundColor: Colors.success, borderColor: Colors.success },
  optionWrong: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  optionText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },

  scratchWrapper: { backgroundColor: "#fff", borderRadius: 20, padding: 20, alignItems: "center", marginBottom: 20 },
  scratchTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text, marginBottom: 4 },
  scratchHintText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, marginBottom: 16 },
  scratchCardOuter: {
    width: CARD_SIZE, height: CARD_SIZE, borderRadius: 20, overflow: "hidden",
    borderWidth: 3, borderColor: "#ddd",
  },
  scratchPrizeLayer: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  scratchPrizeText: { fontSize: 40, marginBottom: 8 },
  scratchPrizeAmount: { fontFamily: "Inter_700Bold", fontSize: 32, color: "#fff" },
  scratchPrizeLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.9)" },
  scratchOverlayIcon: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  scratchProgress: {
    width: CARD_SIZE, height: 8, backgroundColor: "#eee", borderRadius: 4,
    marginTop: 12, overflow: "hidden",
  },
  scratchBar: { height: "100%", backgroundColor: Colors.success, borderRadius: 4 },
  scratchPct: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  scratchLoading: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  scratchLoadingText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.primary },

  scratchDoneCard: { borderRadius: 24, overflow: "hidden", marginBottom: 20 },
  scratchDoneGradient: { padding: 40, alignItems: "center" },
  scratchDoneTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: "#fff", marginTop: 8 },
  scratchDoneAmount: { fontFamily: "Inter_700Bold", fontSize: 48, color: "#fff", marginVertical: 8 },

  scratchPrizeHint: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 20, width: "100%" },
  scratchPrizeHintTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 12 },
  scratchPrizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  scratchPrizeChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
    alignItems: "center",
  },
  scratchPrizeChipText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  scratchPrizePct: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },

  reelsContainer: { flexDirection: "row", gap: 12, alignSelf: "center", marginBottom: 12 },
  reelWindow: {
    width: 80, height: REEL_H * REEL_VISIBLE, overflow: "hidden",
    borderRadius: 16, backgroundColor: "#1e293b",
    borderWidth: 2.5, borderColor: Colors.success,
  },
  reelCell: { width: 80, height: REEL_H, alignItems: "center", justifyContent: "center" },
  reelEmoji: { fontSize: 42 },
  reelHighlight: {
    position: "absolute", left: "50%",
    width: 80 * 3 + 12 * 2, height: REEL_H + 6,
    top: "50%",
    marginLeft: -(80 * 3 + 12 * 2) / 2,
    marginTop: -REEL_H / 2 - 3,
    borderWidth: 3, borderColor: Colors.success,
    borderRadius: 12, pointerEvents: "none",
  },
  reelResult: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    alignItems: "center", marginTop: 12,
  },
  reelResultText: { fontFamily: "Inter_700Bold", fontSize: 16 },

  luckyTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 16, textAlign: "center" },
  luckyInfo: { flexDirection: "row", gap: 16, marginTop: 12, flexWrap: "wrap", justifyContent: "center" },
  luckyInfoText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },

  adLoadingBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  adLoadingText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  adLoadingHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },

  infoCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12, marginTop: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, flex: 1 },
});
