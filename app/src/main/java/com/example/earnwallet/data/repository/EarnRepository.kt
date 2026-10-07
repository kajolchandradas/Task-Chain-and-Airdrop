package com.example.earnwallet.data.repository

import com.example.earnwallet.data.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.*
import kotlin.random.Random

class EarnRepository private constructor() {

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
    private val dayFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private fun now(): String = dateFormat.format(Date())
    private fun today(): String = dayFormat.format(Date())

    // In-memory data structures
    private val _users = MutableStateFlow<List<User>>(emptyList())
    val users: StateFlow<List<User>> = _users.asStateFlow()

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    private val _transactions = MutableStateFlow<List<Transaction>>(emptyList())
    val transactions: StateFlow<List<Transaction>> = _transactions.asStateFlow()

    private val _withdrawals = MutableStateFlow<List<Withdrawal>>(emptyList())
    val withdrawals: StateFlow<List<Withdrawal>> = _withdrawals.asStateFlow()

    private val _tasks = MutableStateFlow<List<Task>>(emptyList())
    val tasks: StateFlow<List<Task>> = _tasks.asStateFlow()

    private val _completedTaskIds = MutableStateFlow<Set<String>>(emptySet()) // "userId:taskId"
    val completedTaskIds: StateFlow<Set<String>> = _completedTaskIds.asStateFlow()

    private val _checkIns = MutableStateFlow<Set<String>>(emptySet()) // "userId:date"
    val checkIns: StateFlow<Set<String>> = _checkIns.asStateFlow()

    private val _adWatches = MutableStateFlow<Map<String, Int>>(emptyMap()) // "userId:date" -> count
    val adWatches: StateFlow<Map<String, Int>> = _adWatches.asStateFlow()

    private val _gamesPlayed = MutableStateFlow<Map<String, Int>>(emptyMap()) // "userId:date:gameType" -> count
    val gamesPlayed: StateFlow<Map<String, Int>> = _gamesPlayed.asStateFlow()

    private val _claimedEvents = MutableStateFlow<Set<String>>(emptySet()) // "userId:eventId"
    val claimedEvents: StateFlow<Set<String>> = _claimedEvents.asStateFlow()

    private val _activationRequests = MutableStateFlow<List<ActivationRequest>>(emptyList())
    val activationRequests: StateFlow<List<ActivationRequest>> = _activationRequests.asStateFlow()

    private val _passwordResetRequests = MutableStateFlow<List<PasswordResetRequest>>(emptyList())
    val passwordResetRequests: StateFlow<List<PasswordResetRequest>> = _passwordResetRequests.asStateFlow()

    private val _notifications = MutableStateFlow<List<NotificationItem>>(emptyList())
    val notifications: StateFlow<List<NotificationItem>> = _notifications.asStateFlow()

    private val _supportMessages = MutableStateFlow<List<SupportMessage>>(emptyList())
    val supportMessages: StateFlow<List<SupportMessage>> = _supportMessages.asStateFlow()

    private val _quizQuestions = MutableStateFlow<List<QuizQuestion>>(emptyList())
    val quizQuestions: StateFlow<List<QuizQuestion>> = _quizQuestions.asStateFlow()

    private val _events = MutableStateFlow<List<SpecialEvent>>(emptyList())
    val events: StateFlow<List<SpecialEvent>> = _events.asStateFlow()

    private val _settings = MutableStateFlow(AppSettings())
    val settings: StateFlow<AppSettings> = _settings.asStateFlow()

    private var nextUserId = 3
    private var nextTransactionId = 1
    private var nextWithdrawalId = 1
    private var nextActivationId = 1
    private var nextResetId = 1
    private var nextTaskId = 5
    private var nextNotifId = 4
    private var nextMsgId = 1
    private var nextQuizId = 26
    private var nextEventId = 3

    var adminPin: String = "123456"

    init {
        seedInitialData()
    }

    private fun seedInitialData() {
        // kajolchandradas3@gmail.com is the permanent admin account, active without any activation code requirement.
        val defaultAdmin = User(
            id = 1,
            fullName = "Kajol Chandra Das (Admin)",
            email = "kajolchandradas3@gmail.com",
            password = "admin",
            referralCode = "admin",
            balance = 100.0,
            totalEarned = 100.0,
            isActive = true,
            isBanned = false,
            createdAt = now(),
            lastLogin = now(),
            isAdmin = true
        )

        _users.value = listOf(defaultAdmin)
        _currentUser.value = null

        _tasks.value = listOf(
            Task(1, "Visit Telegram Community", "https://t.me/taskchainairdrop", "telegram", 1.00, true),
            Task(2, "Watch YouTube Tutorial", "https://youtube.com", "youtube", 1.50, true),
            Task(3, "Join Facebook Group", "https://facebook.com", "facebook", 0.50, true),
            Task(4, "Follow on Twitter / X", "https://twitter.com", "twitter", 0.80, true)
        )

        _events.value = listOf(
            SpecialEvent(1, "Welcome Starter Bonus", "bonus", 5.00, true),
            SpecialEvent(2, "Weekly Super Earner Challenge", "challenge", 10.00, true)
        )

        _notifications.value = listOf(
            NotificationItem(1, "Welcome to Earn Wallet", "Complete tasks, play games, and watch ads to earn TK daily!", "info", now(), null, false),
            NotificationItem(2, "Daily Check-in Active", "Don't forget to claim your daily check-in bonus today.", "success", now(), null, false),
            NotificationItem(3, "Withdrawal Options", "We now support instant Binance Pay USD, bKash, and Nagad!", "warning", now(), null, false)
        )

        _quizQuestions.value = listOf(
            QuizQuestion(1, "What is the capital city of Bangladesh?", listOf("Dhaka", "Chattogram", "Sylhet", "Rajshahi"), 0, "Geography"),
            QuizQuestion(2, "In which year did Bangladesh gain independence?", listOf("1969", "1971", "1972", "1975"), 1, "History"),
            QuizQuestion(3, "Which planet is known as the Red Planet?", listOf("Venus", "Jupiter", "Mars", "Mercury"), 2, "Science"),
            QuizQuestion(4, "Which is the largest ocean on Earth?", listOf("Atlantic", "Indian", "Pacific", "Arctic"), 2, "Geography"),
            QuizQuestion(5, "What is the national flower of Bangladesh?", listOf("Rose", "Water lily (Shapla)", "Sunflower", "Tulip"), 1, "Culture"),
            QuizQuestion(6, "Which country gifted the Statue of Liberty to the USA?", listOf("France", "Canada", "Italy", "Spain"), 0, "History"),
            QuizQuestion(7, "How many continents are there in the world?", listOf("5", "6", "7", "8"), 2, "General Knowledge"),
            QuizQuestion(8, "What is the chemical formula for water?", listOf("CO2", "H2O", "O2", "NaCl"), 1, "Science"),
            QuizQuestion(9, "Which country is famous for the Great Wall?", listOf("Japan", "China", "India", "Mongolia"), 1, "World"),
            QuizQuestion(10, "What is the currency of Japan?", listOf("Won", "Yuan", "Yen", "Ringgit"), 2, "World"),
            QuizQuestion(11, "Which gas do humans primarily need to breathe?", listOf("Oxygen", "Helium", "Hydrogen", "Nitrogen"), 0, "Science"),
            QuizQuestion(12, "Which is the longest river in Bangladesh?", listOf("Padma", "Meghna", "Jamuna", "Surma"), 1, "Geography"),
            QuizQuestion(13, "Where were the first modern Olympic Games held?", listOf("Greece", "France", "United Kingdom", "Italy"), 0, "History"),
            QuizQuestion(14, "How many days are there in a leap year?", listOf("364", "365", "366", "367"), 2, "General Knowledge"),
            QuizQuestion(15, "What is the national animal of Bangladesh?", listOf("Royal Bengal Tiger", "Lion", "Elephant", "Deer"), 0, "Culture")
        )

        _transactions.value = emptyList()
        _withdrawals.value = emptyList()
        _activationRequests.value = emptyList()
        _passwordResetRequests.value = emptyList()
        _supportMessages.value = emptyList()
        _completedTaskIds.value = emptySet()
        _checkIns.value = emptySet()
        _adWatches.value = emptyMap()
        _gamesPlayed.value = emptyMap()
        _claimedEvents.value = emptySet()
    }

    // --- Authentication & Account Lifecycle ---

    fun login(email: String, pass: String): Result<User> {
        val normalizedEmail = email.trim().lowercase()
        val isAdminEmail = normalizedEmail == ADMIN_EMAIL

        var user = _users.value.find { it.email.equals(normalizedEmail, ignoreCase = true) }

        // If it's the designated admin email and not registered yet, automatically register and log in as admin
        if (user == null && isAdminEmail) {
            val adminUser = User(
                id = nextUserId++,
                fullName = "Kajol Chandra Das (Admin)",
                email = ADMIN_EMAIL,
                password = pass,
                referralCode = "admin",
                balance = 100.0,
                totalEarned = 100.0,
                isActive = true,
                isBanned = false,
                createdAt = now(),
                lastLogin = now(),
                isAdmin = true
            )
            _users.value = _users.value + adminUser
            user = adminUser
        }

        if (user == null) {
            return Result.failure(Exception("No account found with this email"))
        }

        if (user.password != pass) {
            return Result.failure(Exception("Invalid password"))
        }
        if (user.isBanned) {
            return Result.failure(Exception("This account is suspended"))
        }

        // Admin account never requires activation code; other accounts require activation if inactive
        val effectiveIsAdmin = isAdminEmail || user.isAdmin
        if (!user.isActive && !effectiveIsAdmin) {
            return Result.failure(Exception("ACCOUNT_NOT_ACTIVE"))
        }

        val updated = user.copy(
            lastLogin = now(),
            isActive = if (effectiveIsAdmin) true else user.isActive,
            isAdmin = effectiveIsAdmin
        )
        updateUser(updated)
        _currentUser.value = updated
        return Result.success(updated)
    }

    fun register(fullName: String, email: String, pass: String, refCode: String?): Result<User> {
        val normalizedEmail = email.trim().lowercase()
        val isAdminEmail = normalizedEmail == ADMIN_EMAIL

        if (_users.value.any { it.email.equals(normalizedEmail, ignoreCase = true) }) {
            return Result.failure(Exception("Email is already registered"))
        }
        if (pass.length < 6) {
            return Result.failure(Exception("Password must be at least 6 characters"))
        }

        val cleanRef = refCode?.trim()?.takeIf { it.isNotEmpty() }
        if (cleanRef != null && _users.value.none { it.referralCode.equals(cleanRef, ignoreCase = true) }) {
            return Result.failure(Exception("Invalid referral code"))
        }

        // kajolchandradas3@gmail.com does not require activation code; standard users require activation based on settings
        val activationNeeded = if (isAdminEmail) false else _settings.value.activationRequired
        val newUserId = nextUserId++
        val generatedRefCode = normalizedEmail.substringBefore("@") + Random.nextInt(100, 999)

        val newUser = User(
            id = newUserId,
            fullName = if (isAdminEmail && fullName.isBlank()) "Kajol Chandra Das (Admin)" else fullName.trim(),
            email = normalizedEmail,
            password = pass,
            referralCode = if (isAdminEmail) "admin" else generatedRefCode,
            referredBy = cleanRef,
            balance = 0.0,
            totalEarned = 0.0,
            isActive = !activationNeeded,
            isBanned = false,
            createdAt = now(),
            lastLogin = now(),
            isAdmin = isAdminEmail
        )

        _users.value = _users.value + newUser

        if (activationNeeded) {
            val req = ActivationRequest(
                id = nextActivationId++,
                userId = newUserId,
                email = newUser.email,
                status = "pending",
                createdAt = now()
            )
            _activationRequests.value = _activationRequests.value + req
            return Result.failure(Exception("ACCOUNT_CREATED_NEEDS_ACTIVATION"))
        } else {
            _currentUser.value = newUser
            return Result.success(newUser)
        }
    }

    fun requestActivation(email: String): Result<String> {
        val user = _users.value.find { it.email.equals(email.trim(), ignoreCase = true) }
            ?: return Result.failure(Exception("Email not found"))

        if (user.isActive) {
            return Result.success("Account is already active. Please log in.")
        }

        val existing = _activationRequests.value.find { it.userId == user.id && it.status == "pending" }
        if (existing == null) {
            _activationRequests.value = _activationRequests.value + ActivationRequest(
                id = nextActivationId++,
                userId = user.id,
                email = user.email,
                status = "pending",
                createdAt = now()
            )
        }
        return Result.success("Activation request submitted! Admin will provide the secret code.")
    }

    fun activateWithCode(email: String, code: String): Result<User> {
        val user = _users.value.find { it.email.equals(email.trim(), ignoreCase = true) }
            ?: return Result.failure(Exception("Email not found"))

        val match = _activationRequests.value.find {
            it.userId == user.id && it.status == "approved" && it.code == code.trim()
        }

        if (match == null) {
            return Result.failure(Exception("Invalid or unapproved activation code"))
        }

        // Mark request as used
        _activationRequests.value = _activationRequests.value.map {
            if (it.id == match.id) it.copy(status = "used") else it
        }

        val activated = user.copy(isActive = true)
        updateUser(activated)
        _currentUser.value = activated
        return Result.success(activated)
    }

    fun requestPasswordReset(email: String): Result<String> {
        val user = _users.value.find { it.email.equals(email.trim(), ignoreCase = true) }
            ?: return Result.failure(Exception("No account registered with this email"))

        _passwordResetRequests.value = _passwordResetRequests.value + PasswordResetRequest(
            id = nextResetId++,
            userId = user.id,
            email = user.email,
            status = "pending",
            createdAt = now()
        )
        return Result.success("Password reset request sent to admin.")
    }

    fun resetPasswordWithCode(email: String, code: String, newPass: String): Result<String> {
        val user = _users.value.find { it.email.equals(email.trim(), ignoreCase = true) }
            ?: return Result.failure(Exception("Email not found"))

        val req = _passwordResetRequests.value.find {
            it.userId == user.id && it.status == "approved" && it.code.equals(code.trim(), ignoreCase = true)
        } ?: return Result.failure(Exception("Invalid or expired secret code"))

        if (newPass.length < 6) {
            return Result.failure(Exception("Password must be at least 6 characters"))
        }

        _passwordResetRequests.value = _passwordResetRequests.value.map {
            if (it.id == req.id) it.copy(status = "used") else it
        }

        updateUser(user.copy(password = newPass))
        return Result.success("Password reset successfully! Please login.")
    }

    fun logout() {
        _currentUser.value = null
    }

    fun updateProfileName(newName: String) {
        val cur = _currentUser.value ?: return
        val updated = cur.copy(fullName = newName.trim())
        updateUser(updated)
    }

    fun updateProfilePhoto(photoUri: String?) {
        val cur = _currentUser.value ?: return
        val updated = cur.copy(profilePhoto = photoUri)
        updateUser(updated)
    }

    private fun updateUser(user: User) {
        _users.value = _users.value.map { if (it.id == user.id) user else it }
        if (_currentUser.value?.id == user.id) {
            _currentUser.value = user
        }
    }

    private fun addBalance(userId: Int, amount: Double, type: String, desc: String, source: String) {
        val user = _users.value.find { it.id == userId } ?: return
        val newBal = (user.balance + amount).coerceAtLeast(0.0)
        val newTotal = if (amount > 0) user.totalEarned + amount else user.totalEarned
        updateUser(user.copy(balance = newBal, totalEarned = newTotal))

        _transactions.value = listOf(
            Transaction(
                id = nextTransactionId++,
                userId = userId,
                type = type,
                amount = amount,
                description = desc,
                source = source,
                createdAt = now()
            )
        ) + _transactions.value
    }

    // --- Daily Check-In ---

    fun canCheckIn(userId: Int): Boolean {
        val key = "$userId:${today()}"
        return !_checkIns.value.contains(key)
    }

    fun doCheckIn(userId: Int): Result<Double> {
        if (!canCheckIn(userId)) {
            return Result.failure(Exception("Already checked in today"))
        }
        val key = "$userId:${today()}"
        _checkIns.value = _checkIns.value + key
        val reward = _settings.value.checkinReward
        addBalance(userId, reward, "checkin", "Daily check-in reward", "Daily Task")
        return Result.success(reward)
    }

    // --- Rewarded Ads ---

    fun getAdsWatchedToday(userId: Int): Int {
        val key = "$userId:${today()}"
        return _adWatches.value[key] ?: 0
    }

    fun canWatchAd(userId: Int): Boolean {
        if (!_settings.value.adsEnabled) return false
        return getAdsWatchedToday(userId) < _settings.value.maxAdsPerDay
    }

    fun watchAdReward(userId: Int): Result<Double> {
        if (!canWatchAd(userId)) {
            return Result.failure(Exception("Daily ad limit reached (${_settings.value.maxAdsPerDay} ads)"))
        }
        val key = "$userId:${today()}"
        val currentCount = getAdsWatchedToday(userId)
        val updatedMap = _adWatches.value.toMutableMap()
        updatedMap[key] = currentCount + 1
        _adWatches.value = updatedMap

        val reward = _settings.value.adReward
        addBalance(userId, reward, "ads", "Watched rewarded video ad", "Ads")
        return Result.success(reward)
    }

    // --- Daily Tasks ---

    fun isTaskCompleted(userId: Int, taskId: Int): Boolean {
        return _completedTaskIds.value.contains("$userId:$taskId")
    }

    fun completeTask(userId: Int, taskId: Int): Result<Double> {
        if (isTaskCompleted(userId, taskId)) {
            return Result.failure(Exception("Task already completed"))
        }
        val task = _tasks.value.find { it.id == taskId }
            ?: return Result.failure(Exception("Task not found"))

        _completedTaskIds.value = _completedTaskIds.value + "$userId:$taskId"
        addBalance(userId, task.reward, "task", "Completed: ${task.title}", "Daily Task")
        return Result.success(task.reward)
    }

    // --- Games ---

    fun getGamePlaysToday(userId: Int, gameType: String): Int {
        val key = "$userId:${today()}:$gameType"
        return _gamesPlayed.value[key] ?: 0
    }

    fun canPlayGame(userId: Int, gameType: String): Boolean {
        val played = getGamePlaysToday(userId, gameType)
        val allowed = _settings.value.freePlaysPerDay + _settings.value.adPlaysPerGame
        return played < allowed
    }

    fun recordGamePlay(userId: Int, gameType: String, reward: Double): Double {
        val key = "$userId:${today()}:$gameType"
        val current = getGamePlaysToday(userId, gameType)
        val updated = _gamesPlayed.value.toMutableMap()
        updated[key] = current + 1
        _gamesPlayed.value = updated

        addBalance(userId, reward, "game", "Played $gameType", "Games")
        return reward
    }

    // --- Special Events ---

    fun isEventClaimed(userId: Int, eventId: Int): Boolean {
        return _claimedEvents.value.contains("$userId:$eventId")
    }

    fun claimEvent(userId: Int, eventId: Int): Result<Double> {
        if (isEventClaimed(userId, eventId)) {
            return Result.failure(Exception("Event bonus already claimed"))
        }
        val event = _events.value.find { it.id == eventId }
            ?: return Result.failure(Exception("Event not found"))

        _claimedEvents.value = _claimedEvents.value + "$userId:$eventId"
        addBalance(userId, event.reward, "event", "Event bonus: ${event.title}", "Event Bonus")
        return Result.success(event.reward)
    }

    // --- Withdrawals ---

    fun submitWithdrawal(userId: Int, amount: Double, method: String, account: String): Result<Withdrawal> {
        val user = _users.value.find { it.id == userId }
            ?: return Result.failure(Exception("User not found"))

        if (amount < _settings.value.minWithdraw) {
            return Result.failure(Exception("Minimum withdrawal is ${_settings.value.minWithdraw} TK"))
        }
        if (user.balance < amount) {
            return Result.failure(Exception("Insufficient balance (${user.balance.format(2)} TK)"))
        }
        if (account.trim().isEmpty()) {
            return Result.failure(Exception("Account number or UID is required"))
        }

        val charge = (amount * _settings.value.withdrawCharge) / 100.0
        val net = amount - charge

        // Deduct balance
        addBalance(userId, -amount, "withdrawal", "Withdrawal via $method ($account)", "Withdrawal")

        val withdrawal = Withdrawal(
            id = nextWithdrawalId++,
            userId = userId,
            amount = amount,
            charge = charge,
            netAmount = net,
            withdrawMethod = method,
            accountNumber = account.trim(),
            status = "pending",
            createdAt = now()
        )

        _withdrawals.value = listOf(withdrawal) + _withdrawals.value
        return Result.success(withdrawal)
    }

    // --- Support ---

    fun sendSupportMessage(userId: Int, messageText: String) {
        val text = messageText.trim()
        if (text.isEmpty()) return

        val userMsg = SupportMessage(
            id = nextMsgId++,
            conversationId = 1,
            userId = userId,
            sender = "user",
            message = text,
            createdAt = now()
        )
        _supportMessages.value = _supportMessages.value + userMsg

        // AI automated reply
        val lower = text.lowercase()
        val replyText = when {
            "withdraw" in lower || "টাকা" in lower || "পেমেন্ট" in lower ->
                "Withdraw করার জন্য Wallet ট্যাবে যান। ন্যূনতম ব্যালেন্স ৫০ TK হতে হবে। Binance, bKash, Nagad বা Recharge সিলেক্ট করে নম্বর দিন।"
            "balance" in lower || "ব্যালেন্স" in lower ->
                "আপনার ব্যালেন্স Home এবং Wallet স্ক্রিনে সরাসরি দেখতে পারবেন। প্রতিটি Task, Ad এবং Game এর টাকা সাথে সাথে যোগ হয়।"
            "referral" in lower || "রেফার" in lower ->
                "Profile স্ক্রিনে আপনার নিজস্ব রেফারেল কোড পাবেন। বন্ধুদের সাথে শেয়ার করলে ৩ স্তরে কমিশন (১০%, ৫%, ২.৫%) আয় করতে পারবেন।"
            "game" in lower || "গেম" in lower || "spin" in lower ->
                "প্রতিদিন প্রতিটি গেম ১ বার ফ্রি এবং অ্যাড দেখে আরও ১ বার খেলতে পারবেন। ০.১ থেকে ৩ TK পর্যন্ত জিততে পারবেন!"
            "checkin" in lower || "চেকইন" in lower ->
                "Home স্ক্রিনে প্রতিদিন ১ বার Daily Check-In বাটনে ক্লিক করে ফ্রি TK রিওয়ার্ড ক্লেইম করতে পারবেন।"
            "ban" in lower || "ব্যান" in lower ->
                "কোনো নিয়ম লঙ্ঘনের কারণে আইডি ব্যান হলে এডমিনের সাথে Telegram এ যোগাযোগ করুন।"
            else ->
                "ধন্যবাদ আপনার বার্তার জন্য! আমাদের সাপোর্ট টিম বা এডমিন শীঘ্রই মেসেজ পর্যালোচনা করে উত্তর দেবেন।"
        }

        val aiMsg = SupportMessage(
            id = nextMsgId++,
            conversationId = 1,
            userId = userId,
            sender = "ai",
            message = replyText,
            createdAt = now()
        )
        _supportMessages.value = _supportMessages.value + aiMsg
    }

    // --- Admin Operations ---

    fun approveWithdrawal(withdrawalId: Int) {
        _withdrawals.value = _withdrawals.value.map {
            if (it.id == withdrawalId) it.copy(status = "approved") else it
        }
    }

    fun rejectWithdrawal(withdrawalId: Int) {
        val target = _withdrawals.value.find { it.id == withdrawalId } ?: return
        // Refund amount
        addBalance(target.userId, target.amount, "refund", "Refunded rejected withdrawal #${target.id}", "Withdrawal")
        _withdrawals.value = _withdrawals.value.map {
            if (it.id == withdrawalId) it.copy(status = "rejected") else it
        }
    }

    fun toggleUserBan(userId: Int) {
        val target = _users.value.find { it.id == userId } ?: return
        updateUser(target.copy(isBanned = !target.isBanned))
    }

    fun approveActivationRequest(requestId: Int): String {
        val code = String.format("%06d", Random.nextInt(100000, 999999))
        _activationRequests.value = _activationRequests.value.map {
            if (it.id == requestId) it.copy(status = "approved", code = code, expiresAt = "24h") else it
        }
        return code
    }

    fun approvePasswordResetRequest(requestId: Int): String {
        val code = String.format("%06d", Random.nextInt(100000, 999999))
        _passwordResetRequests.value = _passwordResetRequests.value.map {
            if (it.id == requestId) it.copy(status = "approved", code = code, expiresAt = "24h") else it
        }
        return code
    }

    fun updateSettings(newSettings: AppSettings) {
        _settings.value = newSettings
    }

    fun sendBroadcastNotification(title: String, message: String, type: String) {
        val item = NotificationItem(
            id = nextNotifId++,
            title = title,
            message = message,
            type = type,
            createdAt = now()
        )
        _notifications.value = listOf(item) + _notifications.value
    }

    fun deleteNotification(id: Int) {
        _notifications.value = _notifications.value.filter { it.id != id }
    }

    fun addTask(title: String, url: String, category: String, reward: Double) {
        val task = Task(
            id = nextTaskId++,
            title = title,
            url = url,
            category = category,
            reward = reward,
            isActive = true
        )
        _tasks.value = _tasks.value + task
    }

    fun deleteTask(id: Int) {
        _tasks.value = _tasks.value.filter { it.id != id }
    }

    fun addQuizQuestion(question: String, options: List<String>, answerIndex: Int, category: String) {
        val q = QuizQuestion(
            id = nextQuizId++,
            question = question,
            options = options,
            answerIndex = answerIndex,
            category = category,
            isActive = true
        )
        _quizQuestions.value = _quizQuestions.value + q
    }

    fun toggleQuizQuestion(id: Int) {
        _quizQuestions.value = _quizQuestions.value.map {
            if (it.id == id) it.copy(isActive = !it.isActive) else it
        }
    }

    fun addSpecialEvent(title: String, type: String, reward: Double) {
        val event = SpecialEvent(
            id = nextEventId++,
            title = title.trim(),
            type = type.trim(),
            reward = reward,
            isActive = true
        )
        _events.value = _events.value + event
    }

    fun deleteSpecialEvent(id: Int) {
        _events.value = _events.value.filter { it.id != id }
    }

    fun toggleSpecialEvent(id: Int) {
        _events.value = _events.value.map {
            if (it.id == id) it.copy(isActive = !it.isActive) else it
        }
    }

    // --- Account Deletion & Reset ---

    fun deleteAccount(userId: Int): Boolean {
        _users.value = _users.value.filter { it.id != userId }
        _transactions.value = _transactions.value.filter { it.userId != userId }
        _withdrawals.value = _withdrawals.value.filter { it.userId != userId }
        _supportMessages.value = _supportMessages.value.filter { it.userId != userId }
        _completedTaskIds.value = _completedTaskIds.value.filterNot { it.startsWith("$userId:") }.toSet()
        _checkIns.value = _checkIns.value.filterNot { it.startsWith("$userId:") }.toSet()
        _adWatches.value = _adWatches.value.filterNot { it.key.startsWith("$userId:") }
        _gamesPlayed.value = _gamesPlayed.value.filterNot { it.key.startsWith("$userId:") }
        _claimedEvents.value = _claimedEvents.value.filterNot { it.startsWith("$userId:") }.toSet()

        if (_currentUser.value?.id == userId) {
            _currentUser.value = null
        }
        return true
    }

    fun resetAllUserData() {
        seedInitialData()
    }

    companion object {
        const val ADMIN_EMAIL = "kajolchandradas3@gmail.com"

        @Volatile
        private var instance: EarnRepository? = null

        fun getInstance(): EarnRepository {
            return instance ?: synchronized(this) {
                instance ?: EarnRepository().also { instance = it }
            }
        }
    }
}

fun Double.format(digits: Int): String = String.format(Locale.US, "%.${digits}f", this)
