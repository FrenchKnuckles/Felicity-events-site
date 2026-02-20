import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Card, Flex, Text, Button, Heading, TextField, TextArea, Grid, Spinner, Tabs, Badge } from "@radix-ui/themes";
import { BarChartIcon, PersonIcon, CheckCircledIcon, CrossCircledIcon, MagnifyingGlassIcon, DownloadIcon, ClockIcon, ExclamationTriangleIcon, ArrowLeftIcon, UploadIcon } from "@radix-ui/react-icons";
import { toast } from "react-toastify";
import { Html5Qrcode } from "html5-qrcode";
import attendanceService from "../../services/attendanceService";

const dn = p => p ? (p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email || "Unknown") : "Unknown";

const AttendanceDashboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("scanner");
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);
  const [reason, setReason] = useState("");
  const [selPart, setSelPart] = useState(null);
  const [logs, setLogs] = useState([]);
  const scannerRef = useRef(null);
  const qrRef = useRef(null);
  const intRef = useRef(null);
  const fileRef = useRef(null);

  const fetchDash = async () => {
    try { const r = await attendanceService.getAttendanceDashboard(eventId); setDash(r.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDash(); intRef.current = setInterval(fetchDash, 10000);
    return () => { clearInterval(intRef.current); stopScanner(); };
  }, [eventId]);

  const stopScanner = async () => {
    if (qrRef.current) { try { await qrRef.current.stop(); qrRef.current = null; } catch {} } setScanning(false);
  };

  const startScanner = useCallback(async () => {
    if (qrRef.current) await stopScanner();
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
    } catch {
      toast.error("Camera permission denied. Please allow camera access in your browser settings.");
      return;
    }
    try {
      qrRef.current = new Html5Qrcode("qr-reader");
      await qrRef.current.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, async d => handleQR(d), () => {});
      setScanning(true);
    } catch { toast.error("Failed to start camera scanner."); }
  }, [eventId]);

  const handleQR = async (qrData) => {
    try {
      if (qrRef.current) await qrRef.current.pause();
      const r = await attendanceService.scanQRCheckIn(eventId, qrData);
      setScanResult({ success: true, message: r.data.message, participant: r.data.attendance.participant, checkInTime: r.data.attendance.checkInTime });
      toast.success(`✅ ${dn(r.data.attendance.participant)} checked in!`); fetchDash();
      setTimeout(async () => { try { if (qrRef.current) await qrRef.current.resume(); } catch {} setScanResult(null); }, 2000);
    } catch (e) {
      const msg = e.response?.data?.message || "Scan failed";
      setScanResult({ success: false, message: msg, isDuplicate: e.response?.status === 409, participant: e.response?.data?.attendance?.participant });
      e.response?.status === 409 ? toast.warning(`⚠️ Already checked in: ${dn(e.response?.data?.attendance?.participant)}`) : toast.error(msg);
      setTimeout(async () => { try { if (qrRef.current) await qrRef.current.resume(); } catch {} setScanResult(null); }, 2000);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    try { const t = new Html5Qrcode("qr-file-temp"); const d = await t.scanFile(file, true); t.clear(); await handleQR(d); }
    catch { setScanResult({ success: false, message: "Could not read a QR code from the uploaded image" }); toast.error("No QR code found in the uploaded image"); }
  };

  const handleSearch = async (e) => {
    e.preventDefault(); if (!searchQ || searchQ.length < 2) { toast.error("Enter at least 2 characters"); return; }
    try { setSearching(true); const r = await attendanceService.searchParticipant(eventId, searchQ); setSearchRes(r.data.results || []); }
    catch { toast.error("Search failed"); } finally { setSearching(false); }
  };

  const manualCheck = async () => {
    if (!selPart || !reason.trim() || reason.trim().length < 10) { toast.error("Please select a participant and provide a reason (min 10 characters)"); return; }
    try { await attendanceService.manualCheckIn(eventId, selPart.ticketId, reason.trim()); toast.success(`✅ ${dn(selPart.participant)} manually checked in!`); setSelPart(null); setReason(""); setSearchRes([]); setSearchQ(""); fetchDash(); }
    catch (e) { toast.error(e.response?.data?.message || "Manual check-in failed"); }
  };

  const exportCSV = async (all = false) => {
    try {
      const r = await attendanceService.exportAttendanceCSV(eventId, all);
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([r.data]));
      a.download = `attendance_${eventId}_${new Date().toISOString().split("T")[0]}.csv`; document.body.appendChild(a); a.click(); a.remove(); toast.success("CSV exported!");
    } catch { toast.error("Export failed"); }
  };

  useEffect(() => { if (activeTab === "audit") attendanceService.getAuditLogs(eventId).then(r => setLogs(r.data.logs || [])).catch(() => {}); }, [activeTab]);

  if (loading) return <Flex align="center" justify="center" style={{ minHeight: "100vh" }}><Spinner size="3" /></Flex>;

  const st = dash?.stats || {};
  const statCards = [
    { icon: <PersonIcon width="24" height="24" color="var(--blue-9)" />, v: st.totalRegistered || 0, l: "Registered" },
    { icon: <CheckCircledIcon width="24" height="24" color="var(--green-9)" />, v: st.checkedIn || 0, l: "Checked In" },
    { icon: <CrossCircledIcon width="24" height="24" color="var(--red-9)" />, v: st.notCheckedIn || 0, l: "Not Checked In" },
    { icon: <BarChartIcon width="24" height="24" color="var(--yellow-9)" />, v: `${st.checkInRate || 0}%`, l: "Check-in Rate" },
  ];

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }}>
      <Box style={{ backgroundColor: "var(--gray-2)", borderBottom: "1px solid var(--gray-4)" }} p="4">
        <Box style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Flex align="center" gap="3" mb="4">
            <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeftIcon width="16" height="16" /></Button>
            <Box><Heading size="5">Attendance Dashboard</Heading><Text size="2" color="gray">{dash?.event?.name}</Text></Box>
          </Flex>
          <Grid columns="4" gap="4">
            {statCards.map(s => <Card key={s.l}><Flex direction="column" align="center">{s.icon}<Text size="5" weight="bold">{s.v}</Text><Text size="1" color="gray">{s.l}</Text></Flex></Card>)}
          </Grid>
        </Box>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto" }} p="4">
        <Tabs.Root value={activeTab} onValueChange={v => { setActiveTab(v); if (v !== "scanner") stopScanner(); }}>
          <Tabs.List mb="6">
            <Tabs.Trigger value="scanner"><BarChartIcon width="14" height="14" /><Text ml="1">QR Scanner</Text></Tabs.Trigger>
            <Tabs.Trigger value="dashboard"><PersonIcon width="14" height="14" /><Text ml="1">Live Dashboard</Text></Tabs.Trigger>
            <Tabs.Trigger value="manual"><CheckCircledIcon width="14" height="14" /><Text ml="1">Manual Check-in</Text></Tabs.Trigger>
            <Tabs.Trigger value="audit"><ClockIcon width="14" height="14" /><Text ml="1">Audit Logs</Text></Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="scanner">
            <Card><Box style={{ maxWidth: "400px", margin: "0 auto" }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
              <div id="qr-file-temp" style={{ display: "none" }} />
              {!scanning ? (
                <Flex direction="column" align="center">
                  <Box style={{ width: 256, height: 256, backgroundColor: "var(--gray-3)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><BarChartIcon width="64" height="64" color="var(--gray-7)" /></Box>
                  <Button size="3" onClick={startScanner}>Start Camera Scanner</Button>
                  <Text size="2" color="gray" mt="3" mb="2" style={{ textAlign: "center" }}>or</Text>
                  <Button size="2" variant="soft" onClick={() => fileRef.current?.click()}><UploadIcon width="16" height="16" />Upload QR Image</Button>
                </Flex>
              ) : (
                <Box>
                  <Box id="qr-reader" ref={scannerRef} style={{ width: "100%", borderRadius: 8, overflow: "hidden" }} />
                  <Button color="red" style={{ width: "100%", marginTop: 16 }} onClick={stopScanner}>Stop Scanner</Button>
                  <Button variant="soft" style={{ width: "100%", marginTop: 8 }} onClick={() => fileRef.current?.click()}><UploadIcon width="16" height="16" />Upload QR Image Instead</Button>
                </Box>
              )}
              {scanResult && (
                <Card mt="4" style={{ backgroundColor: scanResult.success ? "var(--green-3)" : scanResult.isDuplicate ? "var(--yellow-3)" : "var(--red-3)", border: `1px solid ${scanResult.success ? "var(--green-6)" : scanResult.isDuplicate ? "var(--yellow-6)" : "var(--red-6)"}` }}>
                  <Flex align="center" gap="3">
                    {scanResult.success ? <CheckCircledIcon width="24" height="24" color="var(--green-9)" /> : scanResult.isDuplicate ? <ExclamationTriangleIcon width="24" height="24" color="var(--yellow-9)" /> : <CrossCircledIcon width="24" height="24" color="var(--red-9)" />}
                    <Box><Text weight="medium">{scanResult.message}</Text>{scanResult.participant && <Text size="2" color="gray">{dn(scanResult.participant)} - {scanResult.participant.email}</Text>}</Box>
                  </Flex>
                </Card>
              )}
            </Box></Card>
          </Tabs.Content>

          <Tabs.Content value="dashboard">
            <Grid columns={{ initial: "1", lg: "2" }} gap="6">
              <Card>
                <Flex justify="between" align="center" mb="4"><Heading size="4">Recent Check-ins</Heading><Badge color="green">Live</Badge></Flex>
                <Flex direction="column" gap="2" style={{ maxHeight: 400, overflowY: "auto" }}>
                  {dash?.recentCheckIns?.length > 0 ? dash.recentCheckIns.map(c => (
                    <Card key={c._id} variant="surface"><Flex justify="between" align="center"><Box><Text weight="medium">{dn(c.participant)}</Text><Text size="1" color="gray">{new Date(c.checkInTime).toLocaleTimeString()}</Text></Box><Badge color={c.method === "qr_scan" ? "green" : "yellow"}>{c.method === "qr_scan" ? "QR" : "Manual"}</Badge></Flex></Card>
                  )) : <Text color="gray" align="center" py="4">No check-ins yet</Text>}
                </Flex>
              </Card>
              <Card>
                <Flex justify="between" align="center" mb="4"><Heading size="4">Not Checked In</Heading><Button variant="ghost" size="1" onClick={() => exportCSV(true)}><DownloadIcon width="14" height="14" /><Text>Export All</Text></Button></Flex>
                <Flex direction="column" gap="2" style={{ maxHeight: 400, overflowY: "auto" }}>
                  {dash?.notScanned?.length > 0 ? dash.notScanned.map(t => (
                    <Card key={t.ticketId} variant="surface"><Flex justify="between" align="center"><Box><Text weight="medium">{dn(t.participant)}</Text><Text size="1" color="gray">{t.participant?.email}</Text></Box><Button variant="ghost" size="1" onClick={() => { setSelPart(t); setActiveTab("manual"); }}>Manual Check-in</Button></Flex></Card>
                  )) : <Text color="gray" align="center" py="4">Everyone is checked in! 🎉</Text>}
                </Flex>
              </Card>
            </Grid>
          </Tabs.Content>

          <Tabs.Content value="manual">
            <Card>
              <Heading size="4" mb="4">Manual Check-in</Heading>
              <form onSubmit={handleSearch}><Flex gap="2" mb="6"><TextField.Root value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search by name or email..." style={{ flex: 1 }} /><Button type="submit" disabled={searching}>{searching ? <Spinner size="1" /> : <MagnifyingGlassIcon width="16" height="16" />}</Button></Flex></form>
              {searchRes.length > 0 && (
                <Box mb="6"><Text size="2" color="gray" mb="2">Search Results:</Text><Flex direction="column" gap="2">
                  {searchRes.map(r => (
                    <Card key={r.ticketId} variant={selPart?.ticketId === r.ticketId ? "classic" : "surface"} onClick={() => !r.isCheckedIn && setSelPart(r)} style={{ cursor: r.isCheckedIn ? "not-allowed" : "pointer", opacity: r.isCheckedIn ? 0.5 : 1, border: selPart?.ticketId === r.ticketId ? "2px solid var(--blue-9)" : undefined }}>
                      <Flex justify="between" align="center"><Box><Text weight="medium">{dn(r.participant)}</Text><Text size="1" color="gray">{r.participant?.email}</Text></Box>{r.isCheckedIn ? <Text size="2" color="green">Already Checked In</Text> : <Text size="2" color="gray">Click to select</Text>}</Flex>
                    </Card>
                  ))}
                </Flex></Box>
              )}
              {selPart && !selPart.isCheckedIn && (
                <Box style={{ borderTop: "1px solid var(--gray-4)", paddingTop: 16 }}>
                  <Card variant="surface" mb="4"><Text weight="medium">Selected: {dn(selPart.participant)}</Text><Text size="2" color="gray">{selPart.participant?.email}</Text></Card>
                  <Box mb="4"><Text as="label" size="2" weight="medium" mb="2">Override Reason (Required - min 10 characters)</Text><TextArea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., QR code not scanning due to screen damage" rows={3} /></Box>
                  <Button color="yellow" style={{ width: "100%" }} onClick={manualCheck}><CheckCircledIcon width="16" height="16" /><Text>Confirm Manual Check-in</Text></Button>
                </Box>
              )}
            </Card>
          </Tabs.Content>

          <Tabs.Content value="audit">
            <Card>
              <Flex justify="between" align="center" mb="4"><Heading size="4">Audit Logs</Heading><Button size="2" onClick={() => exportCSV(false)}><DownloadIcon width="14" height="14" /><Text>Export Checked-in CSV</Text></Button></Flex>
              <Flex direction="column" gap="2" style={{ maxHeight: 500, overflowY: "auto" }}>
                {logs.length > 0 ? logs.map(l => (
                  <Card key={l._id} variant="surface">
                    <Flex justify="between" align="center" mb="1"><Badge color={l.action === "check_in" ? "green" : l.action === "manual_override" ? "yellow" : "red"}>{l.action.replace("_", " ").toUpperCase()}</Badge><Text size="1" color="gray">{new Date(l.createdAt).toLocaleString()}</Text></Flex>
                    <Text size="2">{dn(l.attendance?.participant)} - {l.attendance?.participant?.email}</Text>
                    <Text size="1" color="gray">By: {l.performedBy?.name || "System"} | IP: {l.ip}</Text>
                    {l.details?.reason && <Text size="1" color="yellow" mt="1">Reason: {l.details.reason}</Text>}
                  </Card>
                )) : <Text color="gray" align="center" py="4">No audit logs yet</Text>}
              </Flex>
            </Card>
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  );
};

export default AttendanceDashboard;
