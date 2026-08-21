package com.TJBotmobile.t54;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import org.json.JSONObject;
import org.junit.Test;

public class T54AssignmentContractTest {
    private static final String ASSIGNMENT_ID = "11111111-2222-4333-8444-555555555555";

    @Test
    public void buildsFixedRequest() throws Exception {
        JSONObject request = T54AssignmentContract.requestBody();
        assertEquals("w02-feelings", request.getString("lessonId"));
        assertEquals(7, request.getInt("lessonVersion"));
        assertEquals("2bbcd940-f9da-47cf-8a99-f1eaf2380e8c", request.getString("childId"));
        assertEquals("espTft", request.getString("profile"));
    }

    @Test
    public void acceptsExactAssignedResponse() throws Exception {
        JSONObject normalized = T54AssignmentContract.validateResponse(201, exactResponse());
        assertEquals(ASSIGNMENT_ID, normalized.getString("assignmentId"));
        assertEquals(1, normalized.getInt("assignmentVersion"));
        assertEquals("ASSIGNED", normalized.getString("state"));
    }

    @Test
    public void rejectsWrongIdentityStateAndShape() throws Exception {
        assertRejects("HTTP_STATUS", 200, exactResponse());
        assertRejects("DEVICE_ID", 201, exactResponseWith("deviceId", "wrong"));
        assertRejects("CHILD_ID", 201, exactResponseWith("childId", "wrong"));
        assertRejects("LESSON_ID", 201, exactResponseWith("lessonId", "wrong"));
        assertRejects("LESSON_VERSION", 201, exactResponseWith("lessonVersion", 8));
        assertRejects("PROFILE", 201, exactResponseWith("profile", "mobile"));
        assertRejects("STATE", 201, exactResponseWith("state", "PRELOADING"));
        assertRejects("ASSIGNMENT_ID", 201, exactResponseWith("assignmentId", "not-a-uuid"));
        assertRejects("MISSING_ASSIGNMENTVERSION", 201,
                wrap(remove(exactAssignment(), "assignmentVersion")));
        assertRejects("RESPONSE_DATA", 201, exactAssignment());
        assertRejects("RESPONSE_ASSIGNMENT", 201,
                new JSONObject().put("data", exactAssignment()));
    }

    private static void assertRejects(String code, int status, JSONObject response) {
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> T54AssignmentContract.validateResponse(status, response));
        assertEquals(code, error.getMessage());
    }

    private static JSONObject exactAssignment() throws Exception {
        return new JSONObject()
                .put("assignmentId", ASSIGNMENT_ID)
                .put("assignmentVersion", 1)
                .put("deviceId", T54AssignmentContract.DEVICE_ID)
                .put("childId", T54AssignmentContract.CHILD_ID)
                .put("lessonId", T54AssignmentContract.LESSON_ID)
                .put("lessonVersion", T54AssignmentContract.LESSON_VERSION)
                .put("profile", T54AssignmentContract.PROFILE)
                .put("state", T54AssignmentContract.STATE);
    }

    private static JSONObject exactResponse() throws Exception {
        return wrap(exactAssignment());
    }

    private static JSONObject exactResponseWith(String key, Object value) throws Exception {
        return wrap(exactAssignment().put(key, value));
    }

    private static JSONObject wrap(JSONObject assignment) throws Exception {
        return new JSONObject().put("data", new JSONObject().put("assignment", assignment));
    }

    private static JSONObject remove(JSONObject source, String key) throws Exception {
        source.remove(key);
        return source;
    }
}
