package com.example.earnwallet.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.earnwallet.data.model.AppSettings
import com.example.earnwallet.data.repository.format
import com.example.earnwallet.ui.theme.*
import com.example.earnwallet.ui.viewmodel.EarnViewModel

enum class AdminTab { DASHBOARD, NOTIFICATIONS, PAYMENTS, USERS, SETTINGS, TASKS, EVENTS, ACTIVATIONS, QUIZ, SECURITY }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminScreen(
    viewModel: EarnViewModel,
    onBack: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(AdminTab.DASHBOARD) }

    val currentUser by viewModel.currentUser.collectAsState()
    val users by viewModel.users.collectAsState()
    val withdrawals by viewModel.withdrawals.collectAsState()
    val tasks by viewModel.tasks.collectAsState()
    val notifications by viewModel.notifications.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val activationRequests by viewModel.activationRequests.collectAsState()
    val passwordResetRequests by viewModel.passwordResetRequests.collectAsState()
    val quizQuestions by viewModel.quizQuestions.collectAsState()
    val events by viewModel.events.collectAsState()

    // Access Control: Only the admin account has access to the admin panel
    val isAdminUser = currentUser?.isAdmin == true || currentUser?.email.equals("kajolchandradas3@gmail.com", ignoreCase = true)

    if (!isAdminUser) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Access Denied") },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = DangerRed, titleContentColor = Surface, navigationIconContentColor = Surface)
                )
            }
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(Background),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = DangerRed, modifier = Modifier.size(56.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Restricted Area", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "This panel is restricted to the administrator (kajolchandradas3@gmail.com). Other accounts do not have access.",
                            fontSize = 13.sp,
                            color = TextSecondary,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = onBack,
                            colors = ButtonDefaults.buttonColors(containerColor = Primary),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Return to App")
                        }
                    }
                }
            }
        }
        return
    }

    // Main Admin View (Direct access granted for kajolchandradas3@gmail.com)
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Admin Control Center", fontSize = 18.sp, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Secondary, titleContentColor = Surface, navigationIconContentColor = Surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Background)
        ) {
            // Horizontal Admin Tabs
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Surface)
                    .padding(vertical = 8.dp, horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val adminTabs = listOf(
                    AdminTab.DASHBOARD to "Dashboard",
                    AdminTab.PAYMENTS to "Withdrawals",
                    AdminTab.ACTIVATIONS to "Activations",
                    AdminTab.USERS to "Users",
                    AdminTab.SETTINGS to "Settings",
                    AdminTab.TASKS to "Tasks",
                    AdminTab.EVENTS to "Events & Bonuses",
                    AdminTab.QUIZ to "Quiz Bank",
                    AdminTab.NOTIFICATIONS to "Broadcasts",
                    AdminTab.SECURITY to "Security"
                )
                items(adminTabs) { (tab, title) ->
                    val isSelected = selectedTab == tab
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(if (isSelected) Secondary else SurfaceVariant)
                            .clickable { selectedTab = tab }
                            .padding(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = title,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isSelected) Surface else TextPrimary
                        )
                    }
                }
            }

            HorizontalDivider(color = Border)

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                when (selectedTab) {
                    AdminTab.DASHBOARD -> {
                        item {
                            // Dashboard Stats Cards
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                AdminStatBox("Total Users", "${users.size}", Color(0xFF3B82F6), Modifier.weight(1f))
                                AdminStatBox("Pending Pay", "${withdrawals.count { it.status == "pending" }}", AccentGold, Modifier.weight(1f))
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                AdminStatBox("Active Tasks", "${tasks.count { it.isActive }}", SuccessGreen, Modifier.weight(1f))
                                AdminStatBox("Pending Act.", "${activationRequests.count { it.status == "pending" }}", Primary, Modifier.weight(1f))
                            }
                        }

                        item {
                            // Master Ad Switch
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface)
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("Master Ad Switch", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                        Text(
                                            if (settings.adsEnabled) "Ads are currently ACTIVE globally" else "Ads are currently DISABLED globally",
                                            fontSize = 12.sp,
                                            color = if (settings.adsEnabled) SuccessGreen else DangerRed
                                        )
                                    }
                                    Switch(
                                        checked = settings.adsEnabled,
                                        onCheckedChange = {
                                            viewModel.updateSettings(settings.copy(adsEnabled = it))
                                        }
                                    )
                                }
                            }
                        }
                    }

                    AdminTab.PAYMENTS -> {
                        item {
                            Text("Pending & Recent Withdrawals (${withdrawals.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        items(withdrawals) { wd ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("${wd.withdrawMethod.uppercase()} - ${wd.accountNumber}", fontWeight = FontWeight.Bold)
                                        Text(wd.status.uppercase(), fontWeight = FontWeight.Bold, color = if (wd.status == "approved") SuccessGreen else if (wd.status == "rejected") DangerRed else AccentGold)
                                    }
                                    Text("Amount: ${wd.amount.format(2)} TK (Net: ${wd.netAmount.format(2)} TK) · ${wd.createdAt}", fontSize = 12.sp, color = TextSecondary)

                                    if (wd.status == "pending") {
                                        Spacer(modifier = Modifier.height(10.dp))
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Button(
                                                onClick = { viewModel.approveWithdrawal(wd.id) },
                                                colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text("Approve")
                                            }
                                            OutlinedButton(
                                                onClick = { viewModel.rejectWithdrawal(wd.id) },
                                                colors = ButtonDefaults.outlinedButtonColors(contentColor = DangerRed),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text("Reject & Refund")
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    AdminTab.ACTIVATIONS -> {
                        item {
                            Text("Account Activation Requests (${activationRequests.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        if (activationRequests.isEmpty()) {
                            item {
                                Text("No pending activation requests", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(vertical = 4.dp))
                            }
                        }
                        items(activationRequests) { req ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface)
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(req.email, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text("Status: ${req.status} · ${req.createdAt}", fontSize = 12.sp, color = TextSecondary)
                                        if (req.code != null) {
                                            Text("Activation Code: ${req.code}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Primary)
                                        }
                                    }
                                    if (req.status == "pending") {
                                        Button(
                                            onClick = {
                                                viewModel.approveActivation(req.id) {}
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = Primary)
                                        ) {
                                            Text("Generate Code")
                                        }
                                    }
                                }
                            }
                        }

                        item {
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("Password Reset Requests (${passwordResetRequests.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        if (passwordResetRequests.isEmpty()) {
                            item {
                                Text("No password reset requests pending", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(vertical = 4.dp))
                            }
                        }
                        items(passwordResetRequests) { req ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface)
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(req.email, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text("Status: ${req.status} · ${req.createdAt}", fontSize = 12.sp, color = TextSecondary)
                                        if (req.code != null) {
                                            Text("Reset Secret Code: ${req.code}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = AccentGold)
                                        }
                                    }
                                    if (req.status == "pending") {
                                        Button(
                                            onClick = {
                                                viewModel.approvePasswordReset(req.id) {}
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = AccentGold)
                                        ) {
                                            Text("Approve Reset", color = Color.Black)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    AdminTab.USERS -> {
                        item {
                            Text("User Directory (${users.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        if (users.isEmpty()) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = Surface)
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Icon(Icons.Default.GroupOff, contentDescription = null, tint = TextMuted, modifier = Modifier.size(40.dp))
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text("No accounts registered yet", fontWeight = FontWeight.Medium, color = TextSecondary)
                                        Text("All previous account data has been cleared.", fontSize = 12.sp, color = TextMuted)
                                    }
                                }
                            }
                        }
                        items(users) { u ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface)
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(u.fullName + if (u.isAdmin) " (Admin)" else "", fontWeight = FontWeight.Bold)
                                        Text("📧 ${u.email}", fontSize = 12.sp, color = TextSecondary)
                                        Text("Bal: ${u.balance.format(2)} TK · Earned: ${u.totalEarned.format(2)} TK", fontSize = 12.sp, color = SuccessGreen)
                                    }
                                    if (!u.isAdmin) {
                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Button(
                                                onClick = { viewModel.toggleUserBan(u.id) },
                                                colors = ButtonDefaults.buttonColors(containerColor = if (u.isBanned) SuccessGreen else DangerRed),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Text(if (u.isBanned) "Unban" else "Ban")
                                            }
                                            IconButton(
                                                onClick = { viewModel.deleteUserByAdmin(u.id) }
                                            ) {
                                                Icon(Icons.Default.DeleteForever, contentDescription = "Delete User", tint = DangerRed)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    AdminTab.SETTINGS -> {
                        item {
                            AdminSettingsForm(settings = settings, onSave = { viewModel.updateSettings(it) })
                        }
                    }

                    AdminTab.NOTIFICATIONS -> {
                        item {
                            AdminBroadcastForm(onSend = { title, msg, type ->
                                viewModel.sendNotification(title, msg, type)
                            })
                        }
                        items(notifications) { notif ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface)
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(notif.title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text(notif.message, fontSize = 12.sp, color = TextSecondary)
                                    }
                                    IconButton(onClick = { viewModel.deleteNotification(notif.id) }) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = DangerRed)
                                    }
                                }
                            }
                        }
                    }

                    AdminTab.TASKS -> {
                        item {
                            AdminTaskForm(onAdd = { title, url, cat, reward ->
                                viewModel.addTask(title, url, cat, reward)
                            })
                        }
                        items(tasks) { task ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface)
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(task.title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text("${task.category} · Reward: +${task.reward.format(2)} TK", fontSize = 12.sp, color = SuccessGreen)
                                    }
                                    IconButton(onClick = { viewModel.deleteTask(task.id) }) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = DangerRed)
                                    }
                                }
                            }
                        }
                    }

                    AdminTab.EVENTS -> {
                        item {
                            AdminEventForm(onAdd = { title, type, reward ->
                                viewModel.addSpecialEvent(title, type, reward)
                            })
                        }
                        item {
                            Text("Special Events & Bonus Offers (${events.size})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                        items(events) { ev ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface)
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(ev.title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text("Type: ${ev.type.uppercase()} · Bonus: +${ev.reward.format(2)} TK", fontSize = 12.sp, color = AccentGold)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Switch(checked = ev.isActive, onCheckedChange = { viewModel.toggleSpecialEvent(ev.id) })
                                        Spacer(modifier = Modifier.width(6.dp))
                                        IconButton(onClick = { viewModel.deleteSpecialEvent(ev.id) }) {
                                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = DangerRed)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    AdminTab.QUIZ -> {
                        item {
                            AdminQuizForm(onAdd = { q, opts, ans, cat ->
                                viewModel.addQuizQuestion(q, opts, ans, cat)
                            })
                        }
                        items(quizQuestions) { q ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Surface)
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(q.question, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        Text("Answer: ${q.options.getOrNull(q.answerIndex) ?: ""} · ${q.category}", fontSize = 11.sp, color = TextSecondary)
                                    }
                                    Switch(checked = q.isActive, onCheckedChange = { viewModel.toggleQuizQuestion(q.id) })
                                }
                            }
                        }
                    }

                    AdminTab.SECURITY -> {
                        item {
                            AdminSecurityForm(onChangePin = { viewModel.changeAdminPin(it) })
                        }
                        item {
                            AdminResetDataCard(
                                onResetAll = {
                                    viewModel.resetAllSystemData {
                                        onBack()
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminStatBox(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = color)
            Text(label, fontSize = 12.sp, color = TextSecondary)
        }
    }
}

@Composable
private fun AdminSettingsForm(settings: AppSettings, onSave: (AppSettings) -> Unit) {
    var appName by remember { mutableStateOf(settings.appName) }
    var appSubtitle by remember { mutableStateOf(settings.appSubtitle) }
    var noticeBanner by remember { mutableStateOf(settings.noticeBanner) }
    var adReward by remember { mutableStateOf(settings.adReward.toString()) }
    var maxAds by remember { mutableStateOf(settings.maxAdsPerDay.toString()) }
    var checkinReward by remember { mutableStateOf(settings.checkinReward.toString()) }
    var minWithdraw by remember { mutableStateOf(settings.minWithdraw.toString()) }
    var chargeRate by remember { mutableStateOf(settings.withdrawCharge.toString()) }
    var usdRate by remember { mutableStateOf(settings.binanceUsdRate.toString()) }
    var telegramLink by remember { mutableStateOf(settings.telegramSupportLink) }
    var adNetwork by remember { mutableStateOf(settings.adNetwork) }
    var adZoneId by remember { mutableStateOf(settings.adZoneId) }
    var refL1 by remember { mutableStateOf(settings.referralRewardRateL1.toString()) }
    var refL2 by remember { mutableStateOf(settings.referralRewardRateL2.toString()) }
    var refL3 by remember { mutableStateOf(settings.referralRewardRateL3.toString()) }
    var gameMin by remember { mutableStateOf(settings.gameMinReward.toString()) }
    var gameMax by remember { mutableStateOf(settings.gameMaxReward.toString()) }
    var bkashOn by remember { mutableStateOf(settings.bkashEnabled) }
    var nagadOn by remember { mutableStateOf(settings.nagadEnabled) }
    var binanceOn by remember { mutableStateOf(settings.binanceEnabled) }
    var rechargeOn by remember { mutableStateOf(settings.rechargeEnabled) }
    var activationOn by remember { mutableStateOf(settings.activationRequired) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        // App Branding & Notice
        Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Surface), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("App Branding & Announcement Banner", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Primary)
                OutlinedTextField(value = appName, onValueChange = { appName = it }, label = { Text("Application Name") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = appSubtitle, onValueChange = { appSubtitle = it }, label = { Text("Tagline / Subtitle") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = noticeBanner, onValueChange = { noticeBanner = it }, label = { Text("Global Notice / Ticker Banner") }, modifier = Modifier.fillMaxWidth())
            }
        }

        // Financial & Earning Configuration
        Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Surface), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Reward & Financial Configuration", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Primary)
                OutlinedTextField(value = adReward, onValueChange = { adReward = it }, label = { Text("Rewarded Video Reward (TK)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = maxAds, onValueChange = { maxAds = it }, label = { Text("Max Ads Per User Daily") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = checkinReward, onValueChange = { checkinReward = it }, label = { Text("Daily Check-in Reward (TK)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = minWithdraw, onValueChange = { minWithdraw = it }, label = { Text("Minimum Withdrawal Limit (TK)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = chargeRate, onValueChange = { chargeRate = it }, label = { Text("Withdrawal Service Fee (%)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = usdRate, onValueChange = { usdRate = it }, label = { Text("Binance USD Exchange Rate (1 USD = ? TK)") }, modifier = Modifier.fillMaxWidth())
            }
        }

        // Payment Gateways Toggles
        Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Surface), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Payment Methods Customization", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Primary)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("bKash Gateway", fontWeight = FontWeight.Medium)
                    Switch(checked = bkashOn, onCheckedChange = { bkashOn = it })
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Nagad Gateway", fontWeight = FontWeight.Medium)
                    Switch(checked = nagadOn, onCheckedChange = { nagadOn = it })
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Binance Pay Gateway", fontWeight = FontWeight.Medium)
                    Switch(checked = binanceOn, onCheckedChange = { binanceOn = it })
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Mobile Recharge Gateway", fontWeight = FontWeight.Medium)
                    Switch(checked = rechargeOn, onCheckedChange = { rechargeOn = it })
                }
            }
        }

        // Referral & Commission Rates
        Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Surface), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Referral Multi-Tier Commission Rates", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Primary)
                OutlinedTextField(value = refL1, onValueChange = { refL1 = it }, label = { Text("Level 1 Commission (%)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = refL2, onValueChange = { refL2 = it }, label = { Text("Level 2 Commission (%)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = refL3, onValueChange = { refL3 = it }, label = { Text("Level 3 Commission (%)") }, modifier = Modifier.fillMaxWidth())
            }
        }

        // Games & Ad Network Settings
        Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Surface), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Games & Ad Network Configuration", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Primary)
                OutlinedTextField(value = gameMin, onValueChange = { gameMin = it }, label = { Text("Game Min Reward (TK)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = gameMax, onValueChange = { gameMax = it }, label = { Text("Game Max Reward (TK)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = adNetwork, onValueChange = { adNetwork = it }, label = { Text("Ad Network Name (e.g. Monetag, AdMob)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = adZoneId, onValueChange = { adZoneId = it }, label = { Text("Ad Placement / Zone ID") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = telegramLink, onValueChange = { telegramLink = it }, label = { Text("Official Telegram Support Link") }, modifier = Modifier.fillMaxWidth())

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Mandatory User Activation Code", fontWeight = FontWeight.Medium)
                        Text("Require admin activation code for new standard users", fontSize = 11.sp, color = TextSecondary)
                    }
                    Switch(checked = activationOn, onCheckedChange = { activationOn = it })
                }
            }
        }

        // Save Button
        Button(
            onClick = {
                onSave(
                    settings.copy(
                        appName = appName.trim().ifEmpty { settings.appName },
                        appSubtitle = appSubtitle.trim(),
                        noticeBanner = noticeBanner.trim(),
                        adReward = adReward.toDoubleOrNull() ?: settings.adReward,
                        maxAdsPerDay = maxAds.toIntOrNull() ?: settings.maxAdsPerDay,
                        checkinReward = checkinReward.toDoubleOrNull() ?: settings.checkinReward,
                        minWithdraw = minWithdraw.toDoubleOrNull() ?: settings.minWithdraw,
                        withdrawCharge = chargeRate.toDoubleOrNull() ?: settings.withdrawCharge,
                        binanceUsdRate = usdRate.toDoubleOrNull() ?: settings.binanceUsdRate,
                        bkashEnabled = bkashOn,
                        nagadEnabled = nagadOn,
                        binanceEnabled = binanceOn,
                        rechargeEnabled = rechargeOn,
                        referralRewardRateL1 = refL1.toDoubleOrNull() ?: settings.referralRewardRateL1,
                        referralRewardRateL2 = refL2.toDoubleOrNull() ?: settings.referralRewardRateL2,
                        referralRewardRateL3 = refL3.toDoubleOrNull() ?: settings.referralRewardRateL3,
                        gameMinReward = gameMin.toDoubleOrNull() ?: settings.gameMinReward,
                        gameMaxReward = gameMax.toDoubleOrNull() ?: settings.gameMaxReward,
                        adNetwork = adNetwork.trim().ifEmpty { settings.adNetwork },
                        adZoneId = adZoneId.trim().ifEmpty { settings.adZoneId },
                        telegramSupportLink = telegramLink.trim(),
                        activationRequired = activationOn
                    )
                )
            },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Secondary)
        ) {
            Icon(Icons.Default.Save, contentDescription = null, tint = Surface)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Save All Settings", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun AdminEventForm(onAdd: (String, String, Double) -> Unit) {
    var title by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("bonus") }
    var reward by remember { mutableStateOf("5.00") }

    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Surface), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Create Special Event / Bonus", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Event Title") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = type, onValueChange = { type = it }, label = { Text("Type (e.g. bonus, challenge, festival)") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = reward, onValueChange = { reward = it }, label = { Text("Reward Amount (TK)") }, modifier = Modifier.fillMaxWidth())

            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        onAdd(title, type, reward.toDoubleOrNull() ?: 5.0)
                        title = ""
                        reward = "5.00"
                    }
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                Text("Publish Event Offer")
            }
        }
    }
}

@Composable
private fun AdminBroadcastForm(onSend: (String, String, String) -> Unit) {
    var title by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }

    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Surface), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Broadcast Notification", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = message, onValueChange = { message = it }, label = { Text("Message") }, modifier = Modifier.fillMaxWidth())

            Button(
                onClick = {
                    if (title.isNotBlank() && message.isNotBlank()) {
                        onSend(title, message, "info")
                        title = ""
                        message = ""
                    }
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                Text("Send Broadcast to All Users")
            }
        }
    }
}

@Composable
private fun AdminTaskForm(onAdd: (String, String, String, Double) -> Unit) {
    var title by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }
    var reward by remember { mutableStateOf("1.00") }

    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Surface), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Add New Daily Task", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Task Title") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = url, onValueChange = { url = it }, label = { Text("Target URL") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = reward, onValueChange = { reward = it }, label = { Text("Reward Amount (TK)") }, modifier = Modifier.fillMaxWidth())

            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        onAdd(title, url, "youtube", reward.toDoubleOrNull() ?: 1.0)
                        title = ""
                        url = ""
                    }
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Secondary)
            ) {
                Text("Create Task")
            }
        }
    }
}

@Composable
private fun AdminQuizForm(onAdd: (String, List<String>, Int, String) -> Unit) {
    var question by remember { mutableStateOf("") }
    var opt0 by remember { mutableStateOf("") }
    var opt1 by remember { mutableStateOf("") }
    var opt2 by remember { mutableStateOf("") }
    var opt3 by remember { mutableStateOf("") }

    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Surface), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Add Question to Quiz Bank", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            OutlinedTextField(value = question, onValueChange = { question = it }, label = { Text("Question") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = opt0, onValueChange = { opt0 = it }, label = { Text("Option 1 (Correct Answer)") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = opt1, onValueChange = { opt1 = it }, label = { Text("Option 2") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = opt2, onValueChange = { opt2 = it }, label = { Text("Option 3") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = opt3, onValueChange = { opt3 = it }, label = { Text("Option 4") }, modifier = Modifier.fillMaxWidth())

            Button(
                onClick = {
                    if (question.isNotBlank() && opt0.isNotBlank()) {
                        onAdd(question, listOf(opt0, opt1, opt2, opt3), 0, "General Knowledge")
                        question = ""
                        opt0 = ""
                        opt1 = ""
                        opt2 = ""
                        opt3 = ""
                    }
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Secondary)
            ) {
                Text("Add Quiz Question")
            }
        }
    }
}

@Composable
private fun AdminSecurityForm(onChangePin: (String) -> Unit) {
    var newPin by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }

    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Surface), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Change Admin Security PIN", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            OutlinedTextField(value = newPin, onValueChange = { newPin = it; message = null }, label = { Text("New PIN (6 digits)") }, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = confirmPin, onValueChange = { confirmPin = it; message = null }, label = { Text("Confirm PIN") }, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())

            if (message != null) {
                Text(message!!, color = if (message!!.contains("updated", true)) SuccessGreen else DangerRed, fontSize = 12.sp)
            }

            Button(
                onClick = {
                    if (newPin.length < 6) {
                        message = "PIN must be at least 6 digits"
                    } else if (newPin != confirmPin) {
                        message = "PINs do not match"
                    } else {
                        onChangePin(newPin)
                        message = "Admin PIN updated successfully!"
                        newPin = ""
                        confirmPin = ""
                    }
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Secondary)
            ) {
                Text("Update PIN")
            }
        }
    }
}

@Composable
private fun AdminResetDataCard(onResetAll: () -> Unit) {
    var showDialog by remember { mutableStateOf(false) }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DangerRedLight),
        modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Clear All Previous Account Data", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = DangerRed)
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                "Permanently purges all user accounts, transactions, game histories, and balances while retaining the base quiz questions and task configurations.",
                fontSize = 12.sp,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(14.dp))
            Button(
                onClick = { showDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = DangerRed),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth().height(46.dp)
            ) {
                Icon(Icons.Default.DeleteForever, contentDescription = null, tint = Surface)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Purge All Account Data", fontWeight = FontWeight.Bold)
            }
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("Purge All Account Data?", fontWeight = FontWeight.Bold) },
            text = { Text("Are you absolutely sure? All registered accounts, history, and earnings will be permanently wiped.") },
            confirmButton = {
                Button(
                    onClick = {
                        showDialog = false
                        onResetAll()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DangerRed)
                ) {
                    Text("Confirm Purge")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
