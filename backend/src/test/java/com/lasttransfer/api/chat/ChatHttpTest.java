package com.lasttransfer.api.chat;

import static org.junit.jupiter.api.Assertions.*;

import com.lasttransfer.api.LastTransferApiApplication;
import com.lasttransfer.fixture.BrowserFixtureApplication;
import java.net.URI;
import java.net.http.*;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
    classes = {LastTransferApiApplication.class, BrowserFixtureApplication.class},
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {"chat.api-key=", "chat.allowed-origins=http://localhost:5173"})
@ActiveProfiles("browser-test")
class ChatHttpTest {
  @LocalServerPort int port;
  final HttpClient client = HttpClient.newHttpClient();

  URI uri(String path) {
    return URI.create("http://127.0.0.1:" + port + path);
  }

  HttpResponse<String> send(HttpRequest request) throws Exception {
    return client.send(request, HttpResponse.BodyHandlers.ofString());
  }

  String cookie() throws Exception {
    var status = send(HttpRequest.newBuilder(uri("/api/chat/status")).GET().build());
    assertEquals(200, status.statusCode());
    String header = status.headers().firstValue("set-cookie").orElseThrow();
    assertTrue(header.contains("HttpOnly"));
    assertTrue(header.contains("SameSite=Strict"));
    return header.split(";", 2)[0];
  }

  HttpRequest post(String cookie, String origin, String type, String body) {
    return HttpRequest.newBuilder(uri("/api/chat"))
        .header("Cookie", cookie)
        .header("Origin", origin)
        .header("Content-Type", type)
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .build();
  }

  @Test
  void statusReplyCacheAndConflict() throws Exception {
    String cookie = cookie();
    var request = post(cookie, "http://localhost:5173", "application/json", ChatContextTest.body());
    var reply = send(request);
    assertEquals(200, reply.statusCode());
    assertTrue(reply.body().contains("\"mode\":\"mock\""));
    assertEquals(reply.body(), send(request).body());
    assertEquals(
        409,
        send(post(
                cookie,
                "http://localhost:5173",
                "application/json",
                ChatContextTest.body().replace("무엇을 확인해요?", "다른 질문")))
            .statusCode());
  }

  @Test
  void originSessionInputAndSizeAreRejected() throws Exception {
    String cookie = cookie(), body = ChatContextTest.body(), origin = "http://localhost:5173";
    assertEquals(
        403, send(post(cookie, "https://evil.example", "application/json", body)).statusCode());
    assertEquals(
        401,
        send(post("last_transfer_chat=invalid", origin, "application/json", body)).statusCode());
    assertEquals(415, send(post(cookie, origin, "text/plain", body)).statusCode());
    assertEquals(400, send(post(cookie, origin, "application/json", "{")).statusCode());
    assertEquals(
        400,
        send(post(cookie, origin, "application/json", body.replace("\"seo\"", "\"stranger\"")))
            .statusCode());
    assertEquals(
        413, send(post(cookie, origin, "application/json", "한".repeat(9000))).statusCode());
    var chunked =
        HttpRequest.newBuilder(uri("/api/chat"))
            .header("Cookie", cookie)
            .header("Origin", origin)
            .header("Content-Type", "application/json")
            .POST(
                HttpRequest.BodyPublishers.ofInputStream(
                    () -> new java.io.ByteArrayInputStream(new byte[24001])))
            .build();
    assertEquals(413, send(chunked).statusCode());
  }

  @Test
  void corsAndPrivatePaths() throws Exception {
    assertEquals(
        204,
        send(HttpRequest.newBuilder(uri("/api/chat"))
                .header("Origin", "http://localhost:5173")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                .build())
            .statusCode());
    for (String path : new String[] {"/private/characters.json", "/actuator/env", "/README.md"})
      assertEquals(404, send(HttpRequest.newBuilder(uri(path)).GET().build()).statusCode());
  }
}
