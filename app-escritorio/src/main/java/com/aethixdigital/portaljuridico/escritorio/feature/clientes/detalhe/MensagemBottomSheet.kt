package com.aethixdigital.portaljuridico.escritorio.feature.clientes.detalhe

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.delay

/**
 * ModalBottomSheet para envio de mensagem/aviso manual ao cliente (D-13, ESCR-07).
 * Fire-and-forget com feedback visual de sucesso/erro no próprio Sheet.
 * Fecha automaticamente após sucesso.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MensagemBottomSheet(
    clienteId: String,
    clienteNome: String,
    onDismiss: () -> Unit,
    viewModel: MensagemViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var texto by remember { mutableStateOf("") }

    // Fechar automaticamente após sucesso
    LaunchedEffect(uiState) {
        if (uiState is MensagemUiState.Success) {
            delay(1500)  // mostrar feedback por 1.5s
            viewModel.resetState()
            onDismiss()
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Enviar mensagem para $clienteNome",
                style = MaterialTheme.typography.titleMedium
            )
            OutlinedTextField(
                value = texto,
                onValueChange = { texto = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 100.dp),
                label = { Text("Mensagem") },
                placeholder = { Text("Digite o aviso para o cliente...") },
                enabled = uiState !is MensagemUiState.Loading,
                maxLines = 6
            )
            when (val state = uiState) {
                is MensagemUiState.Success -> {
                    Text(
                        text = "Mensagem enviada com sucesso!",
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                is MensagemUiState.Error -> {
                    Text(
                        text = state.message,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                else -> {}
            }
            Button(
                onClick = { viewModel.enviar(clienteId, texto) },
                modifier = Modifier.fillMaxWidth(),
                enabled = texto.isNotBlank() && uiState !is MensagemUiState.Loading
            ) {
                if (uiState is MensagemUiState.Loading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text("Enviar")
                }
            }
        }
    }
}
