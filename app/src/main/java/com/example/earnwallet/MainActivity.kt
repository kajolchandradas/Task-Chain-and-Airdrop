package com.example.earnwallet

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.example.earnwallet.ui.screens.AuthScreen
import com.example.earnwallet.ui.screens.MainContainerScreen
import com.example.earnwallet.ui.theme.EarnWalletTheme
import com.example.earnwallet.ui.viewmodel.EarnViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: EarnViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            EarnWalletTheme {
                val currentUser by viewModel.currentUser.collectAsState()

                Surface(modifier = Modifier.fillMaxSize()) {
                    if (currentUser == null) {
                        AuthScreen(
                            viewModel = viewModel,
                            onAuthSuccess = { /* state triggers recomposition */ }
                        )
                    } else {
                        MainContainerScreen(
                            viewModel = viewModel,
                            onLogout = { /* state triggers recomposition */ }
                        )
                    }
                }
            }
        }
    }
}
