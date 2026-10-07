package com.example.earnwallet.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.earnwallet.data.model.QuizQuestion
import com.example.earnwallet.data.repository.format
import com.example.earnwallet.ui.theme.*
import com.example.earnwallet.ui.viewmodel.EarnViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.cos
import kotlin.math.sin

enum class ActiveGameModal { NONE, SPIN_WHEEL, SCRATCH_CARD, SPIN_SPLIT, LUCKY_SPIN, FUN_QUIZ }

data class GameItem(
    val typeKey: String,
    val title: String,
    val desc: String,
    val icon: ImageVector,
    val gradient: List<Color>,
    val modal: ActiveGameModal
)

@Composable
fun GamesScreen(viewModel: EarnViewModel) {
    var activeModal by remember { mutableStateOf(ActiveGameModal.NONE) }
    val winReward by viewModel.currentGameWinReward.collectAsState()

    val gamesList = listOf(
        GameItem("spin_wheel", "Spin Wheel", "Spin the wheel and win up to 3 TK", Icons.Default.Refresh, listOf(Color(0xFFE2136E), Color(0xFF9B0A48)), ActiveGameModal.SPIN_WHEEL),
        GameItem("scratch_card", "Scratch Card", "Scratch and reveal your prize", Icons.Default.CreditCard, listOf(Color(0xFF8B5CF6), Color(0xFF5B21B6)), ActiveGameModal.SCRATCH_CARD),
        GameItem("spin_split", "Spin & Split Coins", "Football themed prize spin", Icons.Default.SportsSoccer, listOf(Color(0xFFF59E0B), Color(0xFFB45309)), ActiveGameModal.SPIN_SPLIT),
        GameItem("lucky_spin", "Lucky Spin 3X", "Triple match slot reels for jackpot", Icons.Default.Star, listOf(Color(0xFF10B981), Color(0xFF065F46)), ActiveGameModal.LUCKY_SPIN),
        GameItem("fun_quiz", "Fun Quiz", "Answer 15 trivia questions to earn TK", Icons.Default.Help, listOf(Color(0xFF3B82F6), Color(0xFF1D4ED8)), ActiveGameModal.FUN_QUIZ)
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Background),
        contentPadding = PaddingValues(bottom = 100.dp)
    ) {
        // Gradient Header
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color(0xFF8B5CF6), Color(0xFF5B21B6))
                        )
                    )
                    .padding(horizontal = 20.dp, vertical = 24.dp)
            ) {
                Column {
                    Text(
                        text = "Interactive Games",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = Surface
                    )
                    Text(
                        text = "Play daily games and win real instant TK rewards",
                        fontSize = 13.sp,
                        color = Surface.copy(alpha = 0.85f),
                        modifier = Modifier.padding(top = 4.dp, bottom = 10.dp)
                    )
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(Surface.copy(alpha = 0.2f))
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = "1 Free Play + 1 Extra Play with Ad daily",
                            color = Surface,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }

        // Daily Reward Banner
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.EmojiEvents,
                            contentDescription = null,
                            tint = AccentGold,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Daily Game Rewards",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Win 0.10 to 3.00 TK per game",
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(AccentGoldLight)
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = "0.1 - 3 TK",
                            color = Color(0xFFB45309),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // Games List
        items(items = gamesList, key = { it.typeKey }) { game ->
            val playsToday = viewModel.getGamePlaysToday(game.typeKey)

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
                    .clickable {
                        viewModel.clearGameReward()
                        activeModal = game.modal
                    },
                shape = RoundedCornerShape(18.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.horizontalGradient(colors = game.gradient)
                        )
                        .padding(18.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Box(
                                modifier = Modifier
                                    .size(54.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(Surface.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = game.icon,
                                    contentDescription = null,
                                    tint = Surface,
                                    modifier = Modifier.size(30.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Column {
                                Text(
                                    text = game.title,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Surface
                                )
                                Text(
                                    text = game.desc,
                                    fontSize = 12.sp,
                                    color = Surface.copy(alpha = 0.85f)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Played: $playsToday/2 today",
                                    fontSize = 11.sp,
                                    color = Surface.copy(alpha = 0.7f),
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(Surface.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Surface)
                        }
                    }
                }
            }
        }

        // Game Rules Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Game Rules & Guidelines",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    listOf(
                        "Each game offers 1 free play per day",
                        "Watch 1 rewarded video ad to get 1 extra play per game",
                        "Rewards range from 0.10 to 3.00 TK per play",
                        "Referral commissions (10%, 5%, 2.5%) apply to team game earnings"
                    ).forEach { rule ->
                        Row(
                            modifier = Modifier.padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(Primary)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = rule, fontSize = 13.sp, color = TextSecondary)
                        }
                    }
                }
            }
        }
    }

    // Modal Dialogs for Each Game
    when (activeModal) {
        ActiveGameModal.SPIN_WHEEL -> {
            SpinWheelGameDialog(
                viewModel = viewModel,
                isFootball = false,
                onDismiss = { activeModal = ActiveGameModal.NONE }
            )
        }
        ActiveGameModal.SPIN_SPLIT -> {
            SpinWheelGameDialog(
                viewModel = viewModel,
                isFootball = true,
                onDismiss = { activeModal = ActiveGameModal.NONE }
            )
        }
        ActiveGameModal.SCRATCH_CARD -> {
            ScratchCardGameDialog(
                viewModel = viewModel,
                onDismiss = { activeModal = ActiveGameModal.NONE }
            )
        }
        ActiveGameModal.LUCKY_SPIN -> {
            LuckySpinGameDialog(
                viewModel = viewModel,
                onDismiss = { activeModal = ActiveGameModal.NONE }
            )
        }
        ActiveGameModal.FUN_QUIZ -> {
            FunQuizGameDialog(
                viewModel = viewModel,
                onDismiss = { activeModal = ActiveGameModal.NONE }
            )
        }
        ActiveGameModal.NONE -> { /* No modal */ }
    }
}

// 1) Spin Wheel & Spin Split Dialog
@Composable
fun SpinWheelGameDialog(
    viewModel: EarnViewModel,
    isFootball: Boolean,
    onDismiss: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var isSpinning by remember { mutableStateOf(false) }
    var rotationAngle by remember { mutableFloatStateOf(0f) }
    var wonAmount by remember { mutableStateOf<Double?>(null) }

    val rotation = remember { Animatable(0f) }

    val segmentColors = listOf(
        Color(0xFFE2136E), Color(0xFFF59E0B), Color(0xFF10B981), Color(0xFF3B82F6),
        Color(0xFF8B5CF6), Color(0xFFEF4444), Color(0xFF0EA5E9), Color(0xFF14B8A6)
    )
    val prizes = listOf(0.10, 0.20, 0.50, 1.00, 1.50, 2.00, 2.50, 3.00)

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Surface),
            modifier = Modifier.fillMaxWidth().padding(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = if (isFootball) "⚽ Spin & Split Coins" else "🎡 Lucky Spin Wheel",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = "Spin to win 0.10 to 3.00 TK!",
                    fontSize = 12.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // Pointer needle
                Text("▼", fontSize = 24.sp, color = Primary, fontWeight = FontWeight.Bold)

                // Canvas Wheel
                Box(
                    modifier = Modifier
                        .size(230.dp)
                        .padding(4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Canvas(
                        modifier = Modifier
                            .fillMaxSize()
                            .rotate(rotation.value)
                    ) {
                        val canvasSize = size.minDimension
                        val radius = canvasSize / 2f
                        val center = Offset(size.width / 2f, size.height / 2f)
                        val sliceAngle = 360f / prizes.size

                        for (i in prizes.indices) {
                            val startAngle = i * sliceAngle
                            drawArc(
                                color = segmentColors[i % segmentColors.size],
                                startAngle = startAngle,
                                sweepAngle = sliceAngle,
                                useCenter = true,
                                topLeft = Offset(center.x - radius, center.y - radius),
                                size = Size(radius * 2, radius * 2)
                            )
                        }

                        // Wheel border and center peg
                        drawCircle(
                            color = Color.White,
                            radius = radius,
                            center = center,
                            style = Stroke(width = 8f)
                        )
                        drawCircle(
                            color = Color.White,
                            radius = 28f,
                            center = center
                        )
                        drawCircle(
                            color = Primary,
                            radius = 16f,
                            center = center
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (wonAmount != null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SuccessGreenLight),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp).fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("🎉 CONGRATULATIONS!", fontWeight = FontWeight.Bold, color = SuccessGreen, fontSize = 16.sp)
                            Text("+${wonAmount!!.format(2)} TK", fontWeight = FontWeight.ExtraBold, color = SuccessGreen, fontSize = 28.sp)
                            Text("Added to your balance!", fontSize = 12.sp, color = TextSecondary)
                        }
                    }
                }

                Button(
                    onClick = {
                        if (!isSpinning) {
                            isSpinning = true
                            wonAmount = null
                            viewModel.playSpinWheel { amount, sliceIndex ->
                                coroutineScope.launch {
                                    val targetRotation = 360f * 5 + (360f - (sliceIndex * 45f + 22.5f))
                                    rotation.animateTo(
                                        targetValue = targetRotation,
                                        animationSpec = tween(
                                            durationMillis = 3000,
                                            easing = EaseOutCubic
                                        )
                                    )
                                    wonAmount = amount
                                    isSpinning = false
                                }
                            }
                        }
                    },
                    enabled = !isSpinning,
                    modifier = Modifier.fillMaxWidth().height(50.dp).testTag("spin_action_button"),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = if (isFootball) Color(0xFFF59E0B) else Primary)
                ) {
                    Text(if (isSpinning) "Spinning..." else "Spin Now!", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(onClick = onDismiss) {
                    Text("Close", color = TextSecondary)
                }
            }
        }
    }
}

// 2) Scratch Card Dialog
@Composable
fun ScratchCardGameDialog(
    viewModel: EarnViewModel,
    onDismiss: () -> Unit
) {
    var revealedCells by remember { mutableStateOf(setOf<Int>()) }
    var isDone by remember { mutableStateOf(false) }
    var wonAmount by remember { mutableStateOf<Double?>(null) }

    val totalCells = 25 // 5x5 grid

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Surface),
            modifier = Modifier.fillMaxWidth().padding(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "🎴 Scratch Card",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = "Rub your finger across the card to reveal prize",
                    fontSize = 12.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // Interactive Scratch Surface
                Box(
                    modifier = Modifier
                        .size(220.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0xFFFFD700), Color(0xFFFFB300))
                            )
                        )
                        .pointerInput(isDone) {
                            if (!isDone) {
                                detectDragGestures { change, _ ->
                                    val x = (change.position.x / (220.dp.toPx() / 5)).toInt().coerceIn(0, 4)
                                    val y = (change.position.y / (220.dp.toPx() / 5)).toInt().coerceIn(0, 4)
                                    val cell = y * 5 + x
                                    revealedCells = revealedCells + cell
                                    if (revealedCells.size > 14 && !isDone) {
                                        isDone = true
                                        viewModel.playScratchCard { amount ->
                                            wonAmount = amount
                                        }
                                    }
                                }
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    // Underneath prize content
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🎁", fontSize = 42.sp)
                        Text(
                            text = if (wonAmount != null) "+${wonAmount!!.format(2)} TK" else "???",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = PrimaryDark
                        )
                        Text("Instant Reward!", fontSize = 12.sp, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                    }

                    // Scratch coating overlay
                    if (!isDone) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val cellSize = size.width / 5f
                            for (row in 0 until 5) {
                                for (col in 0 until 5) {
                                    val cell = row * 5 + col
                                    if (!revealedCells.contains(cell)) {
                                        drawRect(
                                            color = if ((row + col) % 2 == 0) Color(0xFF9E9E9E) else Color(0xFFB0B0B0),
                                            topLeft = Offset(col * cellSize, row * cellSize),
                                            size = Size(cellSize, cellSize)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = if (isDone) "Card Scratched!" else "${(revealedCells.size * 100 / totalCells)}% scratched",
                    fontSize = 12.sp,
                    color = TextSecondary,
                    fontWeight = FontWeight.Medium
                )

                if (wonAmount != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "🎉 You Won +${wonAmount!!.format(2)} TK!",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = SuccessGreen
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = {
                        revealedCells = emptySet()
                        isDone = false
                        wonAmount = null
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6))
                ) {
                    Text("Get New Card", fontWeight = FontWeight.Bold)
                }

                TextButton(onClick = onDismiss) {
                    Text("Close", color = TextSecondary)
                }
            }
        }
    }
}

// 3) Lucky Spin 3X Slot Machine Dialog
@Composable
fun LuckySpinGameDialog(
    viewModel: EarnViewModel,
    onDismiss: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var isRolling by remember { mutableStateOf(false) }
    var reels by remember { mutableStateOf(listOf("⭐", "⭐", "⭐")) }
    var wonAmount by remember { mutableStateOf<Double?>(null) }
    var isJackpot by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Surface),
            modifier = Modifier.fillMaxWidth().padding(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "🎰 Lucky Spin 3X",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = "Match 3 identical symbols to hit the Jackpot!",
                    fontSize = 12.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // 3 Reels Box
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0xFF0F172A))
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    reels.forEach { symbol ->
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF1E293B)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = symbol, fontSize = 34.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                if (wonAmount != null) {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (isJackpot) AccentGoldLight else SuccessGreenLight
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp).fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = if (isJackpot) "🎉 JACKPOT! 3 MATCHING!" else "✨ Small Win! Prize added",
                                fontWeight = FontWeight.Bold,
                                color = if (isJackpot) Color(0xFFB45309) else SuccessGreen,
                                fontSize = 14.sp
                            )
                            Text(
                                text = "+${wonAmount!!.format(2)} TK",
                                fontWeight = FontWeight.ExtraBold,
                                color = if (isJackpot) Color(0xFFB45309) else SuccessGreen,
                                fontSize = 24.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = {
                        if (!isRolling) {
                            isRolling = true
                            wonAmount = null
                            coroutineScope.launch {
                                // Simulate rolling reels
                                val allSyms = listOf("🍎", "🍊", "🍋", "🍇", "🍓", "🦁", "⭐", "💎")
                                repeat(12) {
                                    reels = listOf(allSyms.random(), allSyms.random(), allSyms.random())
                                    delay(80)
                                }
                                viewModel.playLuckySpin { amount, finalSymbols, match ->
                                    reels = finalSymbols
                                    wonAmount = amount
                                    isJackpot = match
                                    isRolling = false
                                }
                            }
                        }
                    },
                    enabled = !isRolling,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen)
                ) {
                    Text(if (isRolling) "Rolling..." else "Spin Reels!", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }

                TextButton(onClick = onDismiss) {
                    Text("Close", color = TextSecondary)
                }
            }
        }
    }
}

// 4) Fun Quiz Dialog
@Composable
fun FunQuizGameDialog(
    viewModel: EarnViewModel,
    onDismiss: () -> Unit
) {
    val quizQuestions by viewModel.quizQuestions.collectAsState()
    val activeQuestions = remember(quizQuestions) { quizQuestions.filter { it.isActive } }

    var currentQuestionIndex by remember { mutableIntStateOf(0) }
    var selectedOption by remember { mutableStateOf<Int?>(null) }
    var correctCount by remember { mutableIntStateOf(0) }
    var isQuizCompleted by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Surface),
            modifier = Modifier.fillMaxWidth().padding(8.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "🧠 Daily Fun Quiz",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                if (isQuizCompleted) {
                    Spacer(modifier = Modifier.height(20.dp))
                    Text("Quiz Completed!", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SuccessGreen)
                    Text("Score: $correctCount / ${activeQuestions.size}", fontSize = 16.sp, color = TextPrimary)
                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = onDismiss,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        Text("Done", fontWeight = FontWeight.Bold)
                    }
                } else if (activeQuestions.isNotEmpty() && currentQuestionIndex < activeQuestions.size) {
                    val currentQ = activeQuestions[currentQuestionIndex]

                    Text(
                        text = "Question ${currentQuestionIndex + 1} of ${activeQuestions.size} · ${currentQ.category}",
                        fontSize = 12.sp,
                        color = Color(0xFF2563EB),
                        modifier = Modifier.padding(vertical = 4.dp)
                    )

                    LinearProgressIndicator(
                        progress = { (currentQuestionIndex + 1f) / activeQuestions.size },
                        modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                        color = Color(0xFF3B82F6),
                        trackColor = Border
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = currentQ.question,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    currentQ.options.forEachIndexed { index, option ->
                        val isSelected = selectedOption == index
                        val isCorrect = index == currentQ.answerIndex

                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clickable(enabled = selectedOption == null) {
                                    selectedOption = index
                                    if (isCorrect) correctCount++
                                },
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = when {
                                    selectedOption == null -> SurfaceVariant
                                    isSelected && isCorrect -> SuccessGreenLight
                                    isSelected && !isCorrect -> DangerRedLight
                                    else -> SurfaceVariant
                                }
                            ),
                            border = if (isSelected) ButtonDefaults.outlinedButtonBorder else null
                        ) {
                            Text(
                                text = option,
                                fontSize = 14.sp,
                                color = TextPrimary,
                                modifier = Modifier.padding(14.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    if (selectedOption != null) {
                        Button(
                            onClick = {
                                if (currentQuestionIndex + 1 < activeQuestions.size) {
                                    currentQuestionIndex++
                                    selectedOption = null
                                } else {
                                    isQuizCompleted = true
                                    val percent = correctCount.toFloat() / activeQuestions.size
                                    viewModel.recordQuizReward(percent, correctCount, activeQuestions.size)
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6))
                        ) {
                            Text(if (currentQuestionIndex + 1 < activeQuestions.size) "Next Question" else "Finish Quiz")
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                TextButton(onClick = onDismiss) {
                    Text("Close", color = TextSecondary)
                }
            }
        }
    }
}
