package com.lasttransfer.api.chat;

import static org.junit.jupiter.api.Assertions.*;

import com.lasttransfer.api.LastTransferApiApplication;
import java.net.URI;
import java.net.http.*;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

@SpringBootTest(
    classes = LastTransferApiApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "chat.api-key=",
      "chat.provider=openai",
      "chat.allowed-origins=http://localhost:5173"
    })
class KeylessHttpTest {
  @LocalServerPort int port;

  @Test
  void statusUnavailableAndGeneration503() throws Exception {
    var client = HttpClient.newHttpClient();
    var uri = URI.create("http://127.0.0.1:" + port + "/api/chat");
    var status =
        client.send(
            HttpRequest.newBuilder(URI.create(uri + "/status")).GET().build(),
            HttpResponse.BodyHandlers.ofString());
    assertTrue(status.body().contains("\"available\":false"));
    var request =
        HttpRequest.newBuilder(uri)
            .header("Origin", "http://localhost:5173")
            .header(
                "Cookie", status.headers().firstValue("set-cookie").orElseThrow().split(";", 2)[0])
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(ChatContextTest.body()))
            .build();
    assertEquals(503, client.send(request, HttpResponse.BodyHandlers.ofString()).statusCode());
  }
}
