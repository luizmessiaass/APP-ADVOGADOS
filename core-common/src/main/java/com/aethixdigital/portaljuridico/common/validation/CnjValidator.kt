package com.aethixdigital.portaljuridico.common.validation

/**
 * CNJ process number validation and normalization.
 *
 * CNJ format: NNNNNNN-DD.AAAA.J.TT.OOOO
 * Example: 0001234-55.2023.8.26.0100
 *
 * Security: T-04-02-03 — normalizeCnj handles both formatted and unformatted (20 digits)
 * input before validation, preventing format-bypass spoofing.
 *
 * Accepts exactly two forms:
 *   1. Pure 20-digit string (no separators) — normalized to canonical format
 *   2. Already formatted string matching CNJ_PATTERN — returned unchanged
 * Partially-formatted strings (wrong separators) are NOT normalized and fail validation.
 */
private val CNJ_PATTERN = Regex("""^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$""")
private val PURE_DIGITS = Regex("""^\d+$""")

/**
 * Normalizes a CNJ number to its canonical formatted form.
 * Only normalizes if input is purely 20 digits (no separators at all).
 * If input contains any non-digit character, it is returned unchanged.
 */
fun normalizeCnj(input: String): String {
    return if (PURE_DIGITS.matches(input) && input.length == 20) {
        "${input.substring(0, 7)}-${input.substring(7, 9)}.${input.substring(9, 13)}.${input[13]}.${input.substring(14, 16)}.${input.substring(16, 20)}"
    } else input
}

/**
 * Validates the format of a CNJ number (accepts formatted or 20-digit unformatted).
 * Note: validates format only, not mathematical check digits.
 */
fun isValidCnjFormat(input: String): Boolean {
    if (input.isBlank()) return false
    val normalized = normalizeCnj(input.trim())
    return CNJ_PATTERN.matches(normalized)
}
