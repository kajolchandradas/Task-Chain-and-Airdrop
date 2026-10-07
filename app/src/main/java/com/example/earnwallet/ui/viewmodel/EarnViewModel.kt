package com.example.earnwallet.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.earnwallet.data.model.*
import com.example.earnwallet.data.repository.EarnRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class EarnViewModel(
    private val repo: EarnRepository = EarnRepository.getInstance()
) : ViewModel() {

    val currentUser = repo.currentUser
    val users = repo.users
    val transactions = repo.transactions
    val withdrawals = repo.withdrawals
    val tasks = repo.tasks
    val completedTaskIds = repo.completedTaskIds
    val notifications = repo.notifications
    val settings = repo.settings
    val events = repo.events
    val claimedEvents = repo.claimedEvents
    val supportMessages = repo.supportMessages
    val quizQuestions = repo.quizQuestions
    val activationRequests = repo.activationRequests
    val passwordResetRequests = repo.passwordResetRequests

    // UI Feedback state
    private val _snackBarMessage = MutableStateFlow<String?>(null)
    val snackBarMessage: StateFlow<String?> = _snackBarMessage.asStateFlow()

    // Rewarded Ad Simulation
    private val _isWatchingAd = MutableStateFlow(false)
    val isWatchingAd: StateFlow<Boolean> = _isWatchingAd.asStateFlow()

    private val _adProgress = MutableStateFlow(0f)
    val adProgress: StateFlow<Float> = _adProgress.asStateFlow()

    // Game state
    private val _currentGameWinReward = MutableStateFlow<Double?>(null)
    val currentGameWinReward: StateFlow<Double?> = _currentGameWinReward.asStateFlow()

    fun showMessage(msg: String) {
        _snackBarMessage.value = msg
    }

    fun clearMessage() {
        _snackBarMessage.value = null
    }

    // --- Auth Actions ---

    fun login(email: String, pass: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        val result = repo.login(email, pass)
        result.onSuccess {
            onSuccess()
        }.onFailure {
            onError(it.message ?: "Login failed")
        }
    }

    fun register(name: String, email: String, pass: String, refCode: String?, onSuccess: () -> Unit, onError: (String) -> Unit) {
        val result = repo.register(name, email, pass, refCode)
        result.onSuccess {
            onSuccess()
        }.onFailure {
            onError(it.message ?: "Registration error")
        }
    }

    fun requestActivation(email: String, onResult: (String) -> Unit) {
        val result = repo.requestActivation(email)
        onResult(result.getOrDefault("Activation request submitted."))
    }

    fun activateWithCode(email: String, code: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        val result = repo.activateWithCode(email, code)
        result.onSuccess { onSuccess() }.onFailure { onError(it.message ?: "Invalid code") }
    }

    fun forgotPassword(email: String, onResult: (String) -> Unit) {
        val result = repo.requestPasswordReset(email)
        onResult(result.getOrDefault("Request submitted."))
    }

    fun resetPassword(email: String, code: String, newPass: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        val result = repo.resetPasswordWithCode(email, code, newPass)
        result.onSuccess { onSuccess() }.onFailure { onError(it.message ?: "Error resetting password") }
    }

    fun logout() {
        repo.logout()
    }

    fun updateName(name: String) {
        repo.updateProfileName(name)
        showMessage("Name updated successfully")
    }

    fun updatePhoto(uri: String?) {
        repo.updateProfilePhoto(uri)
        showMessage("Profile photo updated")
    }

    // --- Daily Check-In ---

    fun canCheckIn(): Boolean {
        val uid = currentUser.value?.id ?: return false
        return repo.canCheckIn(uid)
    }

    fun claimCheckIn() {
        val uid = currentUser.value?.id ?: return
        val res = repo.doCheckIn(uid)
        res.onSuccess {
            showMessage("Daily Check-in bonus claimed: +${it} TK!")
        }.onFailure {
            showMessage(it.message ?: "Could not claim check-in")
        }
    }

    // --- Rewarded Ad ---

    fun getAdsWatchedToday(): Int {
        val uid = currentUser.value?.id ?: return 0
        return repo.getAdsWatchedToday(uid)
    }

    fun canWatchAd(): Boolean {
        val uid = currentUser.value?.id ?: return false
        return repo.canWatchAd(uid)
    }

    fun startWatchingAd(onCompleteReward: () -> Unit = {}) {
        val uid = currentUser.value?.id ?: return
        if (!canWatchAd()) {
            showMessage("Daily ad limit reached (${settings.value.maxAdsPerDay} ads)")
            return
        }

        viewModelScope.launch {
            _isWatchingAd.value = true
            _adProgress.value = 0f
            val totalSteps = 20
            for (i in 1..totalSteps) {
                delay(150)
                _adProgress.value = i / totalSteps.toFloat()
            }
            _isWatchingAd.value = false
            val rewardRes = repo.watchAdReward(uid)
            rewardRes.onSuccess {
                showMessage("Rewarded video complete! You earned +${it} TK!")
                onCompleteReward()
            }.onFailure {
                showMessage(it.message ?: "Ad reward error")
            }
        }
    }

    // --- Daily Tasks ---

    fun isTaskCompleted(taskId: Int): Boolean {
        val uid = currentUser.value?.id ?: return false
        return repo.isTaskCompleted(uid, taskId)
    }

    fun completeTask(taskId: Int) {
        val uid = currentUser.value?.id ?: return
        val res = repo.completeTask(uid, taskId)
        res.onSuccess {
            showMessage("Task completed! You earned +${it} TK!")
        }.onFailure {
            showMessage(it.message ?: "Task error")
        }
    }

    // --- Games ---

    fun getGamePlaysToday(gameType: String): Int {
        val uid = currentUser.value?.id ?: return 0
        return repo.getGamePlaysToday(uid, gameType)
    }

    fun canPlayGame(gameType: String): Boolean {
        val uid = currentUser.value?.id ?: return false
        return repo.canPlayGame(uid, gameType)
    }

    fun playSpinWheel(onResult: (Double, Int) -> Unit) {
        val uid = currentUser.value?.id ?: return
        val prizes = listOf(0.10, 0.20, 0.50, 1.00, 1.50, 2.00, 2.50, 3.00)
        val chosenIndex = (0 until prizes.size).random()
        val reward = prizes[chosenIndex]
        repo.recordGamePlay(uid, "spin_wheel", reward)
        _currentGameWinReward.value = reward
        onResult(reward, chosenIndex)
    }

    fun playSpinSplit(onResult: (Double) -> Unit) {
        val uid = currentUser.value?.id ?: return
        val reward = (10..300).random() / 100.0
        repo.recordGamePlay(uid, "spin_split", reward)
        _currentGameWinReward.value = reward
        onResult(reward)
    }

    fun playScratchCard(onResult: (Double) -> Unit) {
        val uid = currentUser.value?.id ?: return
        val prizes = listOf(0.10, 0.20, 0.50, 1.00, 2.00, 3.00)
        val reward = prizes.random()
        repo.recordGamePlay(uid, "scratch_card", reward)
        _currentGameWinReward.value = reward
        onResult(reward)
    }

    fun playLuckySpin(onResult: (Double, List<String>, Boolean) -> Unit) {
        val uid = currentUser.value?.id ?: return
        val symbols = listOf("🍎", "🍊", "🍋", "🍇", "🍓", "🌸", "🌺", "🦁", "⭐", "💎")
        val isMatch = (1..100).random() <= 30
        val finalSymbols = if (isMatch) {
            val sym = symbols.random()
            listOf(sym, sym, sym)
        } else {
            val s1 = symbols.random()
            var s2 = symbols.random()
            while (s2 == s1) s2 = symbols.random()
            val s3 = symbols.random()
            listOf(s1, s2, s3)
        }

        val reward = if (isMatch) 3.00 else ((10..50).random() / 100.0)
        repo.recordGamePlay(uid, "lucky_spin", reward)
        _currentGameWinReward.value = reward
        onResult(reward, finalSymbols, isMatch)
    }

    fun recordQuizReward(scorePercent: Float, correctCount: Int, totalCount: Int) {
        val uid = currentUser.value?.id ?: return
        val base = settings.value.gameMaxReward
        val reward = ((base * scorePercent).coerceAtLeast(0.10) * 100).toInt() / 100.0
        repo.recordGamePlay(uid, "fun_quiz", reward)
        _currentGameWinReward.value = reward
        showMessage("Quiz finished ($correctCount/$totalCount)! You earned +$reward TK!")
    }

    fun clearGameReward() {
        _currentGameWinReward.value = null
    }

    // --- Special Events ---

    fun isEventClaimed(eventId: Int): Boolean {
        val uid = currentUser.value?.id ?: return false
        return repo.isEventClaimed(uid, eventId)
    }

    fun claimEvent(eventId: Int) {
        val uid = currentUser.value?.id ?: return
        val res = repo.claimEvent(uid, eventId)
        res.onSuccess {
            showMessage("Special bonus claimed: +${it} TK!")
        }.onFailure {
            showMessage(it.message ?: "Event error")
        }
    }

    // --- Withdrawal ---

    fun submitWithdrawal(amount: Double, method: String, account: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        val uid = currentUser.value?.id ?: return
        val res = repo.submitWithdrawal(uid, amount, method, account)
        res.onSuccess {
            showMessage("Withdrawal request submitted! Processing within 24 hours.")
            onSuccess()
        }.onFailure {
            onError(it.message ?: "Withdrawal error")
        }
    }

    // --- Support ---

    fun sendSupportMessage(text: String) {
        val uid = currentUser.value?.id ?: return
        repo.sendSupportMessage(uid, text)
    }

    // --- Admin Operations ---

    fun checkAdminPin(pin: String): Boolean {
        return pin.trim() == repo.adminPin
    }

    fun changeAdminPin(newPin: String) {
        repo.adminPin = newPin.trim()
        showMessage("Admin PIN updated successfully")
    }

    fun approveWithdrawal(id: Int) {
        repo.approveWithdrawal(id)
        showMessage("Withdrawal approved")
    }

    fun rejectWithdrawal(id: Int) {
        repo.rejectWithdrawal(id)
        showMessage("Withdrawal rejected and user refunded")
    }

    fun toggleUserBan(userId: Int) {
        repo.toggleUserBan(userId)
        showMessage("User status updated")
    }

    fun approveActivation(id: Int, onCodeGenerated: (String) -> Unit) {
        val code = repo.approveActivationRequest(id)
        showMessage("Activation approved! Code: $code")
        onCodeGenerated(code)
    }

    fun approvePasswordReset(id: Int, onCodeGenerated: (String) -> Unit) {
        val code = repo.approvePasswordResetRequest(id)
        showMessage("Reset request approved! Code: $code")
        onCodeGenerated(code)
    }

    fun updateSettings(newSettings: AppSettings) {
        repo.updateSettings(newSettings)
        showMessage("Settings saved successfully")
    }

    fun sendNotification(title: String, message: String, type: String) {
        repo.sendBroadcastNotification(title, message, type)
        showMessage("Notification broadcast to all users")
    }

    fun deleteNotification(id: Int) {
        repo.deleteNotification(id)
    }

    fun addTask(title: String, url: String, category: String, reward: Double) {
        repo.addTask(title, url, category, reward)
        showMessage("New task created")
    }

    fun deleteTask(id: Int) {
        repo.deleteTask(id)
        showMessage("Task deleted")
    }

    fun addQuizQuestion(q: String, options: List<String>, answerIndex: Int, category: String) {
        repo.addQuizQuestion(q, options, answerIndex, category)
        showMessage("Question added to Quiz Bank")
    }

    fun toggleQuizQuestion(id: Int) {
        repo.toggleQuizQuestion(id)
    }

    fun addSpecialEvent(title: String, type: String, reward: Double) {
        repo.addSpecialEvent(title, type, reward)
        showMessage("New special event bonus added")
    }

    fun deleteSpecialEvent(id: Int) {
        repo.deleteSpecialEvent(id)
        showMessage("Special event removed")
    }

    fun toggleSpecialEvent(id: Int) {
        repo.toggleSpecialEvent(id)
    }

    // --- Account Management & Reset ---

    fun deleteCurrentAccount(onDeleted: () -> Unit) {
        val uid = currentUser.value?.id ?: return
        repo.deleteAccount(uid)
        showMessage("Account and all associated data deleted successfully")
        onDeleted()
    }

    fun deleteUserByAdmin(userId: Int) {
        repo.deleteAccount(userId)
        showMessage("User account deleted successfully")
    }

    fun resetAllSystemData(onComplete: () -> Unit) {
        repo.resetAllUserData()
        showMessage("All account data and records cleared successfully")
        onComplete()
    }
}
