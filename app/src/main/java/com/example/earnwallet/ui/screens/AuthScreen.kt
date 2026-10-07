package com.example.earnwallet.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.earnwallet.ui.theme.*
import com.example.earnwallet.ui.viewmodel.EarnViewModel

enum class AuthTab { LOGIN, REGISTER, ACTIVATION, FORGOT_PASSWORD }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthScreen(
    viewModel: EarnViewModel,
    onAuthSuccess: () -> Unit
) {
    var currentTab by remember { mutableStateOf(AuthTab.LOGIN) }

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var referralCode by remember { mutableStateOf("") }
    var activationCode by remember { mutableStateOf("") }
    var resetCode by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }

    var passwordVisible by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Primary, PrimaryDark, Secondary)
                )
            )
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // App Logo
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(Surface),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.AccountBalanceWallet,
                    contentDescription = "Earn Wallet Logo",
                    tint = Primary,
                    modifier = Modifier.size(44.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Earn Wallet",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Surface
            )
            Text(
                text = "Watch, Play & Earn Real Money",
                fontSize = 14.sp,
                color = Surface.copy(alpha = 0.85f)
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Auth Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Header tabs
                    when (currentTab) {
                        AuthTab.LOGIN -> {
                            Text(
                                text = "Welcome Back",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Sign in to continue earning",
                                fontSize = 13.sp,
                                color = TextSecondary,
                                modifier = Modifier.padding(bottom = 20.dp)
                            )

                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it; errorMessage = null },
                                label = { Text("Email Address") },
                                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = Primary) },
                                modifier = Modifier.fillMaxWidth().testTag("login_email_input"),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it; errorMessage = null },
                                label = { Text("Password") },
                                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Primary) },
                                trailingIcon = {
                                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                        Icon(
                                            if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = "Toggle password"
                                        )
                                    }
                                },
                                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                modifier = Modifier.fillMaxWidth().testTag("login_password_input"),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.End
                            ) {
                                TextButton(onClick = { currentTab = AuthTab.FORGOT_PASSWORD; errorMessage = null }) {
                                    Text("Forgot Password?", color = Primary, fontSize = 13.sp)
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Button(
                                onClick = {
                                    if (email.isBlank() || password.isBlank()) {
                                        errorMessage = "Please enter both email and password"
                                    } else {
                                        viewModel.login(
                                            email = email,
                                            pass = password,
                                            onSuccess = { onAuthSuccess() },
                                            onError = { err ->
                                                if (err == "ACCOUNT_NOT_ACTIVE") {
                                                    currentTab = AuthTab.ACTIVATION
                                                    errorMessage = "Account is inactive. Enter your secret code."
                                                } else {
                                                    errorMessage = err
                                                }
                                            }
                                        )
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp)
                                    .testTag("login_button"),
                                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("Sign In", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Don't have an account?", fontSize = 13.sp, color = TextSecondary)
                                TextButton(onClick = { currentTab = AuthTab.REGISTER; errorMessage = null }) {
                                    Text("Register", color = Primary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }
                            }

                            TextButton(onClick = { currentTab = AuthTab.ACTIVATION; errorMessage = null }) {
                                Text("Have an activation code? Click here", color = TextSecondary, fontSize = 12.sp)
                            }
                        }

                        AuthTab.REGISTER -> {
                            Text(
                                text = "Create Account",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Join now and earn daily rewards",
                                fontSize = 13.sp,
                                color = TextSecondary,
                                modifier = Modifier.padding(bottom = 20.dp)
                            )

                            OutlinedTextField(
                                value = fullName,
                                onValueChange = { fullName = it; errorMessage = null },
                                label = { Text("Full Name") },
                                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = Primary) },
                                modifier = Modifier.fillMaxWidth().testTag("register_name_input"),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it; errorMessage = null },
                                label = { Text("Email Address") },
                                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = Primary) },
                                modifier = Modifier.fillMaxWidth().testTag("register_email_input"),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it; errorMessage = null },
                                label = { Text("Password (min 6 chars)") },
                                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Primary) },
                                visualTransformation = PasswordVisualTransformation(),
                                modifier = Modifier.fillMaxWidth().testTag("register_password_input"),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            OutlinedTextField(
                                value = referralCode,
                                onValueChange = { referralCode = it; errorMessage = null },
                                label = { Text("Referral Code (Optional)") },
                                leadingIcon = { Icon(Icons.Default.GroupAdd, contentDescription = null, tint = AccentGold) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = {
                                    if (fullName.isBlank() || email.isBlank() || password.isBlank()) {
                                        errorMessage = "Please fill in all required fields"
                                    } else {
                                        viewModel.register(
                                            name = fullName,
                                            email = email,
                                            pass = password,
                                            refCode = referralCode.takeIf { it.isNotBlank() },
                                            onSuccess = { onAuthSuccess() },
                                            onError = { err ->
                                                if (err == "ACCOUNT_CREATED_NEEDS_ACTIVATION") {
                                                    currentTab = AuthTab.ACTIVATION
                                                    successMessage = "Account created! Please enter activation code or request one from admin."
                                                } else {
                                                    errorMessage = err
                                                }
                                            }
                                        )
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp)
                                    .testTag("register_button"),
                                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("Register Now", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Already have an account?", fontSize = 13.sp, color = TextSecondary)
                                TextButton(onClick = { currentTab = AuthTab.LOGIN; errorMessage = null }) {
                                    Text("Sign In", color = Primary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }
                            }
                        }

                        AuthTab.ACTIVATION -> {
                            Text(
                                text = "Activate Account",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Enter the 6-digit secret code from admin",
                                fontSize = 13.sp,
                                color = TextSecondary,
                                modifier = Modifier.padding(bottom = 20.dp)
                            )

                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it; errorMessage = null },
                                label = { Text("Registered Email") },
                                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = Primary) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            OutlinedTextField(
                                value = activationCode,
                                onValueChange = { activationCode = it; errorMessage = null },
                                label = { Text("6-Digit Secret Code") },
                                leadingIcon = { Icon(Icons.Default.Key, contentDescription = null, tint = AccentGold) },
                                modifier = Modifier.fillMaxWidth().testTag("activation_code_input"),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = {
                                    if (email.isBlank() || activationCode.isBlank()) {
                                        errorMessage = "Enter registered email and activation code"
                                    } else {
                                        viewModel.activateWithCode(
                                            email = email,
                                            code = activationCode,
                                            onSuccess = { onAuthSuccess() },
                                            onError = { errorMessage = it }
                                        )
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp)
                                    .testTag("activate_button"),
                                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("Activate Account", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            OutlinedButton(
                                onClick = {
                                    if (email.isBlank()) {
                                        errorMessage = "Enter email to request code"
                                    } else {
                                        viewModel.requestActivation(email) {
                                            successMessage = it
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("Request Code from Admin", color = Primary)
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            TextButton(onClick = { currentTab = AuthTab.LOGIN; errorMessage = null }) {
                                Text("← Back to Sign In", color = TextSecondary, fontSize = 13.sp)
                            }
                        }

                        AuthTab.FORGOT_PASSWORD -> {
                            Text(
                                text = "Reset Password",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Request a code to reset your password",
                                fontSize = 13.sp,
                                color = TextSecondary,
                                modifier = Modifier.padding(bottom = 20.dp)
                            )

                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it; errorMessage = null },
                                label = { Text("Account Email") },
                                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = Primary) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            OutlinedTextField(
                                value = resetCode,
                                onValueChange = { resetCode = it; errorMessage = null },
                                label = { Text("Reset Secret Code (from admin)") },
                                leadingIcon = { Icon(Icons.Default.VpnKey, contentDescription = null, tint = AccentGold) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            OutlinedTextField(
                                value = newPassword,
                                onValueChange = { newPassword = it; errorMessage = null },
                                label = { Text("New Password (min 6 chars)") },
                                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Primary) },
                                visualTransformation = PasswordVisualTransformation(),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = {
                                    if (email.isBlank() || resetCode.isBlank() || newPassword.isBlank()) {
                                        errorMessage = "All fields are required"
                                    } else {
                                        viewModel.resetPassword(
                                            email = email,
                                            code = resetCode,
                                            newPass = newPassword,
                                            onSuccess = {
                                                successMessage = "Password reset! You can now sign in."
                                                currentTab = AuthTab.LOGIN
                                            },
                                            onError = { errorMessage = it }
                                        )
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("Submit New Password", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            OutlinedButton(
                                onClick = {
                                    if (email.isBlank()) {
                                        errorMessage = "Enter email first"
                                    } else {
                                        viewModel.forgotPassword(email) {
                                            successMessage = it
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("Request Reset Code from Admin", color = Primary)
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            TextButton(onClick = { currentTab = AuthTab.LOGIN; errorMessage = null }) {
                                Text("← Back to Sign In", color = TextSecondary, fontSize = 13.sp)
                            }
                        }
                    }

                    // Alerts
                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Card(
                            colors = CardDefaults.cardColors(containerColor = DangerRedLight),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                text = errorMessage!!,
                                color = DangerRed,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }

                    if (successMessage != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Card(
                            colors = CardDefaults.cardColors(containerColor = SuccessGreenLight),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                text = successMessage!!,
                                color = SuccessGreen,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
