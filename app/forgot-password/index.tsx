import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { createForgetPassword } from '@/utils/actions/setting/setting.post';
import { getErrorMessage } from '@/utils/helper/get-error-message';
import { useUserStore } from '@/utils/store/user/use-user-store';

const COOLDOWN_SECONDS = 60;
const STORAGE_KEY = "forgot_pw_cooldown_until";

// SecureStore functions
async function getRemainingSeconds(): Promise<number> {
    try {
        const until = await SecureStore.getItemAsync(STORAGE_KEY);
        if (!until) return 0;
        const remaining = Math.ceil((parseInt(until) - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
    } catch {
        return 0;
    }
}

async function setCooldown() {
    try {
        await SecureStore.setItemAsync(STORAGE_KEY, String(Date.now() + COOLDOWN_SECONDS * 1000));
    } catch {}
}

async function clearCooldown() {
    try {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch {}
}

export default function ForgotPasswordPage() {
    const {user, isAuthenticated} = useUserStore();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [cooldown, setCooldownState] = useState(0);
    // FIX: Change type from NodeJS.Timeout to number
    const timerRef = useRef<number | null>(null);
    const router = useRouter();

    // On mount, restore any existing cooldown from SecureStore
    useEffect(() => {
        const loadCooldown = async () => {
            const remaining = await getRemainingSeconds();
            if (remaining > 0) {
                setSent(true);
                setCooldownState(remaining);
            }
        };
        loadCooldown();
    }, []);

    // Tick the countdown
    useEffect(() => {
        if (cooldown <= 0) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        // FIX: Use NodeJS.Timeout for TypeScript or just number for React Native
        const intervalId = setInterval(async () => {
            const remaining = await getRemainingSeconds();
            setCooldownState(remaining);
            if (remaining <= 0) {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                await clearCooldown();
            }
        }, 1000);
        
        timerRef.current = intervalId;

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [cooldown]);

    const validate = (val: string): string => {
        if (!val) return "Email address is required.";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) return "Enter a valid email address.";
        return "";
    };

    const handleSubmit = async () => {
        const err = validate(email);
        if (err) {
            setError(err);
            return;
        }

        setError("");
        setLoading(true);

        try {
            const res = await createForgetPassword(email);

            if (res.success && res.token) {
                await setCooldown();
                setCooldownState(COOLDOWN_SECONDS);
                setSent(true);

                // Show success message
                Toast.show({
                    type: "success",
                    text1: "Email Sent",
                    text2: "Redirecting to verification...",
                    visibilityTime: 1000,
                });

                setTimeout(() => {
                    router.push(`/forgot-password/verification?email=${email}&token=${res.token}`);
                }, 1000);
            } else {
                setError(res.message || "Failed to create forget password session");
                Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: getErrorMessage(res?.error) || "Failed to create forget password session",
                    visibilityTime: 2000,
                });
            }
        } catch (error) {
            setError("Something went wrong. Please try again.");
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Something went wrong. Please try again.",
                visibilityTime: 2000,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTryAgain = async () => {
        if (cooldown > 0) return;
        setSent(false);
        setEmail("");
        await clearCooldown();
    };

    const progressPercent = (cooldown / COOLDOWN_SECONDS) * 100;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.card}>
                    {!sent ? (
                        <>
                            <View style={styles.iconContainer}>
                                <Ionicons name="mail-outline" size={20} color="#ffffff" />
                            </View>

                            <Text style={styles.title}>Forgot your password?</Text>
                            <Text style={styles.subtitle}>
                                No worries. Enter your email and we'll send you a reset link.
                            </Text>

                            <View style={styles.form}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Email address</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons
                                            name="mail-outline"
                                            size={16}
                                            color="#9ca3af"
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={[styles.input, error ? styles.inputError : null]}
                                            placeholder="you@example.com"
                                            placeholderTextColor="#9ca3af"
                                            value={email}
                                            onChangeText={(text) => {
                                                setEmail(text);
                                                setError("");
                                            }}
                                            editable={!loading}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            autoCorrect={false}
                                        />
                                    </View>
                                    {error && <Text style={styles.errorText}>{error}</Text>}
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <View style={styles.buttonContent}>
                                            <ActivityIndicator color="#ffffff" size="small" />
                                            <Text style={styles.buttonText}>Sending link...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.buttonText}>Send Reset Request</Text>
                                            <Ionicons name="arrow-forward-outline" size={16} color="#ffffff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                           {
                            (user && isAuthenticated)  ? (
                                 <View style={styles.footer}>
                                <Text style={styles.footerText}>Remember it? </Text>
                                <TouchableOpacity onPress={() => router.push("/(main)/setting")}>
                                    <Text style={styles.footerLink}>Go Back</Text>
                                </TouchableOpacity>
                            </View>
                            )  : ( <View style={styles.footer}>
                                <Text style={styles.footerText}>Remember it? </Text>
                                <TouchableOpacity onPress={() => router.push("/login")}>
                                    <Text style={styles.footerLink}>Back to login</Text>
                                </TouchableOpacity>
                            </View>)
                           }
                        </>
                    ) : (
                        <View style={styles.successContainer}>
                            <View style={styles.successIconContainer}>
                                <Ionicons name="checkmark-circle-outline" size={24} color="#059669" />
                            </View>
                            <Text style={styles.successTitle}>Check your inbox</Text>
                            <Text style={styles.successSubtitle}>We sent a reset link to</Text>
                            <Text style={styles.emailText}>{email}</Text>

                            <TouchableOpacity
                                style={[styles.resendButton, cooldown > 0 && styles.resendButtonDisabled]}
                                onPress={handleTryAgain}
                                disabled={cooldown > 0}
                            >
                                {cooldown > 0 ? (
                                    <View style={styles.buttonContent}>
                                        <Ionicons name="time-outline" size={16} color="#6b7280" />
                                        <Text style={styles.resendButtonTextDisabled}>
                                            Resend in {cooldown}s
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={styles.resendButtonText}>Didn't get it? Try again</Text>
                                )}
                            </TouchableOpacity>

                            {/* Progress bar */}
                            {cooldown > 0 && (
                                <View style={styles.progressBarContainer}>
                                    <View
                                        style={[
                                            styles.progressBar,
                                            { width: `${progressPercent}%` }
                                        ]}
                                    />
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
        lineHeight: 20,
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        color: '#4b5563',
    },
    inputWrapper: {
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: 12,
        top: 12,
        zIndex: 1,
    },
    input: {
        height: 44,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingLeft: 36,
        paddingRight: 12,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#ffffff',
    },
    inputError: {
        borderColor: '#fca5a5',
        backgroundColor: '#fef2f2',
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },
    submitButton: {
        height: 44,
        backgroundColor: '#111827',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ffffff',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    footerText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    footerLink: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
    },
    successContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    successIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#ecfdf5',
        borderWidth: 1,
        borderColor: '#d1fae5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 6,
    },
    successSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
        textAlign: 'center',
    },
    emailText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 24,
        textAlign: 'center',
    },
    resendButton: {
        width: '100%',
        height: 44,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    resendButtonDisabled: {
        opacity: 0.6,
    },
    resendButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    resendButtonTextDisabled: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    progressBarContainer: {
        marginTop: 12,
        height: 4,
        width: '100%',
        backgroundColor: '#f3f4f6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#111827',
        borderRadius: 4,
    },
});