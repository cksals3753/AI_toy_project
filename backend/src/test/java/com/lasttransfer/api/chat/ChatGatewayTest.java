package com.lasttransfer.api.chat;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;

class ChatGatewayTest {
  @Test
  void ipLimitAndCookieProtection() throws Exception {
    var gateway = new ChatGateway(ChatContextTest.MAPPER, "http://localhost:5173", true);
    for (int i = 0; i < 101; i++) {
      var request = new MockHttpServletRequest("GET", "/api/chat/status");
      request.setRemoteAddr("127.0.0.2");
      var response = new MockHttpServletResponse();
      gateway.doFilter(request, response, new MockFilterChain());
      if (i == 0) {
        assertTrue(response.getHeader("Set-Cookie").contains("Secure"));
        assertEquals("no-store", response.getHeader("Cache-Control"));
      }
      assertEquals(i == 100 ? 429 : 200, response.getStatus());
    }
  }
}
