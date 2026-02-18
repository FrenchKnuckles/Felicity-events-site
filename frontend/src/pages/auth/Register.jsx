import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Box, Card, Flex, Text, TextField, Button, Heading, Callout, Select, Grid, Spinner } from "@radix-ui/themes";
import { EnvelopeClosedIcon, LockClosedIcon, PersonIcon, MobileIcon, ExclamationTriangleIcon, HomeIcon, BackpackIcon } from "@radix-ui/react-icons";
import SimpleCaptcha from "../../components/SimpleCaptcha";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    participantType: "non-iiit",
    collegeOrg: "",
    contactNumber: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateIIITEmail = (email) => {
    const iiitDomains = ["@iiit.ac.in", "@students.iiit.ac.in", "@research.iiit.ac.in", "@faculty.iiit.ac.in"];
    return iiitDomains.some((domain) => email.toLowerCase().endsWith(domain));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!captchaVerified || !captchaToken) {
      setError("Please complete the CAPTCHA verification");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.participantType === "iiit" && !validateIIITEmail(formData.email)) {
      setError("IIIT participants must use an IIIT email address");
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...userData } = formData;
      await register(userData, captchaToken);
      navigate("/onboarding");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, var(--indigo-2), var(--violet-2))" }} p="4">
      <Flex direction="column" align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Box style={{ maxWidth: 520, width: "100%" }}>
          {/* Header */}
          <Flex direction="column" align="center" mb="6">
            <Heading size="8" style={{ background: "linear-gradient(90deg, var(--indigo-11), var(--violet-11))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Felicity
            </Heading>
            <Heading size="5" mt="5">Create your account</Heading>
            <Text color="gray" size="2" mt="1">Join the biggest tech fest of IIIT Hyderabad</Text>
          </Flex>

          {/* Error Alert */}
          {error && (
            <Callout.Root color="red" mb="4">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {/* Registration Form */}
          <Card size="3">
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="4">
                {/* Name Fields */}
                <Grid columns="2" gap="3">
                  <Box>
                    <Text as="label" size="2" weight="medium" mb="1">First Name *</Text>
                    <TextField.Root
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      size="3"
                    >
                      <TextField.Slot>
                        <PersonIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                  </Box>
                  <Box>
                    <Text as="label" size="2" weight="medium" mb="1">Last Name *</Text>
                    <TextField.Root
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      size="3"
                    />
                  </Box>
                </Grid>

                {/* Participant Type */}
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">Participant Type *</Text>
                  <Select.Root value={formData.participantType} onValueChange={(value) => setFormData(prev => ({ ...prev, participantType: value }))}>
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="non-iiit">Non-IIIT Participant</Select.Item>
                      <Select.Item value="iiit">IIIT Student/Staff</Select.Item>
                    </Select.Content>
                  </Select.Root>
                  {formData.participantType === "iiit" && (
                    <Text size="1" color="indigo" mt="1">Use your @iiit.ac.in email address</Text>
                  )}
                </Box>

                {/* Email */}
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">Email Address *</Text>
                  <TextField.Root
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={formData.participantType === "iiit" ? "yourname@iiit.ac.in" : "you@example.com"}
                    required
                    size="3"
                  >
                    <TextField.Slot>
                      <EnvelopeClosedIcon height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

                {/* College/Organization */}
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">College / Organization</Text>
                  <TextField.Root
                    type="text"
                    name="collegeOrg"
                    value={formData.collegeOrg}
                    onChange={handleChange}
                    placeholder="Your college or organization"
                    size="3"
                  >
                    <TextField.Slot>
                      <HomeIcon height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

                {/* Contact Number */}
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">Contact Number</Text>
                  <TextField.Root
                    type="tel"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    placeholder="+91 1234567890"
                    size="3"
                  >
                    <TextField.Slot>
                      <MobileIcon height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

                {/* Password Fields */}
                <Grid columns="2" gap="3">
                  <Box>
                    <Text as="label" size="2" weight="medium" mb="1">Password *</Text>
                    <TextField.Root
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min 6 characters"
                      required
                      size="3"
                    >
                      <TextField.Slot>
                        <LockClosedIcon height="16" width="16" />
                      </TextField.Slot>
                    </TextField.Root>
                  </Box>
                  <Box>
                    <Text as="label" size="2" weight="medium" mb="1">Confirm Password *</Text>
                    <TextField.Root
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      required
                      size="3"
                    />
                  </Box>
                </Grid>

                {/* hCaptcha */}
                <SimpleCaptcha
                  onTokenChange={(token) => {
                    setCaptchaToken(token);
                    setCaptchaVerified(!!token);
                  }}
                />

                <Button type="submit" size="3" disabled={loading || !captchaVerified}>
                  {loading ? (
                    <Flex align="center" gap="2">
                      <Spinner size="1" />
                      <span>Creating Account...</span>
                    </Flex>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </Flex>
            </form>
          </Card>

          {/* Login Link */}
          <Text align="center" color="gray" mt="4" as="p">
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--indigo-11)", fontWeight: 500 }}>
              Sign in here
            </Link>
          </Text>
        </Box>
      </Flex>
    </Box>
  );
};

export default Register;
