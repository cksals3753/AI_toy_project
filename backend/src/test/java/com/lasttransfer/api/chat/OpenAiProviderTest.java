package com.lasttransfer.api.chat;

import static org.junit.jupiter.api.Assertions.*;

import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.Test;

class OpenAiProviderTest {
  @Test
  void responseContractAndSafeFailures() throws Exception {
    AtomicInteger code = new AtomicInteger(200);
    AtomicReference<String> response =
        new AtomicReference<>(
            "{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\"현장을"
                + " 확인해요.\"}]}]}");
    AtomicReference<String> body = new AtomicReference<>(), auth = new AtomicReference<>();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/responses",
        exchange -> {
          body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          auth.set(exchange.getRequestHeaders().getFirst("Authorization"));
          byte[] bytes = response.get().getBytes(StandardCharsets.UTF_8);
          exchange.sendResponseHeaders(code.get(), bytes.length);
          try (var out = exchange.getResponseBody()) {
            out.write(bytes);
          }
        });
    server.start();
    try {
      var provider =
          new OpenAiProvider(
              ChatContextTest.MAPPER,
              "fake-test-key",
              "test-model",
              Duration.ofSeconds(2),
              URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/responses"));
      assertEquals("현장을 확인해요.", provider.generate("instructions", "context"));
      var sent = ChatContextTest.MAPPER.readTree(body.get());
      assertFalse(sent.path("store").asBoolean());
      assertEquals("none", sent.path("reasoning").path("effort").asText());
      assertEquals("Bearer fake-test-key", auth.get());
      code.set(429);
      response.set("private provider error");
      ChatError error = assertThrows(ChatError.class, () -> provider.generate("i", "c"));
      assertEquals(429, error.status());
      assertFalse(error.getMessage().contains("private provider"));
      code.set(200);
      response.set("{\"status\":\"incomplete\",\"output\":[]}");
      assertEquals(502, assertThrows(ChatError.class, () -> provider.generate("i", "c")).status());
    } finally {
      server.stop(0);
    }
  }

  @Test
  void disabledAndExhaustedQuotaNeverRepeatProviderRequests() throws Exception {
    var disabled =
        new OpenAiProvider(
            ChatContextTest.MAPPER, "fake-test-key", "test-model", Duration.ofSeconds(2), false);
    assertFalse(disabled.ready());
    assertEquals("disabled", disabled.unavailableReason());
    assertEquals(503, assertThrows(ChatError.class, () -> disabled.generate("i", "c")).status());
    AtomicInteger calls = new AtomicInteger();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/responses",
        exchange -> {
          calls.incrementAndGet();
          byte[] bytes =
              "{\"error\":{\"code\":\"credit_balance_exhausted\",\"type\":\"insufficient_quota\",\"message\":\"private detail\"}}"
                  .getBytes(StandardCharsets.UTF_8);
          exchange.sendResponseHeaders(429, bytes.length);
          try (var out = exchange.getResponseBody()) {
            out.write(bytes);
          }
        });
    server.start();
    try {
      var provider =
          new OpenAiProvider(
              ChatContextTest.MAPPER,
              "fake-test-key",
              "test-model",
              Duration.ofSeconds(2),
              URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/responses"));
      var error = assertThrows(ChatError.class, () -> provider.generate("i", "c"));
      assertEquals(429, error.status());
      assertFalse(error.getMessage().contains("private detail"));
      assertFalse(provider.ready());
      assertEquals("quota", provider.unavailableReason());
      assertEquals(503, assertThrows(ChatError.class, () -> provider.generate("i", "c")).status());
      assertEquals(1, calls.get());
    } finally {
      server.stop(0);
    }
  }
}
