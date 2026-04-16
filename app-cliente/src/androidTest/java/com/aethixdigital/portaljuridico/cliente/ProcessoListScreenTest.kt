package com.aethixdigital.portaljuridico.cliente

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.aethixdigital.portaljuridico.ui.components.EmptyStateView
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Rule
import org.junit.Test

@HiltAndroidTest
class ProcessoListScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun processoList_errorState_showsRetryButton() {
        composeTestRule.setContent {
            PortalJuridicoTheme {
                EmptyStateView(
                    heading = "Erro ao carregar",
                    body = "Não conseguimos carregar seus processos. Verifique sua conexão.",
                    actionLabel = "Tentar novamente",
                    onAction = {}
                )
            }
        }
        composeTestRule.onNodeWithText("Não conseguimos carregar seus processos.", substring = true).assertIsDisplayed()
        composeTestRule.onNodeWithText("Tentar novamente").assertIsDisplayed()
    }

    @Test
    fun processoList_emptyState_showsEmptyMessage() {
        composeTestRule.setContent {
            PortalJuridicoTheme {
                EmptyStateView(
                    heading = "Nenhum processo encontrado",
                    body = "Seu advogado ainda não vinculou nenhum processo à sua conta. Entre em contato com o escritório."
                )
            }
        }
        composeTestRule.onNodeWithText("Nenhum processo encontrado").assertIsDisplayed()
        composeTestRule.onNodeWithText("Entre em contato com o escritório.", substring = true).assertIsDisplayed()
    }
}
