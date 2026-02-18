import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Box, Card, Flex, Text, TextField, Button, Heading, Callout, Spinner } from "@radix-ui/themes";
import { EnvelopeClosedIcon, LockClosedIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import SimpleCaptcha from "../../components/SimpleCaptcha";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!captchaVerified || !captchaToken) {
      setError("Please complete the CAPTCHA verification");
      return;
    }

    setLoading(true);

    try {
      const user = await login(email, password, captchaToken);
      
      // Redirect based on role
      switch (user.role) {
        case "admin":
          navigate("/admin/dashboard");
          break;
        case "organizer":
          navigate("/organizer/dashboard");
          break;
        default:
          // Check if user needs onboarding
          if (!user.areasOfInterest || user.areasOfInterest.length === 0) {
            navigate("/onboarding");
          } else {
            navigate("/dashboard");
          }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={{ minHeight: "100vh", background: "linear-gradient(135deg, var(--indigo-2), var(--violet-2))" }} p="4">
      <Flex direction="column" align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Box style={{ maxWidth: 420, width: "100%" }}>
          {/* Header */}
          <Flex direction="column" align="center" mb="6">
            <Heading size="8" style={{ background: "linear-gradient(90deg, var(--indigo-11), var(--violet-11))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Felicity
            </Heading>
            <Text color="gray" size="2" mt="2">IIIT Hyderabad's Annual Technical Fest</Text>
            <Heading size="5" mt="5">Welcome back!</Heading>
            <Text color="gray" size="2" mt="1">Sign in to your account</Text>
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

          {/* Login Form */}
          <Card size="3">
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="4">
                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">Email Address</Text>
                  <TextField.Root
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    size="3"
                  >
                    <TextField.Slot>
                      <EnvelopeClosedIcon height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

                <Box>
                  <Text as="label" size="2" weight="medium" mb="1">Password</Text>
                  <TextField.Root
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    size="3"
                  >
                    <TextField.Slot>
                      <LockClosedIcon height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

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
                      <span>Signing in...</span>
                    </Flex>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </Flex>
            </form>
          </Card>

          {/* Register Link */}
          <Text align="center" color="gray" mt="4" as="p">
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "var(--indigo-11)", fontWeight: 500 }}>
              Register here
            </Link>
          </Text>
        </Box>
      </Flex>
    </Box>
  );
};

export default Login;
