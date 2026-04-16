package com.aethixdigital.portaljuridico.escritorio.feature.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aethixdigital.portaljuridico.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class LoginUiState {
    object Idle : LoginUiState()
    object Loading : LoginUiState()
    data class Success(val role: String) : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading
            authRepository.login(email, password).fold(
                onSuccess = { role -> _uiState.value = LoginUiState.Success(role) },
                onFailure = { _uiState.value = LoginUiState.Error(it.message ?: "Erro ao fazer login") }
            )
        }
    }
}
