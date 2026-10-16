package com.lasttransfer.api.chat;

public interface DialogueProvider {
  default String unavailableReason() {
    return ready() ? "ready" : "unavailable";
  }

  public String mode();

  public boolean ready();

  public String generate(String instructions, String context) throws Exception;
}
