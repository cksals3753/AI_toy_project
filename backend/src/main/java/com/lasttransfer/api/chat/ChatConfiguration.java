package com.lasttransfer.api.chat;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class ChatConfiguration {
  @Bean
  @ConditionalOnMissingBean(value = {DialogueProvider.class})
  DialogueProvider dialogueProvider(
      ObjectMapper mapper,
      @Value(value = "${chat.api-key}") String key,
      @Value(value = "${chat.model}") String model,
      @Value(value = "${chat.provider}") String provider,
      @Value(value = "${chat.timeout-ms}") long timeout,
      @Value("${chat.enabled:false}") boolean enabled) {
    if (!provider.equals("openai")) {
      throw new IllegalArgumentException("AI_PROVIDER는 openai만 지원합니다.");
    }
    if (timeout < 1L || timeout > 20000L) {
      throw new IllegalArgumentException("CHAT_TIMEOUT_MS는 1~20000 범위여야 합니다.");
    }
    return new OpenAiProvider(mapper, key, model, Duration.ofMillis(timeout), enabled);
  }
}
