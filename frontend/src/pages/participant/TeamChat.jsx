import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Flex, Text, Heading, Button, TextField, Spinner, IconButton, Avatar } from "@radix-ui/themes";
import { PaperPlaneIcon, ArrowLeftIcon, PersonIcon, Pencil1Icon, TrashIcon, CheckIcon, Cross2Icon, Link2Icon } from "@radix-ui/react-icons";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import teamChatService from "../../services/teamChatService";
import teamService from "../../services/teamService";
import { format } from "date-fns";

const TeamChat = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [team, setTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
    
    // Start polling for new messages and status updates
    pollIntervalRef.current = setInterval(() => {
      fetchNewMessages();
      fetchOnlineStatus();
    }, 3000);

    // Set online status
    teamChatService.updateOnlineStatus(teamId, true);

    return () => {
      // Cleanup
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      teamChatService.updateOnlineStatus(teamId, false);
    };
  }, [teamId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [teamRes, messagesRes] = await Promise.all([
        teamService.getTeam(teamId),
        teamChatService.getMessages(teamId),
      ]);
      
      setTeam(teamRes.data.team);
      setMessages(messagesRes.data.messages || []);
      
      // Mark as read
      teamChatService.markAsRead(teamId);
    } catch (error) {
      toast.error("Failed to load chat");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNewMessages = async () => {
    try {
      const res = await teamChatService.getMessages(teamId, { limit: 50 });
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const fetchOnlineStatus = async () => {
    try {
      const [onlineRes, typingRes] = await Promise.all([
        teamChatService.getOnlineUsers(teamId),
        teamChatService.getTypingUsers(teamId),
      ]);
      setOnlineUsers(onlineRes.data.onlineUsers || []);
      setTypingUsers(typingRes.data.typingUsers || []);
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTyping = () => {
    teamChatService.updateTypingStatus(teamId, true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      teamChatService.updateTypingStatus(teamId, false);
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      teamChatService.updateTypingStatus(teamId, false);
      
      await teamChatService.sendMessage(teamId, newMessage);
      setNewMessage("");
      inputRef.current?.focus();
      
      fetchNewMessages();
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSendLink = async () => {
    if (!linkUrl.trim()) return;

    try {
      setSending(true);
      await teamChatService.sendMessage(teamId, linkUrl.trim(), "link");
      setLinkUrl("");
      setShowLinkInput(false);
      fetchNewMessages();
    } catch (error) {
      toast.error("Failed to share link");
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId) => {
    if (!editContent.trim()) {
      setEditingMessage(null);
      return;
    }

    try {
      await teamChatService.editMessage(teamId, messageId, editContent);
      setEditingMessage(null);
      setEditContent("");
      fetchNewMessages();
    } catch (error) {
      toast.error("Failed to edit message");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Delete this message?")) return;

    try {
      await teamChatService.deleteMessage(teamId, messageId);
      fetchNewMessages();
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const startEditing = (message) => {
    setEditingMessage(message._id);
    setEditContent(message.content);
  };

  if (loading) {
    return (
      <Box style={{ minHeight: "100vh", background: "var(--gray-1)" }}>
        <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
          <Spinner size="3" />
        </Flex>
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: "100vh", background: "var(--gray-2)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box style={{ background: "var(--gray-1)", borderBottom: "1px solid var(--gray-5)" }} px="4" py="3">
        <Flex justify="between" align="center" style={{ maxWidth: 896, margin: "0 auto" }}>
          <Flex align="center" gap="3">
            <IconButton variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeftIcon />
            </IconButton>
            <Box>
              <Heading size="4">{team?.name} Chat</Heading>
              <Flex align="center" gap="2">
                <PersonIcon width="12" height="12" />
                <Text size="1" color="gray">{team?.members?.length || 0} members</Text>
                <Text size="1" color="gray">•</Text>
                <Text size="1" color="green">{onlineUsers.length} online</Text>
              </Flex>
            </Box>
          </Flex>
          
          {/* Online Users */}
          <Flex style={{ marginLeft: "-8px" }}>
            {team?.members?.slice(0, 5).map((member, index) => {
              const isOnline = onlineUsers.some(
                (u) => u.toString() === member.user?._id?.toString()
              );
              return (
                <Box key={member.user?._id || index} style={{ position: "relative", marginLeft: -8 }} title={member.user?.name}>
                  <Avatar
                    size="2"
                    fallback={member.user?.name?.charAt(0) || "?"}
                    style={{ border: "2px solid var(--gray-1)" }}
                  />
                  <Box
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: isOnline ? "var(--green-9)" : "var(--gray-8)",
                      border: "2px solid var(--gray-1)"
                    }}
                  />
                </Box>
              );
            })}
          </Flex>
        </Flex>
      </Box>

      {/* Messages */}
      <Box style={{ flex: 1, overflowY: "auto" }} p="4">
        <Flex direction="column" gap="3" style={{ maxWidth: 896, margin: "0 auto" }}>
          {messages.length === 0 ? (
            <Box py="8" style={{ textAlign: "center" }}>
              <Text size="4" color="gray">No messages yet</Text>
              <Text size="2" color="gray">Be the first to say hello! 👋</Text>
            </Box>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender?._id === user?.id;
              const isEditing = editingMessage === message._id;

              return (
                <Flex key={message._id} justify={isOwn ? "end" : "start"}>
                  <Box style={{ maxWidth: "70%" }}>
                    {!isOwn && (
                      <Text size="1" color="gray" mb="1" ml="2">{message.sender?.name}</Text>
                    )}
                    
                    <Box
                      style={{
                        position: "relative",
                        background: isOwn ? "var(--indigo-9)" : "var(--gray-4)",
                        color: isOwn ? "white" : "var(--gray-12)",
                        borderRadius: 16,
                        borderBottomRightRadius: isOwn ? 4 : 16,
                        borderBottomLeftRadius: isOwn ? 16 : 4,
                        padding: "8px 16px"
                      }}
                    >
                      {isEditing ? (
                        <Flex align="center" gap="2">
                          <TextField.Root
                            size="1"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            autoFocus
                          />
                          <IconButton size="1" variant="ghost" color="green" onClick={() => handleEditMessage(message._id)}>
                            <CheckIcon />
                          </IconButton>
                          <IconButton size="1" variant="ghost" color="red" onClick={() => setEditingMessage(null)}>
                            <Cross2Icon />
                          </IconButton>
                        </Flex>
                      ) : (
                        <>
                          {message.messageType === "link" ? (
                            <a
                              href={message.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: isOwn ? "#c7d2fe" : "var(--blue-11)", textDecoration: "underline", wordBreak: "break-all" }}
                            >
                              <Flex align="center" gap="1">
                                <Link2Icon width="14" height="14" />
                                <Text>{message.content}</Text>
                              </Flex>
                            </a>
                          ) : (
                            <Text style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {message.content}
                            </Text>
                          )}
                          {message.isEdited && (
                            <Text size="1" style={{ opacity: 0.6, marginLeft: 4 }}>(edited)</Text>
                          )}
                          
                          {isOwn && (
                            <Flex gap="1" style={{ position: "absolute", left: -56, top: "50%", transform: "translateY(-50%)", opacity: 0 }} className="message-actions">
                              <IconButton size="1" variant="ghost" onClick={() => startEditing(message)}>
                                <Pencil1Icon width="12" height="12" />
                              </IconButton>
                              <IconButton size="1" variant="ghost" color="red" onClick={() => handleDeleteMessage(message._id)}>
                                <TrashIcon width="12" height="12" />
                              </IconButton>
                            </Flex>
                          )}
                        </>
                      )}
                    </Box>
                    
                    <Text size="1" color="gray" mt="1" style={{ textAlign: isOwn ? "right" : "left", padding: "0 8px" }}>
                      {format(new Date(message.createdAt), "HH:mm")}
                    </Text>
                  </Box>
                </Flex>
              );
            })
          )}
          
          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <Flex align="center" gap="2">
              <Flex gap="1">
                <Box style={{ width: 8, height: 8, background: "var(--gray-8)", borderRadius: "50%", animation: "bounce 1s infinite" }} />
                <Box style={{ width: 8, height: 8, background: "var(--gray-8)", borderRadius: "50%", animation: "bounce 1s infinite 0.15s" }} />
                <Box style={{ width: 8, height: 8, background: "var(--gray-8)", borderRadius: "50%", animation: "bounce 1s infinite 0.3s" }} />
              </Flex>
              <Text size="2" color="gray">
                {typingUsers.length === 1 ? "Someone is" : "People are"} typing...
              </Text>
            </Flex>
          )}
          
          <div ref={messagesEndRef} />
        </Flex>
      </Box>

      {/* Message Input */}
      <Box style={{ background: "var(--gray-1)", borderTop: "1px solid var(--gray-5)" }} p="4">
        {showLinkInput && (
          <Flex gap="2" align="center" mb="2" style={{ maxWidth: 896, margin: "0 auto" }}>
            <TextField.Root
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Paste a link URL..."
              size="2"
              style={{ flex: 1 }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendLink();
                if (e.key === "Escape") { setShowLinkInput(false); setLinkUrl(""); }
              }}
            />
            <Button size="2" onClick={handleSendLink} disabled={!linkUrl.trim() || sending}>
              Share
            </Button>
            <IconButton size="2" variant="ghost" onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}>
              <Cross2Icon />
            </IconButton>
          </Flex>
        )}
        <form onSubmit={handleSendMessage}>
          <Flex gap="3" align="center" style={{ maxWidth: 896, margin: "0 auto" }}>
            <IconButton
              type="button"
              variant="ghost"
              size="3"
              onClick={() => setShowLinkInput(!showLinkInput)}
              title="Share a link"
              style={{ borderRadius: "50%" }}
            >
              <Link2Icon width="18" height="18" />
            </IconButton>
            <TextField.Root
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type a message..."
              size="3"
              style={{ flex: 1, borderRadius: 9999 }}
            />
            <Button 
              type="submit" 
              disabled={sending || !newMessage.trim()}
              style={{ borderRadius: "50%", width: 44, height: 44 }}
            >
              {sending ? <Spinner size="1" /> : <PaperPlaneIcon />}
            </Button>
          </Flex>
        </form>
      </Box>
    </Box>
  );
};

export default TeamChat;
