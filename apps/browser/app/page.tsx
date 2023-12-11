"use client";

import { v4 as uuid } from "uuid";
import Chat, { ChatMessage } from "@/components/Chat";
import { examplePrompts } from "@/lib/examplePrompts";
import { useCheckForUserFiles } from "@/lib/hooks/useCheckForUserFiles";
import { useEvo } from "@/lib/hooks/useEvo";
import { useHandleAuth } from "@/lib/hooks/useHandleAuth";
import { useAddChatLog } from "@/lib/mutations/useAddChatLog";
import { useAddMessages } from "@/lib/mutations/useAddMessages";
import { useAddVariable } from "@/lib/mutations/useAddVariable";
import { useCreateChat } from "@/lib/mutations/useCreateChat";
import { useChats } from "@/lib/queries/useChats";
import { ChatLogType, ChatMessage as AgentMessage } from "@evo-ninja/agents";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { SupabaseBucketWorkspace } from "@/lib/supabase/SupabaseBucketWorkspace";
import { createSupabaseClient } from "@/lib/supabase/supabase";
import { useAtom } from "jotai";
import { userWorkspaceAtom } from "@/lib/store";

function Dojo() {
  const { mutateAsync: createChat } = useCreateChat()
  const { mutateAsync: addMessages } = useAddMessages()
  const { mutateAsync: addChatLog } = useAddChatLog()
  const { mutateAsync: addVariable } = useAddVariable()
  const checkForUserFiles = useCheckForUserFiles();

  const { status: sessionStatus, data: session } = useSession()
  const { data: chats } = useChats()

  const chatIdRef = useRef<string | undefined>()
  const inMemoryLogsRef = useRef<ChatMessage[]>([])
  const [, setUserWorkspace] = useAtom(userWorkspaceAtom);

  const [inMemoryLogs, setInMemoryLogs] = useState<ChatMessage[]>([])
  
  const isAuthenticatedRef = useRef<boolean>(false);
  const currentChat = chats?.find(c => c.id === chatIdRef.current)
  const logs = currentChat?.logs ?? []
  const logsToShow = isAuthenticatedRef.current ? logs : inMemoryLogs;

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      isAuthenticatedRef.current = true
    }
  }, [sessionStatus])

   useEffect(() => {
    if (session?.supabaseAccessToken && chatIdRef.current) {
      const { storage } = createSupabaseClient(session.supabaseAccessToken)
      const supabaseWorkspace = new SupabaseBucketWorkspace(storage, chatIdRef.current)
      setUserWorkspace(supabaseWorkspace)
    }
  }, [chatIdRef.current])

  const onMessagesAdded = async (type: ChatLogType, messages: AgentMessage[]) => {
    if (!isAuthenticatedRef.current) {
      return;
    }

    if (!chatIdRef.current) {
      throw new Error("No ChatID to add messages")
    }

    await addMessages({
      chatId: chatIdRef.current,
      messages,
      type
    })
  }

  const onVariableSet = async (key: string, value: string) => {
    if (!isAuthenticatedRef.current) {
      return;
    }

    if (!chatIdRef.current) {
      throw new Error("No ChatID to add variable")
    }

    await addVariable({
      chatId: chatIdRef.current,
      key,
      value
    })
  }

  const onChatLog = async (log: ChatMessage) => {
    checkForUserFiles();

    if (!isAuthenticatedRef.current) {
      inMemoryLogsRef.current = [...inMemoryLogsRef.current, log]
      setInMemoryLogs(inMemoryLogsRef.current)
      return;
    }

    if (!chatIdRef.current) {
      throw new Error("No ChatID to add chat log")
    }

    await addChatLog({ chatId: chatIdRef.current, log })
  }

  const {
    isRunning,
    isPaused,
    isSending,
    isStopped,
    start,
    onContinue,
    onPause,
    setIsSending,
  } = useEvo({
    onChatLog,
    onMessagesAdded,
    onVariableSet
  });
  const { handlePromptAuth } = useHandleAuth();

  const handleSend = async (newMessage: string) => {
    if (!newMessage) return;
    const authorized = await handlePromptAuth(newMessage);

    if (!authorized) {
      return;
    }

    if (!currentChat?.messages.length && isAuthenticatedRef.current) {
      const chatId = uuid()
      const createdChat = await createChat(chatId)

      if (!createdChat) {
        return;
      }

      chatIdRef.current = createdChat.id
    }
    await onChatLog({
      title: newMessage,
      user: "user",
    });

    setIsSending(true);
    start(newMessage);
  };

  return (
    <Chat
      messages={logsToShow}
      samplePrompts={logsToShow.length ? undefined: examplePrompts}
      isPaused={isPaused}
      isRunning={isRunning}
      isSending={isSending}
      isStopped={isStopped}
      onPromptSent={handleSend}
      onPause={onPause}
      onContinue={onContinue}
    />
  );
}

export default Dojo;
