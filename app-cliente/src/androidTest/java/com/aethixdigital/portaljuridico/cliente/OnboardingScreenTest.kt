package com.aethixdigital.portaljuridico.cliente

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertDoesNotExist
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.navigation.compose.rememberNavController
import com.aethixdigital.portaljuridico.cliente.features.onboarding.OnboardingScreen
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Rule
import org.junit.Test

@HiltAndroidTest
class OnboardingScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun onboarding_showsFourPages() {
        composeTestRule.setContent {
            PortalJuridicoTheme {
                OnboardingScreen(navController = rememberNavController())
            }
        }
        composeTestRule.onNodeWithText("Seus processos em linguagem simples").assertIsDisplayed()
        composeTestRule.onNodeWithText("Próximo").assertIsDisplayed()
        composeTestRule.onNodeWithText("Pular").assertDoesNotExist()
    }

    @Test
    fun onboarding_nextButtonProgressesThroughPages() {
        composeTestRule.setContent {
            PortalJuridicoTheme {
                OnboardingScreen(navController = rememberNavController())
            }
        }
        composeTestRule.onNodeWithText("Próximo").performClick()
        composeTestRule.onNodeWithText("Próximas datas e prazos").assertIsDisplayed()
        composeTestRule.onNodeWithText("Próximo").performClick()
        composeTestRule.onNodeWithText("Notificações automáticas").assertIsDisplayed()
        composeTestRule.onNodeWithText("Próximo").performClick()
        composeTestRule.onNodeWithText("Fale com seu advogado").assertIsDisplayed()
        composeTestRule.onNodeWithText("Começar").assertIsDisplayed()
    }
}
