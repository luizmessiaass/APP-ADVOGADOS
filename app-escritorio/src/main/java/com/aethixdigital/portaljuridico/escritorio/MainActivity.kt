package com.aethixdigital.portaljuridico.escritorio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.aethixdigital.portaljuridico.data.repository.AuthRepository
import com.aethixdigital.portaljuridico.escritorio.navigation.EscritorioNavGraph
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var authRepository: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PortalJuridicoTheme {
                EscritorioNavGraph(authRepository = authRepository)
            }
        }
    }
}
