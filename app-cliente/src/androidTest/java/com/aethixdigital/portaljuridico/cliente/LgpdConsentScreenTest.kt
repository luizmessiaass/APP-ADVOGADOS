package com.aethixdigital.portaljuridico.cliente

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.navigation.compose.rememberNavController
import com.aethixdigital.portaljuridico.cliente.features.lgpd.LgpdConsentScreen
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Rule
import org.junit.Test

@HiltAndroidTest
class LgpdConsentScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun lgpdConsent_acceptButtonDisabledInitially() {
        composeTestRule.setContent {
            PortalJuridicoTheme {
                LgpdConsentScreen(navController = rememberNavController())
            }
        }
        composeTestRule.onNodeWithText("Aceitar").assertIsNotEnabled()
    }

    @Test
    fun lgpdConsent_acceptButtonEnabledAfterScrollAndCheck() {
        composeTestRule.setContent {
            PortalJuridicoTheme {
                LgpdConsentScreen(navController = rememberNavController())
            }
        }
        composeTestRule.onNodeWithText("Aceitar").performScrollTo()
        composeTestRule.onNodeWithText("Aceitar").assertIsNotEnabled()
        composeTestRule.onNode(hasTestTag("lgpd_checkbox")).performClick()
        composeTestRule.onNodeWithText("Aceitar").assertIsEnabled()
    }

    @Test
    fun lgpdConsent_rejectShowsAlertDialog() {
        composeTestRule.setContent {
            PortalJuridicoTheme {
                LgpdConsentScreen(navController = rememberNavController())
            }
        }
        composeTestRule.onNodeWithText("Recusar").performClick()
        composeTestRule.onNodeWithText("Uso do app requer aceite").assertIsDisplayed()
        composeTestRule.onNodeWithText("Cancelar").assertIsDisplayed()
        composeTestRule.onNodeWithText("Sair").assertIsDisplayed()
    }
}
