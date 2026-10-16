package com.lasttransfer.api.chat;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping(value = {"/api/chat"})
public class ChatController {
  private final ChatContext context;
  private final ChatService service;
  private final ObjectMapper mapper;

  public ChatController(ChatContext context, ChatService service, ObjectMapper mapper) {
    this.context = context;
    this.service = service;
    this.mapper = mapper;
  }

  @GetMapping(value = {"/status"})
  public Map<String, Object> status() {
    return Map.of(
        "available",
        this.service.ready(),
        "mode",
        this.service.mode(),
        "reason",
        this.service.unavailableReason());
  }

  @PostMapping
  public ChatContracts.Reply chat(HttpServletRequest request) throws IOException {
    ChatContracts.Request parsed;
    try {
      if (request.getContentType() == null
          || !MediaType.APPLICATION_JSON.isCompatibleWith(
              MediaType.parseMediaType((String) request.getContentType()))) {
        throw new ChatError(415, "JSON 요청만 지원합니다.");
      }
    } catch (InvalidMediaTypeException error) {
      throw new ChatError(415, "JSON 요청만 지원합니다.");
    }
    if (request.getContentLengthLong() > 24000L) {
      throw new ChatError(413, "대화 기록이 너무 커요.");
    }
    byte[] bytes = request.getInputStream().readNBytes(24001);
    if (bytes.length > 24000) {
      throw new ChatError(413, "대화 기록이 너무 커요.");
    }
    try {
      parsed = this.context.validate(this.mapper.readTree(bytes));
    } catch (ChatError known) {
      throw known;
    } catch (RuntimeException error) {
      throw new ChatError(400, "요청 형식을 확인해주세요.");
    }
    return this.service.generate((String) request.getAttribute("chat.session"), parsed);
  }
}
