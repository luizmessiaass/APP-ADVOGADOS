package com.aethixdigital.portaljuridico.ui.billing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme

/**
 * Tela de suspensão exibida quando o tenant tem status == "suspended".
 * Compartilhada entre app_escritorio e app_cliente.
 *
 * Per D-09 (app_cliente) e D-10 (app_escritorio) em 07-CONTEXT.md
 */
@Composable
fun SuspensionScreen(
    isEscritorioApp: Boolean,
    onWhatsAppClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Default.Lock,
            contentDescription = "Conta suspensa",
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.error,
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Conta Suspensa",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onSurface,
        )

        Spacer(modifier = Modifier.height(16.dp))

        val bodyText = if (isEscritorioApp) {
            "Entre em contato com o Portal Jurídico para regularizar sua assinatura."
        } else {
            "O escritório está com o pagamento pendente. Contate seu advogado."
        }

        Text(
            text = bodyText,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )

        if (!isEscritorioApp && onWhatsAppClick != null) {
            Spacer(modifier = Modifier.height(32.dp))
            Button(onClick = onWhatsAppClick) {
                Text(text = "Falar com meu advogado")
            }
        }
    }
}
