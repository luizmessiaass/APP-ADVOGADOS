package com.aethixdigital.portaljuridico.cliente.brand

import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import com.aethixdigital.portaljuridico.cliente.R

/**
 * Brand configuration for the Flores Advocacia flavor.
 * Same package and object name as main/BrandConfig — Gradle selects
 * the correct source set based on the active flavor.
 */
object BrandConfig {
    // Primary: bordô / vinho
    val primary            = Color(0xFF7B1D22)
    val primaryContainer   = Color(0xFFA52830)
    val onPrimary          = Color.White

    // Secondary: warm gold complementary to bordô
    val secondary          = Color(0xFF8B6914)
    val secondaryFixed     = Color(0xFFF5D78A)
    val onSecondaryFixed   = Color(0xFF3A2800)
    val secondaryContainer = Color(0xFFF5D78A)
    val onSecondaryContainer = Color(0xFF3A2800)

    // Surface palette (warm off-white — shared with EJ)
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
    val inversePrimary   = Color(0xFFE8A0A5)

    // Gradient stops: dark bordô → lighter bordô
    val gradientStart = Color(0xFF5E1519)
    val gradientEnd   = Color(0xFF7B1D22)

    // Logo: Flores Advocacia PNG
    val logoResId: Int? = R.drawable.ic_brand_logo

    val appDisplayName = "Flores Advocacia"
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
