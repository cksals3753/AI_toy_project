package com.lasttransfer.api.chat;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ChatErrors {
  @ExceptionHandler(value = {ChatError.class})
  ResponseEntity<Map<String, String>> known(ChatError error) {
    return ResponseEntity.status((int) error.status()).body(Map.of("error", error.getMessage()));
  }

  @ExceptionHandler(value = {Exception.class})
  ResponseEntity<Map<String, String>> unknown(Exception error) {
    return ResponseEntity.internalServerError().body(Map.of("error", "서버 요청을 처리하지 못했어요."));
  }
}
