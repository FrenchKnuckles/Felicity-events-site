import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import teamService from "../../services/teamService";
import eventService from "../../services/eventService";
import { Box, Card, Flex, Text, Button, Heading, Badge, TextField, Spinner, Tabs, IconButton, Select } from "@radix-ui/themes";
import { PersonIcon, PlusIcon, CopyIcon, CheckIcon, TrashIcon, EnvelopeClosedIcon, StarIcon } from "@radix-ui/react-icons";

const TeamRegistration = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("create");
  const [copiedCode, setCopiedCode] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [sel, setSel] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eRes, tRes] = await Promise.all([eventService.getEventById(eventId), teamService.getMyTeams()]);
      setEvent(eRes?.event || eRes);
      const et = (tRes.data.teams || []).filter(t => t.event === eventId || t.event?._id === eventId);
      setMyTeams(et);
      if (et.length > 0) { setSel(et[0]); setActiveTab("manage"); }
    } catch { toast.error("Failed to load data"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [eventId]);

  const createTeam = async (e) => {
    e.preventDefault(); if (!teamName.trim()) { toast.error("Please enter a team name"); return; }
    try { setCreating(true); const r = await teamService.createTeam({ eventId, name: teamName }); toast.success("Team created!"); setTeamName(""); setSel(r.data.team); setMyTeams([...myTeams, r.data.team]); setActiveTab("manage"); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to create team"); } finally { setCreating(false); }
  };

  const joinTeam = async (e) => {
    e.preventDefault(); if (!inviteCode.trim()) { toast.error("Please enter an invite code"); return; }
    try { setJoining(true); const r = await teamService.joinTeam(inviteCode); toast.success("Joined team!"); setInviteCode(""); setSel(r.data.team); setMyTeams([...myTeams, r.data.team]); setActiveTab("manage"); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to join team"); } finally { setJoining(false); }
  };

  const inviteMember = async (e) => {
    e.preventDefault(); if (!inviteEmail.trim() || !sel) { toast.error("Please enter an email"); return; }
    try { setInviting(true); await teamService.inviteMember(sel._id, inviteEmail); toast.success("Invitation sent!"); setInviteEmail(""); fetchData(); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to send invitation"); } finally { setInviting(false); }
  };

  const copyCode = () => { if (sel?.inviteCode) { navigator.clipboard.writeText(sel.inviteCode); setCopiedCode(true); toast.success("Invite code copied!"); setTimeout(() => setCopiedCode(false), 2000); } };

  const leaveTeam = async () => {
    if (!sel || !window.confirm("Are you sure you want to leave this team?")) return;
    try { await teamService.leaveTeam(sel._id); toast.success("You have left the team"); setMyTeams(myTeams.filter(t => t._id !== sel._id)); setSel(null); setActiveTab("create"); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to leave team"); }
  };

  const completeReg = async () => {
    if (!sel) return;
    try { const r = await teamService.completeTeamRegistration(sel._id); toast.success("Team registration completed! Tickets generated."); setSel(r.data.team); fetchData(); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to complete registration"); }
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }}><Spinner size="3" /></Flex>;

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }} py="6">
      <Box style={{ maxWidth: 896, margin: "0 auto" }} px="4">
        <Card mb="5"><Heading size="6" mb="2">Team Registration</Heading>{event && <Box><Text size="4" color="blue" weight="medium">{event.name}</Text><Text size="2" color="gray" mt="1" as="p">Team Size: {event.minTeamSize || 2} - {event.maxTeamSize || 4} members</Text></Box>}</Card>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List mb="5">
            <Tabs.Trigger value="create"><PersonIcon width={16} height={16} style={{ marginRight: 8 }} />Create Team</Tabs.Trigger>
            <Tabs.Trigger value="join"><PlusIcon width={16} height={16} style={{ marginRight: 8 }} />Join Team</Tabs.Trigger>
            {myTeams.length > 0 && <Tabs.Trigger value="manage"><StarIcon width={16} height={16} style={{ marginRight: 8 }} />Manage Team</Tabs.Trigger>}
          </Tabs.List>

          <Tabs.Content value="create"><Card>
            <Heading size="5" mb="4">Create a New Team</Heading>
            <form onSubmit={createTeam}><Box mb="4"><Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>Team Name</Text><TextField.Root value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Enter your team name" size="3" /></Box>
            <Button type="submit" disabled={creating} size="3" style={{ width: "100%" }}>{creating ? <><Spinner size="1" /> Creating...</> : <><PersonIcon width={16} height={16} /> Create Team</>}</Button></form>
          </Card></Tabs.Content>

          <Tabs.Content value="join"><Card>
            <Heading size="5" mb="4">Join Existing Team</Heading>
            <form onSubmit={joinTeam}><Box mb="4"><Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>Invite Code</Text><TextField.Root value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="Enter 8-character invite code" maxLength={8} size="3" style={{ textAlign: "center", letterSpacing: "0.2em", textTransform: "uppercase" }} /></Box>
            <Button type="submit" disabled={joining} color="green" size="3" style={{ width: "100%" }}>{joining ? <><Spinner size="1" /> Joining...</> : <><PlusIcon width={16} height={16} /> Join Team</>}</Button></form>
          </Card></Tabs.Content>

          <Tabs.Content value="manage">{sel && <Flex direction="column" gap="5">
            {myTeams.length > 1 && <Card><Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>Select Team</Text><Select.Root value={sel._id} onValueChange={v => setSel(myTeams.find(t => t._id === v))}><Select.Trigger style={{ width: "100%" }} /><Select.Content>{myTeams.map(t => <Select.Item key={t._id} value={t._id}>{t.name}</Select.Item>)}</Select.Content></Select.Root></Card>}

            <Card>
              <Flex justify="between" align="start" mb="4">
                <Box><Heading size="5">{sel.name}</Heading><Badge mt="2" color={sel.status === "complete" ? "green" : sel.status === "pending" ? "yellow" : "gray"}>{sel.status?.charAt(0).toUpperCase() + sel.status?.slice(1)}</Badge></Box>
                <Flex align="center" gap="2"><Text size="2" color="gray">Invite Code:</Text><Badge variant="soft" color="blue" style={{ fontFamily: "monospace" }}>{sel.inviteCode}</Badge><IconButton variant="ghost" onClick={copyCode} size="1">{copiedCode ? <CheckIcon width={16} height={16} color="var(--green-9)" /> : <CopyIcon width={16} height={16} />}</IconButton></Flex>
              </Flex>

              <Box mb="5"><Heading size="4" mb="3">Team Members ({sel.members?.length || 0}/{event?.maxTeamSize || 4})</Heading>
                <Flex direction="column" gap="2">
                  {sel.members?.map((m, i) => <Card key={m.user?._id || i} variant="surface"><Flex justify="between" align="center">
                    <Flex align="center" gap="3"><Flex align="center" justify="center" style={{ width: 40, height: 40, backgroundColor: "var(--blue-9)", borderRadius: "50%", color: "white" }}>{m.user?.name?.charAt(0) || "?"}</Flex><Box><Flex align="center" gap="2"><Text weight="medium">{m.user?.name || "Unknown"}</Text>{m.role === "leader" && <StarIcon width={16} height={16} color="var(--yellow-9)" />}</Flex><Text size="2" color="gray">{m.user?.email}</Text></Box></Flex>
                    <Badge color={m.status === "confirmed" ? "green" : m.status === "pending" ? "yellow" : "gray"} size="1">{m.status}</Badge>
                  </Flex></Card>)}
                </Flex>
              </Box>

              {sel.status !== "complete" && <Box pt="4" style={{ borderTop: "1px solid var(--gray-a5)" }}><Heading size="4" mb="3">Invite Member</Heading><form onSubmit={inviteMember}><Flex gap="2"><Box style={{ flex: 1 }}><TextField.Root type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Enter email address" size="2" /></Box><Button type="submit" disabled={inviting}>{inviting ? <Spinner size="1" /> : <EnvelopeClosedIcon width={16} height={16} />}</Button></Flex></form></Box>}

              <Flex gap="3" mt="5" pt="4" style={{ borderTop: "1px solid var(--gray-a5)" }}>
                {sel.status === "pending" && sel.members?.length >= (event?.minTeamSize || 2) && <Button onClick={completeReg} color="green" size="3" style={{ flex: 1 }}>🎫 Complete Registration & Get Tickets</Button>}
                {sel.status === "complete" && <Button onClick={() => navigate(`/team-chat/${sel._id}`)} size="3" style={{ flex: 1 }}>💬 Open Team Chat</Button>}
                <Button onClick={leaveTeam} color="red" variant="soft" size="3"><TrashIcon width={16} height={16} /></Button>
              </Flex>
            </Card>
          </Flex>}</Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  );
};

export default TeamRegistration;
