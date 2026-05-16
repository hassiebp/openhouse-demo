"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { AnimationEvent, FormEvent, KeyboardEvent } from "react";
import { useState } from "react";
import styles from "./chat.module.css";

type WelcomeState = "visible" | "exiting" | "gone";

export function Chat() {
  const [input, setInput] = useState("");
  const [welcomeState, setWelcomeState] = useState<WelcomeState>("visible");
  const { error, messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    submitMessage();
  }

  function dismissWelcome() {
    setWelcomeState((current) =>
      current === "visible" ? "exiting" : current,
    );
  }

  function handleWelcomeAnimationEnd(event: AnimationEvent<HTMLHeadingElement>) {
    if (event.animationName !== "welcomeOut" || welcomeState !== "exiting") {
      return;
    }

    setWelcomeState("gone");
  }

  function submitMessage() {
    const text = input.trim();
    if (!text || isBusy) {
      return;
    }

    if (messages.length === 0) {
      dismissWelcome();
    }

    sendMessage({ text });
    setInput("");
  }

  return (
    <section className={styles.shell} aria-label="Chat">
      <div className={styles.messages}>
        {welcomeState !== "gone" ? (
          <h1
            aria-hidden={welcomeState === "exiting"}
            className={`${styles.welcome} ${
              welcomeState === "exiting" ? styles.welcomeExiting : ""
            }`}
            onAnimationEnd={handleWelcomeAnimationEnd}
          >
            Welcome to the Open House 2026 Conference.
          </h1>
        ) : null}

        {messages.map((message) => (
          <article
            className={`${styles.message} ${styles[message.role]}`}
            key={message.id}
          >
            <span>{message.role === "user" ? "You" : "Assistant"}</span>
            {message.parts.map((part, index) =>
              part.type === "text" ? <p key={index}>{part.text}</p> : null,
            )}
          </article>
        ))}
      </div>

      {error ? <p className={styles.error}>{error.message}</p> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <textarea
          aria-label="Message"
          disabled={isBusy}
          onKeyDown={handleKeyDown}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Message the assistant..."
          rows={1}
          value={input}
        />
        <button disabled={isBusy || input.trim().length === 0} type="submit">
          {isBusy ? "Thinking" : "Send"}
        </button>
      </form>
    </section>
  );
}
