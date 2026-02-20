import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { Box, Card, Flex, Text, Button, Heading, Grid, Spinner } from "@radix-ui/themes";
import { CheckIcon, ArrowRightIcon, StarIcon } from "@radix-ui/react-icons";

const AREAS = ["Competitive Programming", "Web Development", "Mobile App Development", "Machine Learning & AI", "Data Science", "Cybersecurity", "Cloud Computing", "DevOps", "Blockchain", "IoT", "Robotics", "Game Development", "UI/UX Design", "Open Source", "Research & Academia", "Entrepreneurship", "Finance & Trading", "Music & Arts", "Photography", "Dance", "Literary Arts", "Sports & Fitness", "Social Events"];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [sel, setSel] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [followed, setFollowed] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { (async () => { try { const { data } = await api.get("/organizers"); setOrgs(data); } catch {} })(); }, []);

  const toggle = (arr, set, val) => set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const handleComplete = async () => {
    setLoading(true);
    try { await api.put("/auth/preferences", { areasOfInterest: sel, followedOrganizers: followed }); updateUser({ ...user, areasOfInterest: sel, followedOrganizers: followed }); toast.success("Preferences saved! Welcome to Felicity!"); navigate("/dashboard"); }
    catch { toast.error("Failed to save preferences"); } finally { setLoading(false); }
  };

  const StepDot = ({ n }) => <Flex align="center" justify="center" style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: step >= n ? "var(--blue-9)" : "var(--gray-4)", color: step >= n ? "white" : "var(--gray-11)" }}>{step > n ? <CheckIcon width={24} height={24} /> : n}</Flex>;

  return (
    <Box p="4" style={{ minHeight: "100vh", background: "linear-gradient(135deg, var(--blue-2), var(--purple-2))" }}>
      <Box style={{ maxWidth: 768, margin: "0 auto" }} py="6">
        <Flex align="center" justify="center" mb="6"><Flex align="center" gap="2"><StepDot n={1} /><Box style={{ width: 96, height: 4, backgroundColor: step > 1 ? "var(--blue-9)" : "var(--gray-4)" }} /><StepDot n={2} /></Flex></Flex>

        <Card size="3">
          {step === 1 && <>
            <Box style={{ textAlign: "center" }} mb="6"><StarIcon width={48} height={48} color="var(--yellow-9)" style={{ margin: "0 auto 16px" }} /><Heading size="6" mb="2">What interests you?</Heading><Text color="gray" size="3">Select your areas of interest to get personalized event recommendations</Text></Box>
            <Flex wrap="wrap" gap="3" justify="center" mb="6">{AREAS.map(a => <Button key={a} variant={sel.includes(a) ? "solid" : "outline"} color={sel.includes(a) ? "blue" : "gray"} onClick={() => toggle(sel, setSel, a)} style={{ borderRadius: 9999 }}>{sel.includes(a) && <CheckIcon width={16} height={16} />}{a}</Button>)}</Flex>
            <Flex justify="between" align="center"><Button variant="ghost" color="gray" onClick={() => navigate("/dashboard")}>Skip for now</Button><Button onClick={() => setStep(2)}>Next<ArrowRightIcon width={20} height={20} /></Button></Flex>
          </>}

          {step === 2 && <>
            <Box style={{ textAlign: "center" }} mb="6"><Heading size="6" mb="2">Follow Clubs & Organizers</Heading><Text color="gray" size="3">Follow clubs to get notified about their events</Text></Box>
            {orgs.length === 0 ? <Text align="center" color="gray" style={{ display: "block", padding: "32px 0" }}>No clubs/organizers available yet</Text>
            : <Grid columns={{ initial: "1", md: "2" }} gap="4" mb="6">{orgs.map(o => <Card key={o._id} onClick={() => toggle(followed, setFollowed, o._id)} style={{ cursor: "pointer", border: followed.includes(o._id) ? "2px solid var(--blue-9)" : "2px solid var(--gray-5)", backgroundColor: followed.includes(o._id) ? "var(--blue-2)" : undefined }}>
              <Flex justify="between" align="center"><Box><Text weight="bold" size="3">{o.name}</Text><Text size="2" color="gray">{o.category}</Text></Box>{followed.includes(o._id) && <CheckIcon width={24} height={24} color="var(--blue-9)" />}</Flex>
              {o.description && <Text size="2" color="gray" mt="2" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.description}</Text>}
            </Card>)}</Grid>}
            <Flex justify="between" align="center"><Button variant="ghost" color="gray" onClick={() => setStep(1)}>Back</Button><Button onClick={handleComplete} disabled={loading}>{loading ? <><Spinner size="1" /> Saving...</> : "Complete Setup"}</Button></Flex>
          </>}
        </Card>
      </Box>
    </Box>
  );
};

export default Onboarding;
