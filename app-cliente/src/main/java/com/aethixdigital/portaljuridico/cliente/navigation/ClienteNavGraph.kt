package com.aethixdigital.portaljuridico.cliente.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.aethixdigital.portaljuridico.cliente.features.auth.LoginScreen
import com.aethixdigital.portaljuridico.cliente.features.processo.ProcessoDetailScreen
import com.aethixdigital.portaljuridico.cliente.features.processo.ProcessoListScreen
import com.aethixdigital.portaljuridico.cliente.features.welcome.WelcomeScreen

@Composable
fun ClienteNavGraph(navController: NavHostController, startDestination: String) {
    NavHost(navController = navController, startDestination = startDestination) {
        composable(Routes.WELCOME) {
            WelcomeScreen(
                onComecarClick = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.WELCOME) { inclusive = true }
                    }
                },
                onJaSouClienteClick = {
                    navController.navigate(Routes.LOGIN)
                }
            )
        }
        composable(Routes.LOGIN) {
            LoginScreen(navController = navController)
        }
        composable(Routes.ONBOARDING) {
            // Onboarding ainda nao implementado — usa ProcessoList Editorial Juris como placeholder
            ProcessoListScreen(
                onProcessoClick = { id ->
                    navController.navigate("${Routes.PROCESSO_DETAIL}/$id")
                }
            )
        }
        composable(Routes.LGPD_CONSENT) {
            // LGPD consent ainda nao implementado — placeholder navegavel
            ProcessoListScreen(
                onProcessoClick = { id ->
                    navController.navigate("${Routes.PROCESSO_DETAIL}/$id")
                }
            )
        }
        composable(Routes.PROCESSO_LIST) {
            ProcessoListScreen(
                onProcessoClick = { id ->
                    navController.navigate("${Routes.PROCESSO_DETAIL}/$id")
                }
            )
        }
        composable(Routes.PROCESSO_DETAIL_WITH_ID) { backStackEntry ->
            val processoId = backStackEntry.arguments?.getString("processoId") ?: return@composable
            ProcessoDetailScreen(
                processoId = processoId,
                onBackClick = { navController.popBackStack() },
                onConsultorIaClick = { /* chatbot — fase futura */ }
            )
        }
    }
}
