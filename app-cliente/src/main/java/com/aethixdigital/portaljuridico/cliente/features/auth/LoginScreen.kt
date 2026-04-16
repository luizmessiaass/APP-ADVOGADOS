package com.aethixdigital.portaljuridico.cliente.features.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.Fingerprint
import androidx.compose.material.icons.outlined.Gavel
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextDecoration
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aethixdigital.portaljuridico.cliente.brand.BrandConfig
import com.aethixdigital.portaljuridico.cliente.navigation.Routes

@Composable
fun LoginScreen(
    navController: NavController,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    LaunchedEffect(uiState) {
        if (uiState is LoginUiState.Success) {
            navController.navigate(Routes.PROCESSO_LIST) {
                popUpTo(Routes.LOGIN) { inclusive = true }
            }
        }
    }

    val navyGradient = Brush.linearGradient(
        colors = listOf(BrandConfig.gradientStart, BrandConfig.gradientEnd),
        start = Offset(0f, 0f),
        end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
    )
    val isLoading = uiState is LoginUiState.Loading
    val canSubmit = email.isNotBlank() && password.isNotBlank() && !isLoading

    Scaffold(containerColor = BrandConfig.background) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(Modifier.height(48.dp))

            // Logo card
            Box(modifier = Modifier.align(Alignment.CenterHorizontally)) {
                val logoRes = BrandConfig.logoResId
                if (logoRes != null) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.White),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            painter = painterResource(id = logoRes),
                            contentDescription = BrandConfig.appDisplayName,
                            modifier = Modifier
                                .size(52.dp)
                                .padding(4.dp),
                            contentScale = ContentScale.Fit
                        )
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(BrandConfig.gradientStart, BrandConfig.gradientEnd),
                                    start = Offset(0f, 0f),
                                    end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Gavel,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            Text(
                text = BrandConfig.appDisplayName,
                style = MaterialTheme.typography.headlineLarge,
                color = BrandConfig.primary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(4.dp))

            Text(
                text = "Justica na palma da sua mao.",
                style = MaterialTheme.typography.bodyMedium,
                color = BrandConfig.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(36.dp))

            Text(
                text = "Bem-vindo de volta",
                style = MaterialTheme.typography.titleLarge,
                color = BrandConfig.primary
            )

            // CPF field
            Spacer(Modifier.height(20.dp))
            Text(
                text = "CPF",
                style = MaterialTheme.typography.labelLarge,
                color = BrandConfig.onSurface
            )
            Spacer(Modifier.height(6.dp))
            TextField(
                value = email,
                onValueChange = { email = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp)),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor   = BrandConfig.surfaceContainerHigh,
                    unfocusedContainerColor = BrandConfig.surfaceContainerHigh,
                    focusedIndicatorColor   = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    focusedTextColor        = BrandConfig.onSurface,
                    unfocusedTextColor      = BrandConfig.onSurface,
                ),
                placeholder = { Text("000.000.000-00", color = BrandConfig.onSurfaceVariant) },
                trailingIcon = {
                    Icon(
                        Icons.Outlined.Person,
                        contentDescription = null,
                        tint = BrandConfig.onSurfaceVariant
                    )
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true
            )

            // Password field
            Spacer(Modifier.height(12.dp))
            Text(
                text = "Senha",
                style = MaterialTheme.typography.labelLarge,
                color = BrandConfig.onSurface
            )
            Spacer(Modifier.height(6.dp))
            TextField(
                value = password,
                onValueChange = { password = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp)),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor   = BrandConfig.surfaceContainerHigh,
                    unfocusedContainerColor = BrandConfig.surfaceContainerHigh,
                    focusedIndicatorColor   = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    focusedTextColor        = BrandConfig.onSurface,
                    unfocusedTextColor      = BrandConfig.onSurface,
                ),
                placeholder = { Text("••••••••", color = BrandConfig.onSurfaceVariant) },
                visualTransformation = if (passwordVisible) VisualTransformation.None
                                       else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Outlined.VisibilityOff
                                          else Icons.Outlined.Visibility,
                            contentDescription = if (passwordVisible) "Ocultar senha" else "Mostrar senha",
                            tint = BrandConfig.onSurfaceVariant
                        )
                    }
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true
            )

            // Forgot password
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = {}, contentPadding = PaddingValues(0.dp)) {
                    Text("Esqueci minha senha", color = BrandConfig.secondary)
                }
            }

            // Error card
            if (uiState is LoginUiState.Error) {
                Spacer(Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(BrandConfig.errorContainer.copy(alpha = 0.4f))
                        .drawBehind {
                            drawRect(
                                color = BrandConfig.error,
                                size = Size(4.dp.toPx(), size.height)
                            )
                        }
                        .padding(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.Info,
                            contentDescription = null,
                            tint = BrandConfig.error,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = (uiState as LoginUiState.Error).message,
                            color = BrandConfig.onErrorContainer,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            // Login button
            Spacer(Modifier.height(24.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(navyGradient)
                    .then(
                        if (canSubmit) Modifier.clickable { viewModel.login(email, password) }
                        else Modifier
                    )
                    .then(if (!canSubmit) Modifier.background(Color.Black.copy(alpha = 0.5f)) else Modifier),
                contentAlignment = Alignment.Center
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = Color.White
                    )
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            "Entrar",
                            color = Color.White,
                            style = MaterialTheme.typography.labelLarge.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        )
                        Spacer(Modifier.width(8.dp))
                        Icon(
                            Icons.AutoMirrored.Outlined.ArrowForward,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            // OR separator
            Spacer(Modifier.height(20.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                HorizontalDivider(modifier = Modifier.weight(1f))
                Spacer(Modifier.width(8.dp))
                Text(
                    "OU ACESSE COM",
                    style = MaterialTheme.typography.labelSmall,
                    color = BrandConfig.onSurfaceVariant
                )
                Spacer(Modifier.width(8.dp))
                HorizontalDivider(modifier = Modifier.weight(1f))
            }

            // Biometrics button
            Spacer(Modifier.height(12.dp))
            OutlinedButton(
                onClick = {},
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, BrandConfig.outlineVariant),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = BrandConfig.surfaceContainerLow)
            ) {
                Icon(
                    Icons.Outlined.Fingerprint,
                    contentDescription = null,
                    tint = BrandConfig.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "Entrar com Biometria",
                    style = MaterialTheme.typography.labelLarge,
                    color = BrandConfig.primary
                )
            }

            // Footer account link
            Spacer(Modifier.height(20.dp))
            Text(
                text = buildAnnotatedString {
                    append("Nao possui uma conta? ")
                    withStyle(
                        SpanStyle(
                            color = BrandConfig.secondary,
                            textDecoration = TextDecoration.Underline
                        )
                    ) {
                        append("Solicite acesso")
                    }
                },
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            // LGPD card
            Spacer(Modifier.height(20.dp))
            Card(
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = BrandConfig.surfaceContainerLow),
                modifier = Modifier
                    .fillMaxWidth()
                    .drawBehind {
                        drawRect(
                            color = BrandConfig.secondary,
                            size = Size(4.dp.toPx(), size.height)
                        )
                    }
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(BrandConfig.secondaryFixed),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Outlined.VerifiedUser,
                            contentDescription = null,
                            tint = BrandConfig.secondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(
                            "Dados protegidos pela LGPD",
                            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                            color = BrandConfig.onSurface
                        )
                        Text(
                            "Suas informacoes sao criptografadas.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = BrandConfig.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(Modifier.height(32.dp))
        }
    }
}
