package com.aethixdigital.portaljuridico.cliente.brand

import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

/**
 * Brand configuration for the default (Editorial Juris) flavor.
 * The flores source set provides an alternative object with the same name.
 * Theme.kt reads this object at runtime — no interface needed because
 * the Kotlin compiler resolves the correct source set per flavor.
 */
object BrandConfig {
    // Primary palette
    val primary            = Color(0xFF041631)
    val primaryContainer   = Color(0xFF1B2B47)
    val onPrimary          = Color.White

    // Secondary / accent palette
    val secondary          = Color(0xFF735C00)
    val secondaryFixed     = Color(0xFFFFE088)
    val onSecondaryFixed   = Color(0xFF241A00)
    val secondaryContainer = Color(0xFFFED65B)
    val onSecondaryContainer = Color(0xFF745C00)

    // Surface palette (same for all tenants — warm off-white)
    val background              = Color(0xFFFAF9F5)
    val surface                 = Color(0xFFFAF9F5)
    val surfaceContainerLowest  = Color(0xFFFFFFFF)
    val surfaceContainerLow     = Color(0xFFF5F4F0)
    val surfaceContainer        = Color(0xFFEFEEEA)
    val surfaceContainerHigh    = Color(0xFFE9E8E4)
    val surfaceContainerHighest = Color(0xFFE3E2DF)
    val surfaceVariant          = Color(0xFFE3E2DF)
    val surfaceDim              = Color(0xFFDBDAD6)

    // Content colors
    val onSurface        = Color(0xFF1B1C1A)
    val onSurfaceVariant = Color(0xFF44474D)
    val outline          = Color(0xFF75777E)
    val outlineVariant   = Color(0xFFC5C6CE)

    // Error
    val error            = Color(0xFFBA1A1A)
    val errorContainer   = Color(0xFFFFDAD6)
    val onError          = Color.White
    val onErrorContainer = Color(0xFF93000A)

    // Inverse
    val inverseSurface   = Color(0xFF30312E)
    val inverseOnSurface = Color(0xFFF2F1ED)
    val inversePrimary   = Color(0xFFB7C7EA)

    // Gradient stops used in WelcomeScreen / LoginScreen hero sections
    val gradientStart = primary
    val gradientEnd   = primaryContainer

    // Logo: null means "use vector icon fallback" (AccountBalance icon)
    val logoResId: Int? = null

    // App display name used in screens (supplement to string resource)
    val appDisplayName = "Meu Processo"
    val appTagline     = "Seu processo juridico em portugues claro."
}

fun BrandConfig.toColorScheme() = lightColorScheme(
    primary                = primary,
    onPrimary              = onPrimary,
    primaryContainer       = primaryContainer,
    secondary              = secondary,
    onSecondary            = onSecondaryFixed,
    secondaryContainer     = secondaryContainer,
    onSecondaryContainer   = onSecondaryContainer,
    background             = background,
    onBackground           = onSurface,
    surface                = surface,
    onSurface              = onSurface,
    surfaceVariant         = surfaceVariant,
    onSurfaceVariant       = onSurfaceVariant,
    surfaceContainerLowest = surfaceContainerLowest,
    surfaceContainerLow    = surfaceContainerLow,
    surfaceContainer       = surfaceContainer,
    surfaceContainerHigh   = surfaceContainerHigh,
    surfaceContainerHighest= surfaceContainerHighest,
    outline                = outline,
    outlineVariant         = outlineVariant,
    error                  = error,
    onError                = onError,
    errorContainer         = errorContainer,
    onErrorContainer       = onErrorContainer,
    inverseSurface         = inverseSurface,
    inverseOnSurface       = inverseOnSurface,
    inversePrimary         = inversePrimary,
)
