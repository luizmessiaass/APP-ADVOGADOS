package com.aethixdigital.portaljuridico.escritorio.feature.clientes.detalhe

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aethixdigital.portaljuridico.ui.components.ProcessoStatusCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClienteDetalheScreen(
    onBack: () -> Unit,
    onPreviewClick: (clienteId: String) -> Unit,
    viewModel: ClienteDetalheViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val portalUrl by viewModel.portalUrl.collectAsState()
    val portalError by viewModel.portalError.collectAsState()
    val deletarState by viewModel.deletarState.collectAsState()
    var showMensagemSheet by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current

    // Abrir CCT quando URL estiver disponível (ESCR-09)
    LaunchedEffect(portalUrl) {
        portalUrl?.let { url ->
            openStripePortal(context, url)
        }
    }

    // Navigate back on successful deletion
    LaunchedEffect(deletarState) {
        if (deletarState is DeletarClienteState.Success) {
            onBack()
        }
    }

    // Show snackbar on deletion error (D-02)
    LaunchedEffect(deletarState) {
        if (deletarState is DeletarClienteState.Error) {
            snackbarHostState.showSnackbar(
                message = "Erro ao deletar cliente. Tente novamente.",
                duration = SnackbarDuration.Long
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detalhe do Cliente") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { innerPadding ->
        when (val state = uiState) {
            is ClienteDetalheUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is ClienteDetalheUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) {
                    Text(state.message, color = MaterialTheme.colorScheme.error)
                }
            }
            is ClienteDetalheUiState.Success -> {
                val cliente = state.cliente
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Dados do cliente
                    Text(
                        text = cliente.nome,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "CPF: ${cliente.cpf}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    // ESCR-08: status de sync DataJud — usando ProcessoStatusCard de :core-ui
                    ProcessoStatusCard(
                        status = cliente.statusProcesso,
                        impacto = cliente.ultimaSincronizacao?.let { "Última sync: $it" },
                        isLoading = cliente.statusProcesso == null
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    // Ações
                    Button(
                        onClick = { onPreviewClick(viewModel.getClienteId()) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Ver como cliente")
                    }
                    // ESCR-07: Bottom Sheet de mensagem manual (D-13)
                    OutlinedButton(
                        onClick = { showMensagemSheet = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Enviar mensagem")
                    }
                    // ESCR-09: Stripe Customer Portal via Chrome Custom Tabs
                    OutlinedButton(
                        onClick = { viewModel.loadPortalUrl() },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Gerenciar assinatura")
                    }
                    // Erro do portal Stripe (se houver)
                    portalError?.let { error ->
                        Text(
                            text = error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    // Art. 18 LGPD: botão de deleção destrutiva (D-02)
                    OutlinedButton(
                        onClick = { showDeleteDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.error
                        ),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error)
                    ) {
                        Text("Deletar cliente")
                    }
                }

                // ModalBottomSheet condicional (ESCR-07)
                if (showMensagemSheet) {
                    MensagemBottomSheet(
                        clienteId = viewModel.getClienteId(),
                        clienteNome = cliente.nome,
                        onDismiss = { showMensagemSheet = false }
                    )
                }
            }
        }
    }

    // AlertDialog de confirmação de deleção destrutiva (D-02, T-8-11)
    if (showDeleteDialog) {
        val clienteNome = (uiState as? ClienteDetalheUiState.Success)?.cliente?.nome ?: "este cliente"
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Deletar cliente?") },
            text = {
                Text("Todos os dados de $clienteNome serão removidos permanentemente e não podem ser recuperados.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deletarCliente()
                        showDeleteDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Deletar")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}
