package com.aethixdigital.portaljuridico.cliente

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController
import com.aethixdigital.portaljuridico.cliente.features.auth.SplashViewModel
import com.aethixdigital.portaljuridico.cliente.navigation.ClienteNavGraph
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PortalJuridicoTheme {
                val splashViewModel: SplashViewModel = hiltViewModel()
                val startDest by splashViewModel.startDestination.collectAsState()
                if (startDest != null) {
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
