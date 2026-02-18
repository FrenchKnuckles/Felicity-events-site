import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Button, Heading, TextField, TextArea, Select, Spinner } from "@radix-ui/themes";
import { ArrowLeftIcon, PersonIcon, EnvelopeClosedIcon, ImageIcon, FileTextIcon, MobileIcon } from "@radix-ui/react-icons";

const categories = [
  { value: "club", label: "Club" },
  { value: "council", label: "Council" },
  { value: "fest-team", label: "Fest Team" },
  { value: "other", label: "Other" },
];

const EditOrganizer = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    const loadOrganizer = async () => {
      setLoading(true);
      try {
        const data = await adminService.getOrganizerById(id);
        const organizer = data?.organizer || data;

        setFormData({
          name: organizer?.name || "",
          contactEmail: organizer?.contactEmail || organizer?.userId?.email || "",
          description: organizer?.description || "",
          logo: organizer?.logo || "",
          category: organizer?.category || "club",
          contactNumber: organizer?.contactNumber || "",
          discordWebhook: organizer?.discordWebhook || "",
        });
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load organizer");
      } finally {
        setLoading(false);
      }
    };

    loadOrganizer();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contactEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setSaving(true);
    try {
      await adminService.updateOrganizer(id, {
        name: formData.name,
        contactEmail: formData.contactEmail,
        description: formData.description,
        logo: formData.logo,
        category: formData.category,
        contactNumber: formData.contactNumber,
        discordWebhook: formData.discordWebhook,
      });
      toast.success("Organizer updated successfully");
      navigate("/admin/organizers");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update organizer");
    } finally {
      setSaving(false);
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
      <Button variant="ghost" onClick={() => navigate(-1)} mb="6">
        <ArrowLeftIcon width="16" height="16" />
        <Text>Edit Organizer</Text>
      </Button>

      <Box style={{ maxWidth: "720px", margin: "0 auto" }}>
        <Flex direction="column" align="center" mb="6">
          <Flex
            align="center"
            justify="center"
            style={{ width: "64px", height: "64px", backgroundColor: "var(--purple-3)", borderRadius: "50%" }}
            mb="4"
          >
            <PersonIcon width="32" height="32" color="var(--purple-9)" />
          </Flex>
          <Heading size="6" mb="1">Edit Organizer</Heading>
          <Text color="gray">Update organizer details and contact information</Text>
        </Flex>

        <Card size="3">
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="5">
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
                  onChange={handleChange}
                  rows={3}
                  placeholder="Brief description"
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
                <Select.Root value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
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
                  placeholder="Optional webhook URL"
                />
              </Box>

              <Flex gap="4" pt="4">
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => navigate(-1)}
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
      </Box>
    </Box>
  );
};

export default EditOrganizer;
