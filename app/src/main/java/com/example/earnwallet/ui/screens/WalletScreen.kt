package com.example.earnwallet.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.earnwallet.data.model.Withdrawal
import com.example.earnwallet.data.repository.format
import com.example.earnwallet.ui.theme.*
import com.example.earnwallet.ui.viewmodel.EarnViewModel

enum class WalletSubTab { WITHDRAW, HISTORY }

data class WithdrawMethodOption(
    val id: String,
    val label: String,
    val subtitle: String,
    val color: Color,
    val iconName: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WalletScreen(
    viewModel: EarnViewModel,
    onOpenLeaderboard: () -> Unit
) {
    val user by viewModel.currentUser.collectAsState()
    val withdrawals by viewModel.withdrawals.collectAsState()
    val transactions by viewModel.transactions.collectAsState()
    val settings by viewModel.settings.collectAsState()

    var activeTab by remember { mutableStateOf(WalletSubTab.WITHDRAW) }
    var selectedMethod by remember { mutableStateOf("bkash") }
    var accountNumber by remember { mutableStateOf("") }
    var amountText by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val allMethods = listOf(
        WithdrawMethodOption("binance", "Binance Pay", "UID দিয়ে USD পাবেন", Color(0xFFF0B90B), "binance"),
        WithdrawMethodOption("bkash", "bKash", "01XXXXXXXXX", Color(0xFFE2136E), "bkash"),
        WithdrawMethodOption("nagad", "Nagad", "01XXXXXXXXX", Color(0xFFF7941E), "nagad"),
        WithdrawMethodOption("recharge", "Mobile Recharge", "যেকোনো নম্বরে রিচার্জ", Color(0xFF10B981), "recharge")
    )
    val methods = allMethods.filter {
        when (it.id) {
            "binance" -> settings.binanceEnabled
            "bkash" -> settings.bkashEnabled
            "nagad" -> settings.nagadEnabled
            "recharge" -> settings.rechargeEnabled
            else -> true
        }
    }

    val enteredAmount = amountText.toDoubleOrNull() ?: 0.0
    val chargeAmount = (enteredAmount * settings.withdrawCharge) / 100.0
    val netAmount = (enteredAmount - chargeAmount).coerceAtLeast(0.0)
    val usdNet = if (settings.binanceUsdRate > 0) netAmount / settings.binanceUsdRate else 0.0

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
                            colors = listOf(SuccessGreen, Color(0xFF065F46))
                        )
                    )
                    .padding(horizontal = 20.dp, vertical = 24.dp)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "Available Balance",
                        fontSize = 13.sp,
                        color = Surface.copy(alpha = 0.85f)
                    )
                    Text(
                        text = "${user?.balance?.format(2) ?: "0.00"} TK",
                        fontSize = 38.sp,
                        fontWeight = FontWeight.Bold,
                        color = Surface
                    )
                    Text(
                        text = "Total Earned: ${user?.totalEarned?.format(2) ?: "0.00"} TK",
                        fontSize = 12.sp,
                        color = Surface.copy(alpha = 0.8f),
                        modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
                    )

                    Button(
                        onClick = onOpenLeaderboard,
                        colors = ButtonDefaults.buttonColors(containerColor = Surface.copy(alpha = 0.2f)),
                        shape = RoundedCornerShape(50),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.EmojiEvents, contentDescription = null, tint = AccentGold, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("View Leaderboard", color = Surface, fontSize = 12.sp)
                    }
                }
            }
        }

        // Segmented Tab (Withdraw vs History)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Surface)
                    .padding(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (activeTab == WalletSubTab.WITHDRAW) Primary else Color.Transparent)
                        .clickable { activeTab = WalletSubTab.WITHDRAW }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Withdraw Funds",
                        color = if (activeTab == WalletSubTab.WITHDRAW) Surface else TextSecondary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    )
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (activeTab == WalletSubTab.HISTORY) Primary else Color.Transparent)
                        .clickable { activeTab = WalletSubTab.HISTORY }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Withdrawal History",
                        color = if (activeTab == WalletSubTab.HISTORY) Surface else TextSecondary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    )
                }
            }
        }

        if (activeTab == WalletSubTab.WITHDRAW) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            text = "Select Payment Method",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Text(
                            text = "Min withdrawal: ${settings.minWithdraw.format(0)} TK · Processing fee: ${settings.withdrawCharge.format(0)}%",
                            fontSize = 12.sp,
                            color = TextSecondary,
                            modifier = Modifier.padding(bottom = 14.dp)
                        )

                        // 2x2 Payment methods grid
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            methods.chunked(2).forEach { rowMethods ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    rowMethods.forEach { method ->
                                        val isSelected = selectedMethod == method.id
                                        Card(
                                            modifier = Modifier
                                                .weight(1f)
                                                .clickable { selectedMethod = method.id },
                                            shape = RoundedCornerShape(12.dp),
                                            colors = CardDefaults.cardColors(
                                                containerColor = if (isSelected) method.color.copy(alpha = 0.12f) else SurfaceVariant
                                            ),
                                            border = if (isSelected) ButtonDefaults.outlinedButtonBorder else null
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(12.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(34.dp)
                                                        .clip(RoundedCornerShape(8.dp))
                                                        .background(method.color.copy(alpha = 0.2f)),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Icon(
                                                        imageVector = if (method.id == "binance") Icons.Default.CurrencyBitcoin else Icons.Default.PhoneAndroid,
                                                        contentDescription = null,
                                                        tint = method.color,
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                }
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Column {
                                                    Text(
                                                        text = method.label,
                                                        fontSize = 13.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                        color = if (isSelected) method.color else TextPrimary
                                                    )
                                                    Text(
                                                        text = method.subtitle,
                                                        fontSize = 10.sp,
                                                        color = TextSecondary
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (selectedMethod == "binance") {
                            Spacer(modifier = Modifier.height(12.dp))
                            Card(
                                shape = RoundedCornerShape(10.dp),
                                colors = CardDefaults.cardColors(containerColor = AccentGoldLight),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFB45309), modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "1 USD = ${settings.binanceUsdRate.format(0)} TK হিসেবে পাবেন। আপনার Binance Pay UID দিন।",
                                        fontSize = 12.sp,
                                        color = Color(0xFF7B5C00)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Account Input
                        OutlinedTextField(
                            value = accountNumber,
                            onValueChange = { accountNumber = it; errorMessage = null },
                            label = {
                                Text(if (selectedMethod == "binance") "Binance Pay UID" else "Account Number (01XXXXXXXXX)")
                            },
                            leadingIcon = {
                                Icon(
                                    imageVector = if (selectedMethod == "binance") Icons.Default.VpnKey else Icons.Default.Phone,
                                    contentDescription = null,
                                    tint = Primary
                                )
                            },
                            modifier = Modifier.fillMaxWidth().testTag("withdraw_account_input"),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Amount Input
                        OutlinedTextField(
                            value = amountText,
                            onValueChange = { amountText = it; errorMessage = null },
                            label = { Text("Amount (Minimum ${settings.minWithdraw.format(0)} TK)") },
                            leadingIcon = {
                                Icon(Icons.Default.AttachMoney, contentDescription = null, tint = SuccessGreen)
                            },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth().testTag("withdraw_amount_input"),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp)
                        )

                        // Live Calculation Preview
                        if (enteredAmount > 0) {
                            Spacer(modifier = Modifier.height(14.dp))
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = SurfaceVariant),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Requested Amount:", fontSize = 12.sp, color = TextSecondary)
                                        Text("${enteredAmount.format(2)} TK", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                    }
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Service Charge (${settings.withdrawCharge.format(0)}%):", fontSize = 12.sp, color = TextSecondary)
                                        Text("-${chargeAmount.format(2)} TK", fontSize = 12.sp, color = DangerRed, fontWeight = FontWeight.SemiBold)
                                    }
                                    HorizontalDivider(modifier = Modifier.padding(vertical = 6.dp), color = Border)
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("You will receive:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                        if (selectedMethod == "binance") {
                                            Text("${usdNet.format(4)} USD", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF0B90B))
                                        } else {
                                            Text("${netAmount.format(2)} TK", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SuccessGreen)
                                        }
                                    }
                                }
                            }
                        }

                        if (errorMessage != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(errorMessage!!, color = DangerRed, fontSize = 12.sp)
                        }

                        Spacer(modifier = Modifier.height(18.dp))

                        Button(
                            onClick = {
                                if (accountNumber.isBlank() || enteredAmount <= 0) {
                                    errorMessage = "Please enter valid account and amount"
                                } else {
                                    viewModel.submitWithdrawal(
                                        amount = enteredAmount,
                                        method = selectedMethod,
                                        account = accountNumber,
                                        onSuccess = {
                                            accountNumber = ""
                                            amountText = ""
                                            activeTab = WalletSubTab.HISTORY
                                        },
                                        onError = { errorMessage = it }
                                    )
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .testTag("submit_withdraw_button"),
                            colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text("Submit Withdrawal Request", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        } else {
            // History Tab
            item {
                Text(
                    text = "Withdrawal Requests",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    modifier = Modifier.padding(start = 16.dp, bottom = 8.dp)
                )
            }

            if (withdrawals.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Surface)
                    ) {
                        Text(
                            text = "No withdrawal requests yet",
                            color = TextSecondary,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(24.dp)
                        )
                    }
                }
            } else {
                items(withdrawals) { wd ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 5.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clip(CircleShape)
                                        .background(
                                            when (wd.status) {
                                                "approved" -> SuccessGreenLight
                                                "rejected" -> DangerRedLight
                                                else -> AccentGoldLight
                                            }
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = when (wd.status) {
                                            "approved" -> Icons.Default.CheckCircle
                                            "rejected" -> Icons.Default.Cancel
                                            else -> Icons.Default.Schedule
                                        },
                                        contentDescription = null,
                                        tint = when (wd.status) {
                                            "approved" -> SuccessGreen
                                            "rejected" -> DangerRed
                                            else -> AccentGold
                                        },
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(
                                        text = "${wd.withdrawMethod.uppercase()} · ${wd.accountNumber}",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = TextPrimary
                                    )
                                    Text(
                                        text = "${wd.createdAt} · Charge: -${wd.charge.format(2)} TK",
                                        fontSize = 11.sp,
                                        color = TextSecondary
                                    )
                                }
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = if (wd.withdrawMethod == "binance") "${(wd.netAmount / settings.binanceUsdRate).format(4)} USD" else "${wd.netAmount.format(2)} TK",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = wd.status.uppercase(),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = when (wd.status) {
                                        "approved" -> SuccessGreen
                                        "rejected" -> DangerRed
                                        else -> AccentGold
                                    }
                                )
                            }
                        }
                    }
                }
            }

            // Recent Income Transactions
            item {
                Text(
                    text = "Recent Transactions",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 8.dp)
                )
            }

            items(transactions.take(15)) { tx ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        if (tx.amount >= 0) SuccessGreenLight else DangerRedLight
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (tx.amount >= 0) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                                    contentDescription = null,
                                    tint = if (tx.amount >= 0) SuccessGreen else DangerRed,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = tx.description,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "${tx.source} · ${tx.createdAt}",
                                    fontSize = 11.sp,
                                    color = TextSecondary
                                )
                            }
                        }

                        Text(
                            text = "${if (tx.amount >= 0) "+" else ""}${tx.amount.format(2)} TK",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (tx.amount >= 0) SuccessGreen else DangerRed
                        )
                    }
                }
            }
        }
    }
}
