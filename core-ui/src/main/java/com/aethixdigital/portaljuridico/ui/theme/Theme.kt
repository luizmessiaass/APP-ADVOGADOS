package com.aethixdigital.portaljuridico.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

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

@Composable
fun PortalJuridicoTheme(
    darkTheme: Boolean = false,   // app-cliente e light-only; parametro mantido para compatibilidade
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = EditorialJurisColorScheme,
        typography  = Typography,
        content     = content
    )
}
