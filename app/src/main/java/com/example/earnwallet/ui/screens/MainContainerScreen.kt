package com.example.earnwallet.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.earnwallet.ui.theme.Primary
import com.example.earnwallet.ui.viewmodel.EarnViewModel

enum class MainDestination {
    TABS,
    LEADERBOARD,
    SUPPORT,
    ADMIN
}

data class BottomNavTabItem(
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val tag: String
)

@Composable
fun MainContainerScreen(
    viewModel: EarnViewModel,
    onLogout: () -> Unit
) {
    var destination by remember { mutableStateOf(MainDestination.TABS) }
    var selectedTabIndex by remember { mutableIntStateOf(0) }
    val snackbarHostState = remember { SnackbarHostState() }
    val snackbarMessage by viewModel.snackBarMessage.collectAsState()

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessage()
        }
    }

    // Back handling
    BackHandler(enabled = destination != MainDestination.TABS || selectedTabIndex != 0) {
        if (destination != MainDestination.TABS) {
            destination = MainDestination.TABS
        } else if (selectedTabIndex != 0) {
            selectedTabIndex = 0
        }
    }

    val navTabs = listOf(
        BottomNavTabItem("Home", Icons.Default.Home, Icons.Outlined.Home, "tab_home"),
        BottomNavTabItem("Earn", Icons.Default.PlayCircle, Icons.Outlined.PlayCircle, "tab_earn"),
        BottomNavTabItem("Games", Icons.Default.SportsEsports, Icons.Outlined.SportsEsports, "tab_games"),
        BottomNavTabItem("Wallet", Icons.Default.AccountBalanceWallet, Icons.Outlined.AccountBalanceWallet, "tab_wallet"),
        BottomNavTabItem("Profile", Icons.Default.Person, Icons.Outlined.Person, "tab_profile")
    )

    when (destination) {
        MainDestination.LEADERBOARD -> {
            LeaderboardScreen(
                viewModel = viewModel,
                onBack = { destination = MainDestination.TABS }
            )
        }
        MainDestination.SUPPORT -> {
            SupportScreen(
                viewModel = viewModel,
                onBack = { destination = MainDestination.TABS }
            )
        }
        MainDestination.ADMIN -> {
            AdminScreen(
                viewModel = viewModel,
                onBack = { destination = MainDestination.TABS }
            )
        }
        MainDestination.TABS -> {
            Scaffold(
                snackbarHost = { SnackbarHost(snackbarHostState) },
                bottomBar = {
                    NavigationBar(
                        containerColor = MaterialTheme.colorScheme.surface,
                        tonalElevation = 8.dp
                    ) {
                        navTabs.forEachIndexed { index, item ->
                            val isSelected = selectedTabIndex == index
                            NavigationBarItem(
                                selected = isSelected,
                                onClick = { selectedTabIndex = index },
                                icon = {
                                    Icon(
                                        imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                                        contentDescription = item.title,
                                        tint = if (isSelected) Primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                },
                                label = {
                                    Text(
                                        text = item.title,
                                        color = if (isSelected) Primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                },
                                modifier = Modifier.testTag(item.tag)
                            )
                        }
                    }
                }
            ) { padding ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                ) {
                    when (selectedTabIndex) {
                        0 -> HomeScreen(
                            viewModel = viewModel,
                            onNavigateTab = { selectedTabIndex = it },
                            onOpenLeaderboard = { destination = MainDestination.LEADERBOARD },
                            onOpenSupport = { destination = MainDestination.SUPPORT },
                            onOpenAdmin = { destination = MainDestination.ADMIN }
                        )
                        1 -> EarnScreen(viewModel = viewModel)
                        2 -> GamesScreen(viewModel = viewModel)
                        3 -> WalletScreen(
                            viewModel = viewModel,
                            onOpenLeaderboard = { destination = MainDestination.LEADERBOARD }
                        )
                        4 -> ProfileScreen(
                            viewModel = viewModel,
                            onOpenAdmin = { destination = MainDestination.ADMIN },
                            onLogout = onLogout
                        )
                    }
                }
            }
        }
    }
}
