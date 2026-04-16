package com.aethixdigital.portaljuridico.cliente

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController
import com.aethixdigital.portaljuridico.cliente.brand.BrandConfig
import com.aethixdigital.portaljuridico.cliente.brand.toColorScheme
import com.aethixdigital.portaljuridico.cliente.features.auth.SplashViewModel
import com.aethixdigital.portaljuridico.cliente.navigation.ClienteNavGraph
import com.aethixdigital.portaljuridico.cliente.navigation.Routes
import com.aethixdigital.portaljuridico.data.repository.AuthRepository
import com.aethixdigital.portaljuridico.escritorio.navigation.EscritorioNavGraph
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var authRepository: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PortalJuridicoTheme(colorScheme = BrandConfig.toColorScheme()) {
                val splashViewModel: SplashViewModel = hiltViewModel()
                val startDest by splashViewModel.startDestination.collectAsState()
                val role by splashViewModel.userRole.collectAsState()

                if (startDest != null && !(startDest == Routes.ADMIN_HOME && role == null)) {
                    when {
                        role in setOf("advogado", "admin_escritorio") -> {
                            EscritorioNavGraph(authRepository = authRepository)
                        }
                        else -> {
                            val navController = rememberNavController()
                            ClienteNavGraph(
                                navController = navController,
                                startDestination = startDest!!
                            )
                        }
                    }
                }
            }
        }
    }
}
