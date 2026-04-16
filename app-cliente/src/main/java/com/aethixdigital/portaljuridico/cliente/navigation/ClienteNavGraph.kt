package com.aethixdigital.portaljuridico.cliente.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.aethixdigital.portaljuridico.cliente.features.auth.LoginScreen
import com.aethixdigital.portaljuridico.cliente.features.processos.ProcessoDetailScreen
import com.aethixdigital.portaljuridico.cliente.features.processos.ProcessoListScreen

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
            ProcessoListScreen(navController = navController)
        }
        composable(Routes.PROCESSO_DETAIL_WITH_ID) { backStackEntry ->
            val processoId = backStackEntry.arguments?.getString("processoId") ?: return@composable
            ProcessoDetailScreen(processoId = processoId, navController = navController)
        }
    }
}
