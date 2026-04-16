package com.aethixdigital.portaljuridico.ui.components

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow

/**
 * Texto expansível com botão "ver mais".
 * Exibe o texto truncado a [collapsedMaxLines] linhas com botão de expansão inline.
 * Uma vez expandido, não oferece "ver menos" — padrão de leitura para leigos.
 *
 * @param text Texto a exibir
 * @param collapsedMaxLines Número máximo de linhas no estado colapsado (padrão: 3)
 */
@Composable
fun ExpandableText(
    text: String,
    collapsedMaxLines: Int = 3,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    Column(modifier = modifier) {
        Text(
            text = text,
            maxLines = if (expanded) Int.MAX_VALUE else collapsedMaxLines,
            overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.animateContentSize()
        )
        if (!expanded) {
            TextButton(onClick = { expanded = true }) {
                Text(
                    text = "ver mais",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}
