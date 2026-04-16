package com.aethixdigital.portaljuridico.common.validation

/**
 * CPF validation using mod11 algorithm with all-same-digits guard.
 *
 * Security: T-04-02-01 — guard all-same-digits BEFORE arithmetic to prevent
 * trivially fake CPFs (000.000.000-00, 111.111.111-11, etc.) from passing.
 */
fun isValidCpf(cpf: String): Boolean {
    val digits = cpf.filter { it.isDigit() }
    if (digits.length != 11) return false
    if (digits.all { it == digits[0] }) return false  // guard all-same-digits ANTES da aritmética
    val sum1 = (0..8).sumOf { (digits[it] - '0') * (10 - it) }
    val remainder1 = sum1 % 11
    val digit1 = if (remainder1 < 2) 0 else 11 - remainder1
    if ((digits[9] - '0') != digit1) return false
    val sum2 = (0..9).sumOf { (digits[it] - '0') * (11 - it) }
    val remainder2 = sum2 % 11
    val digit2 = if (remainder2 < 2) 0 else 11 - remainder2
    return (digits[10] - '0') == digit2
}

/**
 * Formats a raw digit string into the CPF mask: NNN.NNN.NNN-NN
 */
fun formatCpf(raw: String): String {
    val digits = raw.filter { it.isDigit() }.take(11)
    return buildString {
        digits.forEachIndexed { i, c ->
            if (i == 3 || i == 6) append('.')
            if (i == 9) append('-')
            append(c)
        }
    }
}
