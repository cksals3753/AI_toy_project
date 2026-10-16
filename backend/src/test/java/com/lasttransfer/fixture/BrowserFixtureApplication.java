package com.lasttransfer.fixture;

import com.lasttransfer.api.LastTransferApiApplication;
import com.lasttransfer.api.chat.DialogueProvider;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.annotation.*;
import tools.jackson.databind.json.JsonMapper;

@Configuration
@Profile("browser-test")
public class BrowserFixtureApplication {
  public static void main(String[] args) {
    new SpringApplicationBuilder(LastTransferApiApplication.class, BrowserFixtureApplication.class)
        .profiles("browser-test")
        .run(args);
  }

  @Bean
  @Primary
  public DialogueProvider browserProvider() {
    return new DialogueProvider() {
      private final Set<String> failed = ConcurrentHashMap.newKeySet();

      public String mode() {
        return "mock";
      }

      public boolean ready() {
        return true;
      }

      public String generate(String instructions, String context) throws Exception {
        Thread.sleep(350);
        String question =
            JsonMapper.builder()
                .build()
                .readTree(context)
                .path("unverifiedPlayerQuestion")
                .asText();
        if (question.equals("재시도 검증") && failed.add(question))
          throw new IllegalStateException("mock failure");
        return "모의 검증 응답입니다. 현장의 표식을 직접 확인해 주세요.";
      }
    };
  }
}
