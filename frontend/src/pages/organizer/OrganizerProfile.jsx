import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
import {
  Box,
  Card,
  Flex,
  Text,
  Button,
  Heading,
  TextField,
  TextArea,
  Select,
  Spinner,
  Dialog,
  Badge,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  PersonIcon,
  EnvelopeClosedIcon,
  MobileIcon,
  FileTextIcon,
  ImageIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";

const categories = [
  { value: "club", label: "Club" },
  { value: "council", label: "Council" },
  { value: "fest-team", label: "Fest Team" },
  { value: "other", label: "Other" },
];

const OrganizerProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contactEmail: "",
    description: "",
    logo: "",
    category: "club",
    contactNumber: "",
    discordWebhook: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await organizerService.getProfile();
        const org = data?.organizer || data;
        setFormData({
          name: org?.name || "",
          contactEmail: org?.contactEmail || "",
          description: org?.description || "",
          logo: org?.logo || "",
          category: org?.category || "club",
          contactNumber: org?.contactNumber || "",
          discordWebhook: org?.discordWebhook || "",
        });
      } catch (error) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contactEmail.trim()) {
      toast.error("Name and contact email are required");
      return;
    }

    setSaving(true);
    try {
      await organizerService.updateProfile({
        name: formData.name,
        contactEmail: formData.contactEmail,
        description: formData.description,
        logo: formData.logo,
        category: formData.category,
        contactNumber: formData.contactNumber,
        discordWebhook: formData.discordWebhook,
      });
      toast.success("Profile updated successfully");
      navigate("/organizer/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!resetReason.trim() || resetReason.trim().length < 10) {
      toast.error("Please provide a reason (at least 10 characters)");
      return;
    }

    setSubmittingReset(true);
    try {
      await organizerService.requestPasswordReset(resetReason.trim());
      toast.success("Password reset request submitted! An admin will review it.");
      setResetDialogOpen(false);
      setResetReason("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmittingReset(false);
    }
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "60vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Box p="6">
      <Button variant="ghost" onClick={() => navigate("/organizer/dashboard")} mb="6">
        <ArrowLeftIcon width="16" height="16" />
        <Text>Back to Dashboard</Text>
      </Button>

      <Box style={{ maxWidth: "720px", margin: "0 auto" }}>
        <Flex direction="column" align="center" mb="6">
          <Flex
            align="center"
            justify="center"
            style={{
              width: "64px",
              height: "64px",
              backgroundColor: "var(--green-3)",
              borderRadius: "50%",
            }}
            mb="4"
          >
            <PersonIcon width="32" height="32" color="var(--green-9)" />
          </Flex>
          <Heading size="6" mb="1">Edit Profile</Heading>
          <Text color="gray">Update your organization details and contact information</Text>
        </Flex>

        <Card size="3">
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="5">
              <Box>
                <Flex align="center" gap="1" mb="2">
                  <LockClosedIcon width="14" height="14" />
                  <Text as="label" size="2" weight="medium">Login Email (non-editable)</Text>
                </Flex>
                <TextField.Root
                  type="email"
                  value={user?.email || ""}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </Box>

              <Box>
                <Flex align="center" gap="1" mb="2">
                  <PersonIcon width="14" height="14" />
                  <Text as="label" size="2" weight="medium">Organization Name *</Text>
                </Flex>
                <TextField.Root
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Organization name"
                />
              </Box>

              <Box>
                <Flex align="center" gap="1" mb="2">
                  <EnvelopeClosedIcon width="14" height="14" />
                  <Text as="label" size="2" weight="medium">Contact Email *</Text>
                </Flex>
                <TextField.Root
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="organizer@example.com"
                />
              </Box>

              <Box>
                <Flex align="center" gap="1" mb="2">
                  <MobileIcon width="14" height="14" />
                  <Text as="label" size="2" weight="medium">Contact Number</Text>
                </Flex>
                <TextField.Root
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="Optional contact number"
                />
              </Box>

              <Box>
                <Flex align="center" gap="1" mb="2">
                  <FileTextIcon width="14" height="14" />
                  <Text as="label" size="2" weight="medium">Description</Text>
                </Flex>
                <TextArea
                  name="description"
                  value={formData.description}
                  onChange={(e) => handleChange(e)}
                  rows={3}
                  placeholder="Brief description of your organization"
                />
              </Box>

              <Box>
                <Flex align="center" gap="1" mb="2">
                  <ImageIcon width="14" height="14" />
                  <Text as="label" size="2" weight="medium">Logo URL</Text>
                </Flex>
                <TextField.Root
                  type="url"
                  name="logo"
                  value={formData.logo}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                />
                {formData.logo && (
                  <Card variant="surface" mt="2">
                    <Text size="2" color="gray">Logo preview</Text>
                    <img
                      src={formData.logo}
                      alt="Logo preview"
                      style={{ height: "64px", objectFit: "contain", marginTop: "8px" }}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </Card>
                )}
              </Box>

              <Box>
                <Flex align="center" gap="1" mb="2">
                  <Text as="label" size="2" weight="medium">Category</Text>
                </Flex>
                <Select.Root
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <Select.Trigger placeholder="Select category" />
                  <Select.Content>
                    {categories.map((cat) => (
                      <Select.Item key={cat.value} value={cat.value}>
                        {cat.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>

              <Box>
                <Flex align="center" gap="1" mb="2">
                  <Text as="label" size="2" weight="medium">Discord Webhook</Text>
                </Flex>
                <TextField.Root
                  name="discordWebhook"
                  value={formData.discordWebhook}
                  onChange={handleChange}
                  placeholder="Optional webhook URL for event notifications"
                />
              </Box>

              <Flex gap="4" pt="4">
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => navigate("/organizer/dashboard")}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} style={{ flex: 1 }}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Card>

        {/* Password Reset Request Section */}
        <Card size="3" mt="6" style={{ border: "1px solid var(--red-6)" }}>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="2">
              <LockClosedIcon width="20" height="20" color="var(--red-9)" />
              <Heading size="4">Password Reset</Heading>
            </Flex>
            <Text size="2" color="gray">
              Need to change your password? Submit a request to the admin. Once approved, your password will be reset and provided to you.
            </Text>

            <Dialog.Root open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <Dialog.Trigger>
                <Button variant="outline" color="red">
                  <LockClosedIcon width="14" height="14" />
                  Request Password Reset
                </Button>
              </Dialog.Trigger>

              <Dialog.Content style={{ maxWidth: 450 }}>
                <Dialog.Title>Request Password Reset</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                  Provide a reason for your password reset request. An admin will review and approve it.
                </Dialog.Description>

                <Flex direction="column" gap="3">
                  <Box>
                    <Text as="label" size="2" weight="medium" mb="1" style={{ display: "block" }}>
                      Reason *
                    </Text>
                    <TextArea
                      value={resetReason}
                      onChange={(e) => setResetReason(e.target.value)}
                      placeholder="Explain why you need a password reset (min 10 characters)..."
                      rows={3}
                    />
                    <Text size="1" color={resetReason.trim().length >= 10 ? "green" : "gray"} mt="1">
                      {resetReason.trim().length}/10 characters minimum
                    </Text>
                  </Box>
                </Flex>

                <Flex gap="3" mt="4" justify="end">
                  <Dialog.Close>
                    <Button variant="soft" color="gray">Cancel</Button>
                  </Dialog.Close>
                  <Button
                    color="red"
                    onClick={handleRequestPasswordReset}
                    disabled={submittingReset || resetReason.trim().length < 10}
                  >
                    {submittingReset ? "Submitting..." : "Submit Request"}
                  </Button>
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
