package com.aethixdigital.portaljuridico.escritorio.feature.clientes.detalhe

import android.content.ActivityNotFoundException
import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import com.aethixdigital.portaljuridico.escritorio.BuildConfig

/**
 * Abre o link de suporte do Portal Jurídico via Chrome Custom Tabs.
 *
 * Per CONTEXT.md <specifics> (Phase 7): o método de pagamento ainda não está definido,
 * portanto o Stripe Customer Portal foi substituído por um link de contato WhatsApp.
 * Quando um provider de pagamento for escolhido, esta função será atualizada para abrir
 * o portal de gerenciamento do respectivo provider.
 *
 * O número de telefone é provido via BuildConfig.SUPPORT_WHATSAPP (declarado em
 * app-escritorio/build.gradle.kts como buildConfigField) — nunca hardcoded no source.
 *
 * ESCR-09: via Chrome Custom Tabs (não browser externo) para manter contexto in-app.
 * T-7-23: SUPPORT_WHATSAPP é constante de compile-time — sem impacto de segurança.
 */
fun openSupportContact(context: Context) {
    val phone = BuildConfig.SUPPORT_WHATSAPP
    val message = Uri.encode("Olá, preciso de suporte Portal Jurídico")
    val waUrl = "https://wa.me/$phone?text=$message"
    val fallbackUrl = "tel:$phone"

    val customTabsIntent = CustomTabsIntent.Builder()
        .setShowTitle(true)
        .build()

    try {
        customTabsIntent.launchUrl(context, Uri.parse(waUrl))
    } catch (e: ActivityNotFoundException) {
        customTabsIntent.launchUrl(context, Uri.parse(fallbackUrl))
    }
}
