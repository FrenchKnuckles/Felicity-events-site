import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Button, Heading, Grid, Spinner, TextField, Dialog, Badge, Select } from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  AvatarIcon,
  EnvelopeClosedIcon,
  CalendarIcon,
  TrashIcon,
  Pencil1Icon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
  CrossCircledIcon,
} from "@radix-ui/react-icons";
import { format } from "date-fns";

const ManageOrganizers = () => {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filteredOrganizers, setFilteredOrganizers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchOrganizers();
  }, []);

  useEffect(() => {
    filterOrganizers();
  }, [organizers, search, statusFilter]);

  const fetchOrganizers = async () => {
    try {
      const response = await adminService.getOrganizers();
      // API returns an array; fall back to .organizers for safety
      const list = Array.isArray(response) ? response : response?.organizers || [];
      setOrganizers(list);
    } catch (error) {
      toast.error("Failed to fetch organizers");
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizers = () => {
    let filtered = [...organizers];

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((org) => org.isActive !== false);
    } else if (statusFilter === "disabled") {
      filtered = filtered.filter((org) => org.isActive === false);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (org) =>
          org.name?.toLowerCase().includes(searchLower) ||
          org.contactEmail?.toLowerCase().includes(searchLower) ||
          org.userId?.email?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredOrganizers(filtered);
  };

  const handleDeleteClick = (organizer) => {
    setSelectedOrganizer(organizer);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!selectedOrganizer) return;

    setDeleting(true);
    try {
      await adminService.deleteOrganizer(selectedOrganizer._id);
      toast.success("Organizer permanently deleted");
      setShowDeleteModal(false);
      setSelectedOrganizer(null);
      fetchOrganizers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete organizer");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (organizer) => {
    const isCurrentlyActive = organizer.isActive !== false;
    try {
      if (isCurrentlyActive) {
        await adminService.disableOrganizer(organizer._id);
        toast.success(`${organizer.name} has been disabled`);
      } else {
        await adminService.enableOrganizer(organizer._id);
        toast.success(`${organizer.name} has been re-enabled`);
      }
      fetchOrganizers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update organizer status");
    }
  };

  const handleResetPassword = async (organizerId) => {
    try {
      const response = await adminService.resetOrganizerPassword(organizerId);
      const tempPwd = response.temporaryPassword;

      // Attempt to copy to clipboard for convenience
      if (tempPwd && navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(tempPwd);
          toast.success("Temporary password copied to clipboard");
          return;
        } catch (copyErr) {
          console.warn("Clipboard write failed", copyErr);
        }
      }

      window.prompt("Copy the temporary password:", tempPwd);
      toast.success("Temporary password generated. Copy it from the prompt.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    }
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "50vh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Box p="6">
      {/* Header */}
      <Flex direction={{ initial: "column", md: "row" }} align={{ md: "center" }} justify="between" mb="6">
        <Box>
          <Flex
            align="center"
            gap="2"
            mb="2"
            onClick={() => navigate(-1)}
            style={{ cursor: "pointer", color: "var(--gray-11)" }}
          >
            <ArrowLeftIcon width={20} height={20} />
            <Text size="2">Back</Text>
          </Flex>
          <Heading size="6" weight="bold">Manage Organizers</Heading>
          <Text color="gray" size="2">
            {organizers.length} organizers registered
            {organizers.filter((o) => o.isActive === false).length > 0 &&
              ` · ${organizers.filter((o) => o.isActive === false).length} disabled`}
          </Text>
        </Box>

        <Link to="/admin/organizers/create" style={{ textDecoration: "none" }}>
          <Button size="3" mt={{ initial: "4", md: "0" }}>
            <PlusIcon width={20} height={20} />
            Add Organizer
          </Button>
        </Link>
      </Flex>

      {/* Search & Filter */}
      <Card mb="6" style={{ padding: "16px" }}>
        <Flex gap="3" direction={{ initial: "column", sm: "row" }}>
          <Box style={{ flex: 1 }}>
            <TextField.Root
              size="3"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            >
              <TextField.Slot>
                <MagnifyingGlassIcon width={20} height={20} />
              </TextField.Slot>
            </TextField.Root>
          </Box>
          <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
            <Select.Trigger placeholder="Status" />
            <Select.Content>
              <Select.Item value="all">All</Select.Item>
              <Select.Item value="active">Active</Select.Item>
              <Select.Item value="disabled">Disabled</Select.Item>
            </Select.Content>
          </Select.Root>
        </Flex>
      </Card>

      {/* Organizers Grid */}
      <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="4">
        {filteredOrganizers.length > 0 ? (
          filteredOrganizers.map((organizer) => {
            const isActive = organizer.isActive !== false;

            return (
              <Card
                key={organizer._id}
                style={{
                  padding: "20px",
                  opacity: isActive ? 1 : 0.7,
                  border: !isActive ? "1px solid var(--red-6)" : undefined,
                }}
              >
                <Flex align="start" justify="between" mb="4">
                  <Flex align="center" gap="3">
                    <Box
                      style={{
                        padding: "12px",
                        backgroundColor: isActive ? "var(--purple-3)" : "var(--gray-3)",
                        borderRadius: "50%",
                      }}
                    >
                      <AvatarIcon width={24} height={24} color={isActive ? "var(--purple-9)" : "var(--gray-9)"} />
                    </Box>
                    <Box>
                      <Flex align="center" gap="2">
                        <Text weight="medium" style={{ display: "block" }}>{organizer.name}</Text>
                        <Badge color={isActive ? "green" : "red"} size="1">
                          {isActive ? "Active" : "Disabled"}
                        </Badge>
                      </Flex>
                      <Flex align="center" gap="1">
                        <EnvelopeClosedIcon width={14} height={14} color="var(--gray-9)" />
                        <Text size="1" color="gray">{organizer.contactEmail || organizer.userId?.email}</Text>
                      </Flex>
                    </Box>
                  </Flex>
                </Flex>

                {organizer.description && (
                  <Text
                    size="2"
                    color="gray"
                    mb="4"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {organizer.description}
                  </Text>
                )}

                <Flex align="center" justify="between" mb="4">
                  <Flex align="center" gap="1">
                    <CalendarIcon width={16} height={16} color="var(--gray-9)" />
                    <Text size="2" color="gray">{organizer.eventCount ?? organizer.events?.length ?? 0} events</Text>
                  </Flex>
                  <Flex align="center" gap="1">
                    <Badge color={organizer.category === "club" ? "blue" : organizer.category === "council" ? "purple" : "orange"} size="1" variant="soft">
                      {organizer.category || "club"}
                    </Badge>
                  </Flex>
                </Flex>

                <Box style={{ borderTop: "1px solid var(--gray-5)", paddingTop: "16px" }}>
                  <Flex align="center" gap="2" wrap="wrap">
                    <Button
                      variant="soft"
                      size="1"
                      style={{ flex: 1 }}
                      onClick={() => navigate(`/admin/organizers/${organizer._id}/edit`)}
                    >
                      <Pencil1Icon width={14} height={14} />
                      Edit
                    </Button>
                    <Button
                      variant="soft"
                      size="1"
                      onClick={() => handleResetPassword(organizer._id)}
                      title="Reset Password"
                    >
                      <LockClosedIcon width={14} height={14} />
                    </Button>
                    <Button
                      variant="soft"
                      size="1"
                      color={isActive ? "orange" : "green"}
                      onClick={() => handleToggleActive(organizer)}
                      title={isActive ? "Disable (archive)" : "Re-enable"}
                    >
                      {isActive ? (
                        <CrossCircledIcon width={14} height={14} />
                      ) : (
                        <CheckCircledIcon width={14} height={14} />
                      )}
                      {isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="soft"
                      size="1"
                      color="red"
                      onClick={() => handleDeleteClick(organizer)}
                      title="Permanently delete"
                    >
                      <TrashIcon width={14} height={14} />
                    </Button>
                  </Flex>
                </Box>
              </Card>
            );
          })
        ) : (
          <Box style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0" }}>
            <AvatarIcon width={64} height={64} color="var(--gray-5)" style={{ margin: "0 auto", display: "block" }} />
            <Heading size="4" mt="4" mb="2">No organizers found</Heading>
            <Text color="gray" mb="4" style={{ display: "block" }}>
              {search || statusFilter !== "all" ? "Try different filters" : "Get started by adding an organizer"}
            </Text>
            {!search && statusFilter === "all" && (
              <Link to="/admin/organizers/create" style={{ textDecoration: "none" }}>
                <Button>Add Organizer</Button>
              </Link>
            )}
          </Box>
        )}
      </Grid>

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <Dialog.Content maxWidth="450px">
          <Flex align="center" gap="3" mb="4">
            <Box
              style={{
                padding: "12px",
                backgroundColor: "var(--red-3)",
                borderRadius: "50%",
              }}
            >
              <ExclamationTriangleIcon width={24} height={24} color="var(--red-9)" />
            </Box>
            <Dialog.Title>Permanently Delete Organizer</Dialog.Title>
          </Flex>

          <Dialog.Description size="2" mb="4">
            Are you sure you want to <Text weight="bold" color="red">permanently delete</Text>{" "}
            <Text weight="bold">{selectedOrganizer?.name}</Text>? This will remove their user
            account and all associated data. This action cannot be undone.
          </Dialog.Description>

          <Text size="2" color="gray" mb="4" style={{ display: "block" }}>
            Tip: If you just want to prevent login access, use the Disable button instead.
          </Text>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" disabled={deleting}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button color="red" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default ManageOrganizers;
