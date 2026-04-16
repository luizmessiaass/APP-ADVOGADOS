package com.aethixdigital.portaljuridico.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme

/**
 * Card skeleton com animação shimmer para estados de carregamento.
 * Alpha oscila entre 0.3 e 0.8 em ciclos de 800ms.
 *
 * @param height Altura do skeleton card
 */
@Composable
fun SkeletonCard(
    height: Dp,
    modifier: Modifier = Modifier
) {
    var visible by remember { mutableStateOf(true) }
    val alpha by animateFloatAsState(
        targetValue = if (visible) 0.8f else 0.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 800),
            repeatMode = RepeatMode.Reverse
        ),
        label = "skeleton_alpha"
    )

    LaunchedEffect(Unit) {
        visible = false
    }

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .alpha(alpha),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {}
}

@Preview(showBackground = true)
@Composable
private fun SkeletonCardPreview() {
    PortalJuridicoTheme {
        SkeletonCard(height = 80.dp)
    }
}
