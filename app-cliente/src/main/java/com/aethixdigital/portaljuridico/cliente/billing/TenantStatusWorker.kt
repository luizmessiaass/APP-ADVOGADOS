package com.aethixdigital.portaljuridico.cliente.billing

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

/**
 * Polls GET /api/v1/tenant/status every 30 minutes via WorkManager.
 * Persists result to DataStore so BillingStatusViewModel can observe changes.
 *
 * Per D-11 in 07-CONTEXT.md: status is polled, never injected into JWT.
 * Extends Phase 6 NotificationPollWorker pattern.
 */
@HiltWorker
class TenantStatusWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val repository: TenantStatusRepository,
) : CoroutineWorker(context, workerParams) {

    companion object {
        val BILLING_STATUS_KEY = stringPreferencesKey("billing_status")
        val GRACE_BANNER_KEY = booleanPreferencesKey("grace_banner")
        val DAYS_UNTIL_SUSPENSION_KEY = intPreferencesKey("days_until_suspension")
        const val WORK_NAME = "tenant_status_poll"
    }

    override suspend fun doWork(): Result {
        return try {
            val status = repository.getStatus()
            applicationContext.dataStore.edit { prefs ->
                prefs[BILLING_STATUS_KEY] = status.status
                prefs[GRACE_BANNER_KEY] = status.graceBanner
                status.daysUntilSuspension?.let { prefs[DAYS_UNTIL_SUSPENSION_KEY] = it }
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
