import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { eventService } from "../../services";
import api from "../../api/axios";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Button, TextArea, Spinner, Avatar } from "@radix-ui/themes";
import { io } from "socket.io-client";
import { PaperPlaneIcon, ChatBubbleIcon, HeartFilledIcon, DrawingPinIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TYPING_DEBOUNCE_MS = 500;

const DiscussionForum = ({ eventId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [online, setOnline] = useState([]);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await eventService.getForumMessages(eventId);
      setMessages(Array.isArray(res.messages) ? res.messages : []);
    } catch (e) {
      console.error(e);
      toast.error("Unable to load discussion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const s = io(socketUrl, { query: { user: JSON.stringify(user) } });
    socketRef.current = s;
    s.emit("joinEvent", eventId);

    s.on("newMessage", m => {
      setMessages(prev => [...prev, m]);
      if (m.userId?._id !== user?._id) {
        toast.info("New forum message");
      }
    });
    s.on("messageDeleted", ({ _id }) => {
      setMessages(prev => prev.filter(m => m._id !== _id));
    });
    s.on("messagePinned", data => {
      setMessages(prev => prev.map(m => m._id === data._id ? { ...m, pinned: data.pinned } : m));
    });
    s.on("messageReacted", m => {
      setMessages(prev => prev.map(x => x._id === m._id ? m : x));
    });
    s.on("userTyping", ({ user: u }) => {
      if (u && u._id !== user?._id) {
        setTypingUsers(prev => prev.some(x => x._id === u._id) ? prev : [...prev, u]);
      }
    });
    s.on("userStopTyping", ({ user: u }) => {
      setTypingUsers(prev => prev.filter(x => x._id !== u?._id));
    });
    s.on("onlineUsers", list => {
      setOnline(list);
    });

    return () => {
      s.emit("stopTyping", { eventId });
      s.emit("leaveEvent", eventId);
      s.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [eventId, user]);

  const sendMessage = async () => {
    if (!input.trim() && !attachmentUrl) return;
    try {
      await eventService.postForumMessage(eventId, { content: input, attachmentUrl });
      setInput("");
      setAttachmentUrl("");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socketRef.current.emit("stopTyping", { eventId });
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not send message");
    }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socketRef.current.emit("typing", { eventId });
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit("stopTyping", { eventId });
      }, TYPING_DEBOUNCE_MS);
    }
  };

  const toggleReaction = async (msgId, emoji) => {
    try {
      await eventService.reactForumMessage(eventId, msgId, emoji);
    } catch (e) { console.error(e); }
  };

  const pinMessage = async msgId => {
    try { await eventService.pinForumMessage(eventId, msgId); }
    catch (e) { console.error(e); }
  };

  const deleteMessage = async msgId => {
    if (!window.confirm("Delete this message?")) return;
    try { await eventService.deleteForumMessage(eventId, msgId); }
    catch (e) { console.error(e); }
  };

  const renderMessage = useCallback((m, indent = 0) => {
    const isMine = m.userId?._id === user?._id;
    return (
      <Box key={m._id} style={{ marginLeft: indent * 20, marginBottom: 12 }}>
        <Flex align="center" gap="2">
          <Avatar
            size="2"
            fallback={m.userId?.firstName?.charAt(0) || "U"}
            radius="full"
          />
          <Text weight="medium">{m.userId?.firstName} {m.userId?.lastName}</Text>
          <Text size="1" color="gray">{format(new Date(m.createdAt), "h:mm a")}</Text>
          {m.pinned && <DrawingPinIcon width={14} height={14} color="var(--yellow-9)" />}
          {user?.role === "organizer" && (
            <Button size="1" variant="ghost" onClick={() => pinMessage(m._id)}>
              <DrawingPinIcon width={14} height={14} />
            </Button>
          )}
        </Flex>
        {m.content && <Text style={{ whiteSpace: "pre-wrap", marginLeft: 26 }}>{m.content}</Text>}
        {m.attachmentUrl && (
          <Box mt="2">
            <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">Attachment</a>
          </Box>
        )}
        <Flex gap="2" mt="2" style={{ marginLeft: 26 }}>
          <Button size="1" variant="ghost" onClick={() => toggleReaction(m._id, "👍")}>
            <HeartFilledIcon width={12} height={12} />
          </Button>
          {m.reactions && m.reactions.length > 0 && (
            <Text size="1" color="gray">{m.reactions.length}</Text>
          )}
          <Button size="1" variant="ghost" onClick={() => setInput(prev => prev + `@${m.userId?.firstName} `)}>
            Reply
          </Button>
          {isMine && (
            <Button size="1" variant="ghost" color="red" onClick={() => deleteMessage(m._id)}>
              Delete
            </Button>
          )}
        </Flex>
        {/* Render replies */}
        {messages.filter(x => x.parentId === m._id).map(child => renderMessage(child, indent + 1))}
      </Box>
    );
  }, [messages, user]);

  return (
    <Card mt="6" p="4">
      <Flex justify="between" align="center" mb="3">
        <Flex align="center" gap="2">
          <ChatBubbleIcon />
          <Text size="5" weight="bold">Discussion</Text>
        </Flex>
        <Text size="1" color="gray">Online: {online.length}</Text>
      </Flex>

      {loading ? (
        <Flex align="center" justify="center"><Spinner size="2" /></Flex>
      ) : (
        <Box style={{ maxHeight: 400, overflowY: "auto" }}>
          {messages.filter(m => m.pinned && !m.parentId).map(m => renderMessage(m))}
          {messages.filter(m => !m.pinned && !m.parentId).map(m => renderMessage(m))}
        </Box>
      )}

      {typingUsers.length > 0 && (
        <Text size="1" color="gray">{typingUsers.map(u => u.firstName).join(", ")} typing...</Text>
      )}

      <Box mt="3">
        <TextArea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Write a message... (Shift+Enter for newline)"
          rows={2}
          onKeyDown={handleKeyDown}
        />
        <Flex align="center" gap="2" mt="2">
          <input
            type="file"
            style={{ flex: 1 }}
            onChange={async e => {
              const file = e.target.files[0];
              if (!file) return;
              setUploadingFile(true);
              const fd = new FormData();
              fd.append("file", file);
              try {
                const r = await api.post("/upload", fd);
                if (r.data?.url) {
                  setAttachmentUrl(r.data.url);
                  toast.success("Attachment uploaded");
                }
              } catch (err) {
                console.error(err);
                toast.error("Upload failed");
              } finally {
                setUploadingFile(false);
              }
            }}
          />
          {uploadingFile && <Spinner size="1" />}
        </Flex>
        {attachmentUrl && <Text size="1" color="gray" mt="1">Attachment ready</Text>}
        <Flex justify="end" mt="2">
          <Button
            size="2"
            onClick={sendMessage}
            disabled={!(input.trim() || attachmentUrl)}
          >
            <PaperPlaneIcon width={16} height={16} />
          </Button>
        </Flex>
      </Box>
    </Card>
  );
};

export default DiscussionForum;