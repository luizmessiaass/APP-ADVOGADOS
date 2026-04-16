package com.aethixdigital.portaljuridico.escritorio.feature.preview

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aethixdigital.portaljuridico.common.model.Movimentacao
import com.aethixdigital.portaljuridico.ui.components.MovimentacaoCard
import com.aethixdigital.portaljuridico.ui.components.ProcessoStatusCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreviewScreen(
    onBack: () -> Unit,
    viewModel: PreviewViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Visão do Cliente") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                }
            )
        }
    ) { innerPadding ->
        when (val state = uiState) {
            is PreviewUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is PreviewUiState.Empty -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Nenhuma movimentação disponível ainda.\nSincronização em andamento.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            is PreviewUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.message, color = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.height(8.dp))
                        Button(onClick = viewModel::loadPreview) { Text("Tentar novamente") }
                    }
                }
            }
            is PreviewUiState.Success -> {
                // D-09: tela separada em scroll tela cheia
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text(
                            text = "Visualizando como: ${state.clienteNome}",
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(4.dp))
                        ProcessoStatusCard(
                            status = state.movimentacoes.firstOrNull()?.status,
                            impacto = state.ultimaSincronizacao?.let { "Última sync: $it" },
                            isLoading = false
                        )
                        Spacer(Modifier.height(8.dp))
                        Text("Movimentações", style = MaterialTheme.typography.titleMedium)
                    }
                    // D-10: MovimentacaoCard com disclaimer no TOPO de cada card (implementado em core-ui 04-02)
                    items(state.movimentacoes, key = { it.id }) { mov ->
                        MovimentacaoCard(
                            movimentacao = Movimentacao(
                                id = mov.id,
                                dataHora = mov.proximaData ?: "",
                                descricaoOriginal = mov.explicacao,
                                status = mov.status,
                                explicacao = mov.explicacao,
                                proximaData = mov.proximaData,
                                impacto = mov.impacto
                            ),
                            onExpandToggle = {},
                            isExpanded = false
                        )
                    }
                }
            }
        }
    }
}
