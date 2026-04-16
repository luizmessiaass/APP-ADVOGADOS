package com.aethixdigital.portaljuridico.escritorio.feature.clientes.list

import androidx.compose.ui.test.assertExists
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.aethixdigital.portaljuridico.data.repository.AuthRepository
import com.aethixdigital.portaljuridico.data.repository.ClienteRepository
import com.aethixdigital.portaljuridico.escritorio.MainActivity
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
import com.aethixdigital.portaljuridico.network.model.dto.PreviewResponse
import dagger.hilt.android.testing.BindValue
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class ClienteListScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @BindValue
    @JvmField
    val fakeAuthRepository: AuthRepository = FakeAuthRepositoryLoggedIn()

    @BindValue
    @JvmField
    val fakeClienteRepository: ClienteRepository = FakeClienteRepositoryWithData()

    @Test
    fun clienteList_showsSearchField() {
        composeTestRule.onNodeWithText("Buscar por nome, CPF ou processo...").assertExists()
    }

    @Test
    fun clienteList_showsClienteCard() {
        composeTestRule.onNodeWithText("João Silva").assertExists()
    }
}

class FakeAuthRepositoryLoggedIn : AuthRepository {
    override suspend fun login(email: String, password: String): Result<String> =
        Result.success("advogado")

    override suspend fun logout() {}

    override suspend fun getSavedToken(): String? = "fake.valid.token"

    override fun isValidAdvogadoToken(token: String): Boolean = true
}

class FakeClienteRepositoryWithData : ClienteRepository {
    override suspend fun listarClientes(search: String?): Result<List<ClienteItem>> =
        Result.success(
            listOf(
                ClienteItem("1", "João Silva", "123.456.789-09", "2h atrás", "Em andamento")
            )
        )

    override suspend fun cadastrarCliente(
        nome: String,
        cpf: String,
        email: String,
        numeroCnj: String
    ): Result<String> = Result.success("id")

    override suspend fun getClienteById(id: String): Result<ClienteItem> =
        Result.success(ClienteItem("1", "João Silva", "123.456.789-09", "2h atrás", "Em andamento"))

    override suspend fun previewCliente(clienteId: String): Result<PreviewResponse> =
        Result.success(
            PreviewResponse(
                ClienteItem("1", "João Silva", "123.456.789-09", "2h atrás", "Em andamento"),
                emptyList()
            )
        )

    override suspend fun enviarMensagem(clienteId: String, texto: String): Result<String> =
        Result.success("msg-id")

    override suspend fun getPortalSessionUrl(): Result<String> =
        Result.success("https://billing.stripe.com/test")
}
