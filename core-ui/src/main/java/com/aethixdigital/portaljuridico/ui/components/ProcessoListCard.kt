package com.aethixdigital.portaljuridico.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.aethixdigital.portaljuridico.common.model.ProcessoSummary
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme

/**
 * Card de processo na lista de processos do cliente.
 * Exibe número CNJ, status traduzido e tribunal.
 * Indica desatualização com ícone de aviso vermelho.
 *
 * @param processo Dados resumidos do processo
 * @param onClick Callback ao tocar no card
 */
@Composable
fun ProcessoListCard(
    processo: ProcessoSummary,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    ElevatedCard(
        onClick = onClick,
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Linha 1: número CNJ
            Text(
                text = processo.numeroCnj,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            // Linha 2: status traduzido (1 linha, ellipsis)
            Text(
                text = processo.status ?: "Tradução em andamento...",
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                color = if (processo.status != null)
                    MaterialTheme.colorScheme.onSurface
                else
                    MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            // Linha 3: tribunal
            val tribunalText = processo.tribunal
            if (!tribunalText.isNullOrBlank()) {
                Text(
                    text = tribunalText,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            // Indicador de desatualização
            if (processo.desatualizado) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.Warning,
                        contentDescription = "Processo desatualizado",
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.size(4.dp))
                    Text(
                        text = "Desatualizado",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ProcessoListCardPreview() {
    PortalJuridicoTheme {
        ProcessoListCard(
            processo = ProcessoSummary(
                id = "1",
                numeroCnj = "0001234-55.2023.8.26.0100",
                tribunal = "Tribunal de Justiça de São Paulo",
                ultimaSincronizacao = "há 2 horas",
                desatualizado = false,
                status = "Aguardando julgamento"
            ),
            onClick = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ProcessoListCardDesatualizadoPreview() {
    PortalJuridicoTheme {
        ProcessoListCard(
            processo = ProcessoSummary(
                id = "2",
                numeroCnj = "0009876-11.2022.8.26.0200",
                tribunal = "Tribunal Regional Federal da 3ª Região",
                ultimaSincronizacao = null,
                desatualizado = true,
                status = null
            ),
            onClick = {}
        )
    }
}
