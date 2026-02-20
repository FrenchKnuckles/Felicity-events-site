import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Button, Heading, TextField, TextArea, Select, Spinner, Dialog } from "@radix-ui/themes";
import { ArrowLeftIcon, PersonIcon, EnvelopeClosedIcon, MobileIcon, FileTextIcon, ImageIcon, LockClosedIcon } from "@radix-ui/react-icons";

const cats = [{ value: "cultural", label: "Cultural" }, { value: "technical", label: "Technical" }, { value: "sports", label: "Sports" }, { value: "other", label: "Other" }];

const OrganizerProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fd, setFd] = useState({ name: "", contactEmail: "", description: "", logo: "", category: "technical", contactNumber: "", discordWebhook: "" });

  useEffect(() => {
    (async () => {
      try {
        const d = await organizerService.getProfile();
        const o = d?.organizer || d;
        setFd({ name: o?.name || "", contactEmail: o?.contactEmail || "", description: o?.description || "", logo: o?.logo || "", category: o?.category || "technical", contactNumber: o?.contactNumber || "", discordWebhook: o?.discordWebhook || "" });
      } catch { toast.error("Failed to load profile"); }
      finally { setLoading(false); }
    })();
  }, []);

  const ch = (e) => { const { name, value } = e.target; setFd(p => ({ ...p, [name]: value })); };

  const submit = async (e) => {
    e.preventDefault();
    if (!fd.name.trim() || !fd.contactEmail.trim()) { toast.error("Name and contact email are required"); return; }
    setSaving(true);
    try { await organizerService.updateProfile(fd); toast.success("Profile updated successfully"); navigate("/organizer/dashboard"); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to update profile"); }
    finally { setSaving(false); }
  };

  const requestReset = async () => {
    if (!resetReason.trim() || resetReason.trim().length < 10) { toast.error("Please provide a reason (at least 10 characters)"); return; }
    setSubmitting(true);
    try { await organizerService.requestPasswordReset(resetReason.trim()); toast.success("Password reset request submitted! An admin will review it."); setResetOpen(false); setResetReason(""); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to submit request"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "60vh" }}><Spinner size="3" /></Flex>;

  const fields = [
    { icon: <LockClosedIcon width="14" height="14" />, label: "Login Email (non-editable)", el: <TextField.Root type="email" value={user?.email || ""} disabled style={{ opacity: 0.7 }} /> },
    { icon: <PersonIcon width="14" height="14" />, label: "Organization Name *", el: <TextField.Root name="name" value={fd.name} onChange={ch} placeholder="Organization name" /> },
    { icon: <EnvelopeClosedIcon width="14" height="14" />, label: "Contact Email *", el: <TextField.Root type="email" name="contactEmail" value={fd.contactEmail} onChange={ch} placeholder="organizer@example.com" /> },
    { icon: <MobileIcon width="14" height="14" />, label: "Contact Number", el: <TextField.Root name="contactNumber" value={fd.contactNumber} onChange={ch} placeholder="Optional contact number" /> },
    { icon: <FileTextIcon width="14" height="14" />, label: "Description", el: <TextArea name="description" value={fd.description} onChange={ch} rows={3} placeholder="Brief description of your organization" /> },
    { icon: <ImageIcon width="14" height="14" />, label: "Logo URL", el: <><TextField.Root type="url" name="logo" value={fd.logo} onChange={ch} placeholder="https://example.com/logo.png" />{fd.logo && <Card variant="surface" mt="2"><Text size="2" color="gray">Logo preview</Text><img src={fd.logo} alt="Logo" style={{ height: "64px", objectFit: "contain", marginTop: "8px" }} onError={e => (e.currentTarget.style.display = "none")} /></Card>}</> },
  ];

  return (
    <Box p="6">
      <Button variant="ghost" onClick={() => navigate("/organizer/dashboard")} mb="6"><ArrowLeftIcon width="16" height="16" /><Text>Back to Dashboard</Text></Button>
      <Box style={{ maxWidth: "720px", margin: "0 auto" }}>
        <Flex direction="column" align="center" mb="6">
          <Flex align="center" justify="center" style={{ width: "64px", height: "64px", backgroundColor: "var(--green-3)", borderRadius: "50%" }} mb="4">
            <PersonIcon width="32" height="32" color="var(--green-9)" />
          </Flex>
          <Heading size="6" mb="1">Edit Profile</Heading>
          <Text color="gray">Update your organization details and contact information</Text>
        </Flex>

        <Card size="3">
          <form onSubmit={submit}>
            <Flex direction="column" gap="5">
              {fields.map(f => (
                <Box key={f.label}>
                  <Flex align="center" gap="1" mb="2">{f.icon}<Text as="label" size="2" weight="medium">{f.label}</Text></Flex>
                  {f.el}
                </Box>
              ))}
              <Box>
                <Flex align="center" gap="1" mb="2"><Text as="label" size="2" weight="medium">Category</Text></Flex>
                <Select.Root value={fd.category} onValueChange={v => setFd(p => ({ ...p, category: v }))}>
                  <Select.Trigger placeholder="Select category" />
                  <Select.Content>{cats.map(c => <Select.Item key={c.value} value={c.value}>{c.label}</Select.Item>)}</Select.Content>
                </Select.Root>
              </Box>
              <Box>
                <Flex align="center" gap="1" mb="2"><Text as="label" size="2" weight="medium">Discord Webhook</Text></Flex>
                <TextField.Root name="discordWebhook" value={fd.discordWebhook} onChange={ch} placeholder="Optional webhook URL for event notifications" />
              </Box>
              <Flex gap="4" pt="4">
                <Button type="button" variant="soft" onClick={() => navigate("/organizer/dashboard")} style={{ flex: 1 }}>Cancel</Button>
                <Button type="submit" disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : "Save Changes"}</Button>
              </Flex>
            </Flex>
          </form>
        </Card>

        <Card size="3" mt="6" style={{ border: "1px solid var(--red-6)" }}>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="2"><LockClosedIcon width="20" height="20" color="var(--red-9)" /><Heading size="4">Password Reset</Heading></Flex>
            <Text size="2" color="gray">Need to change your password? Submit a request to the admin. Once approved, your password will be reset and provided to you.</Text>
            <Dialog.Root open={resetOpen} onOpenChange={setResetOpen}>
              <Dialog.Trigger><Button variant="outline" color="red"><LockClosedIcon width="14" height="14" />Request Password Reset</Button></Dialog.Trigger>
              <Dialog.Content style={{ maxWidth: 450 }}>
                <Dialog.Title>Request Password Reset</Dialog.Title>
                <Dialog.Description size="2" mb="4">Provide a reason for your password reset request. An admin will review and approve it.</Dialog.Description>
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>Reason *</Text>
                  <TextArea value={resetReason} onChange={e => setResetReason(e.target.value)} placeholder="Explain why you need a password reset (min 10 characters)..." rows={3} />
                  <Text size="1" color={resetReason.trim().length >= 10 ? "green" : "gray"} mt="1">{resetReason.trim().length}/10 characters minimum</Text>
                </Box>
                <Flex gap="3" mt="4" justify="end">
                  <Dialog.Close><Button variant="soft" color="gray">Cancel</Button></Dialog.Close>
                  <Button color="red" onClick={requestReset} disabled={submitting || resetReason.trim().length < 10}>{submitting ? "Submitting..." : "Submit Request"}</Button>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>
          </Flex>
        </Card>
      </Box>
    </Box>
  );
};

export default OrganizerProfile;
