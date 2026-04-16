package com.aethixdigital.portaljuridico.cliente.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.aethixdigital.portaljuridico.cliente.features.auth.LoginScreen

@Composable
fun ClienteNavGraph(navController: NavHostController, startDestination: String) {
    NavHost(navController = navController, startDestination = startDestination) {
        composable(Routes.LOGIN) {
            LoginScreen(navController = navController)
        }
        composable(Routes.ONBOARDING) {
            TODO("OnboardingScreen — implemented in Plan 05-04")
        }
        composable(Routes.LGPD_CONSENT) {
            TODO("LgpdConsentScreen — implemented in Plan 05-04")
        }
        composable(Routes.PROCESSO_LIST) {
            TODO("ProcessoListScreen — implemented in Plan 05-03")
        }
        composable(Routes.PROCESSO_DETAIL_WITH_ID) { backStackEntry ->
            @Suppress("UNUSED_VARIABLE")
            val processoId = backStackEntry.arguments?.getString("processoId") ?: return@composable
            TODO("ProcessoDetailScreen — implemented in Plan 05-03")
        }
    }
}
