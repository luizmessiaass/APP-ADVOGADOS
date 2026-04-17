package com.aethixdigital.portaljuridico.escritorio.billing

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import retrofit2.http.GET
import javax.inject.Inject

// ---------------------------------------------------------------------------
// Data models
// ---------------------------------------------------------------------------

data class TenantBillingStatus(
    val status: String,
    val graceBanner: Boolean,
    val daysUntilSuspension: Int?,
)

sealed class BillingUiState {
    object Loading : BillingUiState()
    data class Success(val billingStatus: TenantBillingStatus) : BillingUiState()
    data class Error(val message: String) : BillingUiState()
}

// ---------------------------------------------------------------------------
// Repository (v1 simplicity: interface + implementation in same file)
// ---------------------------------------------------------------------------

interface TenantStatusRepository {
    suspend fun getStatus(): TenantBillingStatus
}

// Retrofit data class for API response
@JsonClass(generateAdapter = true)
data class TenantStatusResponse(
    val status: String,
    @Json(name = "grace_banner") val graceBanner: Boolean,
    @Json(name = "grace_period_started_at") val gracePeriodStartedAt: String?,
    @Json(name = "days_until_suspension") val daysUntilSuspension: Int?,
)

interface TenantStatusApi {
    @GET("api/v1/tenant/status")
    suspend fun getStatus(): TenantStatusResponse
}

// ---------------------------------------------------------------------------
// ViewModel
// ---------------------------------------------------------------------------

@HiltViewModel
class BillingStatusViewModel @Inject constructor(
    private val repository: TenantStatusRepository,
) : ViewModel() {

    private val _billingState = MutableStateFlow<BillingUiState>(BillingUiState.Loading)
    val billingState: StateFlow<BillingUiState> = _billingState.asStateFlow()

    init {
        refreshStatus()
    }

    fun refreshStatus() {
        viewModelScope.launch {
            _billingState.value = BillingUiState.Loading
            try {
                val status = repository.getStatus()
                _billingState.value = BillingUiState.Success(status)
            } catch (e: Exception) {
                _billingState.value = BillingUiState.Error(
                    e.message ?: "Erro ao verificar status da assinatura"
                )
            }
        }
    }
}
