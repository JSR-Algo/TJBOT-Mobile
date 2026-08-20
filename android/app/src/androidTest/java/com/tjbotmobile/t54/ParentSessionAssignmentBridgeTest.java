package com.TJBotmobile.t54;

import static org.junit.Assert.assertNotNull;

import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Context;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityNodeInfo;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;

@RunWith(AndroidJUnit4.class)
public class ParentSessionAssignmentBridgeTest {
    private static final String TARGET_PACKAGE = "com.TJBotmobile";
    private static final String ARMING_VALUE = "PASS53";
    private static final String RESULT_NAME = "t54-pass53-assignment.json";
    private static final String[] READY_MARKERS = {
            "Hôm nay",
            "Trạng thái bài học trực tiếp",
            "Hiện không có bài học nào đang diễn ra"
    };

    @Test
    public void probeExistingSession() throws Exception {
        Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
        requireReadyRoute(instrumentation.getUiAutomation());
        String accessToken = null;
        try {
            accessToken = T54SecureStoreReader.readAccessToken(instrumentation.getTargetContext());
            requireJwtShape(accessToken);
            Bundle status = new Bundle();
            status.putString("t54", "SESSION_PROBE_OK route=READY tokenPresent=true");
            instrumentation.sendStatus(0, status);
        } finally {
            accessToken = null;
        }
    }

    @Test
    public void createPass53Assignment() throws Exception {
        Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
        Context targetContext = instrumentation.getTargetContext();
        Bundle arguments = InstrumentationRegistry.getArguments();
        require(ARMING_VALUE.equals(arguments.getString("confirmAssignmentId")), "ARMING");

        File externalDirectory = targetContext.getExternalFilesDir(null);
        require(externalDirectory != null, "RESULT_DIRECTORY");
        File result = new File(externalDirectory, RESULT_NAME).getCanonicalFile();
        String requestedPath = arguments.getString("resultPath");
        require(requestedPath != null
                && result.getPath().equals(new File(requestedPath).getCanonicalPath()), "RESULT_PATH");
        if (result.exists()) require(result.delete(), "RESULT_DELETE");

        String accessToken = null;
        try {
            requireReadyRoute(instrumentation.getUiAutomation());
            accessToken = T54SecureStoreReader.readAccessToken(targetContext);
            requireJwtShape(accessToken);
            JSONObject normalized = postAssignmentOnce(accessToken);
            writeResult(result, normalized);
            Bundle status = new Bundle();
            status.putString("t54", "ASSIGNMENT_CREATED route=READY result=" + RESULT_NAME);
            instrumentation.sendStatus(0, status);
        } catch (Exception error) {
            if (result.exists()) result.delete();
            throw stableFailure(error);
        } finally {
            accessToken = null;
        }
    }

    private static JSONObject postAssignmentOnce(String accessToken) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(T54AssignmentContract.ENDPOINT)
                .openConnection();
        try {
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(30_000);
            connection.setReadTimeout(30_000);
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + accessToken);
            connection.setRequestProperty("Idempotency-Key", "lesson-assign:"
                    + T54AssignmentContract.DEVICE_ID + ":" + T54AssignmentContract.LESSON_ID
                    + ":" + T54AssignmentContract.CHILD_ID);
            connection.setRequestProperty("X-Request-Id", "t54-pass53-parent-session-bridge");

            byte[] requestBytes = T54AssignmentContract.requestBody().toString()
                    .getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(requestBytes.length);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(requestBytes);
            } finally {
                java.util.Arrays.fill(requestBytes, (byte) 0);
            }

            int status = connection.getResponseCode();
            require(status == 201, "HTTP_STATUS");
            JSONObject payload = new JSONObject(readLimited(connection.getInputStream()));
            return T54AssignmentContract.validateResponse(status, payload);
        } finally {
            connection.disconnect();
        }
    }

    private static void requireReadyRoute(UiAutomation automation) {
        assertNotNull("UI_AUTOMATION", automation);
        AccessibilityNodeInfo root = waitForActiveRoot(automation);
        require(root != null, "ROUTE_ROOT");
        try {
            require(TARGET_PACKAGE.contentEquals(root.getPackageName()), "ROUTE_PACKAGE");
            boolean[] found = new boolean[READY_MARKERS.length];
            Deque<AccessibilityNodeInfo> pending = new ArrayDeque<>();
            pending.add(root);
            while (!pending.isEmpty()) {
                AccessibilityNodeInfo node = pending.removeFirst();
                CharSequence text = node.getText();
                CharSequence description = node.getContentDescription();
                String visible = (text == null ? "" : text.toString()) + "\n"
                        + (description == null ? "" : description.toString());
                for (int i = 0; i < READY_MARKERS.length; i++) {
                    found[i] |= visible.contains(READY_MARKERS[i]);
                }
                for (int i = 0; i < node.getChildCount(); i++) {
                    AccessibilityNodeInfo child = node.getChild(i);
                    if (child != null) pending.addLast(child);
                }
                if (node != root) node.recycle();
            }
            for (boolean markerFound : found) require(markerFound, "ROUTE_MARKER");
        } finally {
            root.recycle();
        }
    }

    private static AccessibilityNodeInfo waitForActiveRoot(UiAutomation automation) {
        long deadline = SystemClock.uptimeMillis() + 5_000;
        AccessibilityNodeInfo root;
        do {
            root = automation.getRootInActiveWindow();
            if (root != null) return root;
            SystemClock.sleep(100);
        } while (SystemClock.uptimeMillis() < deadline);
        return null;
    }

    private static String readLimited(InputStream input) throws Exception {
        try (InputStream source = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int total = 0;
            int read;
            while ((read = source.read(buffer)) != -1) {
                total += read;
                require(total <= 64 * 1024, "RESPONSE_SIZE");
                output.write(buffer, 0, read);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    private static void writeResult(File result, JSONObject normalized) throws Exception {
        byte[] bytes = normalized.toString().getBytes(StandardCharsets.UTF_8);
        try (FileOutputStream output = new FileOutputStream(result, false)) {
            output.write(bytes);
            output.getFD().sync();
        } finally {
            java.util.Arrays.fill(bytes, (byte) 0);
        }
    }

    private static void requireJwtShape(String value) {
        require(value != null && value.length() >= 20, "SESSION_SHAPE");
        String[] segments = value.split("\\.", -1);
        require(segments.length == 3, "SESSION_SHAPE");
        for (String segment : segments) {
            require(segment.matches("[A-Za-z0-9_-]+"), "SESSION_SHAPE");
        }
    }

    private static IllegalStateException stableFailure(Exception error) {
        String code = error instanceof IllegalStateException ? error.getMessage() : null;
        if (code == null || !code.matches("[A-Z0-9_]+")) code = "BRIDGE_FAILURE";
        return new IllegalStateException(code);
    }

    private static void require(boolean condition, String code) {
        if (!condition) throw new IllegalStateException(code);
    }
}
