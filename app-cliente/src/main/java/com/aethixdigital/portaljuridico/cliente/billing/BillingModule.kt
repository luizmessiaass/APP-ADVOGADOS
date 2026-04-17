package com.aethixdigital.portaljuridico.cliente.billing

import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TenantStatusRepositoryImpl @Inject constructor(
    private val api: TenantStatusApi,
) : TenantStatusRepository {

    override suspend fun getStatus(): TenantBillingStatus {
        val response = api.getStatus()
        return TenantBillingStatus(
            status = response.status,
            graceBanner = response.graceBanner,
            daysUntilSuspension = response.daysUntilSuspension,
        )
    }
}

@Module
@InstallIn(SingletonComponent::class)
object BillingApiModule {

    @Provides
    @Singleton
    fun provideTenantStatusApi(retrofit: Retrofit): TenantStatusApi =
        retrofit.create(TenantStatusApi::class.java)
}

@Module
@InstallIn(SingletonComponent::class)
abstract class BillingRepositoryModule {

    @Binds
    @Singleton
    abstract fun bindTenantStatusRepository(
        impl: TenantStatusRepositoryImpl,
    ): TenantStatusRepository
}
