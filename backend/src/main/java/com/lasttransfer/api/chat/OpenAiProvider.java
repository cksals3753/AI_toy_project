package com.lasttransfer.api.chat;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public final class OpenAiProvider implements DialogueProvider {
  private final ObjectMapper mapper;
  private final HttpClient client;
  private final URI endpoint;
  private final String key;
  private final String model;
  private final Duration timeout;
  private final boolean enabled;
  private volatile boolean quotaBlocked;

  public OpenAiProvider(ObjectMapper mapper, String key, String model, Duration timeout) {
    this(mapper, key, model, timeout, true);
  }

  public OpenAiProvider(
      ObjectMapper mapper, String key, String model, Duration timeout, boolean enabled) {
    this(mapper, key, model, timeout, URI.create("https://api.openai.com/v1/responses"), enabled);
  }

  OpenAiProvider(ObjectMapper mapper, String key, String model, Duration timeout, URI endpoint) {
    this(mapper, key, model, timeout, endpoint, true);
  }

  private OpenAiProvider(
      ObjectMapper mapper,
      String key,
      String model,
      Duration timeout,
      URI endpoint,
      boolean enabled) {
    this.enabled = enabled;
    this.mapper = mapper;
    this.key = key;
    this.model = model;
    this.timeout = timeout;
    this.endpoint = endpoint;
    this.client =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5L))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
  }

  @Override
  public String mode() {
    return "openai";
  }

  @Override
  public boolean ready() {
    return enabled && !quotaBlocked && this.key != null && !this.key.isBlank();
  }

  @Override
  public String unavailableReason() {
    if (!enabled) return "disabled";
    if (quotaBlocked) return "quota";
    return ready() ? "ready" : "key_missing";
  }

  @Override
  public String generate(String instructions, String context) throws Exception {
    if (!this.ready()) {
      throw new ChatError(503, "AI 키가 설정되지 않았어요. 기존 선택형 질문은 사용할 수 있어요.");
    }
    String body =
        this.mapper.writeValueAsString(
            Map.of(
                "model",
                this.model,
                "instructions",
                instructions,
                "input",
                List.of(Map.of("role", "user", "content", context)),
                "reasoning",
                Map.of("effort", "none"),
                "max_output_tokens",
                600,
                "store",
                false));
    HttpRequest request =
        HttpRequest.newBuilder(this.endpoint)
            .timeout(this.timeout)
            .header("Authorization", "Bearer " + this.key)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
            .build();
    try {
      HttpResponse<InputStream> response =
          this.client.send(request, HttpResponse.BodyHandlers.ofInputStream());
      try (InputStream input = response.body(); ) {
        if (response.statusCode() != 200) {
          byte[] errorBytes = input.readNBytes(262145);
          if (response.statusCode() == 429 && errorBytes.length <= 262144) {
            try {
              JsonNode error = mapper.readTree(errorBytes).path("error");
              String code = error.path("code").asText();
              if (List.of(
                          "credit_balance_exhausted",
                          "insufficient_quota",
                          "organization_spend_limit_exceeded",
                          "project_spend_limit_exceeded",
                          "organization_usage_limit_exceeded")
                      .contains(code)
                  || error.path("type").asText().equals("insufficient_quota")) {
                quotaBlocked = true;
              }
            } catch (RuntimeException ignored) {
              /* Keep raw provider errors private. */
            }
          }
          throw new ChatError(
              response.statusCode() == 429 ? 429 : 502,
              quotaBlocked
                  ? "AI 사용 한도가 부족해 자유 대화를 중지했어요. 선택형 질문으로 계속하세요."
                  : "AI 제공자 연결이 원활하지 않아요. 선택형 질문으로 계속할 수 있어요.");
        }
        byte[] bytes = input.readNBytes(262145);
        if (bytes.length > 262144) {
          throw new ChatError(502, "AI 응답 크기를 확인하지 못했어요.");
        }
        JsonNode data = this.mapper.readTree(bytes);
        if (!data.path("status").asText().equals("completed") || !data.path("output").isArray()) {
          throw new ChatError(502, "AI 답변이 완성되지 않았어요. 다시 시도해주세요.");
        }
        StringBuilder result = new StringBuilder();
        for (JsonNode item : data.path("output")) {
          if (!item.path("type").asText().equals("message") || !item.path("content").isArray())
            continue;
          for (JsonNode part : item.path("content")) {
            if (!part.path("type").asText().equals("output_text") || !part.path("text").isTextual())
              continue;
            if (!result.isEmpty()) {
              result.append('\n');
            }
            result.append(part.path("text").asText());
          }
        }
        if (result.toString().isBlank()) {
          throw new ChatError(502, "AI 답변이 비어 있어요. 다시 시도해주세요.");
        }
        return result.toString();
      }

    } catch (HttpTimeoutException ex) {
      throw new ChatError(504, "답변 시간이 초과됐어요. 같은 질문으로 재시도할 수 있어요.");
    }
  }
}
