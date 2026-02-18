import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Card, Flex, Text, Button, Heading, TextField, TextArea, Grid, Spinner, Tabs, Badge } from "@radix-ui/themes";
import { BarChartIcon, PersonIcon, CheckCircledIcon, CrossCircledIcon, MagnifyingGlassIcon, DownloadIcon, ClockIcon, ExclamationTriangleIcon, ArrowLeftIcon, UploadIcon } from "@radix-ui/react-icons";
import { toast } from "react-toastify";
import { Html5Qrcode } from "html5-qrcode";
import attendanceService from "../../services/attendanceService";

// Helper: backend returns firstName/lastName, not a combined name field
const displayName = (p) => {
  if (!p) return "Unknown";
  if (p.name) return p.name;
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email || "Unknown";
};

const AttendanceDashboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("scanner");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  
  const [auditLogs, setAuditLogs] = useState([]);
  
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDashboard();
    
    refreshIntervalRef.current = setInterval(fetchDashboard, 10000);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      stopScanner();
    };
  }, [eventId]);

  const fetchDashboard = async () => {
    try {
      const res = await attendanceService.getAttendanceDashboard(eventId);
      setDashboardData(res.data);
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const startScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      await stopScanner();
    }

    try {
      html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await handleQRScan(decodedText);
        },
        (errorMessage) => {}
      );
      
      setScanning(true);
    } catch (error) {
      toast.error("Failed to start camera. Please allow camera permissions.");
      console.error(error);
    }
  }, [eventId]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setScanning(false);
  };

  const handleQRScan = async (qrData) => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.pause();
      }

      const res = await attendanceService.scanQRCheckIn(eventId, qrData);
      
      setScanResult({
        success: true,
        message: res.data.message,
        participant: res.data.attendance.participant,
        checkInTime: res.data.attendance.checkInTime,
      });
      
      toast.success(`✅ ${displayName(res.data.attendance.participant)} checked in!`);
      fetchDashboard();
      
      setTimeout(async () => {
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.resume();
          } catch (e) {}
        }
        setScanResult(null);
      }, 2000);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Scan failed";
      
      setScanResult({
        success: false,
        message: errorMsg,
        isDuplicate: error.response?.status === 409,
        participant: error.response?.data?.attendance?.participant,
      });
      
      if (error.response?.status === 409) {
        toast.warning(`⚠️ Already checked in: ${displayName(error.response?.data?.attendance?.participant)}`);
      } else {
        toast.error(errorMsg);
      }
      
      setTimeout(async () => {
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.resume();
          } catch (e) {}
        }
        setScanResult(null);
      }, 2000);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-selected

    try {
      const tempScanner = new Html5Qrcode("qr-file-temp");
      const decodedText = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      await handleQRScan(decodedText);
    } catch (error) {
      setScanResult({
        success: false,
        message: "Could not read a QR code from the uploaded image",
        isDuplicate: false,
      });
      toast.error("No QR code found in the uploaded image");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery || searchQuery.length < 2) {
      toast.error("Enter at least 2 characters");
      return;
    }

    try {
      setSearching(true);
      const res = await attendanceService.searchParticipant(eventId, searchQuery);
      setSearchResults(res.data.results || []);
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!selectedParticipant || !overrideReason || overrideReason.length < 10) {
      toast.error("Please select a participant and provide a reason (min 10 characters)");
      return;
    }

    try {
      await attendanceService.manualCheckIn(
        eventId,
        selectedParticipant.ticketId,
        overrideReason
      );
      
      toast.success(`✅ ${displayName(selectedParticipant.participant)} manually checked in!`);
      setSelectedParticipant(null);
      setOverrideReason("");
      setSearchResults([]);
      setSearchQuery("");
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || "Manual check-in failed");
    }
  };

  const handleExportCSV = async (includeNotCheckedIn = false) => {
    try {
      const res = await attendanceService.exportAttendanceCSV(eventId, includeNotCheckedIn);
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance_${eventId}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("CSV exported successfully!");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await attendanceService.getAuditLogs(eventId);
      setAuditLogs(res.data.logs || []);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: "var(--gray-1)" }}>
      {/* Header */}
      <Box style={{ backgroundColor: "var(--gray-2)", borderBottom: "1px solid var(--gray-4)" }} p="4">
        <Box style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Flex align="center" gap="3" mb="4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeftIcon width="16" height="16" />
            </Button>
            <Box>
              <Heading size="5">Attendance Dashboard</Heading>
              <Text size="2" color="gray">{dashboardData?.event?.name}</Text>
            </Box>
          </Flex>

          {/* Quick Stats */}
          <Grid columns="4" gap="4">
            <Card>
              <Flex direction="column" align="center">
                <PersonIcon width="24" height="24" color="var(--blue-9)" style={{ marginBottom: "4px" }} />
                <Text size="5" weight="bold">{dashboardData?.stats?.totalRegistered || 0}</Text>
                <Text size="1" color="gray">Registered</Text>
              </Flex>
            </Card>
            <Card>
              <Flex direction="column" align="center">
                <CheckCircledIcon width="24" height="24" color="var(--green-9)" style={{ marginBottom: "4px" }} />
                <Text size="5" weight="bold">{dashboardData?.stats?.checkedIn || 0}</Text>
                <Text size="1" color="gray">Checked In</Text>
              </Flex>
            </Card>
            <Card>
              <Flex direction="column" align="center">
                <CrossCircledIcon width="24" height="24" color="var(--red-9)" style={{ marginBottom: "4px" }} />
                <Text size="5" weight="bold">{dashboardData?.stats?.notCheckedIn || 0}</Text>
                <Text size="1" color="gray">Not Checked In</Text>
              </Flex>
            </Card>
            <Card>
              <Flex direction="column" align="center">
                <BarChartIcon width="24" height="24" color="var(--yellow-9)" style={{ marginBottom: "4px" }} />
                <Text size="5" weight="bold">{dashboardData?.stats?.checkInRate || 0}%</Text>
                <Text size="1" color="gray">Check-in Rate</Text>
              </Flex>
            </Card>
          </Grid>
        </Box>
      </Box>

      {/* Tabs */}
      <Box style={{ maxWidth: "1200px", margin: "0 auto" }} p="4">
        <Tabs.Root value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          if (value !== "scanner") {
            stopScanner();
          }
        }}>
          <Tabs.List mb="6">
            <Tabs.Trigger value="scanner">
              <BarChartIcon width="14" height="14" />
              <Text ml="1">QR Scanner</Text>
            </Tabs.Trigger>
            <Tabs.Trigger value="dashboard">
              <PersonIcon width="14" height="14" />
              <Text ml="1">Live Dashboard</Text>
            </Tabs.Trigger>
            <Tabs.Trigger value="manual">
              <CheckCircledIcon width="14" height="14" />
              <Text ml="1">Manual Check-in</Text>
            </Tabs.Trigger>
            <Tabs.Trigger value="audit">
              <ClockIcon width="14" height="14" />
              <Text ml="1">Audit Logs</Text>
            </Tabs.Trigger>
          </Tabs.List>

          {/* Scanner Tab */}
          <Tabs.Content value="scanner">
            <Card>
              <Box style={{ maxWidth: "400px", margin: "0 auto" }}>
                {/* Shared hidden elements for file upload scanning */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                <div id="qr-file-temp" style={{ display: "none" }}></div>

                {!scanning ? (
                  <Flex direction="column" align="center">
                    <Box
                      style={{
                        width: "256px",
                        height: "256px",
                        backgroundColor: "var(--gray-3)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "16px",
                      }}
                    >
                      <BarChartIcon width="64" height="64" color="var(--gray-7)" />
                    </Box>
                    <Button size="3" onClick={startScanner}>
                      Start Camera Scanner
                    </Button>
                    <Text size="2" color="gray" mt="3" mb="2" style={{ textAlign: "center" }}>or</Text>
                    <Button size="2" variant="soft" onClick={() => fileInputRef.current?.click()}>
                      <UploadIcon width="16" height="16" />
                      Upload QR Image
                    </Button>
                  </Flex>
                ) : (
                  <Box>
                    <Box
                      id="qr-reader"
                      ref={scannerRef}
                      style={{ width: "100%", borderRadius: "8px", overflow: "hidden" }}
                    />
                    <Button
                      color="red"
                      style={{ width: "100%", marginTop: "16px" }}
                      onClick={stopScanner}
                    >
                      Stop Scanner
                    </Button>
                    <Button
                      variant="soft"
                      style={{ width: "100%", marginTop: "8px" }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadIcon width="16" height="16" />
                      Upload QR Image Instead
                    </Button>
                  </Box>
                )}

                {/* Scan Result */}
                {scanResult && (
                  <Card
                    mt="4"
                    style={{
                      backgroundColor: scanResult.success
                        ? "var(--green-3)"
                        : scanResult.isDuplicate
                        ? "var(--yellow-3)"
                        : "var(--red-3)",
                      border: `1px solid ${
                        scanResult.success
                          ? "var(--green-6)"
                          : scanResult.isDuplicate
                          ? "var(--yellow-6)"
                          : "var(--red-6)"
                      }`,
                    }}
                  >
                    <Flex align="center" gap="3">
                      {scanResult.success ? (
                        <CheckCircledIcon width="24" height="24" color="var(--green-9)" />
                      ) : scanResult.isDuplicate ? (
                        <ExclamationTriangleIcon width="24" height="24" color="var(--yellow-9)" />
                      ) : (
                        <CrossCircledIcon width="24" height="24" color="var(--red-9)" />
                      )}
                      <Box>
                        <Text weight="medium">{scanResult.message}</Text>
                        {scanResult.participant && (
                          <Text size="2" color="gray">
                            {displayName(scanResult.participant)} - {scanResult.participant.email}
                          </Text>
                        )}
                      </Box>
                    </Flex>
                  </Card>
                )}
              </Box>
            </Card>
          </Tabs.Content>

          {/* Live Dashboard Tab */}
          <Tabs.Content value="dashboard">
            <Grid columns={{ initial: "1", lg: "2" }} gap="6">
              {/* Recent Check-ins */}
              <Card>
                <Flex justify="between" align="center" mb="4">
                  <Heading size="4">Recent Check-ins</Heading>
                  <Badge color="green">Live</Badge>
                </Flex>
                <Flex direction="column" gap="2" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {dashboardData?.recentCheckIns?.length > 0 ? (
                    dashboardData.recentCheckIns.map((checkIn) => (
                      <Card key={checkIn._id} variant="surface">
                        <Flex justify="between" align="center">
                          <Box>
                            <Text weight="medium">{displayName(checkIn.participant)}</Text>
                            <Text size="1" color="gray">
                              {new Date(checkIn.checkInTime).toLocaleTimeString()}
                            </Text>
                          </Box>
                          <Badge color={checkIn.method === "qr_scan" ? "green" : "yellow"}>
                            {checkIn.method === "qr_scan" ? "QR" : "Manual"}
                          </Badge>
                        </Flex>
                      </Card>
                    ))
                  ) : (
                    <Text color="gray" align="center" py="4">No check-ins yet</Text>
                  )}
                </Flex>
              </Card>

              {/* Not Checked In */}
              <Card>
                <Flex justify="between" align="center" mb="4">
                  <Heading size="4">Not Checked In</Heading>
                  <Button variant="ghost" size="1" onClick={() => handleExportCSV(true)}>
                    <DownloadIcon width="14" height="14" />
                    <Text>Export All</Text>
                  </Button>
                </Flex>
                <Flex direction="column" gap="2" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {dashboardData?.notScanned?.length > 0 ? (
                    dashboardData.notScanned.map((ticket) => (
                      <Card key={ticket.ticketId} variant="surface">
                        <Flex justify="between" align="center">
                          <Box>
                            <Text weight="medium">{displayName(ticket.participant)}</Text>
                            <Text size="1" color="gray">{ticket.participant?.email}</Text>
                          </Box>
                          <Button
                            variant="ghost"
                            size="1"
                            onClick={() => {
                              setSelectedParticipant(ticket);
                              setActiveTab("manual");
                            }}
                          >
                            Manual Check-in
                          </Button>
                        </Flex>
                      </Card>
                    ))
                  ) : (
                    <Text color="gray" align="center" py="4">Everyone is checked in! 🎉</Text>
                  )}
                </Flex>
              </Card>
            </Grid>
          </Tabs.Content>

          {/* Manual Check-in Tab */}
          <Tabs.Content value="manual">
            <Card>
              <Heading size="4" mb="4">Manual Check-in</Heading>
              
              {/* Search */}
              <form onSubmit={handleSearch}>
                <Flex gap="2" mb="6">
                  <TextField.Root
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    style={{ flex: 1 }}
                  />
                  <Button type="submit" disabled={searching}>
                    {searching ? <Spinner size="1" /> : <MagnifyingGlassIcon width="16" height="16" />}
                  </Button>
                </Flex>
              </form>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <Box mb="6">
                  <Text size="2" color="gray" mb="2">Search Results:</Text>
                  <Flex direction="column" gap="2">
                    {searchResults.map((result) => (
                      <Card
                        key={result.ticketId}
                        variant={selectedParticipant?.ticketId === result.ticketId ? "classic" : "surface"}
                        onClick={() => !result.isCheckedIn && setSelectedParticipant(result)}
                        style={{
                          cursor: result.isCheckedIn ? "not-allowed" : "pointer",
                          opacity: result.isCheckedIn ? 0.5 : 1,
                          border: selectedParticipant?.ticketId === result.ticketId ? "2px solid var(--blue-9)" : undefined,
                        }}
                      >
                        <Flex justify="between" align="center">
                          <Box>
                            <Text weight="medium">{displayName(result.participant)}</Text>
                            <Text size="1" color="gray">{result.participant?.email}</Text>
                          </Box>
                          {result.isCheckedIn ? (
                            <Text size="2" color="green">Already Checked In</Text>
                          ) : (
                            <Text size="2" color="gray">Click to select</Text>
                          )}
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                </Box>
              )}

              {/* Override Form */}
              {selectedParticipant && !selectedParticipant.isCheckedIn && (
                <Box style={{ borderTop: "1px solid var(--gray-4)", paddingTop: "16px" }}>
                  <Card variant="surface" mb="4">
                    <Text weight="medium">Selected: {displayName(selectedParticipant.participant)}</Text>
                    <Text size="2" color="gray">{selectedParticipant.participant?.email}</Text>
                  </Card>
                  
                  <Box mb="4">
                    <Text as="label" size="2" weight="medium" mb="2">
                      Override Reason (Required - min 10 characters)
                    </Text>
                    <TextArea
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g., QR code not scanning due to screen damage"
                      rows={3}
                    />
                  </Box>
                  
                  <Button color="yellow" style={{ width: "100%" }} onClick={handleManualCheckIn}>
                    <CheckCircledIcon width="16" height="16" />
                    <Text>Confirm Manual Check-in</Text>
                  </Button>
                </Box>
              )}
            </Card>
          </Tabs.Content>

          {/* Audit Logs Tab */}
          <Tabs.Content value="audit">
            <Card>
              <Flex justify="between" align="center" mb="4">
                <Heading size="4">Audit Logs</Heading>
                <Button size="2" onClick={() => handleExportCSV(false)}>
                  <DownloadIcon width="14" height="14" />
                  <Text>Export Checked-in CSV</Text>
                </Button>
              </Flex>
              
              <Flex direction="column" gap="2" style={{ maxHeight: "500px", overflowY: "auto" }}>
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <Card key={log._id} variant="surface">
                      <Flex justify="between" align="center" mb="1">
                        <Badge
                          color={
                            log.action === "check_in"
                              ? "green"
                              : log.action === "manual_override"
                              ? "yellow"
                              : "red"
                          }
                        >
                          {log.action.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Text size="1" color="gray">
                          {new Date(log.createdAt).toLocaleString()}
                        </Text>
                      </Flex>
                      <Text size="2">
                        {displayName(log.attendance?.participant)} - {log.attendance?.participant?.email}
                      </Text>
                      <Text size="1" color="gray">
                        By: {log.performedBy?.name || "System"} | IP: {log.ip}
                      </Text>
                      {log.details?.reason && (
                        <Text size="1" color="yellow" mt="1">
                          Reason: {log.details.reason}
                        </Text>
                      )}
                    </Card>
                  ))
                ) : (
                  <Text color="gray" align="center" py="4">No audit logs yet</Text>
                )}
              </Flex>
            </Card>
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  );
};

export default AttendanceDashboard;
