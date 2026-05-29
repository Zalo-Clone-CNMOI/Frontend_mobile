# ADR-001: Mobile document Q&A is served by the Zai-chat RAG path; the dedicated `ai:document:query` socket endpoint is retired (unused by mobile)

- **Status:** Accepted
- **Date:** 2026-05-30
- **Deciders:** AI feature team
- **Related:** AI Feature Implementation Progress Report (FE Mobile vs `ai-core-service`), Issue #7
- **Location note:** Filed in the mobile FE repo because this is a mobile-client architecture decision. (The backend `docs/` directory is gitignored, so it could not live in the backend repo.)

## Context

The backend exposes **two parallel mechanisms** for "ask a question about a document":

1. **Dedicated document-query socket endpoint.**
   `ai:document:query:request` → Kafka `ai.document.query` → `ai:document:query:result`,
   returning `{ answer, sources[] }`. Backend wiring lives in
   `apps/ws-gateway/src/socket/chat.gateway.ts` (+ `ws-payload.dto.ts`),
   `libs/contracts` (`ws/events.ts`, `kafka/topics.ts`, `kafka/ai.events.ts`), and
   `apps/ai-core-service/src/modules/document/document.engine.ts`
   (consumed via `transport/ai.consumer.ts`, fanned out by ws-gateway
   `ai-fanout.consumer.ts`).

2. **Zai-chat RAG path.**
   A document-anchored Zai conversation → `ai.zai.chat.request` →
   `DocumentChatStrategy` (`apps/ai-core-service/src/modules/zai-chat/zai-chat.engine.ts`,
   `chat-strategy.ts`) → a streamed Zai assistant reply
   (`ai:stream:chunk` / `ai:stream:complete`).

The **mobile frontend (`Frontend_mobile`) never defines or emits the dedicated
`ai:document:query` events.** It performs document Q&A entirely through the
Zai-chat RAG path — the same streaming chat UI used for general Zai chat — by
anchoring a conversation to a document and chatting normally. The dedicated
endpoint is therefore **unconsumed by the mobile client**, while the RAG path is
the de-facto, shipping document-Q&A experience.

Maintaining two endpoints for the same capability is a source of drift: contract
changes must be mirrored in both, and a future contributor could wire the mobile
client to the dedicated endpoint by mistake, splitting the UX.

## Decision

- **Mobile document Q&A is served by the Zai-chat RAG path.** This is the single
  supported document-Q&A mechanism for the mobile client.
- The dedicated `ai:document:query` socket endpoint is **retired from the mobile
  product surface**: the mobile FE will not add events, types, a service, or a
  screen for it.
- The dedicated endpoint's **backend code is RETAINED, not deleted.** It may
  still serve other/future clients (e.g. a web client or an integration), and
  removing it is out of scope for the mobile AI-completion work. No backend code
  is changed by this decision.

## Rationale

- **One chat UX.** Document Q&A reuses the existing Zai streaming chat (typing
  indicator, token-by-token streaming, stop/cancel, history) instead of a
  separate request/response screen — less UI to build and maintain.
- **No parallel surface to keep in sync.** Building a second mobile path for the
  dedicated endpoint would duplicate the RAG experience and double the contract
  surface the mobile client depends on.
- **RAG path already ships.** The Zai-chat RAG path is implemented end to end and
  is what users already use; standardising on it matches reality.

## Consequences

- **Positive:** Single, already-working document-Q&A path on mobile; smaller
  mobile contract surface; no duplicate UI.
- **Neutral:** The dedicated `ai:document:query` endpoint remains in the backend
  but is unused by mobile. It continues to compile/run; it is simply not a mobile
  integration target.
- **Follow-up (out of scope here):** If no other client adopts the dedicated
  endpoint, consider deprecating and then removing it (events, DTOs, handler,
  consumer, fanout, `document.engine` query path) in a dedicated backend cleanup
  — tracked separately, not part of the mobile AI-completion effort.

## Alternatives considered

- **Build a parallel mobile UI for `ai:document:query`.** Rejected: duplicates
  the RAG chat experience, adds a second contract dependency, and offers no user
  benefit over in-conversation RAG chat.
- **Delete the dedicated endpoint now.** Rejected for this change: it may serve
  non-mobile clients and deleting backend code is outside the mobile-completion
  scope. Captured as a possible future cleanup above.
