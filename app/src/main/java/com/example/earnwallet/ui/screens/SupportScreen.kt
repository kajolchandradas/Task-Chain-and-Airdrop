package com.example.earnwallet.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.earnwallet.ui.theme.*
import com.example.earnwallet.ui.viewmodel.EarnViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportScreen(
    viewModel: EarnViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val messages by viewModel.supportMessages.collectAsState()
    val settings by viewModel.settings.collectAsState()
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    val quickQuestions = listOf(
        "Withdraw কিভাবে করবো?",
        "Balance কোথায় দেখবো?",
        "Referral code কোথায়?",
        "Game কিভাবে খেলবো?",
        "Account ban হলে কি করবো?",
        "Daily check-in কি?"
    )

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(Surface.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.SmartToy, contentDescription = null, tint = Surface)
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text("AI + Live Support", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF4ADE80))
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Online 24/7", fontSize = 11.sp, color = Surface.copy(alpha = 0.8f))
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Secondary,
                    titleContentColor = Surface,
                    navigationIconContentColor = Surface
                )
            )
        },
        bottomBar = {
            // Message Input Bar
            Surface(
                modifier = Modifier.fillMaxWidth().navigationBarsPadding(),
                color = Surface,
                tonalElevation = 4.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        placeholder = { Text("আপনার প্রশ্ন লিখুন...") },
                        modifier = Modifier.weight(1f).testTag("support_input"),
                        shape = RoundedCornerShape(24.dp),
                        singleLine = false,
                        maxLines = 3
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            if (inputText.isNotBlank()) {
                                viewModel.sendSupportMessage(inputText)
                                inputText = ""
                            }
                        },
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(Primary)
                            .testTag("send_support_button")
                    ) {
                        Icon(Icons.Default.Send, contentDescription = "Send", tint = Surface)
                    }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Background)
        ) {
            // Telegram Banner
            if (settings.telegramSupportLink.isNotBlank()) {
                Surface(
                    color = Color(0xFFE0F2FE),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            runCatching {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(settings.telegramSupportLink)))
                            }
                        }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Send, contentDescription = null, tint = Color(0xFF0284C7), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Admin এর সাথে সরাসরি Telegram এ কথা বলুন",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF0369A1),
                            modifier = Modifier.weight(1f)
                        )
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color(0xFF0369A1))
                    }
                }
            }

            // Quick Questions FlowRow
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = "Quick Inquiries:",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    quickQuestions.take(3).forEach { q ->
                        SuggestionChip(
                            onClick = { viewModel.sendSupportMessage(q) },
                            label = { Text(q, fontSize = 11.sp) },
                            shape = RoundedCornerShape(20.dp)
                        )
                    }
                }
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    quickQuestions.drop(3).forEach { q ->
                        SuggestionChip(
                            onClick = { viewModel.sendSupportMessage(q) },
                            label = { Text(q, fontSize = 11.sp) },
                            shape = RoundedCornerShape(20.dp)
                        )
                    }
                }
            }

            HorizontalDivider(color = Border)

            // Message Stream
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Initial AI Greeting message
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Start
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Primary.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.SmartToy, contentDescription = null, tint = Primary, modifier = Modifier.size(18.dp))
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Card(
                            shape = RoundedCornerShape(topStart = 0.dp, topEnd = 16.dp, bottomStart = 16.dp, bottomEnd = 16.dp),
                            colors = CardDefaults.cardColors(containerColor = Surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier.widthIn(max = 280.dp)
                        ) {
                            Text(
                                text = "আমি AI Support Assistant! আপনার যেকোনো প্রশ্নের উত্তর দিতে প্রস্তুত। উপরে দেওয়া দ্রুত প্রশ্ন বা নিচে লিখে পাঠান।",
                                fontSize = 13.sp,
                                color = TextPrimary,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }
                }

                items(messages) { msg ->
                    val isMe = msg.sender == "user"
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start
                    ) {
                        if (!isMe) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(Primary.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.SmartToy, contentDescription = null, tint = Primary, modifier = Modifier.size(18.dp))
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                        }

                        Card(
                            shape = if (isMe) {
                                RoundedCornerShape(topStart = 16.dp, topEnd = 0.dp, bottomStart = 16.dp, bottomEnd = 16.dp)
                            } else {
                                RoundedCornerShape(topStart = 0.dp, topEnd = 16.dp, bottomStart = 16.dp, bottomEnd = 16.dp)
                            },
                            colors = CardDefaults.cardColors(
                                containerColor = if (isMe) Primary else Surface
                            ),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier.widthIn(max = 280.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = msg.message,
                                    fontSize = 13.sp,
                                    color = if (isMe) Surface else TextPrimary
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = msg.createdAt,
                                    fontSize = 10.sp,
                                    color = if (isMe) Surface.copy(alpha = 0.7f) else TextMuted
                                )
                            }
                        }

                        if (isMe) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(Primary),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = Surface, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
