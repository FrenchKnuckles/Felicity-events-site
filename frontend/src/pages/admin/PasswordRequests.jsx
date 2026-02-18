import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Button, Heading, Badge, TextField, Dialog, Spinner } from "@radix-ui/themes";
import { ArrowLeftIcon, LockClosedIcon, CheckCircledIcon, CrossCircledIcon, ClockIcon, PersonIcon, EnvelopeClosedIcon, MixerHorizontalIcon, ReloadIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

const PasswordRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [processing, setProcessing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState("");

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      const params = statusFilter === "all" ? {} : { status: statusFilter };
      const response = await adminService.getPasswordRequests(params);
      setRequests(Array.isArray(response) ? response : []);
    } catch (error) {
      toast.error("Failed to fetch password requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setModalAction("approve");
    setGeneratedPassword("");
    setShowModal(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setModalAction("reject");
    setShowModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest) return;

    setProcessing(selectedRequest._id);
    try {
      const result = await adminService.handlePasswordRequest(selectedRequest._id, "approve");
      if (result.newPassword) {
        setGeneratedPassword(result.newPassword);
        toast.success("Password reset approved — copy the new password below");
      } else {
        toast.success("Password reset approved");
        setShowModal(false);
        setSelectedRequest(null);
      }
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve request");
    } finally {
      setProcessing(null);
    }
  };

  const confirmReject = async () => {
    if (!selectedRequest) return;

    setProcessing(selectedRequest._id);
    try {
      await adminService.handlePasswordRequest(selectedRequest._id, "reject");
      toast.success("Password request rejected");
      setShowModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject request");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "orange",
      approved: "green",
      rejected: "red",
    };
    return colors[status] || "gray";
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: ClockIcon,
      approved: CheckCircledIcon,
      rejected: CrossCircledIcon,
    };
    return icons[status] || ClockIcon;
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
      <Flex direction={{ initial: "column", md: "row" }} justify="between" align={{ md: "center" }} mb="6" gap="4">
        <Box>
          <Button variant="ghost" onClick={() => navigate(-1)} mb="2">
            <ArrowLeftIcon width="16" height="16" />
            <Text>Back</Text>
          </Button>
          <Heading size="6">Password Reset Requests</Heading>
          <Text color="gray">Manage password reset requests from organizers</Text>
        </Box>

        <Button variant="soft" onClick={fetchRequests}>
          <ReloadIcon width="16" height="16" />
          <Text>Refresh</Text>
        </Button>
      </Flex>

      {/* Filter */}
      <Card mb="6">
        <Flex align="center" gap="4">
          <MixerHorizontalIcon width="20" height="20" color="gray" />
          <Flex gap="2">
            {["pending", "approved", "rejected", "all"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "solid" : "soft"}
                onClick={() => setStatusFilter(status)}
                style={{ textTransform: "capitalize" }}
              >
                {status}
              </Button>
            ))}
          </Flex>
        </Flex>
      </Card>

      {/* Requests List */}
      {requests.length > 0 ? (
        <Flex direction="column" gap="4">
          {requests.map((request) => {
            const StatusIcon = getStatusIcon(request.status);
            return (
              <Card key={request._id}>
                <Flex direction={{ initial: "column", md: "row" }} justify="between" align={{ md: "center" }} gap="4">
                  <Flex gap="4" align="start">
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        padding: "12px",
                        backgroundColor: "var(--gray-3)",
                        borderRadius: "50%",
                      }}
                    >
                      <PersonIcon width="24" height="24" color="gray" />
                    </Flex>
                    <Box>
                      <Text weight="medium" size="3">
                        {request.organizerId?.name || "Unknown Organizer"}
                      </Text>
                      <Flex align="center" gap="1" mt="1">
                        <EnvelopeClosedIcon width="14" height="14" color="gray" />
                        <Text size="2" color="gray">{request.userId?.email || "N/A"}</Text>
                      </Flex>
                      <Flex align="center" gap="3" mt="2">
                        <Badge color={getStatusColor(request.status)}>
                          <StatusIcon width="14" height="14" />
                          <Text style={{ textTransform: "capitalize" }}>{request.status}</Text>
                        </Badge>
                        <Text size="2" color="gray">
                          Requested{" "}
                          {request.createdAt &&
                            format(new Date(request.createdAt), "MMM d, yyyy 'at' HH:mm")}
                        </Text>
                      </Flex>
                      {request.reason && (
                        <Text size="2" color="gray" mt="2">
                          <Text weight="medium">Reason:</Text> {request.reason}
                        </Text>
                      )}
                    </Box>
                  </Flex>

                  {request.status === "pending" && (
                    <Flex gap="2">
                      <Button
                        color="green"
                        onClick={() => handleApprove(request)}
                        disabled={processing === request._id}
                      >
                        <CheckCircledIcon width="16" height="16" />
                        <Text>Approve</Text>
                      </Button>
                      <Button
                        color="red"
                        onClick={() => handleReject(request)}
                        disabled={processing === request._id}
                      >
                        <CrossCircledIcon width="16" height="16" />
                        <Text>Reject</Text>
                      </Button>
                    </Flex>
                  )}

                  {request.status !== "pending" && (
                    <Box>
                      {request.processedAt && (
                        <Text size="2" color="gray">
                          Processed {format(new Date(request.processedAt), "MMM d, yyyy")}
                        </Text>
                      )}
                    </Box>
                  )}
                </Flex>
              </Card>
            );
          })}
        </Flex>
      ) : (
        <Card>
          <Flex direction="column" align="center" py="8">
            <LockClosedIcon width="64" height="64" color="gray" style={{ marginBottom: "16px" }} />
            <Heading size="4" mb="2">No requests found</Heading>
            <Text color="gray">
              {statusFilter === "pending"
                ? "No pending password reset requests"
                : `No ${statusFilter} requests`}
            </Text>
          </Flex>
        </Card>
      )}

      {/* Modal */}
      <Dialog.Root open={showModal} onOpenChange={setShowModal}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Flex gap="3" align="center" mb="4">
            <Flex
              align="center"
              justify="center"
              style={{
                padding: "12px",
                backgroundColor: modalAction === "approve" ? "var(--green-3)" : "var(--red-3)",
                borderRadius: "50%",
              }}
            >
              {modalAction === "approve" ? (
                <CheckCircledIcon width="24" height="24" color="green" />
              ) : (
                <ExclamationTriangleIcon width="24" height="24" color="red" />
              )}
            </Flex>
            <Dialog.Title>
              {modalAction === "approve" ? "Approve Request" : "Reject Request"}
            </Dialog.Title>
          </Flex>

          {modalAction === "approve" ? (
            <>
              {generatedPassword ? (
                <Box mb="4">
                  <Text color="green" weight="medium" mb="2">Password reset successful!</Text>
                  <Text size="2" color="gray" mb="2">Copy this temporary password and share it with the organizer:</Text>
                  <Card style={{ backgroundColor: "var(--gray-3)", fontFamily: "monospace" }}>
                    <Text size="4" weight="bold">{generatedPassword}</Text>
                  </Card>
                </Box>
              ) : (
                <Text color="gray" mb="4">
                  Approve the password reset request from{" "}
                  <Text weight="medium">{selectedRequest?.organizerId?.name}</Text>?
                  A new temporary password will be generated automatically.
                </Text>
              )}
            </>
          ) : (
            <Text color="gray" mb="6">
              Are you sure you want to reject the password reset request from{" "}
              <Text weight="medium">{selectedRequest?.organizerId?.name}</Text>?
            </Text>
          )}

          <Flex gap="4">
            <Button
              variant="soft"
              onClick={() => {
                setShowModal(false);
                setSelectedRequest(null);
                setGeneratedPassword("");
              }}
              disabled={processing}
              style={{ flex: 1 }}
            >
              {generatedPassword ? "Close" : "Cancel"}
            </Button>
            {!generatedPassword && (
              <Button
                color={modalAction === "approve" ? "green" : "red"}
                onClick={modalAction === "approve" ? confirmApprove : confirmReject}
                disabled={processing}
                style={{ flex: 1 }}
              >
                {processing
                  ? "Processing..."
                  : modalAction === "approve"
                  ? "Approve"
                  : "Reject"}
              </Button>
            )}
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default PasswordRequests;
