package com.lasttransfer.api.chat;

import jakarta.annotation.PreDestroy;
import java.time.Clock;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.LongSupplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ChatService {
  private final DialogueProvider provider;
  private final ChatContext context;
  private final LongSupplier now;
  private final long timeout;
  private final ExecutorService workers = Executors.newVirtualThreadPerTaskExecutor();
  private final Map<String, Cached> cache = new HashMap<>();
  private final Map<String, List<Long>> rates = new HashMap<>();
  private final Set<String> activeSessions = new HashSet<>();
  private int active;

  @Autowired
  public ChatService(
      DialogueProvider provider, ChatContext context, @Value("${chat.timeout-ms}") long timeout) {
    this(provider, context, timeout, Clock.systemUTC()::millis);
  }

  ChatService(DialogueProvider provider, ChatContext context, long timeout, LongSupplier now) {
    this.provider = provider;
    this.context = context;
    this.timeout = timeout;
    this.now = now;
  }

  public boolean ready() {
    return provider.ready();
  }

  public String unavailableReason() {
    return provider.unavailableReason();
  }

  public String mode() {
    return provider.mode();
  }

  public ChatContracts.Reply generate(String session, ChatContracts.Request request) {
    String key = session + ":" + request.requestId();
    Cached entry;
    boolean owner = false;
    synchronized (this) {
      long time = now.getAsLong();
      cache.entrySet().removeIf(e -> e.getValue().expires < time && e.getValue().result.isDone());
      rates.values().forEach(v -> v.removeIf(t -> t <= time - 60_000));
      rates.values().removeIf(List::isEmpty);
      entry = cache.get(key);
      if (entry != null) {
        if (!entry.request.equals(request)) throw new ChatError(409, "같은 요청 번호의 내용이 달라졌어요.");
      } else {
        if (!provider.ready()) throw new ChatError(503, "AI 키가 설정되지 않았어요. 기존 선택형 질문은 사용할 수 있어요.");
        if (activeSessions.contains(session) || active >= 2)
          throw new ChatError(429, "답변을 기다리는 중이에요. 잠시 뒤 재시도해주세요.");
        List<Long> perSession = rates.computeIfAbsent(session, s -> new ArrayList<>());
        List<Long> global = rates.computeIfAbsent("global", s -> new ArrayList<>());
        if (perSession.size() >= 6 || global.size() >= 30 || cache.size() >= 500)
          throw new ChatError(429, "호출 한도에 도달했어요. 1분 뒤 재시도해주세요.");
        perSession.add(time);
        global.add(time);
        active++;
        activeSessions.add(session);
        entry = new Cached(request, time + 1_800_000, new CompletableFuture<>());
        cache.put(key, entry);
        owner = true;
      }
    }
    if (owner) {
      Future<String> job = null;
      try {
        String output;
        if (context.privateQuestion(request.text())) output = ChatContext.REFUSAL;
        else {
          job =
              workers.submit(
                  () ->
                      provider.generate(
                          context.instructions(request),
                          context.serialize(context.build(request))));
          output = job.get(timeout, TimeUnit.MILLISECONDS);
        }
        entry.result.complete(
            new ChatContracts.Reply(
                request.requestId(),
                request.characterId(),
                context.safeOutput(output),
                provider.mode()));
      } catch (Exception error) {
        if (job != null) job.cancel(true);
        Throwable cause = error instanceof ExecutionException ? error.getCause() : error;
        ChatError failure =
            cause instanceof ChatError known
                ? known
                : cause instanceof TimeoutException
                    ? new ChatError(504, "답변 시간이 초과됐어요. 같은 질문으로 재시도할 수 있어요.")
                    : new ChatError(502, "AI 연결에 실패했어요. 같은 질문으로 다시 시도해주세요.");
        if (error instanceof InterruptedException) Thread.currentThread().interrupt();
        synchronized (this) {
          cache.remove(key, entry);
        }
        entry.result.completeExceptionally(failure);
      } finally {
        synchronized (this) {
          active--;
          activeSessions.remove(session);
        }
      }
    }
    try {
      return entry.result.get(timeout + 1000, TimeUnit.MILLISECONDS);
    } catch (ExecutionException error) {
      if (error.getCause() instanceof ChatError known) throw known;
      throw new ChatError(502, "AI 연결에 실패했어요.");
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      throw new ChatError(502, "대화 요청이 중단됐어요.");
    } catch (TimeoutException error) {
      throw new ChatError(504, "답변 시간이 초과됐어요.");
    }
  }

  @PreDestroy
  public void close() {
    workers.shutdownNow();
  }

  private record Cached(
      ChatContracts.Request request, long expires, CompletableFuture<ChatContracts.Reply> result) {}
}
