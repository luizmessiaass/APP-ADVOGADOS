package com.aethixdigital.portaljuridico.escritorio.feature.clientes.detalhe

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

/**
 * Abre o Stripe Customer Portal em Chrome Custom Tabs.
 * URL é obtida do backend via POST /api/v1/escritorios/portal-session.
 * Session URL tem validade de ~5 minutos (Stripe default) — abrir imediatamente após fetch.
 * ESCR-09: via Chrome Custom Tabs (não browser externo) para manter contexto in-app.
 */
fun openStripePortal(context: Context, url: String) {
    val customTabsIntent = CustomTabsIntent.Builder()
        .setShowTitle(true)
        .build()
    customTabsIntent.launchUrl(context, Uri.parse(url))
}
