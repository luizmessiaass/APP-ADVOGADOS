package com.aethixdigital.portaljuridico.escritorio.feature.login

import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.aethixdigital.portaljuridico.data.repository.AuthRepository
import com.aethixdigital.portaljuridico.escritorio.MainActivity
import dagger.hilt.android.testing.BindValue
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class LoginScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @BindValue
    @JvmField
    val fakeAuthRepository: AuthRepository = FakeAuthRepositoryForUI()

    @Test
    fun loginScreen_showsEmailPasswordAndButton() {
        composeTestRule.onNodeWithText("E-mail").assertExists()
        composeTestRule.onNodeWithText("Senha").assertExists()
        composeTestRule.onNodeWithText("Entrar").assertExists()
    }

    @Test
    fun loginButton_disabledWhenFieldsEmpty() {
        composeTestRule.onNodeWithText("Entrar").assertIsNotEnabled()
    }
}

class FakeAuthRepositoryForUI : AuthRepository {
    override suspend fun login(email: String, password: String): Result<String> =
        Result.success("advogado")

    override suspend fun logout() {}

    override suspend fun getSavedToken(): String? = null  // sempre mostra login

    override fun isValidAdvogadoToken(token: String): Boolean = false
}
