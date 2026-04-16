package com.aethixdigital.portaljuridico.escritorio.navigation

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.aethixdigital.portaljuridico.data.repository.AuthRepository
import com.aethixdigital.portaljuridico.escritorio.feature.clientes.cadastro.CadastroClienteScreen
import com.aethixdigital.portaljuridico.escritorio.feature.clientes.list.ClienteListScreen
import com.aethixdigital.portaljuridico.escritorio.feature.login.LoginScreen

@Composable
fun EscritorioNavGraph(authRepository: AuthRepository) {
    val navController = rememberNavController()
    var startDestination: EscritorioRoute by remember { mutableStateOf(EscritorioRoute.Login) }
    var isReady by remember { mutableStateOf(false) }

    // D-07: verificar token ao abrir app — antes de mostrar qualquer tela
    LaunchedEffect(Unit) {
        val token = authRepository.getSavedToken()
        startDestination = if (token != null && authRepository.isValidAdvogadoToken(token)) {
            EscritorioRoute.ClienteLista
        } else {
            EscritorioRoute.Login
        }
        isReady = true
    }

    if (!isReady) return  // aguarda verificação assíncrona do token

    NavHost(navController = navController, startDestination = startDestination) {
        composable<EscritorioRoute.Login> {
            LoginScreen(
                onLoginSuccess = { _ ->
                    navController.navigate(EscritorioRoute.ClienteLista) {
                        popUpTo(EscritorioRoute.Login) { inclusive = true }
                    }
                }
            )
        }
        composable<EscritorioRoute.ClienteLista> {
            ClienteListScreen(
                onClienteClick = { clienteId ->
                    navController.navigate(EscritorioRoute.ClienteDetalhe(clienteId))
                },
                onCadastrarClick = {
                    navController.navigate(EscritorioRoute.CadastroCliente)
                }
            )
        }
        composable<EscritorioRoute.ClienteDetalhe> {
            // Plano 04-05 implementa esta tela
            Text("Detalhe cliente — implementado em 04-05")
        }
        composable<EscritorioRoute.CadastroCliente> {
            CadastroClienteScreen(
                onSuccess = { navController.popBackStack() },
                onBack = { navController.popBackStack() }
            )
        }
        composable<EscritorioRoute.PreviewCliente> {
            // Plano 04-05 implementa esta tela
            Text("Preview cliente — implementado em 04-05")
        }
    }
}
