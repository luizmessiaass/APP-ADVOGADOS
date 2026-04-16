package com.aethixdigital.portaljuridico.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf

/**
 * CompositionLocal that carries the active brand color scheme.
 * Defaults to the Editorial Juris scheme so previews and non-flavor
 * contexts work without explicit injection.
 */
val LocalBrandColorScheme = staticCompositionLocalOf<ColorScheme> {
    EditorialJurisColorScheme
}

private val EditorialJurisColorScheme = lightColorScheme(
    primary                = EjPrimary,
    onPrimary              = EjOnPrimary,
    primaryContainer       = EjPrimaryContainer,
    onPrimaryContainer     = EjOnPrimaryContainer,
    inversePrimary         = EjInversePrimary,
    secondary              = EjSecondary,
    onSecondary            = EjOnSecondaryFixed,
    secondaryContainer     = EjSecondaryContainer,
    onSecondaryContainer   = EjOnSecondaryContainer,
    background             = EjBackground,
    onBackground           = EjOnSurface,
    surface                = EjSurface,
    onSurface              = EjOnSurface,
    surfaceVariant         = EjSurfaceVariant,
    onSurfaceVariant       = EjOnSurfaceVariant,
    surfaceContainerLowest = EjSurfaceContainerLowest,
    surfaceContainerLow    = EjSurfaceContainerLow,
    surfaceContainer       = EjSurfaceContainer,
    surfaceContainerHigh   = EjSurfaceContainerHigh,
    surfaceContainerHighest= EjSurfaceContainerHighest,
    outline                = EjOutline,
    outlineVariant         = EjOutlineVariant,
    error                  = EjError,
    onError                = EjOnError,
    errorContainer         = EjErrorContainer,
    onErrorContainer       = EjOnErrorContainer,
    inverseSurface         = EjInverseSurface,
    inverseOnSurface       = EjInverseOnSurface,
)

/**
 * Main theme composable. Accepts an optional [colorScheme] override so that
 * each flavor's Activity/BrandConfig can inject its own palette. Callers in
 * app-cliente should pass BrandConfig.toColorScheme(); callers in app-escritorio
 * continue to pass null (gets Editorial Juris default).
 */
@Composable
fun PortalJuridicoTheme(
    colorScheme: ColorScheme? = null,
    darkTheme: Boolean = false,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val resolvedScheme = colorScheme ?: EditorialJurisColorScheme
    CompositionLocalProvider(LocalBrandColorScheme provides resolvedScheme) {
        MaterialTheme(
            colorScheme = resolvedScheme,
            typography  = Typography,
            content     = content
        )
    }
}
