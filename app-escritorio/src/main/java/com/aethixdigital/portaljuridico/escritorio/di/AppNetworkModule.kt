package com.aethixdigital.portaljuridico.escritorio.di

import com.aethixdigital.portaljuridico.escritorio.BuildConfig
import com.aethixdigital.portaljuridico.network.config.NetworkConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppNetworkModule {

    @Provides
    @Singleton
    fun provideNetworkConfig(): NetworkConfig = NetworkConfig(
        baseUrl = BuildConfig.API_BASE_URL,
        isDebug = BuildConfig.DEBUG
    )
}
