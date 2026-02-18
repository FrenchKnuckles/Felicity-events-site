import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import teamService from "../../services/teamService";
import eventService from "../../services/eventService";
import {
  Box,
  Card,
  Flex,
  Text,
  Button,
  Heading,
  Badge,
  TextField,
  Spinner,
  Tabs,
  IconButton,
  Select,
} from "@radix-ui/themes";
import {
  PersonIcon,
  PlusIcon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
  EnvelopeClosedIcon,
  StarIcon,
} from "@radix-ui/react-icons";

const TeamRegistration = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("create"); // create, join, manage
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Create team form
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  
  // Join team form
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  
  // Invite member form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  
  // Selected team for management
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventRes, teamsRes] = await Promise.all([
        eventService.getEventById(eventId),
        teamService.getMyTeams(),
      ]);
      
      setEvent(eventRes?.event || eventRes);
      
      // Filter teams for this event
      const eventTeams = (teamsRes.data.teams || []).filter(
        (t) => t.event === eventId || t.event?._id === eventId
      );
      setMyTeams(eventTeams);
      
      if (eventTeams.length > 0) {
        setSelectedTeam(eventTeams[0]);
        setActiveTab("manage");
      }
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    try {
      setCreating(true);
      const res = await teamService.createTeam({
        eventId,
        name: teamName,
      });
      
      toast.success("Team created successfully!");
      setTeamName("");
      setSelectedTeam(res.data.team);
      setMyTeams([...myTeams, res.data.team]);
      setActiveTab("manage");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }

    try {
      setJoining(true);
      const res = await teamService.joinTeam(inviteCode);
      
      toast.success("Successfully joined team!");
      setInviteCode("");
      setSelectedTeam(res.data.team);
      setMyTeams([...myTeams, res.data.team]);
      setActiveTab("manage");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to join team");
    } finally {
      setJoining(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedTeam) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      setInviting(true);
      await teamService.inviteMember(selectedTeam._id, inviteEmail);
      
      toast.success("Invitation sent!");
      setInviteEmail("");
      fetchData(); // Refresh team data
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const copyInviteCode = () => {
    if (selectedTeam?.inviteCode) {
      navigator.clipboard.writeText(selectedTeam.inviteCode);
      setCopiedCode(true);
      toast.success("Invite code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleLeaveTeam = async () => {
    if (!selectedTeam) return;
    
    if (!window.confirm("Are you sure you want to leave this team?")) {
      return;
    }

    try {
      await teamService.leaveTeam(selectedTeam._id);
      toast.success("You have left the team");
      setMyTeams(myTeams.filter((t) => t._id !== selectedTeam._id));
      setSelectedTeam(null);
      setActiveTab("create");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave team");
    }
  };

  const handleCompleteRegistration = async () => {
    if (!selectedTeam) return;

    try {
      const res = await teamService.completeTeamRegistration(selectedTeam._id);
      toast.success("Team registration completed! Tickets generated.");
      setSelectedTeam(res.data.team);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to complete registration");
    }
  };

  if (loading) {
    return (
      <Flex
        align="center"
        justify="center"
        style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }}
      >
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }} py="6">
      <Box style={{ maxWidth: "896px", margin: "0 auto" }} px="4">
        {/* Header */}
        <Card mb="5">
          <Heading size="6" mb="2">Team Registration</Heading>
          {event && (
            <Box>
              <Text size="4" color="blue" weight="medium">{event.name}</Text>
              <Text size="2" color="gray" mt="1" as="p">
                Team Size: {event.minTeamSize || 2} - {event.maxTeamSize || 4} members
              </Text>
            </Box>
          )}
        </Card>

        {/* Tabs */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List mb="5">
            <Tabs.Trigger value="create">
              <PersonIcon width={16} height={16} style={{ marginRight: "8px" }} />
              Create Team
            </Tabs.Trigger>
            <Tabs.Trigger value="join">
              <PlusIcon width={16} height={16} style={{ marginRight: "8px" }} />
              Join Team
            </Tabs.Trigger>
            {myTeams.length > 0 && (
              <Tabs.Trigger value="manage">
                <StarIcon width={16} height={16} style={{ marginRight: "8px" }} />
                Manage Team
              </Tabs.Trigger>
            )}
          </Tabs.List>

          {/* Create Team Tab */}
          <Tabs.Content value="create">
            <Card>
              <Heading size="5" mb="4">Create a New Team</Heading>
              <form onSubmit={handleCreateTeam}>
                <Box mb="4">
                  <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                    Team Name
                  </Text>
                  <TextField.Root
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter your team name"
                    size="3"
                  />
                </Box>
                <Button type="submit" disabled={creating} size="3" style={{ width: "100%" }}>
                  {creating ? (
                    <><Spinner size="1" /> Creating...</>
                  ) : (
                    <><PersonIcon width={16} height={16} /> Create Team</>
                  )}
                </Button>
              </form>
            </Card>
          </Tabs.Content>

          {/* Join Team Tab */}
          <Tabs.Content value="join">
            <Card>
              <Heading size="5" mb="4">Join Existing Team</Heading>
              <form onSubmit={handleJoinTeam}>
                <Box mb="4">
                  <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                    Invite Code
                  </Text>
                  <TextField.Root
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter 8-character invite code"
                    maxLength={8}
                    size="3"
                    style={{ textAlign: "center", letterSpacing: "0.2em", textTransform: "uppercase" }}
                  />
                </Box>
                <Button type="submit" disabled={joining} color="green" size="3" style={{ width: "100%" }}>
                  {joining ? (
                    <><Spinner size="1" /> Joining...</>
                  ) : (
                    <><PlusIcon width={16} height={16} /> Join Team</>
                  )}
                </Button>
              </form>
            </Card>
          </Tabs.Content>

          {/* Manage Team Tab */}
          <Tabs.Content value="manage">
            {selectedTeam && (
              <Flex direction="column" gap="5">
                {/* Team Selector */}
                {myTeams.length > 1 && (
                  <Card>
                    <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                      Select Team
                    </Text>
                    <Select.Root
                      value={selectedTeam._id}
                      onValueChange={(value) => setSelectedTeam(myTeams.find((t) => t._id === value))}
                    >
                      <Select.Trigger style={{ width: "100%" }} />
                      <Select.Content>
                        {myTeams.map((team) => (
                          <Select.Item key={team._id} value={team._id}>
                            {team.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Card>
                )}

                {/* Team Info */}
                <Card>
                  <Flex justify="between" align="start" mb="4">
                    <Box>
                      <Heading size="5">{selectedTeam.name}</Heading>
                      <Badge
                        mt="2"
                        color={
                          selectedTeam.status === "complete" ? "green" :
                          selectedTeam.status === "pending" ? "yellow" : "gray"
                        }
                      >
                        {selectedTeam.status?.charAt(0).toUpperCase() + selectedTeam.status?.slice(1)}
                      </Badge>
                    </Box>
                    <Flex align="center" gap="2">
                      <Text size="2" color="gray">Invite Code:</Text>
                      <Badge variant="soft" color="blue" style={{ fontFamily: "monospace" }}>
                        {selectedTeam.inviteCode}
                      </Badge>
                      <IconButton
                        variant="ghost"
                        onClick={copyInviteCode}
                        size="1"
                      >
                        {copiedCode ? (
                          <CheckIcon width={16} height={16} color="var(--green-9)" />
                        ) : (
                          <CopyIcon width={16} height={16} />
                        )}
                      </IconButton>
                    </Flex>
                  </Flex>

                  {/* Members */}
                  <Box mb="5">
                    <Heading size="4" mb="3">
                      Team Members ({selectedTeam.members?.length || 0}/{event?.maxTeamSize || 4})
                    </Heading>
                    <Flex direction="column" gap="2">
                      {selectedTeam.members?.map((member, index) => (
                        <Card key={member.user?._id || index} variant="surface">
                          <Flex justify="between" align="center">
                            <Flex align="center" gap="3">
                              <Flex
                                align="center"
                                justify="center"
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  backgroundColor: "var(--blue-9)",
                                  borderRadius: "50%",
                                  color: "white",
                                }}
                              >
                                {member.user?.name?.charAt(0) || "?"}
                              </Flex>
                              <Box>
                                <Flex align="center" gap="2">
                                  <Text weight="medium">{member.user?.name || "Unknown"}</Text>
                                  {member.role === "leader" && (
                                    <StarIcon width={16} height={16} color="var(--yellow-9)" />
                                  )}
                                </Flex>
                                <Text size="2" color="gray">{member.user?.email}</Text>
                              </Box>
                            </Flex>
                            <Badge
                              color={
                                member.status === "confirmed" ? "green" :
                                member.status === "pending" ? "yellow" : "gray"
                              }
                              size="1"
                            >
                              {member.status}
                            </Badge>
                          </Flex>
                        </Card>
                      ))}
                    </Flex>
                  </Box>

                  {/* Invite Member Form */}
                  {selectedTeam.status !== "complete" && (
                    <Box pt="4" style={{ borderTop: "1px solid var(--gray-a5)" }}>
                      <Heading size="4" mb="3">Invite Member</Heading>
                      <form onSubmit={handleInviteMember}>
                        <Flex gap="2">
                          <Box style={{ flex: 1 }}>
                            <TextField.Root
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="Enter email address"
                              size="2"
                            />
                          </Box>
                          <Button type="submit" disabled={inviting}>
                            {inviting ? <Spinner size="1" /> : <EnvelopeClosedIcon width={16} height={16} />}
                          </Button>
                        </Flex>
                      </form>
                    </Box>
                  )}

                  {/* Actions */}
                  <Flex gap="3" mt="5" pt="4" style={{ borderTop: "1px solid var(--gray-a5)" }}>
                    {selectedTeam.status === "pending" && 
                     selectedTeam.members?.length >= (event?.minTeamSize || 2) && (
                      <Button
                        onClick={handleCompleteRegistration}
                        color="green"
                        size="3"
                        style={{ flex: 1 }}
                      >
                        🎫 Complete Registration & Get Tickets
                      </Button>
                    )}
                    
                    {selectedTeam.status === "complete" && (
                      <Button
                        onClick={() => navigate(`/team-chat/${selectedTeam._id}`)}
                        size="3"
                        style={{ flex: 1 }}
                      >
                        💬 Open Team Chat
                      </Button>
                    )}
                    
                    <Button
                      onClick={handleLeaveTeam}
                      color="red"
                      variant="soft"
                      size="3"
                    >
                      <TrashIcon width={16} height={16} />
                    </Button>
                  </Flex>
                </Card>
              </Flex>
            )}
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  );
};

export default TeamRegistration;
