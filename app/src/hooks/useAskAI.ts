import { useNavigate } from "react-router-dom";
import { useChat } from "../store/chat";

/** Abre uma conversa nova já com a pergunta enviada, para a IA explicar o passo a passo. */
export function useAskAI() {
  const navigate = useNavigate();
  return (prompt: string) => {
    const chat = useChat.getState();
    chat.newChat();
    chat.send(prompt);
    navigate("/");
  };
}
