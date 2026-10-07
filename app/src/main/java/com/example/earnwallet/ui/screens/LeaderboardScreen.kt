package com.example.earnwallet.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.earnwallet.data.model.User
import com.example.earnwallet.data.repository.format
import com.example.earnwallet.ui.theme.*
import com.example.earnwallet.ui.viewmodel.EarnViewModel

enum class LeaderboardTab { TOP_EARNERS, TOP_REFERRERS, TOP_GAMERS }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaderboardScreen(
    viewModel: EarnViewModel,
    onBack: () -> Unit
) {
    val users by viewModel.users.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    var selectedTab by remember { mutableStateOf(LeaderboardTab.TOP_EARNERS) }

    // Sort users according to selected metric
    val rankedUsers = remember(users, selectedTab) {
        when (selectedTab) {
            LeaderboardTab.TOP_EARNERS -> users.sortedByDescending { it.totalEarned }
            LeaderboardTab.TOP_REFERRERS -> users.sortedByDescending { u ->
                users.count { it.referredBy?.equals(u.referralCode, ignoreCase = true) == true }
            }
            LeaderboardTab.TOP_GAMERS -> users.sortedByDescending { it.balance }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Leaderboard", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AccentGold,
                    titleContentColor = Surface,
                    navigationIconContentColor = Surface
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Background),
            contentPadding = PaddingValues(16.dp)
        ) {
            // Tab Selector
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Surface)
                        .padding(4.dp)
                ) {
                    LeaderboardTabButton("Top Earner", selectedTab == LeaderboardTab.TOP_EARNERS, Modifier.weight(1f)) {
                        selectedTab = LeaderboardTab.TOP_EARNERS
                    }
                    LeaderboardTabButton("Top Referrer", selectedTab == LeaderboardTab.TOP_REFERRERS, Modifier.weight(1f)) {
                        selectedTab = LeaderboardTab.TOP_REFERRERS
                    }
                    LeaderboardTabButton("Top Gamer", selectedTab == LeaderboardTab.TOP_GAMERS, Modifier.weight(1f)) {
                        selectedTab = LeaderboardTab.TOP_GAMERS
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Top 3 Podium
            if (rankedUsers.isNotEmpty()) {
                item {
                    val first = rankedUsers.getOrNull(0)
                    val second = rankedUsers.getOrNull(1)
                    val third = rankedUsers.getOrNull(2)

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        // 2nd Place (Silver)
                        if (second != null) {
                            PodiumColumn(
                                user = second,
                                rank = 2,
                                medal = "🥈",
                                barHeight = 70.dp,
                                color = Color(0xFFC0C0C0),
                                metricText = "${second.totalEarned.format(2)} TK",
                                modifier = Modifier.weight(1f)
                            )
                        } else {
                            Spacer(modifier = Modifier.weight(1f))
                        }

                        // 1st Place (Gold)
                        if (first != null) {
                            PodiumColumn(
                                user = first,
                                rank = 1,
                                medal = "🥇",
                                barHeight = 100.dp,
                                color = AccentGold,
                                metricText = "${first.totalEarned.format(2)} TK",
                                modifier = Modifier.weight(1.1f)
                            )
                        }

                        // 3rd Place (Bronze)
                        if (third != null) {
                            PodiumColumn(
                                user = third,
                                rank = 3,
                                medal = "🥉",
                                barHeight = 50.dp,
                                color = Color(0xFFCD7F32),
                                metricText = "${third.totalEarned.format(2)} TK",
                                modifier = Modifier.weight(1f)
                            )
                        } else {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                }
            }

            // Rest of Rank Cards (Rank 4+)
            val rest = if (rankedUsers.size > 3) rankedUsers.drop(3) else emptyList()
            itemsIndexed(rest) { index, u ->
                val rank = index + 4
                val isMe = u.id == currentUser?.id

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isMe) AccentGoldLight else Surface
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(CircleShape)
                                    .background(Border),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "$rank",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextSecondary
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(Primary.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = u.fullName.firstOrNull()?.toString() ?: "U",
                                    fontWeight = FontWeight.Bold,
                                    color = Primary
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = u.fullName + if (isMe) " (You)" else "",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp,
                                    color = TextPrimary
                                )
                                Text(
                                    text = u.email.substringBefore("@"),
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                            }
                        }

                        Text(
                            text = "${u.totalEarned.format(2)} TK",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = AccentGold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LeaderboardTabButton(
    title: String,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (isSelected) AccentGold else Color.Transparent)
            .clickable { onClick() }
            .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = title,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (isSelected) Surface else TextSecondary
        )
    }
}

@Composable
private fun PodiumColumn(
    user: User,
    rank: Int,
    medal: String,
    barHeight: androidx.compose.ui.unit.Dp,
    color: Color,
    metricText: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(horizontal = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(medal, fontSize = 24.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .size(46.dp)
                .clip(CircleShape)
                .background(color.copy(alpha = 0.25f)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = user.fullName.firstOrNull()?.toString() ?: "U",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = color
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = user.fullName.substringBefore(" "),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary,
            maxLines = 1
        )
        Text(
            text = metricText,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = color
        )
        Spacer(modifier = Modifier.height(6.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(barHeight)
                .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                .background(color)
        )
    }
}
