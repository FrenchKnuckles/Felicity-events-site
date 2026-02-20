import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Button, Heading, Grid, Spinner, TextField, Dialog, Badge, Select } from "@radix-ui/themes";
import { ArrowLeftIcon, PlusIcon, MagnifyingGlassIcon, AvatarIcon, EnvelopeClosedIcon, CalendarIcon, TrashIcon, Pencil1Icon, LockClosedIcon, ExclamationTriangleIcon, CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";

const ManageOrganizers = () => {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [delModal, setDelModal] = useState(false);
  const [selOrg, setSelOrg] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOrgs = async () => { try { const r = await adminService.getOrganizers(); setOrgs(Array.isArray(r) ? r : r?.organizers || []); } catch { toast.error("Failed to fetch organizers"); } finally { setLoading(false); } };
  useEffect(() => { fetchOrgs(); }, []);

  const filtered = orgs.filter(o => {
    if (statusFilter === "active" && o.isActive === false) return false;
    if (statusFilter === "disabled" && o.isActive !== false) return false;
    if (search) { const s = search.toLowerCase(); return o.name?.toLowerCase().includes(s) || o.contactEmail?.toLowerCase().includes(s) || o.userId?.email?.toLowerCase().includes(s); }
    return true;
  });

  const handleDelete = async () => {
    if (!selOrg) return; setDeleting(true);
    try { await adminService.deleteOrganizer(selOrg._id); toast.success("Organizer permanently deleted"); setDelModal(false); setSelOrg(null); fetchOrgs(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed to delete"); } finally { setDeleting(false); }
  };

  const toggleActive = async (o) => {
    const act = o.isActive !== false;
    try { act ? await adminService.disableOrganizer(o._id) : await adminService.enableOrganizer(o._id); toast.success(`${o.name} has been ${act ? "disabled" : "re-enabled"}`); fetchOrgs(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed to update status"); }
  };

  const resetPwd = async (id) => {
    try { const r = await adminService.resetOrganizerPassword(id); const p = r.temporaryPassword;
      if (p && navigator?.clipboard?.writeText) { try { await navigator.clipboard.writeText(p); toast.success("Temporary password copied to clipboard"); return; } catch {} }
      window.prompt("Copy the temporary password:", p); toast.success("Temporary password generated");
    } catch (e) { toast.error(e.response?.data?.message || "Failed to reset password"); }
  };

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "50vh" }}><Spinner size="3" /></Flex>;

  return (
    <Box p="6">
      <Flex direction={{ initial: "column", md: "row" }} align={{ md: "center" }} justify="between" mb="6">
        <Box><Flex align="center" gap="2" mb="2" onClick={() => navigate(-1)} style={{ cursor: "pointer", color: "var(--gray-11)" }}><ArrowLeftIcon width={20} height={20} /><Text size="2">Back</Text></Flex>
          <Heading size="6" weight="bold">Manage Organizers</Heading>
          <Text color="gray" size="2">{orgs.length} organizers registered{orgs.filter(o => o.isActive === false).length > 0 && ` · ${orgs.filter(o => o.isActive === false).length} disabled`}</Text>
        </Box>
        <Link to="/admin/organizers/create" style={{ textDecoration: "none" }}><Button size="3" mt={{ initial: "4", md: "0" }}><PlusIcon width={20} height={20} />Add Organizer</Button></Link>
      </Flex>

      <Card mb="6" style={{ padding: 16 }}><Flex gap="3" direction={{ initial: "column", sm: "row" }}>
        <Box style={{ flex: 1 }}><TextField.Root size="3" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}><TextField.Slot><MagnifyingGlassIcon width={20} height={20} /></TextField.Slot></TextField.Root></Box>
        <Select.Root value={statusFilter} onValueChange={setStatusFilter}><Select.Trigger placeholder="Status" /><Select.Content><Select.Item value="all">All</Select.Item><Select.Item value="active">Active</Select.Item><Select.Item value="disabled">Disabled</Select.Item></Select.Content></Select.Root>
      </Flex></Card>

      <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="4">
        {filtered.length > 0 ? filtered.map(o => { const act = o.isActive !== false; return (
          <Card key={o._id} style={{ padding: 20, opacity: act ? 1 : 0.7, border: !act ? "1px solid var(--red-6)" : undefined }}>
            <Flex align="start" justify="between" mb="4"><Flex align="center" gap="3">
              <Box style={{ padding: 12, backgroundColor: act ? "var(--purple-3)" : "var(--gray-3)", borderRadius: "50%" }}><AvatarIcon width={24} height={24} color={act ? "var(--purple-9)" : "var(--gray-9)"} /></Box>
              <Box><Flex align="center" gap="2"><Text weight="medium" style={{ display: "block" }}>{o.name}</Text><Badge color={act ? "green" : "red"} size="1">{act ? "Active" : "Disabled"}</Badge></Flex>
                <Flex align="center" gap="1"><EnvelopeClosedIcon width={14} height={14} color="var(--gray-9)" /><Text size="1" color="gray">{o.contactEmail || o.userId?.email}</Text></Flex></Box>
            </Flex></Flex>
            {o.description && <Text size="2" color="gray" mb="4" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.description}</Text>}
            <Flex align="center" justify="between" mb="4"><Flex align="center" gap="1"><CalendarIcon width={16} height={16} color="var(--gray-9)" /><Text size="2" color="gray">Events: {o.eventCount ?? o.events?.length ?? 0}</Text></Flex>
              <Badge color={o.category === "cultural" ? "blue" : o.category === "technical" ? "purple" : o.category === "sports" ? "green" : "orange"} size="1" variant="soft">{o.category || "other"}</Badge></Flex>
            <Box style={{ borderTop: "1px solid var(--gray-5)", paddingTop: 16 }}><Flex align="center" gap="2" wrap="wrap">
              <Button variant="soft" size="1" style={{ flex: 1 }} onClick={() => navigate(`/admin/organizers/${o._id}/edit`)}><Pencil1Icon width={14} height={14} />Edit</Button>
              <Button variant="soft" size="1" onClick={() => resetPwd(o._id)} title="Reset Password"><LockClosedIcon width={14} height={14} /></Button>
              <Button variant="soft" size="1" color={act ? "orange" : "green"} onClick={() => toggleActive(o)}>{act ? <CrossCircledIcon width={14} height={14} /> : <CheckCircledIcon width={14} height={14} />}{act ? "Disable" : "Enable"}</Button>
              <Button variant="soft" size="1" color="red" onClick={() => { setSelOrg(o); setDelModal(true); }}><TrashIcon width={14} height={14} /></Button>
            </Flex></Box>
          </Card>); })
        : <Box style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0" }}><AvatarIcon width={64} height={64} color="var(--gray-5)" style={{ margin: "0 auto", display: "block" }} /><Heading size="4" mt="4" mb="2">No organizers found</Heading>
          <Text color="gray" mb="4" style={{ display: "block" }}>{search || statusFilter !== "all" ? "Try different filters" : "Get started by adding an organizer"}</Text>
          {!search && statusFilter === "all" && <Link to="/admin/organizers/create" style={{ textDecoration: "none" }}><Button>Add Organizer</Button></Link>}</Box>}
      </Grid>

      <Dialog.Root open={delModal} onOpenChange={setDelModal}><Dialog.Content maxWidth="450px">
        <Flex align="center" gap="3" mb="4"><Box style={{ padding: 12, backgroundColor: "var(--red-3)", borderRadius: "50%" }}><ExclamationTriangleIcon width={24} height={24} color="var(--red-9)" /></Box><Dialog.Title>Permanently Delete Organizer</Dialog.Title></Flex>
        <Dialog.Description size="2" mb="4">Are you sure you want to <Text weight="bold" color="red">permanently delete</Text> <Text weight="bold">{selOrg?.name}</Text>? This will remove their user account and all associated data. This action cannot be undone.</Dialog.Description>
        <Text size="2" color="gray" mb="4" style={{ display: "block" }}>Tip: If you just want to prevent login access, use the Disable button instead.</Text>
        <Flex gap="3" mt="4" justify="end"><Dialog.Close><Button variant="soft" color="gray" disabled={deleting}>Cancel</Button></Dialog.Close><Button color="red" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete Permanently"}</Button></Flex>
      </Dialog.Content></Dialog.Root>
    </Box>
  );
};

export default ManageOrganizers;
