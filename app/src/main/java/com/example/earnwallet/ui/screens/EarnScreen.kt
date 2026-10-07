package com.example.earnwallet.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.earnwallet.data.model.Task
import com.example.earnwallet.data.repository.format
import com.example.earnwallet.ui.theme.*
import com.example.earnwallet.ui.viewmodel.EarnViewModel

@Composable
fun EarnScreen(viewModel: EarnViewModel) {
    val context = LocalContext.current
    val tasks by viewModel.tasks.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val isWatchingAd by viewModel.isWatchingAd.collectAsState()
    val adProgress by viewModel.adProgress.collectAsState()

    val adsWatched = viewModel.getAdsWatchedToday()
    val maxAds = settings.maxAdsPerDay
    val remaining = (maxAds - adsWatched).coerceAtLeast(0)
    val adReward = settings.adReward
    val progressRatio = (adsWatched.toFloat() / maxAds).coerceIn(0f, 1f)

    // Pulse animation for Watch Ad button
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.03f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Background),
        contentPadding = PaddingValues(bottom = 100.dp)
    ) {
        // Top Header
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Primary, PrimaryDark)
                        )
                    )
                    .padding(horizontal = 20.dp, vertical = 24.dp)
            ) {
                Column {
                    Text(
                        text = "Watch & Earn",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = Surface
                    )
                    Text(
                        text = "Earn TK by watching rewarded ads & completing daily tasks",
                        fontSize = 13.sp,
                        color = Surface.copy(alpha = 0.85f),
                        modifier = Modifier.padding(top = 4.dp, bottom = 8.dp)
                    )
                    // Monetization network badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(Surface.copy(alpha = 0.2f))
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Bolt,
                                contentDescription = null,
                                tint = AccentGold,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Monetized via ${settings.adNetwork.uppercase()}",
                                fontSize = 11.sp,
                                color = Surface,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }

        // Rewarded Ad Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(PrimaryLight)
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Icon(
                                Icons.Default.PlayCircle,
                                contentDescription = null,
                                tint = Primary,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Rewarded Ad",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Primary
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "+${adReward.format(2)} TK",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = SuccessGreen
                            )
                            Text(
                                text = "per ad view",
                                fontSize = 11.sp,
                                color = TextSecondary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Progress Bar
                    LinearProgressIndicator(
                        progress = { progressRatio },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = Primary,
                        trackColor = Border
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "$adsWatched/$maxAds ads watched today",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                        Text(
                            text = "${(adsWatched * adReward).format(2)} TK earned",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = SuccessGreen
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    if (settings.adsEnabled) {
                        Button(
                            onClick = {
                                viewModel.startWatchingAd()
                            },
                            enabled = remaining > 0 && !isWatchingAd,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .testTag("watch_ad_button"),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Primary)
                        ) {
                            if (remaining == 0) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.HourglassBottom, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Daily Limit Reached", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                                }
                            } else {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.PlayArrow, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Watch Ad & Earn ${adReward.format(2)} TK", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    } else {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SurfaceVariant),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Block, contentDescription = null, tint = TextMuted)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Ads temporarily paused by admin", color = TextSecondary, fontSize = 13.sp)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Stats Row
                    HorizontalDivider(color = Border)
                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = "$remaining", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(text = "Remaining", fontSize = 11.sp, color = TextSecondary)
                        }
                        VerticalDivider(modifier = Modifier.height(30.dp), color = Border)
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = "${(adsWatched * adReward).format(2)} TK", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SuccessGreen)
                            Text(text = "Earned Today", fontSize = 11.sp, color = TextSecondary)
                        }
                        VerticalDivider(modifier = Modifier.height(30.dp), color = Border)
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = "${(maxAds * adReward).format(2)} TK", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Primary)
                            Text(text = "Max Daily", fontSize = 11.sp, color = TextSecondary)
                        }
                    }
                }
            }
        }

        // Daily Tasks Section
        item {
            Text(
                text = "Daily Tasks",
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 10.dp)
            )
        }

        items(tasks) { task ->
            val isDone = viewModel.isTaskCompleted(task.id)

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        val iconColor = when (task.category) {
                            "youtube" -> Color(0xFFFF0000)
                            "facebook" -> Color(0xFF1877F2)
                            "telegram" -> Color(0xFF229ED9)
                            "twitter" -> Color(0xFF1DA1F2)
                            else -> Primary
                        }
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(iconColor.copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = when (task.category) {
                                    "youtube" -> Icons.Default.PlayArrow
                                    "telegram" -> Icons.Default.Send
                                    "facebook" -> Icons.Default.ThumbUp
                                    else -> Icons.Default.Task
                                },
                                contentDescription = null,
                                tint = iconColor,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = task.title,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Reward: +${task.reward.format(2)} TK",
                                fontSize = 12.sp,
                                color = SuccessGreen,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    if (isDone) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(SuccessGreenLight)
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = SuccessGreen, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Done", color = SuccessGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    } else {
                        Button(
                            onClick = {
                                if (task.url.isNotBlank()) {
                                    runCatching {
                                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(task.url)))
                                    }
                                }
                                viewModel.completeTask(task.id)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Primary),
                            shape = RoundedCornerShape(50),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)
                        ) {
                            Text("Go", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }

    // Rewarded Video Watching Modal
    if (isWatchingAd) {
        Dialog(onDismissRequest = { /* Cannot dismiss until complete */ }) {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                modifier = Modifier.fillMaxWidth().padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(70.dp)
                            .clip(CircleShape)
                            .background(PrimaryLight),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Videocam,
                            contentDescription = null,
                            tint = Primary,
                            modifier = Modifier.size(36.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Watching Video Ad...",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Please watch until completion to claim your reward",
                        fontSize = 12.sp,
                        color = TextSecondary,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    LinearProgressIndicator(
                        progress = { adProgress },
                        modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                        color = Primary,
                        trackColor = Border
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "${(adProgress * 100).toInt()}%",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                }
            }
        }
    }
}
