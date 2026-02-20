import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import teamChatService from "../../services/teamChatService";
import teamService from "../../services/teamService";
import { Box, Card, Flex, Text, Button, Heading, Spinner, TextField, Badge, IconButton, Dialog, DropdownMenu } from "@radix-ui/themes";
import { PaperPlaneIcon, Pencil1Icon, TrashIcon, Link2Icon, DotsVerticalIcon, CheckIcon, Cross2Icon, PersonIcon } from "@radix-ui/react-icons";

const TeamChat = () => {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const typingRef = useRef(null);
  const pollRef = useRef(null);
  const userId = JSON.parse(localStorage.getItem("user") || "{}")._id;

  const dn = u => u?.name || u?.user?.name || "User";

  const fetchTeam = useCallback(async () => { try { const r = await teamService.getTeam(teamId); setTeam(r.data.team); } catch { toast.error("Failed to load team"); } }, [teamId]);

  const fetchMessages = useCallback(async () => {
    try {
      const r = await teamChatService.getMessages(teamId);
      setMessages(r.data.messages || []);
      setOnlineUsers(r.data.onlineUsers || []);
      setTypingUsers(r.data.typingUsers || []);
    } catch {}
  }, [teamId]);

  useEffect(() => {
    (async () => { setLoading(true); await Promise.all([fetchTeam(), fetchMessages()]); setLoading(false); })();
    pollRef.current = setInterval(fetchMessages, 3000);
    const ping = setInterval(() => { teamChatService.updateOnlineStatus(teamId, true).catch(() => {}); }, 15000);
    teamChatService.updateOnlineStatus(teamId, true).catch(() => {});
    return () => { clearInterval(pollRef.current); clearInterval(ping); teamChatService.updateOnlineStatus(teamId, false).catch(() => {}); };
  }, [teamId, fetchTeam, fetchMessages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleTyping = () => {
    teamChatService.updateTypingStatus(teamId, true).catch(() => {});
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => teamChatService.updateTypingStatus(teamId, false).catch(() => {}), 2000);
  };

  const send = async (e) => {
    e.preventDefault(); if (!msg.trim()) return;
    try { setSending(true); await teamChatService.sendMessage(teamId, msg, "text"); setMsg(""); fetchMessages(); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to send"); } finally { setSending(false); }
  };

  const sendLink = async (e) => {
    e.preventDefault(); if (!linkUrl.trim()) return;
    try { await teamChatService.sendMessage(teamId, linkTitle || linkUrl, "link"); setLinkOpen(false); setLinkUrl(""); setLinkTitle(""); fetchMessages(); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to send link"); }
  };

  const startEdit = m => { setEditId(m._id); setEditText(m.content); };
  const cancelEdit = () => { setEditId(null); setEditText(""); };
  const saveEdit = async () => {
    if (!editText.trim()) return;
    try { await teamChatService.editMessage(teamId, editId, editText); cancelEdit(); fetchMessages(); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to edit"); }
  };
  const deleteMsg = async (id) => {
    if (!window.confirm("Delete this message?")) return;
    try { await teamChatService.deleteMessage(teamId, id); fetchMessages(); } catch { toast.error("Failed to delete"); }
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }}><Spinner size="3" /></Flex>;

  const isOnline = uid => onlineUsers.some(u => (u._id || u) === uid);
  const typing = typingUsers.filter(u => (u._id || u) !== userId);

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }} py="4">
      <Box style={{ maxWidth: 896, margin: "0 auto", height: "calc(100vh - 120px)" }} px="4">
        <Card mb="3"><Flex justify="between" align="center">
          <Box><Heading size="5">{team?.name || "Team Chat"}</Heading><Text size="2" color="gray">{onlineUsers.length} online</Text></Box>
          <Flex gap="1">{team?.members?.slice(0, 5).map((m, i) => <Box key={m.user?._id || i} title={dn(m)} style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: isOnline(m.user?._id) ? "var(--green-9)" : "var(--gray-8)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 14, position: "relative" }}>{dn(m).charAt(0)}</Box>)}</Flex>
        </Flex></Card>

        <Card style={{ height: "calc(100% - 140px)", display: "flex", flexDirection: "column" }}>
          <Box style={{ flex: 1, overflow: "auto", padding: 16 }}>
            {messages.length === 0 ? <Flex align="center" justify="center" style={{ height: "100%" }}><Text color="gray">No messages yet. Start the conversation!</Text></Flex>
            : messages.map(m => {
              const mine = (m.sender?._id || m.sender) === userId;
              return <Flex key={m._id} justify={mine ? "end" : "start"} mb="3">
                {!mine && <Flex align="center" justify="center" style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "var(--blue-9)", color: "white", fontSize: 12, flexShrink: 0, marginRight: 8, marginTop: 4 }}>{dn(m.sender).charAt(0)}</Flex>}
                <Box style={{ maxWidth: "70%", position: "relative" }}>
                  {!mine && <Text size="1" color="gray" mb="1" style={{ display: "block" }}>{dn(m.sender)}</Text>}
                  <Card variant={mine ? "classic" : "surface"} style={{ backgroundColor: mine ? "var(--blue-9)" : undefined, color: mine ? "white" : undefined }}>
                    {editId === m._id ? <Flex gap="2"><TextField.Root value={editText} onChange={e => setEditText(e.target.value)} size="1" style={{ flex: 1 }} /><IconButton size="1" onClick={saveEdit}><CheckIcon /></IconButton><IconButton size="1" variant="ghost" onClick={cancelEdit}><Cross2Icon /></IconButton></Flex>
                    : <>{m.messageType === "link" ? <a href={m.metadata?.url} target="_blank" rel="noopener noreferrer" style={{ color: mine ? "white" : "var(--blue-9)", textDecoration: "underline" }}>{m.content}</a> : <Text size="2">{m.content}</Text>}
                      {m.edited && <Text size="1" style={{ opacity: 0.6 }}> (edited)</Text>}</>}
                  </Card>
                  <Flex justify={mine ? "end" : "start"} mt="1" gap="2" align="center">
                    <Text size="1" style={{ opacity: 0.5 }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                    {mine && !editId && <DropdownMenu.Root><DropdownMenu.Trigger><IconButton size="1" variant="ghost"><DotsVerticalIcon width={12} height={12} /></IconButton></DropdownMenu.Trigger><DropdownMenu.Content size="1"><DropdownMenu.Item onClick={() => startEdit(m)}><Pencil1Icon width={14} height={14} /> Edit</DropdownMenu.Item><DropdownMenu.Item color="red" onClick={() => deleteMsg(m._id)}><TrashIcon width={14} height={14} /> Delete</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>}
                  </Flex>
                </Box>
              </Flex>;
            })}
            <div ref={endRef} />
          </Box>

          {typing.length > 0 && <Box px="4" pb="1"><Text size="1" color="gray" style={{ fontStyle: "italic" }}>{typing.map(u => dn(u)).join(", ")} typing...</Text></Box>}

          <Box p="3" style={{ borderTop: "1px solid var(--gray-a5)" }}>
            <form onSubmit={send}><Flex gap="2">
              <Dialog.Root open={linkOpen} onOpenChange={setLinkOpen}><Dialog.Trigger><IconButton type="button" variant="soft"><Link2Icon /></IconButton></Dialog.Trigger>
                <Dialog.Content style={{ maxWidth: 400 }}><Dialog.Title>Share Link</Dialog.Title><form onSubmit={sendLink}><Box mb="3"><Text as="label" size="2">URL</Text><TextField.Root value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." /></Box><Box mb="4"><Text as="label" size="2">Title (optional)</Text><TextField.Root value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Link title" /></Box><Flex gap="2" justify="end"><Dialog.Close><Button variant="soft" color="gray">Cancel</Button></Dialog.Close><Button type="submit">Share</Button></Flex></form></Dialog.Content>
              </Dialog.Root>
              <Box style={{ flex: 1 }}><TextField.Root ref={inputRef} value={msg} onChange={e => { setMsg(e.target.value); handleTyping(); }} placeholder="Type a message..." size="3" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) send(e); }} /></Box>
              <Button type="submit" disabled={sending || !msg.trim()} size="3"><PaperPlaneIcon /></Button>
            </Flex></form>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default TeamChat;
