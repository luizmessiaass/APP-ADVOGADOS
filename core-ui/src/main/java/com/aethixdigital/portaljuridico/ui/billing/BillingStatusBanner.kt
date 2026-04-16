package com.aethixdigital.portaljuridico.ui.billing

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme

/**
 * Banner informativo de status de cobrança exibido no topo das telas principais.
 *
 * Estados:
 * - status == "suspended": banner vermelho — conta suspensa
 * - status == "read_only" && isEscritorioApp: banner vermelho — modo leitura com countdown
 * - graceBanner && isEscritorioApp: banner vermelho — assinatura vencendo com countdown
 * - graceBanner && !isEscritorioApp: banner amarelo/âmbar — escritório com pagamento pendente
 * - Caso contrário: não renderiza nada
 *
 * Per D-09 (app_cliente) e D-10 (app_escritorio) em 07-CONTEXT.md
 */
@Composable
fun BillingStatusBanner(
    status: String,
    graceBanner: Boolean,
    daysUntilSuspension: Int?,
    isEscritorioApp: Boolean,
    modifier: Modifier = Modifier,
) {
    val (backgroundColor, message) = when {
        status == "suspended" -> Pair(
            MaterialTheme.colorScheme.error,
            "Conta suspensa. Entre em contato para regularizar.",
        )
        status == "read_only" && isEscritorioApp -> Pair(
            MaterialTheme.colorScheme.error,
            if (daysUntilSuspension != null)
                "Modo leitura — $daysUntilSuspension dias para suspensão. Regularize."
            else
                "Modo leitura ativo. Regularize sua assinatura.",
        )
        graceBanner && isEscritorioApp -> Pair(
            MaterialTheme.colorScheme.error,
            if (daysUntilSuspension != null)
                "Assinatura vence em $daysUntilSuspension dias. Regularize para evitar bloqueio."
            else
                "Assinatura com pagamento pendente. Regularize.",
        )
        graceBanner && !isEscritorioApp -> Pair(
            Color(0xFFFF8F00),
            "Escritório com pagamento pendente. Contate seu advogado.",
        )
        else -> return
    }

    Surface(
        modifier = modifier.fillMaxWidth(),
        color = backgroundColor,
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = Color.White,
        )
    }
}
