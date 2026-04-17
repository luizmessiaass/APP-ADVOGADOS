package com.aethixdigital.portaljuridico.escritorio.feature.clientes.cadastro

import com.aethixdigital.portaljuridico.data.repository.ClienteRepository
import com.aethixdigital.portaljuridico.network.model.dto.ClienteItem
import com.aethixdigital.portaljuridico.network.model.dto.PreviewResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CadastroClienteViewModelTest {
    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var fakeRepo: FakeCadastroClienteRepository
    private lateinit var viewModel: CadastroClienteViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        fakeRepo = FakeCadastroClienteRepository()
        viewModel = CadastroClienteViewModel(fakeRepo)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun initialState_noErrors() {
        val form = viewModel.formState.value
        assertNull(form.cpfError)
        assertNull(form.cnjError)
        assertFalse(form.isSubmitEnabled)
    }

    @Test
    fun onCpfBlur_invalidCpf_setsError() {
        viewModel.onCpfChange("11111111111")
        viewModel.onCpfBlur()
        assertNotNull(viewModel.formState.value.cpfError)
        assertEquals("CPF inválido", viewModel.formState.value.cpfError)
    }

    @Test
    fun onCpfBlur_validCpf_noError() {
        viewModel.onCpfChange("12345678909")
        viewModel.onCpfBlur()
        assertNull(viewModel.formState.value.cpfError)
    }

    @Test
    fun onCnjBlur_invalidCnj_setsError() {
        viewModel.onCnjChange("invalido")
        viewModel.onCnjBlur()
        assertNotNull(viewModel.formState.value.cnjError)
    }

    @Test
    fun onCnjBlur_validCnj_noError() {
        viewModel.onCnjChange("0001234-55.2023.8.26.0100")
        viewModel.onCnjBlur()
        assertNull(viewModel.formState.value.cnjError)
    }

    @Test
    fun cadastrar_success_emitsSuccess() = runTest {
        fakeRepo.cadastrarResult = Result.success("cliente-uuid-123")
        viewModel.onNomeChange("João Silva")
        viewModel.onEmailChange("joao@test.com")
        viewModel.onCpfChange("12345678909")
        viewModel.onCpfBlur()
        viewModel.onCnjChange("0001234-55.2023.8.26.0100")
        viewModel.onCnjBlur()
        viewModel.cadastrar()
        val state = viewModel.uiState.value
        assertTrue(state is CadastroUiState.Success)
        assertEquals("cliente-uuid-123", (state as CadastroUiState.Success).clienteId)
    }

    @Test
    fun cadastrar_failure_emitsError() = runTest {
        fakeRepo.cadastrarResult = Result.failure(Exception("CPF já cadastrado"))
        viewModel.onNomeChange("João Silva")
        viewModel.onEmailChange("joao@test.com")
        viewModel.onCpfChange("12345678909")
        viewModel.onCpfBlur()
        viewModel.onCnjChange("0001234-55.2023.8.26.0100")
        viewModel.onCnjBlur()
        viewModel.cadastrar()
        assertTrue(viewModel.uiState.value is CadastroUiState.Error)
    }
}

class FakeCadastroClienteRepository : ClienteRepository {
    var cadastrarResult: Result<String> = Result.success("fake-id")

    override suspend fun listarClientes(search: String?): Result<List<ClienteItem>> =
        Result.success(emptyList())

    override suspend fun cadastrarCliente(
        nome: String,
        cpf: String,
        email: String,
        numeroCnj: String
    ): Result<String> = cadastrarResult

    override suspend fun getClienteById(id: String): Result<ClienteItem> =
        Result.success(ClienteItem("1", "Test", "00000000000", null, null))

    override suspend fun previewCliente(clienteId: String): Result<PreviewResponse> =
        Result.success(PreviewResponse(ClienteItem("1", "Test", "00000000000", null, null), emptyList()))

    override suspend fun enviarMensagem(clienteId: String, texto: String): Result<String> =
        Result.success("fake-msg-id")

    override suspend fun getPortalSessionUrl(): Result<String> =
        Result.success("https://billing.stripe.com/test")

    override suspend fun deletarCliente(clienteId: String): Result<Unit> =
        Result.success(Unit)
}
