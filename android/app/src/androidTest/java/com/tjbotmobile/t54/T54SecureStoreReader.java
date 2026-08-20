package com.TJBotmobile.t54;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class T54SecureStoreReader {
    private static final String PREFERENCE_KEY = "key_v1-TJBot_access_token";
    private static final String KEYSTORE_ALIAS =
            "AES/GCM/NoPadding:key_v1:keystoreUnauthenticated";

    private T54SecureStoreReader() {}

    static String readAccessToken(Context targetContext) throws Exception {
        SharedPreferences preferences = targetContext.getSharedPreferences("SecureStore", Context.MODE_PRIVATE);
        String encodedEnvelope = preferences.getString(PREFERENCE_KEY, null);
        require(encodedEnvelope != null && !encodedEnvelope.isEmpty(), "SECURESTORE_MISSING");

        JSONObject envelope = new JSONObject(encodedEnvelope);
        require("aes".equals(envelope.optString("scheme")), "SECURESTORE_SCHEME");
        require(envelope.optBoolean("usesKeystoreSuffix", false), "SECURESTORE_ALIAS_FORMAT");
        require(!envelope.optBoolean("requireAuthentication", false), "SECURESTORE_AUTH_REQUIRED");

        int authenticationTagLength = envelope.optInt("tlen", 0);
        require(authenticationTagLength >= 96 && authenticationTagLength <= 128,
                "SECURESTORE_TAG_LENGTH");
        byte[] ciphertext = Base64.decode(envelope.getString("ct"), Base64.DEFAULT);
        byte[] initializationVector = Base64.decode(envelope.getString("iv"), Base64.DEFAULT);
        require(ciphertext.length > 0, "SECURESTORE_CIPHERTEXT");
        require(initializationVector.length == 12, "SECURESTORE_IV");

        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        KeyStore.Entry entry = keyStore.getEntry(KEYSTORE_ALIAS, null);
        require(entry instanceof KeyStore.SecretKeyEntry, "SECURESTORE_KEY");
        SecretKey secretKey = ((KeyStore.SecretKeyEntry) entry).getSecretKey();

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, secretKey,
                new GCMParameterSpec(authenticationTagLength, initializationVector));
        byte[] plaintext = cipher.doFinal(ciphertext);
        try {
            String value = new String(plaintext, StandardCharsets.UTF_8);
            require(!value.isEmpty(), "SECURESTORE_EMPTY");
            return value;
        } finally {
            java.util.Arrays.fill(plaintext, (byte) 0);
            java.util.Arrays.fill(ciphertext, (byte) 0);
            java.util.Arrays.fill(initializationVector, (byte) 0);
        }
    }

    private static void require(boolean condition, String code) {
        if (!condition) throw new IllegalStateException(code);
    }
}
