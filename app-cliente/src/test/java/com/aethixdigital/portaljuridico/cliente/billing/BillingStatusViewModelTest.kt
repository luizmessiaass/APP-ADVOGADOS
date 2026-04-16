package com.aethixdigital.portaljuridico.cliente.billing

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for BillingStatusViewModel (app-cliente).
 * Mirrors app-escritorio test structure in cliente package.
 * Per 07-VALIDATION.md Wave 0 requirements (BILLING-05, BILLING-06).
 */
@OptIn(ExperimentalCoroutinesApi::class)
class BillingStatusViewModelTest {

    private class FakeTenantStatusRepository(
        private val result: Result<TenantBillingStatus>,
    ) : TenantStatusRepository {
        override suspend fun getStatus(): TenantBillingStatus = result.getOrThrow()
    }

    private fun viewModelWith(status: TenantBillingStatus) =
        BillingStatusViewModel(FakeTenantStatusRepository(Result.success(status)))

    private fun viewModelWithError(message: String = "network error") =
        BillingStatusViewModel(
            FakeTenantStatusRepository(Result.failure(RuntimeException(message)))
        )

    @Test
    fun `read_only status emits Success with correct state`() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModelWith(
            TenantBillingStatus(
                status = "read_only",
                graceBanner = true,
                daysUntilSuspension = 7,
            )
        )

        val state = viewModel.billingState.value
        assertTrue("Expected Success but was $state", state is BillingUiState.Success)
        val success = state as BillingUiState.Success
        assertEquals("read_only", success.billingStatus.status)
        assertEquals(true, success.billingStatus.graceBanner)
        assertEquals(7, success.billingStatus.daysUntilSuspension)
    }

    @Test
    fun `suspended status emits Success with status=suspended`() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModelWith(
            TenantBillingStatus(
                status = "suspended",
                graceBanner = false,
                daysUntilSuspension = 0,
            )
        )

        val state = viewModel.billingState.value
        assertTrue("Expected Success but was $state", state is BillingUiState.Success)
        val success = state as BillingUiState.Success
        assertEquals("suspended", success.billingStatus.status)
    }

    @Test
    fun `active status emits Success with graceBanner=false`() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModelWith(
            TenantBillingStatus(
                status = "active",
                graceBanner = false,
                daysUntilSuspension = null,
            )
        )

        val state = viewModel.billingState.value
        assertTrue("Expected Success but was $state", state is BillingUiState.Success)
        val success = state as BillingUiState.Success
        assertEquals("active", success.billingStatus.status)
        assertEquals(false, success.billingStatus.graceBanner)
    }

    @Test
    fun `repository error emits Error state`() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModelWithError()

        val state = viewModel.billingState.value
        assertTrue("Expected Error but was $state", state is BillingUiState.Error)
    }
}
