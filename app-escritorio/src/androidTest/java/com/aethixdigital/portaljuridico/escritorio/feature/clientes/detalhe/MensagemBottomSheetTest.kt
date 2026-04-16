package com.aethixdigital.portaljuridico.escritorio.feature.clientes.detalhe

import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.aethixdigital.portaljuridico.data.repository.ClienteRepository
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
import com.aethixdigital.portaljuridico.network.model.dto.PreviewResponse
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MensagemBottomSheetTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun enviarButton_disabledWhenTextEmpty() {
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
                Result.success(ClienteItem("1", "T", "0", null, null))

            override suspend fun previewCliente(clienteId: String): Result<PreviewResponse> =
                Result.success(PreviewResponse(ClienteItem("1", "T", "0", null, null), emptyList()))

            override suspend fun enviarMensagem(clienteId: String, texto: String): Result<String> =
                Result.success("id")

            override suspend fun getPortalSessionUrl(): Result<String> = Result.success("url")
        }

        val vm = MensagemViewModel(fakeRepo)
        composeTestRule.setContent {
            PortalJuridicoTheme {
                MensagemBottomSheet(
                    clienteId = "cli-1",
                    clienteNome = "João",
                    onDismiss = {},
                    viewModel = vm
                )
            }
        }
        composeTestRule.onNodeWithText("Enviar").assertIsNotEnabled()
    }
}
