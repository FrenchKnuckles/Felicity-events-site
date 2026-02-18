import { useEffect, useRef, useState } from "react";
import "@hcaptcha/vanilla-hcaptcha";
import { Box, Flex, Text } from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";

/**
 * hCaptcha wrapper component
 * Renders the official hCaptcha widget and exposes the token via callbacks
 */
const SimpleCaptcha = ({ onTokenChange }) => {
  const captchaRef = useRef(null);
  const [verified, setVerified] = useState(false);
  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

  useEffect(() => {
    const el = captchaRef.current;
    if (!el || !siteKey) {
      if (!siteKey && onTokenChange) {
        onTokenChange(null);
      }
      return;
    }

    const handleVerified = (e) => {
      const token = e.token;
      setVerified(true);
      if (onTokenChange) {
        onTokenChange(token);
      }
    };

    const handleExpired = () => {
      setVerified(false);
      if (onTokenChange) {
        onTokenChange(null);
      }
    };

    const handleError = () => {
      setVerified(false);
      if (onTokenChange) {
        onTokenChange(null);
      }
    };

    el.addEventListener("verified", handleVerified);
    el.addEventListener("expired", handleExpired);
    el.addEventListener("error", handleError);

    return () => {
      el.removeEventListener("verified", handleVerified);
      el.removeEventListener("expired", handleExpired);
      el.removeEventListener("error", handleError);
    };
  }, [siteKey, onTokenChange]);

  if (!siteKey) {
    return (
      <Box p="3" style={{ background: "var(--yellow-3)", borderRadius: "var(--radius-3)" }}>
        <Text size="2" color="yellow">
          CAPTCHA is not configured. Please set VITE_HCAPTCHA_SITE_KEY in the frontend .env file.
        </Text>
      </Box>
    );
  }

  return (
    <Box p="3" style={{ background: "var(--gray-3)", borderRadius: "var(--radius-3)" }}>
      <Flex justify="between" align="center" mb="2">
        <Text size="2" color="gray">Verify you're human</Text>
        {verified && (
          <Flex align="center" gap="1">
            <CheckCircledIcon width="16" height="16" style={{ color: "var(--green-9)" }} />
            <Text size="1" color="green">Verified</Text>
          </Flex>
        )}
      </Flex>

      {/* hCaptcha web component */}
      <h-captcha
        ref={captchaRef}
        site-key={siteKey}
        size="normal"
      ></h-captcha>
    </Box>
  );
};

export default SimpleCaptcha;
