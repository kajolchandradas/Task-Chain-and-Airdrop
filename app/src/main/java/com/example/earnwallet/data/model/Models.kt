package com.example.earnwallet.data.model

data class User(
    val id: Int,
    val fullName: String,
    val email: String,
    val password: String,
    val referralCode: String,
    val referredBy: String? = null,
    val balance: Double = 0.0,
    val totalEarned: Double = 0.0,
    val isActive: Boolean = false,
    val isBanned: Boolean = false,
    val createdAt: String,
    val lastLogin: String,
    val isAdmin: Boolean = false,
    val profilePhoto: String? = null
)

data class Transaction(
    val id: Int,
    val userId: Int,
    val type: String, // "ads", "task", "game", "checkin", "event", "withdrawal"
    val amount: Double,
    val description: String,
    val source: String, // "Ads", "Daily Task", "Games", "Event Bonus", "Withdrawal"
    val createdAt: String
)

data class Withdrawal(
    val id: Int,
    val userId: Int,
    val amount: Double,
    val charge: Double,
    val netAmount: Double,
    val withdrawMethod: String, // "binance", "bkash", "nagad", "recharge"
    val accountNumber: String,
    val status: String, // "pending", "approved", "rejected"
    val createdAt: String
)

data class Task(
    val id: Int,
    val title: String,
    val url: String,
    val category: String, // "youtube", "facebook", "telegram", "tiktok", "twitter", "other"
    val reward: Double,
    val isActive: Boolean = true
)

data class ActivationRequest(
    val id: Int,
    val userId: Int,
    val email: String,
    val status: String, // "pending", "approved", "used", "expired"
    val code: String? = null,
    val createdAt: String,
    val expiresAt: String? = null
)

data class PasswordResetRequest(
    val id: Int,
    val userId: Int,
    val email: String,
    val status: String, // "pending", "approved", "used", "expired"
    val code: String? = null,
    val createdAt: String,
    val expiresAt: String? = null
)

data class SupportMessage(
    val id: Int,
    val conversationId: Int,
    val userId: Int,
    val sender: String, // "user", "admin", "ai"
    val message: String,
    val createdAt: String
)

data class SupportConversation(
    val id: Int,
    val userId: Int,
    val status: String = "open", // "open", "closed"
    val createdAt: String
)

data class QuizQuestion(
    val id: Int,
    val question: String,
    val options: List<String>,
    val answerIndex: Int,
    val category: String,
    val isActive: Boolean = true
)

data class NotificationItem(
    val id: Int,
    val title: String,
    val message: String,
    val type: String, // "info", "warning", "success", "error"
    val createdAt: String,
    val userId: Int? = null,
    val isRead: Boolean = false
)

data class SpecialEvent(
    val id: Int,
    val title: String,
    val type: String,
    val reward: Double,
    val isActive: Boolean = true
)

data class AppSettings(
    val appName: String = "Earn Wallet",
    val appSubtitle: String = "Watch, Play & Earn Real Money",
    val noticeBanner: String = "Welcome to Earn Wallet! Complete tasks, watch ads, and invite friends to earn real money.",
    val adsEnabled: Boolean = true,
    val adReward: Double = 0.50,
    val maxAdsPerDay: Int = 10,
    val checkinReward: Double = 0.50,
    val minWithdraw: Double = 50.0,
    val withdrawCharge: Double = 10.0,
    val binanceUsdRate: Double = 110.0,
    val bkashEnabled: Boolean = true,
    val nagadEnabled: Boolean = true,
    val binanceEnabled: Boolean = true,
    val rechargeEnabled: Boolean = true,
    val freePlaysPerDay: Int = 1,
    val adPlaysPerGame: Int = 1,
    val gameMinReward: Double = 0.10,
    val gameMaxReward: Double = 3.00,
    val activationRequired: Boolean = true,
    val telegramSupportLink: String = "https://t.me/taskchainairdrop",
    val referralRewardRateL1: Double = 10.0,
    val referralRewardRateL2: Double = 5.0,
    val referralRewardRateL3: Double = 2.5,
    val adNetwork: String = "Monetag",
    val adZoneId: String = "897654"
)
