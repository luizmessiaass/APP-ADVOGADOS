package com.aethixdigital.portaljuridico.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme

/**
 * View de estado vazio ou erro, centrada na tela.
 * Exibe título, corpo e opcionalmente um botão de ação.
 *
 * @param heading Título em titleLarge
 * @param body Descrição em bodyLarge, centralizada
 * @param actionLabel Texto do botão de ação; null = sem botão
 * @param onAction Callback do botão; invocado apenas quando actionLabel != null
 */
@Composable
fun EmptyStateView(
    heading: String,
    body: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = heading,
            style = MaterialTheme.typography.titleLarge,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = body,
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        if (actionLabel != null) {
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedButton(onClick = { onAction?.invoke() }) {
                Text(text = actionLabel)
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun EmptyStateViewPreview() {
    PortalJuridicoTheme {
        EmptyStateView(
            heading = "Nenhum processo encontrado",
            body = "Seu advogado ainda não vinculou nenhum processo à sua conta. Entre em contato com o escritório.",
            actionLabel = "Tentar novamente",
            onAction = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun EmptyStateViewNoActionPreview() {
    PortalJuridicoTheme {
        EmptyStateView(
            heading = "Nenhum processo encontrado",
            body = "Seu advogado ainda não vinculou nenhum processo à sua conta."
        )
    }
}
