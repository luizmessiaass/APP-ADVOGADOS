package com.aethixdigital.portaljuridico.cliente

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.aethixdigital.portaljuridico.cliente.features.processos.EmptyTimelineCard
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Rule
import org.junit.Test

@HiltAndroidTest
class ProcessoDetailScreenEmptyTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun processoDetail_emptyTimeline_showsReassuringCard() {
        composeTestRule.setContent {
            PortalJuridicoTheme {
                EmptyTimelineCard(dataSincronizacao = "15 de janeiro de 2025")
            }
        }
        composeTestRule.onNodeWithText("Nenhuma novidade desde", substring = true).assertIsDisplayed()
        composeTestRule.onNodeWithText("Isso é normal", substring = true).assertIsDisplayed()
        composeTestRule.onNodeWithText("Seu advogado será notificado", substring = true).assertIsDisplayed()
    }
}
