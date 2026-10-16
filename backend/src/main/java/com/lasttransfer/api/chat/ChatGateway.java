package com.lasttransfer.api.chat;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

@Component
public class ChatGateway extends OncePerRequestFilter {
  static final String SESSION = "chat.session";
  private final Set<String> origins;
  private final boolean secure;
  private final ObjectMapper mapper;
  private final Map<String, Long> sessions = new HashMap<String, Long>();
  private final Map<String, List<Long>> traffic = new HashMap<String, List<Long>>();

  public ChatGateway(
      ObjectMapper mapper,
      @Value(value = "${chat.allowed-origins}") String origins,
      @Value(value = "${chat.secure-cookie}") boolean secure) {
    this.mapper = mapper;
    this.secure = secure;
    this.origins = new HashSet<String>();
    String[] stringArray = origins.split(",");
    int n = stringArray.length;
    int n2 = 0;
    while (n2 < n) {
      String origin = stringArray[n2];
      if (!origin.isBlank()) {
        this.origins.add(origin.trim());
      }
      ++n2;
    }
  }

  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    String path = request.getRequestURI();
    if (!path.equals("/api/chat") && !path.equals("/api/chat/status")) {
      this.fail(response, 404, "Not found");
      return;
    }
    try {
      this.rate(request.getRemoteAddr());
      String origin = request.getHeader("Origin");
      if (origin != null && !this.origins.contains(origin)) {
        throw new ChatError(403, "허용되지 않은 출처입니다.");
      }
      if (origin != null) {
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Vary", "Origin");
      }
      if (request.getMethod().equals("OPTIONS")) {
        if (origin == null || !this.origins.contains(origin)) {
          throw new ChatError(403, "허용되지 않은 출처입니다.");
        }
        response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        response.setStatus(204);
        return;
      }
      if (path.equals("/api/chat/status") && request.getMethod().equals("GET")) {
        String token = this.token(request);
        ChatGateway chatGateway = this;
        synchronized (chatGateway) {
          if (token == null) {
            if (this.sessions.size() >= 1000) {
              throw new ChatError(429, "대화 세션이 많아요. 잠시 뒤 시도해주세요.");
            }
            token = UUID.randomUUID().toString();
            this.sessions.put(token, System.currentTimeMillis() + 1800000L);
            response.addHeader(
                "Set-Cookie",
                "last_transfer_chat="
                    + token
                    + "; HttpOnly; SameSite=Strict; Path=/api/chat; Max-Age=1800"
                    + (this.secure ? "; Secure" : ""));
          }
        }
        request.setAttribute(SESSION, (Object) token);
      } else if (path.equals("/api/chat") && request.getMethod().equals("POST")) {
        if (origin == null) {
          throw new ChatError(403, "같은 게임 화면에서 요청해주세요.");
        }
        String token = this.token(request);
        if (token == null) {
          throw new ChatError(401, "대화 연결을 다시 확인해주세요.");
        }
        request.setAttribute(SESSION, (Object) token);
      } else {
        throw new ChatError(404, "Not found");
      }
      chain.doFilter(request, response);
    } catch (ChatError error) {
      this.fail(response, error.status(), error.getMessage());
    }
  }

  private synchronized String token(HttpServletRequest request) {
    if (request.getCookies() == null) {
      return null;
    }
    Cookie[] cookieArray = request.getCookies();
    int n = cookieArray.length;
    int n2 = 0;
    while (n2 < n) {
      Cookie cookie = cookieArray[n2];
      if (cookie.getName().equals("last_transfer_chat")
          && this.sessions.getOrDefault(cookie.getValue(), 0L) > System.currentTimeMillis()) {
        return cookie.getValue();
      }
      ++n2;
    }
    return null;
  }

  private synchronized void rate(String ip) {
    long time = System.currentTimeMillis();
    this.sessions.values().removeIf(expires -> expires <= time);
    this.traffic
        .values()
        .forEach(
            v -> {
              v.removeIf(t -> t <= time - 60000L);
            });
    this.traffic.values().removeIf(List::isEmpty);
    if (!this.traffic.containsKey(ip) && this.traffic.size() >= 1000
        || this.traffic.getOrDefault(ip, List.of()).size() >= 100) {
      throw new ChatError(429, "요청이 많아요. 잠시 뒤 다시 시도해주세요.");
    }
    this.traffic.computeIfAbsent(ip, s -> new ArrayList<>()).add(time);
  }

  private void fail(HttpServletResponse response, int status, String message) throws IOException {
    response.setStatus(status);
    response.setContentType("application/json;charset=UTF-8");
    response.getOutputStream().write(this.mapper.writeValueAsBytes(Map.of("error", message)));
  }
}
