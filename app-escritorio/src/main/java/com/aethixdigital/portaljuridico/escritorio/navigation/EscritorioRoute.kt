package com.aethixdigital.portaljuridico.escritorio.navigation

import kotlinx.serialization.Serializable

sealed interface EscritorioRoute {
    @Serializable data object Login : EscritorioRoute
    @Serializable data object ClienteLista : EscritorioRoute
    @Serializable data class ClienteDetalhe(val clienteId: String) : EscritorioRoute
    @Serializable data object CadastroCliente : EscritorioRoute
    @Serializable data class PreviewCliente(val clienteId: String) : EscritorioRoute
}
