import { useEffect, useRef, useState } from "react";
import "@hcaptcha/vanilla-hcaptcha";
import { Box, Flex, Text } from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";

const SimpleCaptcha = ({ onTokenChange }) => {
  const ref = useRef(null);
  const [verified, setVerified] = useState(false);
  const sk = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

  useEffect(() => {
    const el = ref.current;
    if (!el || !sk) { if (!sk && onTokenChange) onTokenChange(null); return; }
    const onV = e => { setVerified(true); onTokenChange?.(e.token); };
    const onX = () => { setVerified(false); onTokenChange?.(null); };
    el.addEventListener("verified", onV); el.addEventListener("expired", onX); el.addEventListener("error", onX);
    return () => { el.removeEventListener("verified", onV); el.removeEventListener("expired", onX); el.removeEventListener("error", onX); };
  }, [sk, onTokenChange]);

  if (!sk) return <Box p="3" style={{ background: "var(--yellow-3)", borderRadius: "var(--radius-3)" }}><Text size="2" color="yellow">CAPTCHA is not configured. Please set VITE_HCAPTCHA_SITE_KEY in the frontend .env file.</Text></Box>;

  return (
    <Box p="3" style={{ background: "var(--gray-3)", borderRadius: "var(--radius-3)" }}>
      <Flex justify="between" align="center" mb="2"><Text size="2" color="gray">Verify you're human</Text>{verified && <Flex align="center" gap="1"><CheckCircledIcon width="16" height="16" style={{ color: "var(--green-9)" }} /><Text size="1" color="green">Verified</Text></Flex>}</Flex>
      <h-captcha ref={ref} site-key={sk} size="normal"></h-captcha>
    </Box>
  );
};

export default SimpleCaptcha;
