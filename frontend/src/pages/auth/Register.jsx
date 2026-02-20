import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Box, Card, Flex, Text, TextField, Button, Heading, Callout, Select, Grid, Spinner } from "@radix-ui/themes";
import { EnvelopeClosedIcon, LockClosedIcon, PersonIcon, MobileIcon, ExclamationTriangleIcon, HomeIcon, EyeOpenIcon, EyeNoneIcon } from "@radix-ui/react-icons";
import SimpleCaptcha from "../../components/SimpleCaptcha";

const Register = () => {
  const [fd, setFd] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", participantType: "non-iiit", collegeOrg: "", contactNumber: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const ch = e => setFd(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (!captchaToken) { setError("Please complete the CAPTCHA verification"); return; }
    if (fd.password !== fd.confirmPassword) { setError("Passwords do not match"); return; }
    if (fd.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (fd.participantType === "iiit" && !["@iiit.ac.in", "@students.iiit.ac.in", "@research.iiit.ac.in", "@faculty.iiit.ac.in"].some(d => fd.email.toLowerCase().endsWith(d))) { setError("IIIT participants must use an IIIT email address"); return; }
    setLoading(true);
    try { const { confirmPassword, ...userData } = fd; await register(userData, captchaToken); navigate("/onboarding"); }
    catch (err) { setError(err.response?.data?.message || "Registration failed. Please try again."); } finally { setLoading(false); }
  };

  const fields = [
    { name: "firstName", label: "First Name *", type: "text", icon: PersonIcon, half: true },
    { name: "lastName", label: "Last Name *", type: "text", half: true },
    { name: "email", label: "Email Address *", type: "email", icon: EnvelopeClosedIcon, placeholder: fd.participantType === "iiit" ? "yourname@iiit.ac.in" : "you@example.com" },
    { name: "collegeOrg", label: "College / Organization", type: "text", icon: HomeIcon, placeholder: "Your college or organization" },
    { name: "contactNumber", label: "Contact Number", type: "tel", icon: MobileIcon, placeholder: "+91 1234567890" },
    { name: "password", label: "Password *", type: "password", icon: LockClosedIcon, placeholder: "Min 6 characters", half: true },
    { name: "confirmPassword", label: "Confirm Password *", type: "password", placeholder: "Confirm password", half: true },
  ];

  const renderField = f => <Box key={f.name}><Text as="label" size="2" weight="medium" mb="1">{f.label}</Text>
    <TextField.Root type={f.type === "password" ? (showPw ? "text" : "password") : f.type} name={f.name} value={fd[f.name]} onChange={ch} placeholder={f.placeholder} required={f.label.includes("*")} size="3">{f.icon && <TextField.Slot><f.icon height="16" width="16" /></TextField.Slot>}{f.type === "password" && <TextField.Slot side="right" style={{ cursor: "pointer" }} onClick={() => setShowPw(p => !p)}>{showPw ? <EyeNoneIcon height="16" width="16" /> : <EyeOpenIcon height="16" width="16" />}</TextField.Slot>}</TextField.Root></Box>;

  const halfFields = fields.filter(f => f.half);
  const fullFields = fields.filter(f => !f.half);

  return (
    <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, var(--indigo-2), var(--violet-2))" }} p="4">
      <Flex direction="column" align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Box style={{ maxWidth: 520, width: "100%" }}>
          <Flex direction="column" align="center" mb="6">
            <Heading size="8" style={{ background: "linear-gradient(90deg, var(--indigo-11), var(--violet-11))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Felicity</Heading>
            <Heading size="5" mt="5">Create your account</Heading><Text color="gray" size="2" mt="1">Join the biggest tech fest of IIIT Hyderabad</Text>
          </Flex>
          {error && <Callout.Root color="red" mb="4"><Callout.Icon><ExclamationTriangleIcon /></Callout.Icon><Callout.Text>{error}</Callout.Text></Callout.Root>}
          <Card size="3"><form onSubmit={handleSubmit}><Flex direction="column" gap="4">
            <Grid columns="2" gap="3">{halfFields.slice(0, 2).map(renderField)}</Grid>
            <Box><Text as="label" size="2" weight="medium" mb="1">Participant Type *</Text>
              <Select.Root value={fd.participantType} onValueChange={v => setFd(p => ({ ...p, participantType: v }))}><Select.Trigger style={{ width: "100%" }} /><Select.Content><Select.Item value="non-iiit">Non-IIIT Participant</Select.Item><Select.Item value="iiit">IIIT Student/Staff</Select.Item></Select.Content></Select.Root>
              {fd.participantType === "iiit" && <Text size="1" color="indigo" mt="1">Use your @iiit.ac.in email address</Text>}
            </Box>
            {fullFields.map(renderField)}
            <Grid columns="2" gap="3">{halfFields.slice(2).map(renderField)}</Grid>
            <SimpleCaptcha onTokenChange={t => setCaptchaToken(t)} />
            <Button type="submit" size="3" disabled={loading || !captchaToken}>{loading ? <Flex align="center" gap="2"><Spinner size="1" /><span>Creating Account...</span></Flex> : "Create Account"}</Button>
          </Flex></form></Card>
          <Text align="center" color="gray" mt="4" as="p">Already have an account?{" "}<Link to="/login" style={{ color: "var(--indigo-11)", fontWeight: 500 }}>Sign in here</Link></Text>
        </Box>
      </Flex>
    </Box>
  );
};

export default Register;
