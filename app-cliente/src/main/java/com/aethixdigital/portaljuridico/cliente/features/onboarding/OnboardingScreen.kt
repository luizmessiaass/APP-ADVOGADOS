package com.aethixdigital.portaljuridico.cliente.features.onboarding

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aethixdigital.portaljuridico.cliente.R
import com.aethixdigital.portaljuridico.cliente.navigation.Routes
import com.aethixdigital.portaljuridico.ui.components.PagerDots
import kotlinx.coroutines.launch

private data class OnboardingPageData(
    val drawableRes: Int,
    val headline: String,
    val subtitle: String
)

private val onboardingPages = listOf(
    OnboardingPageData(
        drawableRes = R.drawable.ic_onboarding_processos,
        headline = "Seus processos em linguagem simples",
        subtitle = "Veja o que está acontecendo no seu processo sem precisar entender de direito."
    ),
    OnboardingPageData(
        drawableRes = R.drawable.ic_onboarding_datas,
        headline = "Próximas datas e prazos",
        subtitle = "Saiba quando é sua próxima audiência sem precisar ligar para o advogado."
    ),
    OnboardingPageData(
        drawableRes = R.drawable.ic_onboarding_notificacoes,
        headline = "Notificações automáticas",
        subtitle = "Receba um aviso quando houver novidade no seu processo."
    ),
    OnboardingPageData(
        drawableRes = R.drawable.ic_onboarding_whatsapp,
        headline = "Fale com seu advogado",
        subtitle = "Entre em contato direto com o escritório com um toque."
    )
)

@Composable
fun OnboardingScreen(navController: NavController) {
    val viewModel: OnboardingViewModel = hiltViewModel()
    val pagerState = rememberPagerState(pageCount = { onboardingPages.size })
    val scope = rememberCoroutineScope()

    // D-10: Back on page 1 = no-op; back on pages 2-4 = navigate to previous page
    BackHandler {
        if (pagerState.currentPage > 0) {
            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) }
        }
        // else: no-op — cannot exit onboarding on page 0
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surfaceVariant)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.weight(1f)
        ) { page ->
            OnboardingPageContent(page = onboardingPages[page])
        }

        PagerDots(
            pageCount = onboardingPages.size,
            currentPage = pagerState.currentPage,
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .padding(bottom = 16.dp)
        )

        Button(
            onClick = {
                if (pagerState.currentPage < onboardingPages.size - 1) {
                    scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                } else {
                    viewModel.markOnboardingComplete()
                    navController.navigate(Routes.LGPD_CONSENT) {
                        popUpTo(Routes.ONBOARDING) { inclusive = true }
                    }
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 16.dp)
        ) {
            Text(if (pagerState.currentPage < onboardingPages.size - 1) "Próximo" else "Começar")
        }
    }
}

@Composable
private fun OnboardingPageContent(page: OnboardingPageData) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Image(
            painter = painterResource(id = page.drawableRes),
            contentDescription = page.headline,
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            contentScale = ContentScale.Fit
        )
        Spacer(Modifier.height(32.dp))
        Text(
            text = page.headline,
            style = MaterialTheme.typography.titleLarge,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = page.subtitle,
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(48.dp))
    }
}
