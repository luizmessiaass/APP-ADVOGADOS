package com.aethixdigital.portaljuridico.cliente.features.processos

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ExitToApp
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aethixdigital.portaljuridico.cliente.navigation.Routes
import com.aethixdigital.portaljuridico.ui.components.EmptyStateView
import com.aethixdigital.portaljuridico.ui.components.ProcessoListCard
import com.aethixdigital.portaljuridico.ui.components.SkeletonCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProcessoListScreen(
    navController: NavController,
    viewModel: ProcessoListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Meus Processos",
                        style = MaterialTheme.typography.titleLarge
                    )
                },
                actions = {
                    IconButton(onClick = { /* logout — implementado na integração completa */ }) {
                        Icon(
                            imageVector = Icons.Outlined.ExitToApp,
                            contentDescription = "Sair da conta"
                        )
                    }
                }
            )
        }
    ) { innerPadding ->
        when (val state = uiState) {
            is ProcessoListViewModel.UiState.Loading -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(2) {
                        SkeletonCard(height = 88.dp, modifier = Modifier.fillMaxWidth())
                    }
                }
            }

            is ProcessoListViewModel.UiState.Empty -> {
                EmptyStateView(
                    heading = "Nenhum processo encontrado",
                    body = "Seu advogado ainda não vinculou nenhum processo à sua conta. Entre em contato com o escritório.",
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                )
            }

            is ProcessoListViewModel.UiState.Error -> {
                EmptyStateView(
                    heading = "Erro ao carregar",
                    body = "Não conseguimos carregar seus processos. Verifique sua conexão.",
                    actionLabel = "Tentar novamente",
                    onAction = { viewModel.loadProcessos() },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                )
            }

            is ProcessoListViewModel.UiState.Success -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(state.processos, key = { it.id }) { processo ->
                        ProcessoListCard(
                            processo = processo,
                            onClick = {
                                navController.navigate("${Routes.PROCESSO_DETAIL}/${processo.id}")
                            }
                        )
                    }
                }
            }
        }
    }
}
