# ============================================================
# Hilt / Dagger keep rules
# ============================================================

# Keep all Hilt-generated component classes
-keep class *_HiltComponents { *; }
-keep class *_HiltComponents$* { *; }

# Keep Hilt-generated activity/fragment injectors
-keep class Hilt_* { *; }
-keep class Hilt_*_* { *; }

# Keep @Singleton, @HiltAndroidApp and related annotation classes
-keepattributes *Annotation*

# Dagger internal classes referenced at runtime
-keep class dagger.** { *; }
-keep class dagger.hilt.** { *; }
-dontwarn dagger.hilt.**

# Keep @Inject-annotated constructors (Hilt finds them via reflection)
-keepclassmembers class * {
    @javax.inject.Inject <init>(...);
    @javax.inject.Inject <fields>;
}

# ============================================================
# Jetpack Compose keep rules
# ============================================================

# Compose relies on reflection for @Composable metadata
-keepclassmembers class * {
    @androidx.compose.runtime.Composable <methods>;
}

# Compose UI internals
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# ============================================================
# Kotlin keep rules
# ============================================================

# Kotlin metadata required for reflection-based features
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeVisibleParameterAnnotations
-keepattributes RuntimeVisibleTypeAnnotations

# Kotlin coroutines (used by Compose lifecycle)
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# ============================================================
# Android lifecycle
# ============================================================
-keep class androidx.lifecycle.** { *; }
