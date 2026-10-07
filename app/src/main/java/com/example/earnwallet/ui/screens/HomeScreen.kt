package com.example.earnwallet.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.earnwallet.data.model.NotificationItem
import com.example.earnwallet.data.repository.format
import com.example.earnwallet.ui.theme.*
import com.example.earnwallet.ui.viewmodel.EarnViewModel

@Composable
fun HomeScreen(
    viewModel: EarnViewModel,
    onNavigateTab: (Int) -> Unit, // 0: Home, 1: Earn, 2: Games, 3: Wallet, 4: Profile
    onOpenLeaderboard: () -> Unit,
    onOpenSupport: () -> Unit,
    onOpenAdmin: () -> Unit
) {
    val user by viewModel.currentUser.collectAsState()
    val events by viewModel.events.collectAsState()
    val claimedEvents by viewModel.claimedEvents.collectAsState()
    val notifications by viewModel.notifications.collectAsState()
    val settings by viewModel.settings.collectAsState()

    var showNotificationsDialog by remember { mutableStateOf(false) }

    val adsWatched = viewModel.getAdsWatchedToday()
    val canCheckIn = viewModel.canCheckIn()

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
                            colors = listOf(Primary, PrimaryDark)
                        )
                    )
                    .padding(horizontal = 20.dp, vertical = 24.dp)
            ) {
                Column {
                    // Top user bar
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = settings.appName,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = AccentGold,
                                    letterSpacing = 1.sp
                                )
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = user?.fullName ?: "Member",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Surface
                                )
                                if (user?.isAdmin == true) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = AccentGold,
                                        modifier = Modifier.padding(top = 2.dp)
                                    ) {
                                        Text(
                                            text = "ADMIN",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Color.Black,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                        }

                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (user?.isAdmin == true) {
                                IconButton(
                                    onClick = onOpenAdmin,
                                    modifier = Modifier
                                        .size(42.dp)
                                        .clip(CircleShape)
                                        .background(Secondary)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.AdminPanelSettings,
                                        contentDescription = "Admin Panel",
                                        tint = Surface
                                    )
                                }
                            }

                            // Notification Icon with badge
                            Box {
                                IconButton(
                                    onClick = { showNotificationsDialog = true },
                                    modifier = Modifier
                                        .size(42.dp)
                                        .clip(CircleShape)
                                        .background(Surface.copy(alpha = 0.2f))
                                        .testTag("notification_button")
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Notifications,
                                        contentDescription = "Notifications",
                                        tint = Surface
                                    )
                                }
                                if (notifications.isNotEmpty()) {
                                    Box(
                                        modifier = Modifier
                                            .size(18.dp)
                                            .align(Alignment.TopEnd)
                                            .clip(CircleShape)
                                            .background(DangerRed),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = "${notifications.size}",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Surface
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Balance Card
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Surface.copy(alpha = 0.18f))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Total Balance",
                                    fontSize = 13.sp,
                                    color = Surface.copy(alpha = 0.85f)
                                )
                                Text(
                                    text = "${user?.balance?.format(2) ?: "0.00"} TK",
                                    fontSize = 32.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Surface
                                )
                                Text(
                                    text = "Total Earned: ${user?.totalEarned?.format(2) ?: "0.00"} TK",
                                    fontSize = 12.sp,
                                    color = Surface.copy(alpha = 0.8f)
                                )
                            }

                            Button(
                                onClick = { onNavigateTab(3) },
                                shape = RoundedCornerShape(50),
                                colors = ButtonDefaults.buttonColors(containerColor = Surface),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ArrowOutward,
                                    contentDescription = null,
                                    tint = Primary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Withdraw",
                                    color = Primary,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }

        // Announcement / Notice Banner
        if (settings.noticeBanner.isNotBlank()) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = PrimaryLight.copy(alpha = 0.6f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Campaign,
                            contentDescription = null,
                            tint = Primary,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = settings.noticeBanner,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = PrimaryDark,
                            lineHeight = 16.sp
                        )
                    }
                }
            }
        }

        // Stats Row
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Primary.copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.PlayCircle, contentDescription = null, tint = Primary)
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "$adsWatched/${settings.maxAdsPerDay}",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text("Ads Today", fontSize = 11.sp, color = TextSecondary)
                        }
                    }
                }

                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF0EA5E9).copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.People, contentDescription = null, tint = Color(0xFF0EA5E9))
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = user?.referralCode ?: "-",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text("Referral Code", fontSize = 11.sp, color = TextSecondary)
                        }
                    }
                }
            }
        }

        // Admin shortcut banner if user is admin
        if (user?.isAdmin == true) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                        .clickable { onOpenAdmin() },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Secondary)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Shield, contentDescription = null, tint = AccentGold)
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Admin Management Panel",
                                    color = Surface,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Manage users, withdrawals, tasks, ads & quiz",
                                    color = Surface.copy(alpha = 0.75f),
                                    fontSize = 11.sp
                                )
                            }
                        }
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Surface)
                    }
                }
            }
        }

        // Daily Check-in Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
                    .clickable(enabled = canCheckIn) {
                        if (canCheckIn) viewModel.claimCheckIn()
                    }
                    .testTag("checkin_button"),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(if (canCheckIn) Primary.copy(alpha = 0.15f) else SuccessGreen.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (canCheckIn) Icons.Default.CalendarToday else Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = if (canCheckIn) Primary else SuccessGreen
                            )
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column {
                            Text(
                                text = if (canCheckIn) "Daily Check-In" else "Checked In Today",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = if (canCheckIn) "Claim +${settings.checkinReward.format(2)} TK now!" else "Come back tomorrow for your next reward",
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                        }
                    }

                    if (canCheckIn) {
                        Button(
                            onClick = { viewModel.claimCheckIn() },
                            colors = ButtonDefaults.buttonColors(containerColor = Primary),
                            shape = RoundedCornerShape(50),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Text("+${settings.checkinReward.format(2)} TK", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(SuccessGreenLight)
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text("Done", color = SuccessGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Quick Actions Section
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                Text(
                    text = "Quick Actions",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                val menuItems = listOf(
                    Triple("Watch Ads", Icons.Default.PlayCircle, Primary to { onNavigateTab(1) }),
                    Triple("Play Games", Icons.Default.SportsEsports, Color(0xFF8B5CF6) to { onNavigateTab(2) }),
                    Triple("Refer & Earn", Icons.Default.Group, Color(0xFF0EA5E9) to { onNavigateTab(4) }),
                    Triple("Withdraw", Icons.Default.AccountBalanceWallet, SuccessGreen to { onNavigateTab(3) }),
                    Triple("Leaderboard", Icons.Default.EmojiEvents, AccentGold to { onOpenLeaderboard() }),
                    Triple("AI Support", Icons.Default.HeadsetMic, Color(0xFF64748B) to { onOpenSupport() })
                )

                // 2x3 Grid
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    for (row in menuItems.chunked(3)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            for ((label, icon, colorAction) in row) {
                                val (color, action) = colorAction
                                Card(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { action() },
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Surface),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 16.dp, horizontal = 8.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(46.dp)
                                                .clip(RoundedCornerShape(14.dp))
                                                .background(color.copy(alpha = 0.15f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(icon, contentDescription = label, tint = color)
                                        }
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            text = label,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = TextPrimary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Special Bonuses / Events Header
        item {
            Text(
                text = "Special Bonuses & Events",
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 10.dp)
            )
        }

        // Events list
        items(events) { event ->
            val userId = user?.id ?: 0
            val isClaimed = claimedEvents.contains("$userId:${event.id}")

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(Primary, PrimaryDark)
                            )
                        )
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.CardGiftcard,
                                contentDescription = null,
                                tint = Surface,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = event.title,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Surface
                                )
                                Text(
                                    text = "Reward: +${event.reward.format(2)} TK",
                                    fontSize = 12.sp,
                                    color = Surface.copy(alpha = 0.85f)
                                )
                            }
                        }

                        if (isClaimed) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(Surface.copy(alpha = 0.25f))
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = "Claimed ✓",
                                    color = Surface,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        } else {
                            Button(
                                onClick = { viewModel.claimEvent(event.id) },
                                shape = RoundedCornerShape(50),
                                colors = ButtonDefaults.buttonColors(containerColor = Surface)
                            ) {
                                Text(
                                    text = "Claim",
                                    color = Primary,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Notifications Dialog
    if (showNotificationsDialog) {
        AlertDialog(
            onDismissRequest = { showNotificationsDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Notifications, contentDescription = null, tint = Primary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Notifications (${notifications.size})", fontWeight = FontWeight.Bold)
                }
            },
            text = {
                if (notifications.isEmpty()) {
                    Text("No notifications at this moment.", color = TextSecondary)
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth().heightIn(max = 350.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(notifications) { notif ->
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = SurfaceVariant),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(notif.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextPrimary)
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(notif.message, fontSize = 12.sp, color = TextSecondary)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(notif.createdAt, fontSize = 10.sp, color = TextMuted)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showNotificationsDialog = false }) {
                    Text("Close", color = Primary, fontWeight = FontWeight.Bold)
                }
            }
        )
    }
}
