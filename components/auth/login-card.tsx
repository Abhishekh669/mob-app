import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import Toast from "react-native-toast-message";
import { getErrorMessage } from "@/utils/helper/get-error-message";
import { loginUser } from "@/utils/actions/auth/auth";
import { LoginUser } from "@/utils/types/user/user.types";
import { useUserStore } from "@/utils/store/user/use-user-store";

export default function LoginCard() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { setUser } = useUserStore();

    const router = useRouter();

    const loginHandler = async () => {
        if (!email || !password) {
            Toast.show({ type: "error", text1: "Please fill in all fields" });
            return;
        }

        setLoading(true);
        try {
            const loginData: LoginUser = { email, password };
            const res = await loginUser(loginData);

            if (res.success && res.message && res.user) {
                Toast.show({
                    type: "success",
                    text1: res.message || "Welcome back!",
                    visibilityTime: 2000,
                });

                setUser(res.user)

                router.replace("/(main)/home");
            } else {
                throw new Error("Login failed");
            }
        } catch (err) {
            Toast.show({ type: "error", text1: String(getErrorMessage(err)) });
            console.log("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        router.push("/forgot-password");
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                {/* Brand Section */}
                <View style={styles.brandSection}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logo}>D</Text>
                    </View>
                    <Text style={styles.brandName}>DineX</Text>
                </View>

                {/* Login Card */}
                <View style={styles.card}>
                    <Text style={styles.welcomeText}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue to your dashboard</Text>

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="#9ca3af"
                                value={email}
                                editable={!loading}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor="#9ca3af"
                                secureTextEntry={!showPassword}
                                value={password}
                                editable={!loading}
                                onChangeText={setPassword}
                            />
                            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <Ionicons
                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color="#9ca3af"
                                />
                            </Pressable>
                        </View>
                    </View>

                    {/* Forgot Password Link */}
                    <Pressable onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </Pressable>

                    {/* Login Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                            loading && styles.buttonDisabled,
                        ]}
                        disabled={loading}
                        onPress={loginHandler}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
                    </Pressable>

                    <Text style={styles.adminContact}>Need access? Contact your administrator</Text>
                </View>

                {/* Already logged in note */}
                <View style={styles.alreadyLoggedIn}>
                    <Text style={styles.alreadyLoggedInText}>Already logged in?</Text>
                    <Pressable
                        onPress={() => router.replace("/(main)/home")}
                        style={({ pressed }) => [
                            styles.refreshButton,
                            pressed && { opacity: 0.8 },
                        ]}
                    >
                        <Ionicons name="refresh-outline" size={16} color="#dc2626" />
                        <Text style={styles.refreshButtonText}>Go to Dashboard</Text>
                    </Pressable>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 20,
        backgroundColor: "#f8fafc",
    },
    brandSection: {
        alignItems: "center",
        marginBottom: 40,
    },
    logoContainer: {
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: "#dc2626",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    logo: {
        fontSize: 32,
        fontWeight: "700",
        color: "#fff",
    },
    brandName: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1e293b",
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    card: {
        width: "100%",
        maxWidth: 400,
        alignSelf: "center",
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    welcomeText: { 
        fontSize: 22, 
        fontWeight: "700", 
        color: "#0f172a", 
        marginBottom: 6 
    },
    subtitle: { 
        fontSize: 14, 
        color: "#64748b", 
        marginBottom: 24 
    },
    inputContainer: { 
        marginBottom: 16 
    },
    label: { 
        fontSize: 13, 
        fontWeight: "600", 
        color: "#334155", 
        marginBottom: 6 
    },
    inputWrapper: { 
        flexDirection: "row", 
        alignItems: "center", 
        backgroundColor: "#f8fafc", 
        borderRadius: 12, 
        borderWidth: 1, 
        borderColor: "#e2e8f0" 
    },
    inputIcon: { 
        paddingLeft: 12 
    },
    input: { 
        flex: 1, 
        paddingVertical: 14, 
        paddingHorizontal: 12, 
        fontSize: 15, 
        color: "#0f172a" 
    },
    eyeIcon: { 
        paddingRight: 12 
    },
    forgotPasswordContainer: {
        alignSelf: "flex-end",
        marginBottom: 20,
        marginTop: 4,
    },
    forgotPasswordText: {
        fontSize: 13,
        color: "#dc2626",
        fontWeight: "500",
    },
    button: {
        backgroundColor: "#dc2626",
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
        shadowColor: "#dc2626",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: { 
        opacity: 0.7 
    },
    buttonText: { 
        color: "#fff", 
        fontWeight: "600", 
        fontSize: 16 
    },
    adminContact: { 
        textAlign: "center", 
        fontSize: 12, 
        color: "#64748b" 
    },
    alreadyLoggedIn: {
        alignItems: "center",
        marginTop: 24,
        gap: 8,
    },
    alreadyLoggedInText: {
        fontSize: 13,
        color: "#94a3b8",
    },
    refreshButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#fca5a5",
        backgroundColor: "#fff5f5",
    },
    refreshButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#dc2626",
    },
});