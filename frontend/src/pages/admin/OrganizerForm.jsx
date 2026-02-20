import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Button, Heading, TextField, TextArea, Callout, Select, Spinner } from "@radix-ui/themes";
import { ArrowLeftIcon, PersonIcon, EnvelopeClosedIcon, ImageIcon, FileTextIcon, CheckCircledIcon, CopyIcon, InfoCircledIcon, MobileIcon } from "@radix-ui/react-icons";

const CATS = [{ value: "cultural", label: "Cultural" }, { value: "technical", label: "Technical" }, { value: "sports", label: "Sports" }, { value: "other", label: "Other" }];

const OrganizerForm = ({ mode = "create" }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [errors, setErrors] = useState({});
  const [fd, setFd] = useState({ name: "", email: "", contactEmail: "", description: "", logo: "", category: "technical", contactNumber: "", discordWebhook: "" });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const data = await adminService.getOrganizerById(id);
        const o = data.organizer || data;
        setFd({
          name: o.name || "",
          email: "",
          contactEmail: o.contactEmail || o.userId?.email || "",
          description: o.description || "",
          logo: o.logo || "",
          category: o.category || "technical",
          contactNumber: o.contactNumber || "",
          discordWebhook: o.discordWebhook || ""
        });
      } catch (err) {
        console.error("Load org error:", err);
        toast.error("Failed to load organizer");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const onChange = (e) => { const { name, value } = e.target; setFd((p) => ({ ...p, [name]: value })); if (errors[name]) setErrors((p) => ({ ...p, [name]: "" })); };
  const copy = async (text, label) => { try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); } catch { window.prompt(`Copy ${label}:`, text); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit) {
      const errs = {};
      if (!fd.name.trim()) errs.name = "Name required";
      if (!fd.email.trim()) errs.email = "Email required";
      else if (!/\S+@\S+\.\S+/.test(fd.email)) errs.email = "Invalid email";
      setErrors(errs);
      if (Object.keys(errs).length) return;
    } else if (!fd.name.trim() || !fd.contactEmail.trim()) { toast.error("Name and email required"); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await adminService.updateOrganizer(id, { name: fd.name, contactEmail: fd.contactEmail, description: fd.description, logo: fd.logo, category: fd.category, contactNumber: fd.contactNumber, discordWebhook: fd.discordWebhook });
        toast.success("Organizer updated");
        navigate("/admin/organizers");
      } else {
        const res = await adminService.createOrganizer({ name: fd.name, email: fd.email, description: fd.description, logo: fd.logo, category: fd.category });
        setCredentials(res.credentials);
        toast.success("Organizer created!");
      }
    } catch (err) { toast.error(err.response?.data?.message || `Failed to ${isEdit ? "update" : "create"} organizer`); }
    finally { setSaving(false); }
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "60vh" }}><Spinner size="3" /></Flex>;

  if (credentials) return (
    <Box p="6"><Box style={{ maxWidth: 672, margin: "0 auto" }}>
      <Flex direction="column" align="center" mb="6">
        <Flex align="center" justify="center" style={{ width: 64, height: 64, backgroundColor: "var(--green-3)", borderRadius: "50%" }} mb="4"><CheckCircledIcon width="32" height="32" color="var(--green-9)" /></Flex>
        <Heading size="6" mb="1">Organizer Created!</Heading>
        <Text color="gray">Share credentials with the organizer</Text>
      </Flex>
      <Card size="3" mb="4">
        <Flex direction="column" gap="4">
          <Callout.Root color="blue"><Callout.Icon><InfoCircledIcon /></Callout.Icon><Callout.Text>Password was auto-generated. Copy and share — it cannot be retrieved later.</Callout.Text></Callout.Root>
          {[["Login Email", credentials.email], ["Password", credentials.password]].map(([label, val]) => (
            <Box key={label}>
              <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>{label}</Text>
              <Flex gap="2" align="center">
                <TextField.Root value={val} readOnly style={{ flex: 1, ...(label === "Password" ? { fontFamily: "monospace" } : {}) }} />
                <Button type="button" variant="soft" onClick={() => copy(val, label)}><CopyIcon width="16" height="16" /></Button>
              </Flex>
            </Box>
          ))}
          <Button type="button" variant="soft" style={{ width: "100%" }} onClick={() => copy(`Email: ${credentials.email}\nPassword: ${credentials.password}`, "Credentials")}><CopyIcon width="16" height="16" /> Copy Both</Button>
        </Flex>
      </Card>
      <Flex gap="4">
        <Button variant="soft" style={{ flex: 1 }} onClick={() => { setCredentials(null); setFd({ name: "", email: "", contactEmail: "", description: "", logo: "", category: "club", contactNumber: "", discordWebhook: "" }); }}>Create Another</Button>
        <Button style={{ flex: 1 }} onClick={() => navigate("/admin/organizers")}>Manage Organizers</Button>
      </Flex>
    </Box></Box>
  );

  return (
    <Box p="6">
      <Button variant="ghost" onClick={() => navigate(-1)} mb="6"><ArrowLeftIcon width="16" height="16" /> Back</Button>
      <Box style={{ maxWidth: 672, margin: "0 auto" }}>
        <Flex direction="column" align="center" mb="6">
          <Flex align="center" justify="center" style={{ width: 64, height: 64, backgroundColor: "var(--purple-3)", borderRadius: "50%" }} mb="4"><PersonIcon width="32" height="32" color="var(--purple-9)" /></Flex>
          <Heading size="6" mb="1">{isEdit ? "Edit" : "Create New"} Organizer</Heading>
          <Text color="gray">{isEdit ? "Update organizer details" : "Add a new organization"}</Text>
        </Flex>
        <Card size="3">
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
              {!isEdit && <Callout.Root color="blue"><Callout.Icon><InfoCircledIcon /></Callout.Icon><Callout.Text>A secure password will be auto-generated after creation.</Callout.Text></Callout.Root>}
              <Box>
                <Flex align="center" gap="1" mb="1"><PersonIcon width="14" height="14" /><Text as="label" size="2" weight="medium">Organization Name *</Text></Flex>
                <TextField.Root name="name" value={fd.name} onChange={onChange} placeholder="Organization name" color={errors.name ? "red" : undefined} />
                {errors.name && <Text size="1" color="red" mt="1">{errors.name}</Text>}
              </Box>
              <Box>
                <Flex align="center" gap="1" mb="1"><EnvelopeClosedIcon width="14" height="14" /><Text as="label" size="2" weight="medium">{isEdit ? "Contact Email *" : "Login Email *"}</Text></Flex>
                <TextField.Root type="email" name={isEdit ? "contactEmail" : "email"} value={isEdit ? fd.contactEmail : fd.email} onChange={onChange} placeholder="email@example.com" color={errors.email ? "red" : undefined} />
                {errors.email && <Text size="1" color="red" mt="1">{errors.email}</Text>}
              </Box>
              {isEdit && <Box><Flex align="center" gap="1" mb="1"><MobileIcon width="14" height="14" /><Text as="label" size="2" weight="medium">Contact Number</Text></Flex><TextField.Root name="contactNumber" value={fd.contactNumber} onChange={onChange} placeholder="Optional" /></Box>}
              <Box>
                <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>Category</Text>
                <Select.Root value={fd.category} onValueChange={(v) => setFd((p) => ({ ...p, category: v }))}><Select.Trigger style={{ width: "100%" }} /><Select.Content>{CATS.map((c) => <Select.Item key={c.value} value={c.value}>{c.label}</Select.Item>)}</Select.Content></Select.Root>
              </Box>
              <Box><Flex align="center" gap="1" mb="1"><FileTextIcon width="14" height="14" /><Text as="label" size="2" weight="medium">Description</Text></Flex><TextArea name="description" value={fd.description} onChange={onChange} rows={3} placeholder="Brief description..." /></Box>
              <Box>
                <Flex align="center" gap="1" mb="1"><ImageIcon width="14" height="14" /><Text as="label" size="2" weight="medium">Logo URL</Text></Flex>
                <TextField.Root type="url" name="logo" value={fd.logo} onChange={onChange} placeholder="https://example.com/logo.png" />
                {fd.logo && <Card variant="surface" mt="2"><img src={fd.logo} alt="Preview" style={{ height: 64, objectFit: "contain" }} onError={(e) => (e.target.style.display = "none")} /></Card>}
              </Box>
              {isEdit && <Box><Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>Discord Webhook</Text><TextField.Root name="discordWebhook" value={fd.discordWebhook} onChange={onChange} placeholder="Optional webhook URL" /></Box>}
              <Flex gap="4" pt="2">
                <Button type="button" variant="soft" onClick={() => navigate(-1)} style={{ flex: 1 }}>Cancel</Button>
                <Button type="submit" disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Create Organizer"}</Button>
              </Flex>
            </Flex>
          </form>
        </Card>
      </Box>
    </Box>
  );
};

export default OrganizerForm;
