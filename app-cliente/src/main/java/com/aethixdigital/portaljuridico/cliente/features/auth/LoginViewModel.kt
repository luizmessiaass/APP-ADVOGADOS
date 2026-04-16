package com.aethixdigital.portaljuridico.cliente.features.auth

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aethixdigital.portaljuridico.network.api.AuthApi
import com.aethixdigital.portaljuridico.network.model.dto.LoginRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class LoginUiState {
    object Idle : LoginUiState()
    object Loading : LoginUiState()
    data class Error(val message: String) : LoginUiState()
    data class Success(val role: String) : LoginUiState()
}

private val VALID_ROLES = setOf("cliente", "advogado", "admin_escritorio")

@HiltViewModel
open class LoginViewModel @Inject constructor(
    private val authApi: AuthApi,
    @ApplicationContext private val context: Context,
) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _uiState.value = LoginUiState.Error("Preencha email e senha.")
            return
        }
        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading
            try {
                val response = authApi.login(LoginRequest(email, password))
                val role = response.role
                if (role !in VALID_ROLES) {
                    _uiState.value = LoginUiState.Error("Conta não autorizada.")
                    return@launch
                }
                context.clienteDataStore.edit { prefs ->
                    prefs[TOKEN_KEY] = response.token
                    prefs[ROLE_KEY] = role
                }
                _uiState.value = LoginUiState.Success(role)
            } catch (e: retrofit2.HttpException) {
                if (e.code() == 401) {
                    _uiState.value = LoginUiState.Error("Email ou senha incorretos. Tente novamente.")
                } else {
                    _uiState.value = LoginUiState.Error("Erro ao fazer login. Tente novamente.")
                }
            } catch (e: Exception) {
                _uiState.value = LoginUiState.Error("Sem conexão. Verifique sua internet.")
            }
        }
    }
}
