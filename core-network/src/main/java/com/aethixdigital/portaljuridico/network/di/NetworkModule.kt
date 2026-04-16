package com.aethixdigital.portaljuridico.network.di

import com.aethixdigital.portaljuridico.network.api.AuthApi
import com.aethixdigital.portaljuridico.network.api.ClienteApi
import com.aethixdigital.portaljuridico.network.config.NetworkConfig
import com.aethixdigital.portaljuridico.network.interceptor.AuthInterceptor
import com.squareup.moshi.Moshi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        networkConfig: NetworkConfig
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .also { builder ->
            if (networkConfig.isDebug) {
                builder.addInterceptor(
                    HttpLoggingInterceptor().apply {
                        level = HttpLoggingInterceptor.Level.BODY
                    }
                )
            }
        }
        .build()

    @Provides
    @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder().build()

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        moshi: Moshi,
        networkConfig: NetworkConfig
    ): Retrofit = Retrofit.Builder()
        .baseUrl(networkConfig.baseUrl)
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi =
        retrofit.create(AuthApi::class.java)

    @Provides
    @Singleton
    fun provideClienteApi(retrofit: Retrofit): ClienteApi =
        retrofit.create(ClienteApi::class.java)
}
