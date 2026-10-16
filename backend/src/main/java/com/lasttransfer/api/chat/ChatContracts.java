package com.lasttransfer.api.chat;

import java.util.List;
import java.util.Set;

public final class ChatContracts {
  public static final Set<String> CHARACTERS = Set.of("seo", "kang", "min", "oh");
  public static final Set<String> AREAS = Set.of("hall", "electrical", "stairs");
  public static final int BODY_BYTES = 24000;
  public static final int INPUT = 600;
  public static final int ANSWER = 700;
  public static final int HISTORY = 12;
  public static final int HISTORY_TEXT = 700;
  public static final int HISTORY_TOTAL = 4500;

  private ChatContracts() {}

  public record Context(
      int chapter,
      String area,
      List<String> discovered,
      List<String> asked,
      List<String> shared,
      List<History> recent) {}

  public record History(String who, String text) {}

  public record Reply(String requestId, String characterId, String text, String mode) {}

  public record Request(String requestId, String characterId, String text, Context context) {}
}
