import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Heading, Badge, Grid, Button, TextField } from "@radix-ui/themes";
import { PersonIcon, EnvelopeClosedIcon, MobileIcon, HomeIcon, Pencil1Icon, CheckIcon, Cross2Icon, LockClosedIcon, HeartIcon, StarIcon, EyeOpenIcon, EyeNoneIcon } from "@radix-ui/react-icons";

const AREAS = ["Competitive Programming","Web Development","Mobile App Development","Machine Learning & AI","Data Science","Cybersecurity","Cloud Computing","Robotics","IoT","Game Development","UI/UX Design","Open Source","Music","Dance","Drama & Theatre","Art & Design","Photography","Literature","Debating & Quiz","Sports & Fitness","Entrepreneurship","Finance & Trading","Social Events","Environment"];

const Profile = () => {
  const { user, updateUser, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unfollowLoading, setUnfollowLoading] = useState(null);
  const [fd, setFd] = useState({ firstName: "", lastName: "", contactNumber: "", collegeOrg: "", areasOfInterest: [] });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);

  useEffect(() => { refreshUser(); }, []);
  useEffect(() => { if (user) setFd({ firstName: user.firstName || "", lastName: user.lastName || "", contactNumber: user.contactNumber || "", collegeOrg: user.collegeOrg || "", areasOfInterest: user.areasOfInterest || [] }); }, [user]);

  const ch = e => { const { name, value } = e.target; setFd(p => ({ ...p, [name]: value })); };
  const toggleInterest = i => setFd(p => ({ ...p, areasOfInterest: p.areasOfInterest.includes(i) ? p.areasOfInterest.filter(x => x !== i) : [...p.areasOfInterest, i] }));

  const save = async (e) => {
    e?.preventDefault(); setLoading(true);
    try { const { data } = await api.put("/auth/profile", fd); updateUser(data.user); toast.success("Profile updated!"); setEditing(false); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to update profile"); }
    finally { setLoading(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (pw.newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try { await api.put("/auth/password", { currentPassword: pw.currentPassword, newPassword: pw.newPassword }); toast.success("Password changed!"); setChangingPw(false); setPw({ currentPassword: "", newPassword: "", confirmPassword: "" }); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to change password"); }
    finally { setLoading(false); }
  };

  const unfollow = async (orgId) => {
    setUnfollowLoading(orgId);
    try { const { followedOrganizers } = await organizerService.toggleFollow(orgId); updateUser({ followedOrganizers }); toast.success("Unfollowed"); }
    catch { toast.error("Failed to unfollow"); } finally { setUnfollowLoading(null); }
  };

  const field = ({ icon, label, name, type, disabled, children }) => (
    <Box>
      <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}><Flex align="center" gap="1">{icon}{label}</Flex></Text>
      {children || (editing && !disabled ? <TextField.Root type={type} name={name} value={fd[name]} onChange={ch} required={name === "firstName" || name === "lastName"} /> : <Text as="p" weight="medium">{disabled ? user?.email : (fd[name] || "Not provided")}</Text>)}
      {disabled && <Text as="p" size="1" color="gray" mt="1">Email cannot be changed</Text>}
    </Box>
  );

  return (
    <Box p="6" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Box mb="6"><Heading size="7" weight="bold">My Profile</Heading><Text as="p" size="3" color="gray" mt="2">Manage your account settings and preferences</Text></Box>

      <Grid columns={{ initial: "1", lg: "3" }} gap="6">
        <Box style={{ gridColumn: "span 2" }}>
          <Flex direction="column" gap="5">
            <Card>
              <Flex align="center" justify="between" mb="5"><Heading size="5">Personal Information</Heading>
                {!editing ? <Button variant="ghost" onClick={() => setEditing(true)}><Pencil1Icon width={16} height={16} />Edit</Button> : <Button variant="ghost" color="gray" onClick={() => setEditing(false)}><Cross2Icon width={16} height={16} />Cancel</Button>}
              </Flex>
              <form onSubmit={save}>
                <Grid columns={{ initial: "1", md: "2" }} gap="5">
                  {field({ icon: <PersonIcon width={14} height={14} />, label: "First Name", name: "firstName" })}
                  {field({ label: "Last Name", name: "lastName" })}
                  {field({ icon: <EnvelopeClosedIcon width={14} height={14} />, label: "Email", disabled: true })}
                  {field({ icon: <MobileIcon width={14} height={14} />, label: "Contact Number", name: "contactNumber", type: "tel" })}
                  <Box style={{ gridColumn: "span 2" }}>{field({ icon: <HomeIcon width={14} height={14} />, label: "College / Organization", name: "collegeOrg" })}</Box>
                </Grid>
                {editing && <Flex justify="end" mt="5"><Button type="submit" disabled={loading}><CheckIcon width={16} height={16} />{loading ? "Saving..." : "Save Changes"}</Button></Flex>}
              </form>
            </Card>

            <Card>
              <Flex align="center" gap="2" mb="5"><StarIcon width={20} height={20} color="var(--yellow-9)" /><Heading size="5">Areas of Interest</Heading></Flex>
              <Text as="p" color="gray" mb="4">Select your interests to get personalized event recommendations</Text>
              <Flex wrap="wrap" gap="2">
                {AREAS.map(i => <Button key={i} variant={fd.areasOfInterest.includes(i) ? "solid" : "outline"} size="1" onClick={() => toggleInterest(i)} style={{ borderRadius: 9999 }}>{i}</Button>)}
              </Flex>
              {JSON.stringify(fd.areasOfInterest) !== JSON.stringify(user?.areasOfInterest) && <Flex justify="end" mt="5"><Button onClick={save} disabled={loading}><CheckIcon width={16} height={16} />{loading ? "Saving..." : "Save Interests"}</Button></Flex>}
            </Card>

            <Card>
              <Flex align="center" justify="between" mb="5"><Flex align="center" gap="2"><LockClosedIcon width={20} height={20} color="var(--gray-8)" /><Heading size="5">Password</Heading></Flex>
                {!changingPw ? <Button variant="ghost" onClick={() => setChangingPw(true)}>Change Password</Button> : <Button variant="ghost" color="gray" onClick={() => setChangingPw(false)}>Cancel</Button>}
              </Flex>
              {changingPw && <form onSubmit={changePw}><Flex direction="column" gap="4">
                {[{ l: "Current Password", k: "currentPassword" }, { l: "New Password", k: "newPassword" }, { l: "Confirm New Password", k: "confirmPassword" }].map(f => <Box key={f.k}><Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>{f.l}</Text><TextField.Root type={showPw ? "text" : "password"} value={pw[f.k]} onChange={e => setPw(p => ({ ...p, [f.k]: e.target.value }))} required minLength={f.k === "newPassword" ? 6 : undefined}><TextField.Slot side="right" style={{ cursor: "pointer" }} onClick={() => setShowPw(p => !p)}>{showPw ? <EyeNoneIcon height="16" width="16" /> : <EyeOpenIcon height="16" width="16" />}</TextField.Slot></TextField.Root></Box>)}
                <Flex justify="end"><Button type="submit" disabled={loading}>{loading ? "Changing..." : "Change Password"}</Button></Flex>
              </Flex></form>}
            </Card>
          </Flex>
        </Box>

        <Flex direction="column" gap="5">
          <Card style={{ textAlign: "center" }}>
            <Box style={{ width: 96, height: 96, background: "linear-gradient(135deg, var(--blue-9), var(--purple-9))", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Text size="7" weight="bold" style={{ color: "white" }}>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</Text>
            </Box>
            <Heading size="4">{user?.firstName} {user?.lastName}</Heading><Text as="p" color="gray">{user?.email}</Text>
            <Box mt="4"><Badge color={user?.participantType === "iiit" ? "blue" : "green"}>{user?.participantType === "iiit" ? "IIIT Participant" : "External Participant"}</Badge></Box>
          </Card>
          <Card>
            <Flex align="center" gap="2" mb="4"><HeartIcon width={18} height={18} color="var(--red-9)" /><Heading size="4">Following</Heading></Flex>
            {user?.followedOrganizers?.length > 0 ? <Flex direction="column" gap="3">
              {user.followedOrganizers.map(org => <Flex key={org._id} align="center" gap="3">
                <Box style={{ width: 32, height: 32, backgroundColor: "var(--blue-3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Text size="2" weight="medium" color="blue">{org.name?.charAt(0)}</Text></Box>
                <Box style={{ flex: 1 }}><Text as="p" size="2" weight="medium">{org.name}</Text><Text as="p" size="1" color="gray">{org.category}</Text></Box>
                <Button variant="ghost" color="red" size="1" disabled={unfollowLoading === org._id} onClick={() => unfollow(org._id)} title="Unfollow"><Cross2Icon width={14} height={14} /></Button>
              </Flex>)}
            </Flex> : <Text as="p" size="2" color="gray">Not following any organizers yet</Text>}
          </Card>
        </Flex>
      </Grid>
    </Box>
  );
};

export default Profile;
