package com.aethixdigital.portaljuridico.cliente.features.processos

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Chat
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aethixdigital.portaljuridico.common.model.ProcessoDetail
import com.aethixdigital.portaljuridico.common.util.SyncLabelFormatter
import com.aethixdigital.portaljuridico.ui.components.EmptyStateView
import com.aethixdigital.portaljuridico.ui.components.MovimentacaoCard
import com.aethixdigital.portaljuridico.ui.components.ProcessoStatusCard
import com.aethixdigital.portaljuridico.ui.components.ProximaDataCard
import com.aethixdigital.portaljuridico.ui.components.SkeletonCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProcessoDetailScreen(
    processoId: String,
    navController: NavController,
    viewModel: ProcessoDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(processoId) {
        viewModel.loadProcessoDetail(processoId)
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = uiState.processo?.numeroCnj ?: "Detalhe do Processo",
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1
                    )
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "Voltar"
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            val telefone = uiState.processo?.telefoneWhatsapp
            if (!telefone.isNullOrBlank()) {
                ExtendedFloatingActionButton(
                    onClick = { abrirWhatsApp(context, telefone) },
                    icon = {
                        Icon(
                            imageVector = Icons.Outlined.Chat,
                            contentDescription = null
                        )
                    },
                    text = { Text("Falar com meu advogado") }
                )
            }
        }
    ) { innerPadding ->

        if (uiState.error != null) {
            EmptyStateView(
                heading = "Erro ao carregar",
                body = "Não conseguimos carregar os detalhes deste processo. Verifique sua conexão.",
                actionLabel = "Tentar novamente",
                onAction = { viewModel.loadProcessoDetail(processoId) },
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            )
            return@Scaffold
        }

        // CRITICAL: ÚNICO LazyColumn para toda a tela — sem nested scrollable
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
        ) {
            // --- Status card ---
            item {
                Spacer(Modifier.height(8.dp))
                if (uiState.isLoading) {
                    SkeletonCard(height = 88.dp, modifier = Modifier.fillMaxWidth())
                } else {
                    val processo = uiState.processo
                    val ultimaMov = uiState.movimentacoesByMonth.values.flatten().firstOrNull()
                    ProcessoStatusCard(
                        status = processo?.status,
                        impacto = ultimaMov?.impacto,
                        isLoading = false
                    )
                }
            }

            item { Spacer(Modifier.height(8.dp)) }

            // --- Próxima data card ---
            item {
                if (uiState.isLoading) {
                    SkeletonCard(height = 64.dp, modifier = Modifier.fillMaxWidth())
                } else {
                    val ultimaMov = uiState.movimentacoesByMonth.values.flatten().firstOrNull()
                    ProximaDataCard(proximaData = ultimaMov?.proximaData)
                }
            }

            item { Spacer(Modifier.height(8.dp)) }

            // --- Staleness indicator ---
            item {
                if (!uiState.isLoading) {
                    val processo = uiState.processo
                    val syncLabel = SyncLabelFormatter.format(processo?.ultimaSincronizacao)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (processo?.desatualizado == true) {
                            Icon(
                                imageVector = Icons.Outlined.Warning,
                                contentDescription = "Processo desatualizado",
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.error
                            )
                            Spacer(Modifier.size(4.dp))
                            Text(
                                text = syncLabel,
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.error
                            )
                        } else {
                            Text(
                                text = syncLabel,
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(16.dp)) }

            // --- Movimentações header ---
            item {
                Text(
                    text = "Movimentações",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
            }

            // --- Timeline: vazia ou com movimentações ---
            if (uiState.hasEmptyTimeline && !uiState.isLoading) {
                item {
                    val dataSincronizacao = SyncLabelFormatter.format(
                        uiState.processo?.ultimaSincronizacao
                    )
                    EmptyTimelineCard(dataSincronizacao = dataSincronizacao)
                }
            } else if (!uiState.isLoading) {
                uiState.movimentacoesByMonth.forEach { (mesAno, movimentacoes) ->
                    stickyHeader(key = "header_$mesAno") {
                        Surface(
                            color = MaterialTheme.colorScheme.background,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = mesAno,
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp)
                            )
                        }
                    }
                    items(movimentacoes, key = { it.id }) { mov ->
                        MovimentacaoCard(
                            movimentacao = mov,
                            onExpandToggle = { viewModel.toggleMovimentacao(mov.id) },
                            isExpanded = mov.id in uiState.expandedMovimentacaoIds
                        )
                        Spacer(Modifier.height(4.dp))
                    }
                }
            }

            item { Spacer(Modifier.height(16.dp)) }

            // --- Dados Cadastrais colapsável ---
            if (!uiState.isLoading && uiState.processo != null) {
                item {
                    DadosCadastraisSection(
                        processo = uiState.processo!!,
                        expanded = uiState.dadosCadastraisExpanded,
                        onToggle = { viewModel.toggleDadosCadastrais() }
                    )
                }
            }

            item { Spacer(Modifier.height(88.dp)) } // espaço para o FAB
        }
    }
}

/**
 * Card exibido quando não há movimentações na timeline.
 * Extraído como composable interno nomeado para ser referenciável por testes (Plan 05-05).
 */
@Composable
internal fun EmptyTimelineCard(dataSincronizacao: String) {
    ElevatedCard(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Nenhuma novidade desde $dataSincronizacao. " +
                "Isso é normal — processos judiciais podem ficar semanas sem movimentação. " +
                "Seu advogado será notificado automaticamente quando houver atualização.",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Composable
private fun DadosCadastraisSection(
    processo: ProcessoDetail,
    expanded: Boolean,
    onToggle: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        HorizontalDivider()
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Dados Cadastrais",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = onToggle) {
                Icon(
                    imageVector = if (expanded) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore,
                    contentDescription = if (expanded) "Recolher dados cadastrais" else "Expandir dados cadastrais"
                )
            }
        }

        AnimatedVisibility(visible = expanded) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
            ) {
                DadoCadastralItem(label = "Número do processo", valor = processo.numeroCnj)
                processo.tribunal?.takeIf { it.isNotBlank() }?.let {
                    DadoCadastralItem(label = "Tribunal responsável", valor = it)
                }
                processo.comarca?.takeIf { it.isNotBlank() }?.let {
                    DadoCadastralItem(label = "Cidade / Comarca", valor = it)
                }
                processo.classeProcessual?.takeIf { it.isNotBlank() }?.let {
                    DadoCadastralItem(label = "Tipo de processo", valor = it)
                }
                processo.requerente?.takeIf { it.isNotBlank() }?.let {
                    DadoCadastralItem(label = "Requerente", valor = it)
                }
                processo.requerido?.takeIf { it.isNotBlank() }?.let {
                    DadoCadastralItem(label = "Requerido", valor = it)
                }
            }
        }
    }
}

@Composable
private fun DadoCadastralItem(label: String, valor: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = valor,
            style = MaterialTheme.typography.bodyLarge
        )
    }
}

private fun abrirWhatsApp(context: Context, telefone: String) {
    val uri = Uri.parse("whatsapp://send?phone=$telefone")
    val intent = Intent(Intent.ACTION_VIEW, uri)
    if (intent.resolveActivity(context.packageManager) != null) {
        context.startActivity(intent)
    } else {
        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$telefone")))
    }
}
