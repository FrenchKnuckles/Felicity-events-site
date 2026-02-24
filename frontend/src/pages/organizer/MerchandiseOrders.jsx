import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { Box, Card, Flex, Text, Button, Heading, Grid, Spinner, Select } from "@radix-ui/themes";
import { MixerHorizontalIcon, EnvelopeClosedIcon, CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";

const orderStatusColor = s => ({ pending: "orange", confirmed: "green", rejected: "red", cancelled: "gray" }[s] || "gray");

const MerchandiseOrders = () => {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actioningId, setActioningId] = useState(null);

  const fetchOrders = async (status) => {
    setLoading(true);
    try {
      const params = {};
      if (status && status !== "all") params.status = status;
      const res = await organizerService.getMerchandiseOrders(id, params);
      setOrders(res?.orders || []);
      setCounts(res?.counts || {});
    } catch (e) {
      toast.error("Failed to load merchandise orders");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (ticketId) => {
    setActioningId(ticketId);
    try {
      await organizerService.approveMerchandiseOrder(id, ticketId);
      toast.success("Order approved! Ticket generated & email sent.");
      fetchOrders(statusFilter);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to approve order");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (ticketId) => {
    setActioningId(ticketId);
    try {
      await organizerService.rejectMerchandiseOrder(id, ticketId);
      toast.success("Order rejected.");
      fetchOrders(statusFilter);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to reject order");
    } finally {
      setActioningId(null);
    }
  };

  useEffect(() => { fetchOrders(statusFilter); }, [id]);

  return (
    <Box p="6">
      <Heading size="6" mb="4">Merchandise Orders</Heading>
      <Grid columns={{ initial: "2", md: "4" }} gap="4" mb="4">
        {[
          { l: "Pending", v: counts.pending ?? 0, c: "orange" },
          { l: "Approved", v: counts.confirmed ?? 0, c: "green" },
          { l: "Rejected", v: counts.rejected ?? 0, c: "red" },
          { l: "Cancelled", v: counts.cancelled ?? 0, c: "gray" },
        ].map(s => (
          <Card key={s.l}><Flex direction="column" align="center"><Text size="5" weight="bold" color={s.c}>{s.v}</Text><Text size="2" color="gray">{s.l}</Text></Flex></Card>
        ))}
      </Grid>

      <Card mb="4">
        <Flex align="center" gap="3">
          <MixerHorizontalIcon width="16" height="16" color="gray" />
          <Select.Root value={statusFilter} onValueChange={v => { setStatusFilter(v); fetchOrders(v); }}>
            <Select.Trigger placeholder="Filter by status" />
            <Select.Content>
              <Select.Item value="all">All Orders</Select.Item>
              <Select.Item value="pending">Pending</Select.Item>
              <Select.Item value="confirmed">Approved</Select.Item>
              <Select.Item value="rejected">Rejected</Select.Item>
              <Select.Item value="cancelled">Cancelled</Select.Item>
            </Select.Content>
          </Select.Root>
          <Button variant="soft" size="1" onClick={() => fetchOrders(statusFilter)}>Refresh</Button>
        </Flex>
      </Card>

      <Card>
        {loading ? (
          <Flex align="center" justify="center" py="6"><Spinner size="2" /></Flex>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Buyer</th>
                <th style={{ textAlign: "left", padding: 8 }}>Variant</th>
                <th style={{ textAlign: "right", padding: 8 }}>Amount</th>
                <th style={{ textAlign: "center", padding: 8 }}>Payment Proof</th>
                <th style={{ textAlign: "center", padding: 8 }}>Status</th>
                <th style={{ textAlign: "right", padding: 8 }}>Date</th>
                <th style={{ textAlign: "center", padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? orders.map(o => (
                <tr key={o._id}>
                  <td style={{ padding: 8 }}>
                    <Box>
                      <Text weight="medium" size="2">{o.userId?.firstName} {o.userId?.lastName}</Text>
                      <Flex align="center" gap="1"><EnvelopeClosedIcon width="12" height="12" color="gray" /><Text size="1" color="gray">{o.userId?.email || "N/A"}</Text></Flex>
                    </Box>
                  </td>
                  <td style={{ padding: 8 }}><Text size="2">{o.variant?.size} {o.variant?.color}</Text></td>
                  <td style={{ padding: 8, textAlign: "right" }}><Text size="2" weight="medium">₹{o.amount}</Text></td>
                  <td style={{ padding: 8, textAlign: "center" }}>
                    {o.paymentProofUrl ? (
                      <a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                        <img src={o.paymentProofUrl} alt="Proof" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4, border: "1px solid var(--gray-6)", cursor: "pointer" }} />
                      </a>
                    ) : <Text size="1" color="gray">None</Text>}
                  </td>
                  <td style={{ padding: 8, textAlign: "center" }}><Badge color={orderStatusColor(o.status)} size="1">{o.status === "confirmed" ? "Approved" : o.status}</Badge></td>
                  <td style={{ padding: 8, textAlign: "right" }}><Text size="1" color="gray">{o.createdAt ? format(new Date(o.createdAt), "MMM d, h:mm a") : ""}</Text></td>
                  <td style={{ padding: 8, textAlign: "center" }}>
                    {o.status === "pending" ? (
                      <Flex gap="2" justify="center">
                        <Button size="1" color="green" variant="soft" disabled={actioningId === o._id} onClick={() => handleApprove(o._id)}>
                          <CheckCircledIcon width="14" height="14" /> Approve
                        </Button>
                        <Button size="1" color="red" variant="soft" disabled={actioningId === o._id} onClick={() => handleReject(o._id)}>
                          <CrossCircledIcon width="14" height="14" /> Reject
                        </Button>
                      </Flex>
                    ) : <Text size="1" color="gray">—</Text>}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7}><Flex justify="center" py="6"><Text color="gray">No merchandise orders found</Text></Flex></td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </Box>
  );
};

export default MerchandiseOrders;
