package com.aethixdigital.portaljuridico.escritorio.feature.preview

import androidx.compose.ui.test.assertExists
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.lifecycle.SavedStateHandle
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.aethixdigital.portaljuridico.data.repository.ClienteRepository
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
import com.aethixdigital.portaljuridico.network.model.dto.MovimentacaoDto
import com.aethixdigital.portaljuridico.network.model.dto.PreviewResponse
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PreviewScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun previewScreen_showsMovimentacaoExplicacaoInCard() {
        val fakeRepo = object : ClienteRepository {
            override suspend fun listarClientes(search: String?): Result<List<ClienteItem>> =
                Result.success(emptyList())

            override suspend fun cadastrarCliente(
                nome: String,
                cpf: String,
                email: String,
                numeroCnj: String
            ): Result<String> = Result.success("id")

            override suspend fun getClienteById(id: String): Result<ClienteItem> =
                Result.success(ClienteItem("cli-1", "João", "123.456.789-09", "2h atrás", "Em andamento"))

            override suspend fun previewCliente(clienteId: String): Result<PreviewResponse> =
                Result.success(
                    PreviewResponse(
                        ClienteItem("cli-1", "João", "123.456.789-09", "2h atrás", "Em andamento"),
                        listOf(
                            MovimentacaoDto(
                                id = "m1",
                                status = "Aguardando",
                                proximaData = null,
                                explicacao = "O juiz analisa o processo",
                                impacto = "Aguarde a decisão",
                                disclaimer = "Explicação gerada por IA — confirme com seu advogado"
                            )
                        )
                    )
                )

            override suspend fun enviarMensagem(clienteId: String, texto: String): Result<String> =
                Result.success("id")

            override suspend fun getPortalSessionUrl(): Result<String> = Result.success("url")
        }

        val vm = PreviewViewModel(fakeRepo, SavedStateHandle(mapOf("clienteId" to "cli-1")))
        composeTestRule.setContent {
            PortalJuridicoTheme {
                PreviewScreen(onBack = {}, viewModel = vm)
            }
        }
        composeTestRule.waitForIdle()
        // Verifica que a explicação da movimentação é exibida no card
        composeTestRule.onNodeWithText("O juiz analisa o processo").assertExists()
    }

    @Test
    fun previewScreen_emptyState_showsMessage() {
        val fakeRepo = object : ClienteRepository {
            override suspend fun listarClientes(search: String?): Result<List<ClienteItem>> =
                Result.success(emptyList())

            override suspend fun cadastrarCliente(
                nome: String,
                cpf: String,
                email: String,
                numeroCnj: String
            ): Result<String> = Result.success("id")

            override suspend fun getClienteById(id: String): Result<ClienteItem> =
                Result.success(ClienteItem("cli-1", "João", "123.456.789-09", null, null))

            override suspend fun previewCliente(clienteId: String): Result<PreviewResponse> =
                Result.success(
                    PreviewResponse(
                        ClienteItem("cli-1", "João", "123.456.789-09", null, null),
                        emptyList()
                    )
                )

            override suspend fun enviarMensagem(clienteId: String, texto: String): Result<String> =
                Result.success("id")

            override suspend fun getPortalSessionUrl(): Result<String> = Result.success("url")
        }

        val vm = PreviewViewModel(fakeRepo, SavedStateHandle(mapOf("clienteId" to "cli-1")))
        composeTestRule.setContent {
            PortalJuridicoTheme {
                PreviewScreen(onBack = {}, viewModel = vm)
            }
        }
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Nenhuma movimentação disponível ainda.\nSincronização em andamento.")
            .assertExists()
    }
}
