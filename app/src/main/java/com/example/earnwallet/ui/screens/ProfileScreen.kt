package com.example.earnwallet.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.example.earnwallet.data.repository.format
import com.example.earnwallet.ui.theme.*
import com.example.earnwallet.ui.viewmodel.EarnViewModel

@Composable
fun ProfileScreen(
    viewModel: EarnViewModel,
    onOpenAdmin: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val user by viewModel.currentUser.collectAsState()
    val transactions by viewModel.transactions.collectAsState()
    val allUsers by viewModel.users.collectAsState()
    val settings by viewModel.settings.collectAsState()

    var isEditingName by remember { mutableStateOf(false) }
    var editedName by remember { mutableStateOf(user?.fullName ?: "") }
    var showLogoutConfirm by remember { mutableStateOf(false) }
    var showDeleteAccountConfirm by remember { mutableStateOf(false) }

    // Calculate income breakdown
    val adsIncome = transactions.filter { it.source == "Ads" && it.amount > 0 }.sumOf { it.amount }
    val refIncome = transactions.filter { it.source == "Referral" && it.amount > 0 }.sumOf { it.amount }
    val gamesIncome = transactions.filter { it.source == "Games" && it.amount > 0 }.sumOf { it.amount }
    val taskIncome = transactions.filter { it.source == "Daily Task" && it.amount > 0 }.sumOf { it.amount }
    val eventIncome = transactions.filter { it.source == "Event Bonus" && it.amount > 0 }.sumOf { it.amount }

    // Direct referrals (Level 1)
    val teamMembers = allUsers.filter { it.referredBy?.equals(user?.referralCode, ignoreCase = true) == true }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Background),
        contentPadding = PaddingValues(bottom = 100.dp)
    ) {
        // Gradient Profile Header
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color(0xFF0EA5E9), Color(0xFF1D4ED8))
                        )
                    )
                    .padding(horizontal = 20.dp, vertical = 28.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Avatar Circle
                    Box(
                        modifier = Modifier
                            .size(86.dp)
                            .clip(CircleShape)
                            .background(Surface.copy(alpha = 0.25f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = (user?.fullName?.firstOrNull() ?: 'U').uppercase(),
                            fontSize = 36.sp,
                            fontWeight = FontWeight.Bold,
                            color = Surface
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (isEditingName) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            OutlinedTextField(
                                value = editedName,
                                onValueChange = { editedName = it },
                                modifier = Modifier.width(200.dp),
                                singleLine = true,
                                shape = RoundedCornerShape(10.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Surface,
                                    unfocusedTextColor = Surface,
                                    focusedBorderColor = Surface,
                                    unfocusedBorderColor = Surface.copy(alpha = 0.7f)
                                )
                            )
                            IconButton(onClick = {
                                if (editedName.isNotBlank()) {
                                    viewModel.updateName(editedName)
                                    isEditingName = false
                                }
                            }) {
                                Icon(Icons.Default.Check, contentDescription = "Save", tint = Surface)
                            }
                            IconButton(onClick = { isEditingName = false }) {
                                Icon(Icons.Default.Close, contentDescription = "Cancel", tint = Surface)
                            }
                        }
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = user?.fullName ?: "Member",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = Surface
                            )
                            if (user?.isAdmin == true) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = AccentGold
                                ) {
                                    Text(
                                        text = "ADMIN",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color.Black,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            IconButton(
                                onClick = { isEditingName = true },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = "Edit Name", tint = Surface.copy(alpha = 0.8f), modifier = Modifier.size(16.dp))
                            }
                        }
                    }

                    Text(
                        text = user?.email ?: "",
                        fontSize = 13.sp,
                        color = Surface.copy(alpha = 0.85f)
                    )
                }
            }
        }

        // Referral Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(
                        text = "Your Referral Code",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Invite friends to build your 3-level earning tree",
                        fontSize = 12.sp,
                        color = TextSecondary,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    // Code Display Box
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(PrimaryLight)
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = user?.referralCode ?: "-",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Primary,
                            letterSpacing = 2.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                val clip = ClipData.newPlainText("Referral Code", user?.referralCode ?: "")
                                clipboard.setPrimaryClip(clip)
                                viewModel.showMessage("Referral code copied to clipboard!")
                            },
                            modifier = Modifier.weight(1f).height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryLight)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = null, tint = Primary, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Copy Code", color = Primary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }

                        Button(
                            onClick = {
                                val code = user?.referralCode ?: ""
                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_SUBJECT, "Join Earn Wallet")
                                    putExtra(Intent.EXTRA_TEXT, "Earn daily money with Earn Wallet! Use my referral code: $code to get started.")
                                }
                                context.startActivity(Intent.createChooser(shareIntent, "Share Referral Code"))
                            },
                            modifier = Modifier.weight(1f).height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Primary)
                        ) {
                            Icon(Icons.Default.Share, contentDescription = null, tint = Surface, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Share Link", color = Surface, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // 3-Tier Commission Badges
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        CommissionBadgeBox("Level 1", "${settings.referralRewardRateL1.format(0)}%", "${teamMembers.size} members", Primary, Modifier.weight(1f))
                        CommissionBadgeBox("Level 2", "${settings.referralRewardRateL2.format(0)}%", "0 members", Color(0xFF8B5CF6), Modifier.weight(1f))
                        CommissionBadgeBox("Level 3", "${settings.referralRewardRateL3.format(1)}%", "0 members", Color(0xFF0EA5E9), Modifier.weight(1f))
                    }
                }
            }
        }

        // Income Breakdown Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(
                        text = "Income Breakdown",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    listOf(
                        Triple("Rewarded Video Ads", adsIncome, Primary),
                        Triple("Referral Commissions", refIncome, Color(0xFF8B5CF6)),
                        Triple("Games & Quizzes", gamesIncome, AccentGold),
                        Triple("Daily Tasks", taskIncome, Color(0xFF0EA5E9)),
                        Triple("Special Event Bonuses", eventIncome, DangerRed)
                    ).forEach { (label, amt, color) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(CircleShape)
                                        .background(color)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(text = label, fontSize = 13.sp, color = TextPrimary)
                            }
                            Text(
                                text = "+${amt.format(2)} TK",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (amt > 0) SuccessGreen else TextMuted
                            )
                        }
                    }
                }
            }
        }

        // Admin panel & Logout options
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column {
                    if (user?.isAdmin == true) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onOpenAdmin() }
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.AdminPanelSettings, contentDescription = null, tint = Primary)
                                Spacer(modifier = Modifier.width(12.dp))
                                Text("Admin Control Panel", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            }
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted)
                        }
                        HorizontalDivider(color = Border)
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showLogoutConfirm = true }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Logout, contentDescription = null, tint = TextPrimary)
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("Logout", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                        }
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted)
                    }

                    HorizontalDivider(color = Border)

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showDeleteAccountConfirm = true }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.DeleteForever, contentDescription = null, tint = DangerRed)
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("Delete Account & Data", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = DangerRed)
                        }
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted)
                    }
                }
            }
        }
    }

    if (showDeleteAccountConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteAccountConfirm = false },
            title = { Text("Delete Account Data?", fontWeight = FontWeight.Bold) },
            text = { Text("This will permanently remove your account, transactions, balance, and all associated personal records. This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteAccountConfirm = false
                        viewModel.deleteCurrentAccount {
                            onLogout()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DangerRed)
                ) {
                    Text("Permanently Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteAccountConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            title = { Text("Confirm Logout") },
            text = { Text("Are you sure you want to sign out of your account?") },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutConfirm = false
                        viewModel.logout()
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DangerRed)
                ) {
                    Text("Logout")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun CommissionBadgeBox(
    level: String,
    rate: String,
    members: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(10.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = level, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = color)
            Text(text = rate, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = color)
            Text(text = members, fontSize = 10.sp, color = TextSecondary)
        }
    }
}
