import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Button, Heading, Badge, Dialog, Spinner } from "@radix-ui/themes";
import { ArrowLeftIcon, LockClosedIcon, CheckCircledIcon, CrossCircledIcon, ClockIcon, PersonIcon, EnvelopeClosedIcon, MixerHorizontalIcon, ReloadIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

const stColor = { pending: "orange", approved: "green", rejected: "red" };
const stIcon = { pending: ClockIcon, approved: CheckCircledIcon, rejected: CrossCircledIcon };

const PasswordRequests = () => {
  const navigate = useNavigate();
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [processing, setProcessing] = useState(null);
  const [modal, setModal] = useState(false);
  const [action, setAction] = useState(null);
  const [selReq, setSelReq] = useState(null);
  const [genPwd, setGenPwd] = useState("");

  const fetch = async () => { try { const r = await adminService.getPasswordRequests(filter === "all" ? {} : { status: filter }); setReqs(Array.isArray(r) ? r : []); } catch { toast.error("Failed to fetch password requests"); } finally { setLoading(false); } };
  useEffect(() => { fetch(); }, [filter]);

  const openModal = (req, act) => { setSelReq(req); setAction(act); setGenPwd(""); setModal(true); };

  const confirm = async () => {
    if (!selReq) return; setProcessing(selReq._id);
    try {
      if (action === "approve") { const r = await adminService.handlePasswordRequest(selReq._id, "approve"); if (r.newPassword) { setGenPwd(r.newPassword); toast.success("Password reset approved — copy the new password below"); } else { toast.success("Password reset approved"); setModal(false); setSelReq(null); } }
      else { await adminService.handlePasswordRequest(selReq._id, "reject"); toast.success("Password request rejected"); setModal(false); setSelReq(null); }
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || `Failed to ${action} request`); } finally { setProcessing(null); }
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "50vh" }}><Spinner size="3" /></Flex>;

  return (
    <Box p="6">
      <Flex direction={{ initial: "column", md: "row" }} justify="between" align={{ md: "center" }} mb="6" gap="4">
        <Box><Button variant="ghost" onClick={() => navigate(-1)} mb="2"><ArrowLeftIcon width="16" height="16" /><Text>Back</Text></Button><Heading size="6">Password Reset Requests</Heading><Text color="gray">Manage password reset requests from organizers</Text></Box>
        <Button variant="soft" onClick={fetch}><ReloadIcon width="16" height="16" /><Text>Refresh</Text></Button>
      </Flex>

      <Card mb="6"><Flex align="center" gap="4"><MixerHorizontalIcon width="20" height="20" color="gray" /><Flex gap="2">
        {["pending", "approved", "rejected", "all"].map(s => <Button key={s} variant={filter === s ? "solid" : "soft"} onClick={() => setFilter(s)} style={{ textTransform: "capitalize" }}>{s}</Button>)}
      </Flex></Flex></Card>

      {reqs.length > 0 ? <Flex direction="column" gap="4">{reqs.map(r => { const SI = stIcon[r.status] || ClockIcon; return (
        <Card key={r._id}><Flex direction={{ initial: "column", md: "row" }} justify="between" align={{ md: "center" }} gap="4">
          <Flex gap="4" align="start">
            <Flex align="center" justify="center" style={{ padding: 12, backgroundColor: "var(--gray-3)", borderRadius: "50%" }}><PersonIcon width="24" height="24" color="gray" /></Flex>
            <Box><Text weight="medium" size="3">{r.organizerId?.name || "Unknown Organizer"}</Text>
              <Flex align="center" gap="1" mt="1"><EnvelopeClosedIcon width="14" height="14" color="gray" /><Text size="2" color="gray">{r.userId?.email || "N/A"}</Text></Flex>
              <Flex align="center" gap="3" mt="2"><Badge color={stColor[r.status] || "gray"}><SI width="14" height="14" /><Text style={{ textTransform: "capitalize" }}>{r.status}</Text></Badge><Text size="2" color="gray">Requested: {r.createdAt && format(new Date(r.createdAt), "MMM d, yyyy 'at' HH:mm")}</Text></Flex>
              {r.reason && <Text size="2" color="gray" mt="2"><Text weight="medium">Reason:</Text> {r.reason}</Text>}
            </Box>
          </Flex>
          {r.status === "pending" ? <Flex gap="2"><Button color="green" onClick={() => openModal(r, "approve")} disabled={processing === r._id}><CheckCircledIcon width="16" height="16" /><Text>Approve</Text></Button><Button color="red" onClick={() => openModal(r, "reject")} disabled={processing === r._id}><CrossCircledIcon width="16" height="16" /><Text>Reject</Text></Button></Flex>
          : <Box>{r.processedAt && <Text size="2" color="gray">Processed: {format(new Date(r.processedAt), "MMM d, yyyy")}</Text>}</Box>}
        </Flex></Card>); })}</Flex>
      : <Card><Flex direction="column" align="center" py="8"><LockClosedIcon width="64" height="64" color="gray" style={{ marginBottom: 16 }} /><Heading size="4" mb="2">No requests found</Heading><Text color="gray">{filter === "pending" ? "No pending password reset requests" : `No ${filter} requests`}</Text></Flex></Card>}

      <Dialog.Root open={modal} onOpenChange={setModal}><Dialog.Content style={{ maxWidth: 450 }}>
        <Flex gap="3" align="center" mb="4"><Flex align="center" justify="center" style={{ padding: 12, backgroundColor: action === "approve" ? "var(--green-3)" : "var(--red-3)", borderRadius: "50%" }}>{action === "approve" ? <CheckCircledIcon width="24" height="24" color="green" /> : <ExclamationTriangleIcon width="24" height="24" color="red" />}</Flex><Dialog.Title>{action === "approve" ? "Approve Request" : "Reject Request"}</Dialog.Title></Flex>
        {action === "approve" ? <>{genPwd ? <Box mb="4"><Text color="green" weight="medium" mb="2">Password reset successful!</Text><Text size="2" color="gray" mb="2">Copy this temporary password and share it with the organizer:</Text><Card style={{ backgroundColor: "var(--gray-3)", fontFamily: "monospace" }}><Text size="4" weight="bold">{genPwd}</Text></Card></Box>
          : <Text color="gray" mb="4">Approve the password reset request from <Text weight="medium">{selReq?.organizerId?.name}</Text>? A new temporary password will be generated automatically.</Text>}</>
        : <Text color="gray" mb="6">Are you sure you want to reject the password reset request from <Text weight="medium">{selReq?.organizerId?.name}</Text>?</Text>}
        <Flex gap="4"><Button variant="soft" onClick={() => { setModal(false); setSelReq(null); setGenPwd(""); }} disabled={processing} style={{ flex: 1 }}>{genPwd ? "Close" : "Cancel"}</Button>
          {!genPwd && <Button color={action === "approve" ? "green" : "red"} onClick={confirm} disabled={processing} style={{ flex: 1 }}>{processing ? "Processing..." : action === "approve" ? "Approve" : "Reject"}</Button>}</Flex>
      </Dialog.Content></Dialog.Root>
    </Box>
  );
};

export default PasswordRequests;
