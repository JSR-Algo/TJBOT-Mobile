package com.TJBotmobile.t54;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;

final class T54AssignmentContract {
    static final String DEVICE_ID = "91deb5af-c1c0-416b-956d-266d510eac5e";
    static final String CHILD_ID = "2bbcd940-f9da-47cf-8a99-f1eaf2380e8c";
    static final String LESSON_ID = "w02-feelings";
    static final int LESSON_VERSION = 7;
    static final String PROFILE = "espTft";
    static final String STATE = "ASSIGNED";
    static final String ENDPOINT = "https://tbot-backend-8wmh.onrender.com/v1/devices/"
            + DEVICE_ID + "/assignments";

    private T54AssignmentContract() {}

    static JSONObject requestBody() throws JSONException {
        return new JSONObject()
                .put("lessonId", LESSON_ID)
                .put("lessonVersion", LESSON_VERSION)
                .put("childId", CHILD_ID)
                .put("profile", PROFILE);
    }

    static JSONObject validateResponse(int httpStatus, JSONObject payload) throws JSONException {
        require(httpStatus == 201, "HTTP_STATUS");
        JSONObject envelope = payload.optJSONObject("data");
        require(envelope != null, "RESPONSE_DATA");
        JSONObject assignment = envelope.optJSONObject("assignment");
        require(assignment != null, "RESPONSE_ASSIGNMENT");

        String assignmentId = stringValue(assignment, "assignment_id", "assignmentId");
        int assignmentVersion = intValue(assignment, "assignment_version", "assignmentVersion");
        String deviceId = stringValue(assignment, "device_id", "deviceId");
        String childId = stringValue(assignment, "child_id", "childId");
        String lessonId = stringValue(assignment, "lesson_id", "lessonId");
        int lessonVersion = intValue(assignment, "lesson_version", "lessonVersion");
        String profile = stringValue(assignment, "profile", "profile");
        String state = stringValue(assignment, "state", "state");

        try {
            UUID.fromString(assignmentId);
        } catch (IllegalArgumentException error) {
            throw new IllegalStateException("ASSIGNMENT_ID", error);
        }
        require(assignmentVersion > 0, "ASSIGNMENT_VERSION");
        require(DEVICE_ID.equals(deviceId), "DEVICE_ID");
        require(CHILD_ID.equals(childId), "CHILD_ID");
        require(LESSON_ID.equals(lessonId), "LESSON_ID");
        require(LESSON_VERSION == lessonVersion, "LESSON_VERSION");
        require(PROFILE.equals(profile), "PROFILE");
        require(STATE.equals(state), "STATE");

        return new JSONObject()
                .put("httpStatus", httpStatus)
                .put("assignmentId", assignmentId)
                .put("assignmentVersion", assignmentVersion)
                .put("deviceId", deviceId)
                .put("childId", childId)
                .put("lessonId", lessonId)
                .put("lessonVersion", lessonVersion)
                .put("profile", profile)
                .put("state", state);
    }

    private static String stringValue(JSONObject object, String snakeKey, String camelKey) {
        String value = object.optString(snakeKey, object.optString(camelKey, ""));
        require(!value.isEmpty(), "MISSING_" + camelKey.toUpperCase());
        return value;
    }

    private static int intValue(JSONObject object, String snakeKey, String camelKey) {
        Object raw = object.has(snakeKey) ? object.opt(snakeKey) : object.opt(camelKey);
        require(raw instanceof Number, "MISSING_" + camelKey.toUpperCase());
        return ((Number) raw).intValue();
    }

    private static void require(boolean condition, String code) {
        if (!condition) throw new IllegalStateException(code);
    }
}
