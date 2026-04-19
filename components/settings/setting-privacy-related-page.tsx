import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { updatePassword } from '@/utils/actions/setting/setting.put';
import Toast from 'react-native-toast-message';
import { getErrorMessage } from '@/utils/helper/get-error-message';
import { useUserStore } from '@/utils/store/user/use-user-store';

interface PasswordForm {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

function SettingPrivacyRelatedPage() {
    const router = useRouter();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const { logout } = useUserStore();
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [form, setForm] = useState<PasswordForm>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');

    const handleChange = (name: keyof PasswordForm, value: string) => {
        setForm(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async () => {
        setIsChangingPassword(true);

        try {
            if (form.newPassword.length < 8) {
                setError('New password must be at least 8 characters.');
                setIsChangingPassword(false);
                return;
            }
            if (form.newPassword !== form.confirmPassword) {
                setError('Passwords do not match.');
                setIsChangingPassword(false);
                return;
            }

            const res = await updatePassword(form.currentPassword, form.newPassword);

            if (!res.success) {
                console.log("res.error : ", getErrorMessage(res))
                Toast.show({
                    type: "error",
                    text1: getErrorMessage(res?.error) || "Failed to update password",
                    visibilityTime: 2000,
                });
                setIsChangingPassword(false);
                return;
            }
            
            Toast.show({
                type: "success",
                text1: res?.message as string || "Successfully updated password",
                visibilityTime: 2000,
            });
            
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            await logout();
            router.replace("/(auth)/login");
        } catch (error) {
            Toast.show({
                type: "error",
                text1: getErrorMessage(error) || "Failed to update password",
                visibilityTime: 2000,
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleForgotPassword = () => {
        router.push('/forgot-password');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Ionicons name="shield-outline" size={20} color="#6b7280" />
                </View>
                <View>
                    <Text style={styles.headerTitle}>Security & privacy</Text>
                    <Text style={styles.headerSubtitle}>Update your account password</Text>
                </View>
            </View>

            {/* Password fields */}
            <View style={styles.formContainer}>
                {/* Current Password */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Current password</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            secureTextEntry={!showCurrentPassword}
                            value={form.currentPassword}
                            onChangeText={(value) => handleChange('currentPassword', value)}
                            placeholder="Enter current password"
                            placeholderTextColor="#9ca3af"
                            style={styles.input}
                            editable={!isChangingPassword}
                        />
                        <TouchableOpacity
                            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                            style={styles.eyeIcon}
                        >
                            <Ionicons
                                name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                                size={20}
                                color="#6b7280"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* New Password & Confirm Password */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.label}>New password</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                secureTextEntry={!showNewPassword}
                                value={form.newPassword}
                                onChangeText={(value) => handleChange('newPassword', value)}
                                placeholder="Min. 8 characters"
                                placeholderTextColor="#9ca3af"
                                style={styles.input}
                                editable={!isChangingPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowNewPassword(!showNewPassword)}
                                style={styles.eyeIcon}
                            >
                                <Ionicons
                                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color="#6b7280"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.label}>Confirm new password</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                secureTextEntry={!showConfirmPassword}
                                value={form.confirmPassword}
                                onChangeText={(value) => handleChange('confirmPassword', value)}
                                placeholder="Re-enter new password"
                                placeholderTextColor="#9ca3af"
                                style={styles.input}
                                editable={!isChangingPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={styles.eyeIcon}
                            >
                                <Ionicons
                                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color="#6b7280"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
                {/* Forgot Password Button */}
                <TouchableOpacity
                    onPress={handleForgotPassword}
                    style={styles.forgotButton}
                >
                    <Ionicons name="key-outline" size={16} color="#374151" />
                    <Text style={styles.forgotButtonText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Update Password Button */}
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isChangingPassword}
                    style={[styles.updateButton, isChangingPassword && styles.updateButtonDisabled]}
                >
                    {isChangingPassword ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                        <Text style={styles.updateButtonText}>Update password</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 20,
        margin: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#9ca3af',
    },
    formContainer: {
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfWidth: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        height: 40,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingRight: 36,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#ffffff',
    },
    eyeIcon: {
        position: 'absolute',
        right: 10,
        top: 10,
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    forgotButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#ffffff',
    },
    forgotButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    updateButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#111827',
    },
    updateButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    updateButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ffffff',
    },
});

export default SettingPrivacyRelatedPage;