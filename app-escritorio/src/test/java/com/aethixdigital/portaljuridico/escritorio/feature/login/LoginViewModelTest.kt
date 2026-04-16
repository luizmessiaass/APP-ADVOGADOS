package com.aethixdigital.portaljuridico.escritorio.feature.login

import com.aethixdigital.portaljuridico.data.repository.AuthRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {
    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var fakeAuthRepository: FakeAuthRepository
    private lateinit var viewModel: LoginViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        fakeAuthRepository = FakeAuthRepository()
        viewModel = LoginViewModel(fakeAuthRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun initialState_isIdle() {
        assertTrue(viewModel.uiState.value is LoginUiState.Idle)
    }

    @Test
    fun login_success_emitsSuccess() = runTest {
        fakeAuthRepository.loginResult = Result.success("advogado")
        viewModel.login("test@test.com", "password")
        val state = viewModel.uiState.value
        assertTrue("Expected Success but got $state", state is LoginUiState.Success)
        assertEquals("advogado", (state as LoginUiState.Success).role)
    }

    @Test
    fun login_failure_emitsError() = runTest {
        fakeAuthRepository.loginResult = Result.failure(Exception("Credenciais inválidas"))
        viewModel.login("test@test.com", "wrong")
        val state = viewModel.uiState.value
        assertTrue(state is LoginUiState.Error)
        assertEquals("Credenciais inválidas", (state as LoginUiState.Error).message)
    }
}

class FakeAuthRepository : AuthRepository {
    var loginResult: Result<String> = Result.success("advogado")
    override suspend fun login(email: String, password: String) = loginResult
    override suspend fun logout() {}
    override suspend fun getSavedToken(): String? = null
    override fun isValidAdvogadoToken(token: String) = false
}
