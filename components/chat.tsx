"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { AnimationEvent, FormEvent, KeyboardEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import styles from "./chat.module.css";

type WelcomeState = "visible" | "exiting" | "gone";
type StoredChat = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
};

type StoredChatState = {
  version: 1;
  activeChatId: string;
  chats: StoredChat[];
};

const CHAT_STORAGE_KEY = "open-house.chats.v1";
const CHAT_STORAGE_EVENT = "open-house.chats.change";
const HYDRATION_CHAT_STATE: StoredChatState = {
  version: 1,
  activeChatId: "initial-chat",
  chats: [
    {
      id: "initial-chat",
      title: "New chat",
      createdAt: "",
      updatedAt: "",
      messages: [],
    },
  ],
};
let lastRawChatState: string | null = null;
let lastChatStateSnapshot = HYDRATION_CHAT_STATE;

function createChat(): StoredChat {
  const now = new Date().toISOString();

  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `chat-${Date.now()}`,
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function parseStoredChatState(rawState: string | null): StoredChatState | null {
  if (!rawState) {
    return null;
  }

  try {
    const state = JSON.parse(rawState) as StoredChatState;

    if (
      state.version !== 1 ||
      !Array.isArray(state.chats) ||
      state.chats.length === 0
    ) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

function getStoredChatSnapshot() {
  const rawState = window.localStorage.getItem(CHAT_STORAGE_KEY);

  if (rawState === lastRawChatState) {
    return lastChatStateSnapshot;
  }

  lastRawChatState = rawState;
  lastChatStateSnapshot =
    parseStoredChatState(rawState) ?? HYDRATION_CHAT_STATE;

  return lastChatStateSnapshot;
}

function getServerChatSnapshot() {
  return HYDRATION_CHAT_STATE;
}

function subscribeToStoredChatState(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHAT_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHAT_STORAGE_EVENT, onStoreChange);
  };
}

function subscribeToHydration() {
  return () => {};
}

function getHydratedSnapshot() {
  return true;
}

function getServerHydratedSnapshot() {
  return false;
}

function writeStoredChatState(state: StoredChatState) {
  const rawState = JSON.stringify(state);

  lastRawChatState = rawState;
  lastChatStateSnapshot = state;

  window.localStorage.setItem(CHAT_STORAGE_KEY, rawState);
  window.dispatchEvent(new Event(CHAT_STORAGE_EVENT));
}

function getMessageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

function createTitle(messages: UIMessage[]) {
  const firstUserText = messages
    .filter((message) => message.role === "user")
    .map(getMessageText)
    .find(Boolean);

  if (!firstUserText) {
    return "New chat";
  }

  const title = firstUserText.replace(/\s+/g, " ");
  return title.length > 48 ? `${title.slice(0, 45)}...` : title;
}

export function Chat() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const chatState = useSyncExternalStore(
    subscribeToStoredChatState,
    getStoredChatSnapshot,
    getServerChatSnapshot,
  );
  const [isActiveChatBusy, setIsActiveChatBusy] = useState(false);
  const activeChat =
    chatState.chats.find((chat) => chat.id === chatState.activeChatId) ??
    chatState.chats[0];

  const updateChatState = useCallback(
    (update: (current: StoredChatState) => StoredChatState) => {
      if (!isHydrated) {
        return;
      }

      writeStoredChatState(update(getStoredChatSnapshot()));
    },
    [isHydrated],
  );

  const createNewChat = useCallback(() => {
    if (isActiveChatBusy) {
      return;
    }

    const chat = createChat();
    updateChatState((current) => ({
      ...current,
      activeChatId: chat.id,
      chats: [chat, ...current.chats],
    }));
  }, [isActiveChatBusy, updateChatState]);

  const selectChat = useCallback(
    (chatId: string) => {
      if (isActiveChatBusy) {
        return;
      }

      updateChatState((current) => ({
        ...current,
        activeChatId: chatId,
      }));
    },
    [isActiveChatBusy, updateChatState],
  );

  const deleteChat = useCallback(
    (chatId: string) => {
      if (isActiveChatBusy) {
        return;
      }

      updateChatState((current) => {
        const chatIndex = current.chats.findIndex((chat) => chat.id === chatId);
        if (chatIndex === -1) {
          return current;
        }

        const remainingChats = current.chats.filter(
          (chat) => chat.id !== chatId,
        );

        if (remainingChats.length === 0) {
          const chat = createChat();

          return {
            ...current,
            activeChatId: chat.id,
            chats: [chat],
          };
        }

        const nextActiveChatId =
          current.activeChatId === chatId
            ? remainingChats[Math.min(chatIndex, remainingChats.length - 1)].id
            : current.activeChatId;

        return {
          ...current,
          activeChatId: nextActiveChatId,
          chats: remainingChats,
        };
      });
    },
    [isActiveChatBusy, updateChatState],
  );

  const updateChatMessages = useCallback(
    (chatId: string, messages: UIMessage[]) => {
      updateChatState((current) => ({
        ...current,
        chats: current.chats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                title: createTitle(messages),
                updatedAt: new Date().toISOString(),
                messages,
              }
            : chat,
        ),
      }));
    },
    [updateChatState],
  );

  return (
    <section className={styles.workspace} aria-label="Chat workspace">
      <aside className={styles.sidebar} aria-label="Chats">
        <div className={styles.sidebarHeader}>
          <h2>Chats</h2>
          <div className={styles.sidebarActions}>
            <button
              aria-label="New chat"
              className={styles.newChatButton}
              disabled={isActiveChatBusy}
              onClick={createNewChat}
              type="button"
            >
              <span aria-hidden="true">+</span>
              New Chat
            </button>
          </div>
        </div>

        <nav className={styles.chatList} aria-label="Saved chats">
          {chatState.chats.map((chat) => (
            <div className={styles.chatItem} key={chat.id}>
              <button
                aria-current={chat.id === activeChat.id ? "page" : undefined}
                className={styles.chatTab}
                disabled={isActiveChatBusy && chat.id !== activeChat.id}
                onClick={() => selectChat(chat.id)}
                type="button"
              >
                <span className={styles.chatTitle}>{chat.title}</span>
              </button>
              <button
                aria-label={`Delete ${chat.title}`}
                className={styles.deleteChatButton}
                disabled={isActiveChatBusy}
                onClick={() => deleteChat(chat.id)}
                type="button"
              >
                x
              </button>
            </div>
          ))}
        </nav>
      </aside>

      <ChatThread
        chat={activeChat}
        key={activeChat.id}
        onBusyChange={setIsActiveChatBusy}
        onMessagesChange={updateChatMessages}
      />
    </section>
  );
}

function ChatThread({
  chat,
  onBusyChange,
  onMessagesChange,
}: {
  chat: StoredChat;
  onBusyChange: (isBusy: boolean) => void;
  onMessagesChange: (chatId: string, messages: UIMessage[]) => void;
}) {
  const [input, setInput] = useState("");
  const [welcomeState, setWelcomeState] = useState<WelcomeState>(() =>
    chat.messages.length === 0 ? "visible" : "gone",
  );
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [],
  );
  const { error, messages, sendMessage, status } = useChat({
    id: chat.id,
    messages: chat.messages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    onBusyChange(isBusy);
  }, [isBusy, onBusyChange]);

  useEffect(() => {
    onMessagesChange(chat.id, messages);
  }, [chat.id, messages, onMessagesChange]);

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
    setWelcomeState((current) => (current === "visible" ? "exiting" : current));
  }

  function handleWelcomeAnimationEnd(
    event: AnimationEvent<HTMLHeadingElement>,
  ) {
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
      <div className={styles.tracesFooter}>
        <a
          className={styles.tracesLink}
          href="https://cloud.langfuse.com/project/clkpwwm0m000gmm094odg11gi/traces?filter=traceName%3BstringOptions%3B%3Bany+of%3BOpenHouse-Itinerary-Agent"
          target="_blank"
          rel="noopener noreferrer"
        >
          View traces in Langfuse →
        </a>
      </div>
    </section>
  );
}
