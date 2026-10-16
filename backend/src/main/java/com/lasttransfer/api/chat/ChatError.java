package com.lasttransfer.api.chat;

public final class ChatError extends RuntimeException {
  private final int status;

  public ChatError(int status, String message) {
    super(message);
    this.status = status;
  }

  public int status() {
    return this.status;
  }
}
