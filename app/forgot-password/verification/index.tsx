import React, { useState, useEffect } from 'react';
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
    Alert as RNAlert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useGetForgetPasswordSession } from '@/hooks/tanstack/query-hook/setting/use-get-forget-password-session';
import { checkForgetPasswordPin } from '@/utils/actions/setting/setting.post';
import { getErrorMessage } from '@/utils/helper/get-error-message';
import { useUserStore } from '@/utils/store/user/use-user-store';

function ForgotPasswordVerificationPage() {
    const router = useRouter();
    const { email, token } = useLocalSearchParams<{ email: string; token: string }>();
    const {logout} = useUserStore();
    const [pin, setPin] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({
        pin: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState(0);

    // Validate email and token parameters
    if (!email || !token) {
        return (
            <View style={styles.errorContainer}>
                <View style={styles.errorCard}>
                    <View style={styles.errorIconContainer}>
                        <Ionicons name="alert-circle" size={24} color="#dc2626" />
                    </View>
                    <Text style={styles.errorTitle}>Invalid Reset Link</Text>
                    <Text style={styles.errorMessage}>
                        Missing required parameters. Please request a new password reset link.
                    </Text>
                    <TouchableOpacity
                        style={styles.errorButton}
                        onPress={() => router.replace('/login')}
                    >
                        <Text style={styles.errorButtonText}>Go to Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const { data, isLoading: isSessionLoading, isError, error } = useGetForgetPasswordSession(email, token);

    // Handle session validation
    useEffect(() => {
        if (!isSessionLoading) {
            if (isError || !data?.success) {
                Toast.show({
                    type: "error",
                    text1: "Invalid Link",
                    text2: data?.message || error?.message || "Invalid or expired reset link",
                    visibilityTime: 3000,
                });

                // Start countdown for redirect
                setRedirectCountdown(5);
                const timer = setInterval(() => {
                    setRedirectCountdown((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            router.replace('/login');
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);

                return () => clearInterval(timer);
            }
        }
    }, [isSessionLoading, isError, data, error, router]);

    // Show loading state
    if (isSessionLoading) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingCard}>
                    <View style={styles.loadingIconContainer}>
                        <Ionicons name="shield" size={32} color="#2563eb" />
                    </View>
                    <Text style={styles.loadingTitle}>Verifying Reset Link</Text>
                    <Text style={styles.loadingSubtitle}>
                        Please wait while we verify your request...
                    </Text>
                    <ActivityIndicator size="large" color="#2563eb" style={styles.loadingSpinner} />
                </View>
            </View>
        );
    }

    // Show error state with redirect
    if (isError || !data?.success) {
        return (
            <View style={styles.errorContainer}>
                <View style={styles.errorCard}>
                    <View style={styles.errorIconContainer}>
                        <Ionicons name="alert-circle" size={24} color="#dc2626" />
                    </View>
                    <Text style={styles.errorTitle}>Invalid or Expired Reset Link</Text>
                    <Text style={styles.errorMessage}>
                        {data?.message || error?.message || "This password reset link is invalid or has expired."}
                    </Text>
                    <Text style={styles.errorSubMessage}>
                        Please request a new password reset link from the login page.
                    </Text>
                    {redirectCountdown > 0 && (
                        <Text style={styles.countdownText}>
                            Redirecting to login in {redirectCountdown} seconds...
                        </Text>
                    )}
                    <TouchableOpacity
                        style={styles.errorButton}
                        onPress={() => router.replace('/login')}
                    >
                        <Text style={styles.errorButtonText}>Go to Login</Text>
                    </TouchableOpacity>

                    {/* Request New Link Option */}
                    <View style={styles.requestNewLinkContainer}>
                        <Text style={styles.requestNewLinkText}>Need a new reset link? </Text>
                        <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                            <Text style={styles.requestNewLinkButton}>Click here</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    const validatePin = (value: string) => {
        if (!value) return 'PIN is required';
        if (value.length > 30) return 'PIN must be 30 characters or less';
        return '';
    };

    const validatePassword = (value: string) => {
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (value.length > 30) return 'Password must be 30 characters or less';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/(?=.*[0-9])/.test(value)) return 'Password must contain at least one number';
        if (!/(?=.*[!@#$%^&*])/.test(value)) return 'Password must contain at least one special character';
        return '';
    };

    const validateConfirmPassword = (value: string) => {
        if (!value) return 'Please confirm your password';
        if (value !== newPassword) return 'Passwords do not match';
        return '';
    };

    const handlePinChange = (value: string) => {
        const slicedValue = value.slice(0, 30);
        setPin(slicedValue);
        setErrors({ ...errors, pin: validatePin(slicedValue) });
    };

    const handleNewPasswordChange = (value: string) => {
        const slicedValue = value.slice(0, 30);
        setNewPassword(slicedValue);
        setErrors({
            ...errors,
            newPassword: validatePassword(slicedValue),
            confirmPassword: confirmPassword ? validateConfirmPassword(confirmPassword) : ''
        });
    };

    const handleConfirmPasswordChange = (value: string) => {
        const slicedValue = value.slice(0, 30);
        setConfirmPassword(slicedValue);
        setErrors({ ...errors, confirmPassword: validateConfirmPassword(slicedValue) });
    };

    const handleSubmit = async () => {
        const pinError = validatePin(pin);
        const passwordError = validatePassword(newPassword);
        const confirmError = validateConfirmPassword(confirmPassword);

        if (pinError || passwordError || confirmError) {
            setErrors({
                pin: pinError,
                newPassword: passwordError,
                confirmPassword: confirmError
            });
            return;
        }

        setIsLoading(true);

        try {
            const res = await checkForgetPasswordPin({
                pin,
                token,
                email,
                new_password: newPassword
            });

            if (res.success) {
                Toast.show({
                    type: "success",
                    text1: "Success!",
                    text2: "Password reset successfully! Redirecting to login...",
                    visibilityTime: 3000,
                });
                await logout();
                setTimeout(() => {
                    router.replace('/login');
                }, 3000);
            } else {
                Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: getErrorMessage(res?.error) || "Failed to reset password",
                    visibilityTime: 2000,
                });
                // If PIN is invalid, clear it
                if (res.message?.toLowerCase().includes('pin')) {
                    setPin('');
                }
            }
        } catch (error: any) {
            console.error(error);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error?.message || "Something went wrong",
                visibilityTime: 2000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getPasswordStrength = () => {
        if (!newPassword) return { level: 0, text: '', color: '#e5e7eb' };

        let strength = 0;
        if (newPassword.length >= 8) strength++;
        if (newPassword.length >= 12) strength++;
        if (/(?=.*[a-z])/.test(newPassword)) strength++;
        if (/(?=.*[A-Z])/.test(newPassword)) strength++;
        if (/(?=.*[0-9])/.test(newPassword)) strength++;
        if (/(?=.*[!@#$%^&*])/.test(newPassword)) strength++;

        if (strength <= 2) return { level: 20, text: 'Weak', color: '#ef4444' };
        if (strength <= 4) return { level: 60, text: 'Medium', color: '#eab308' };
        return { level: 100, text: 'Strong', color: '#10b981' };
    };

    const passwordStrength = getPasswordStrength();

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
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerIconContainer}>
                            <Ionicons name="shield" size={32} color="#2563eb" />
                        </View>
                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.subtitle}>
                            Enter the verification PIN sent to {email} and set a new password
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* PIN Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Verification PIN <Text style={styles.requiredStar}>*</Text>
                            </Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="key-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, errors.pin ? styles.inputError : null]}
                                    placeholder="Enter verification PIN"
                                    placeholderTextColor="#9ca3af"
                                    value={pin}
                                    onChangeText={handlePinChange}
                                    editable={!isLoading}
                                    maxLength={30}
                                />
                            </View>
                            {errors.pin ? (
                                <Text style={styles.errorText}>{errors.pin}</Text>
                            ) : (
                                <Text style={styles.hintText}>Max 30 characters • Enter the PIN sent to your email</Text>
                            )}
                        </View>

                        {/* New Password Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                New Password <Text style={styles.requiredStar}>*</Text>
                            </Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, styles.inputWithRightIcon, errors.newPassword ? styles.inputError : null]}
                                    secureTextEntry={!showNewPassword}
                                    placeholder="Enter new password"
                                    placeholderTextColor="#9ca3af"
                                    value={newPassword}
                                    onChangeText={handleNewPasswordChange}
                                    editable={!isLoading}
                                    maxLength={30}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                                        size={18}
                                        color="#9ca3af"
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Password Strength Indicator */}
                            {newPassword ? (
                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthHeader}>
                                        <Text style={styles.strengthLabel}>Password strength:</Text>
                                        <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                                            {passwordStrength.text}
                                        </Text>
                                    </View>
                                    <View style={styles.strengthBarContainer}>
                                        <View
                                            style={[
                                                styles.strengthBar,
                                                { width: `${passwordStrength.level}%`, backgroundColor: passwordStrength.color }
                                            ]}
                                        />
                                    </View>
                                </View>
                            ) : null}

                            {errors.newPassword ? (
                                <Text style={styles.errorText}>{errors.newPassword}</Text>
                            ) : (
                                <View style={styles.requirementsContainer}>
                                    <Text style={styles.requirementsTitle}>Password requirements:</Text>
                                    <View style={styles.requirementsList}>
                                        <Text style={styles.requirementItem}>• 8-30 characters long</Text>
                                        <Text style={styles.requirementItem}>• At least one uppercase letter</Text>
                                        <Text style={styles.requirementItem}>• At least one lowercase letter</Text>
                                        <Text style={styles.requirementItem}>• At least one number</Text>
                                        <Text style={styles.requirementItem}>• At least one special character (!@#$%^&*)</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Confirm New Password <Text style={styles.requiredStar}>*</Text>
                            </Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, styles.inputWithRightIcon, errors.confirmPassword ? styles.inputError : null]}
                                    secureTextEntry={!showConfirmPassword}
                                    placeholder="Re-enter new password"
                                    placeholderTextColor="#9ca3af"
                                    value={confirmPassword}
                                    onChangeText={handleConfirmPasswordChange}
                                    editable={!isLoading}
                                    maxLength={30}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                        size={18}
                                        color="#9ca3af"
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.confirmPassword && (
                                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                            )}
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <View style={styles.buttonContent}>
                                    <ActivityIndicator color="#ffffff" size="small" />
                                    <Text style={styles.buttonText}>Resetting Password...</Text>
                                </View>
                            ) : (
                                <Text style={styles.buttonText}>Reset Password</Text>
                            )}
                        </TouchableOpacity>

                        {/* Back to Login Link */}
                        <TouchableOpacity
                            onPress={() => router.push('/login')}
                            style={styles.backLink}
                        >
                            <Ionicons name="arrow-back-outline" size={16} color="#2563eb" />
                            <Text style={styles.backLinkText}>Back to Login</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info Alert */}
                    <View style={styles.infoAlert}>
                        <Ionicons name="information-circle-outline" size={20} color="#1e40af" />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>Didn't receive a PIN?</Text>
                            <Text style={styles.infoText}>
                                Check your spam folder or{' '}
                                <Text
                                    style={styles.infoLink}
                                    onPress={() => router.push('/forgot-password')}
                                >
                                    request a new PIN
                                </Text>
                            </Text>
                        </View>
                    </View>
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
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    headerIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#dbeafe',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    requiredStar: {
        color: '#ef4444',
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
        paddingLeft: 38,
        paddingRight: 12,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#ffffff',
    },
    inputWithRightIcon: {
        paddingRight: 38,
    },
    inputError: {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
    },
    eyeIcon: {
        position: 'absolute',
        right: 12,
        top: 12,
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
    },
    hintText: {
        fontSize: 12,
        color: '#6b7280',
    },
    strengthContainer: {
        gap: 4,
    },
    strengthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    strengthLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    strengthText: {
        fontSize: 12,
        fontWeight: '500',
    },
    strengthBarContainer: {
        height: 4,
        backgroundColor: '#e5e7eb',
        borderRadius: 2,
        overflow: 'hidden',
    },
    strengthBar: {
        height: '100%',
        borderRadius: 2,
        transform: 'width 0.3s ease',
    },
    requirementsContainer: {
        marginTop: 4,
    },
    requirementsTitle: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    requirementsList: {
        gap: 2,
    },
    requirementItem: {
        fontSize: 11,
        color: '#6b7280',
    },
    submitButton: {
        height: 44,
        backgroundColor: '#2563eb',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#93c5fd',
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
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
    },
    backLinkText: {
        fontSize: 14,
        color: '#2563eb',
        fontWeight: '500',
    },
    infoAlert: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginTop: 24,
        padding: 12,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#1e3a8a',
        marginBottom: 2,
    },
    infoText: {
        fontSize: 12,
        color: '#1e40af',
    },
    infoLink: {
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    // Loading styles
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    loadingCard: {
        alignItems: 'center',
        padding: 24,
    },
    loadingIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#dbeafe',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    loadingTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    loadingSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
        textAlign: 'center',
    },
    loadingSpinner: {
        marginTop: 16,
    },
    // Error styles
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        padding: 16,
    },
    errorCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    errorIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fef2f2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#991b1b',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 14,
        color: '#7f1d1d',
        textAlign: 'center',
        marginBottom: 8,
    },
    errorSubMessage: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    countdownText: {
        fontSize: 12,
        color: '#dc2626',
        marginBottom: 16,
    },
    errorButton: {
        width: '100%',
        height: 44,
        backgroundColor: '#dc2626',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ffffff',
    },
    requestNewLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    requestNewLinkText: {
        fontSize: 13,
        color: '#6b7280',
    },
    requestNewLinkButton: {
        fontSize: 13,
        color: '#2563eb',
        fontWeight: '500',
    },
});

export default ForgotPasswordVerificationPage;