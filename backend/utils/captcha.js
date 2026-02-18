import axios from "axios";

/**
 * Verify reCAPTCHA v2/v3 token
 * @param {string} token - The reCAPTCHA token from the frontend
 * @param {string} remoteip - Optional IP address of the user
 * @returns {Promise<{success: boolean, score?: number, action?: string, error?: string}>}
 */
export const verifyRecaptcha = async (token, remoteip = null) => {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.warn("RECAPTCHA_SECRET_KEY not configured - skipping verification");
    return { success: true, message: "CAPTCHA verification skipped (not configured)" };
  }

  if (!token) {
    return { success: false, error: "No CAPTCHA token provided" };
  }

  try {
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    if (remoteip) {
      params.append("remoteip", remoteip);
    }

    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = response.data;

    if (data.success) {
      // For reCAPTCHA v3, check score (0.0 - 1.0, where 1.0 is very likely human)
      if (data.score !== undefined) {
        const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || "0.5");
        if (data.score < minScore) {
          return {
            success: false,
            score: data.score,
            error: "Low CAPTCHA score - suspected bot activity",
          };
        }
      }

      return {
        success: true,
        score: data.score,
        action: data.action,
        hostname: data.hostname,
      };
    } else {
      return {
        success: false,
        error: "CAPTCHA verification failed",
        errorCodes: data["error-codes"],
      };
    }
  } catch (error) {
    console.error("CAPTCHA verification error:", error.message);
    return {
      success: false,
      error: "CAPTCHA verification service unavailable",
    };
  }
};

/**
 * Verify hCaptcha token
 * @param {string} token - The hCaptcha token from the frontend
 * @param {string} remoteip - Optional IP address of the user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const verifyHcaptcha = async (token, remoteip = null) => {
  const secretKey = process.env.HCAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.warn("HCAPTCHA_SECRET_KEY not configured - skipping verification");
    return { success: true, message: "CAPTCHA verification skipped (not configured)" };
  }

  if (!token) {
    return { success: false, error: "No CAPTCHA token provided" };
  }

  try {
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    if (remoteip) {
      params.append("remoteip", remoteip);
    }

    const response = await axios.post(
      "https://hcaptcha.com/siteverify",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = response.data;

    if (data.success) {
      return {
        success: true,
        hostname: data.hostname,
      };
    } else {
      return {
        success: false,
        error: "CAPTCHA verification failed",
        errorCodes: data["error-codes"],
      };
    }
  } catch (error) {
    console.error("hCaptcha verification error:", error.message);
    return {
      success: false,
      error: "CAPTCHA verification service unavailable",
    };
  }
};

/**
 * Middleware to verify CAPTCHA on routes
 * Supports both reCAPTCHA and hCaptcha based on environment config
 */
export const verifyCaptchaMiddleware = async (req, res, next) => {
  const captchaProvider = process.env.CAPTCHA_PROVIDER || "recaptcha";
  const captchaToken = req.body.captchaToken || req.headers["x-captcha-token"];

  // Skip CAPTCHA in development mode if configured
  if (process.env.NODE_ENV === "development" && process.env.SKIP_CAPTCHA === "true") {
    return next();
  }

  let result;
  if (captchaProvider === "hcaptcha") {
    result = await verifyHcaptcha(captchaToken, req.ip);
  } else {
    result = await verifyRecaptcha(captchaToken, req.ip);
  }

  if (!result.success) {
    return res.status(400).json({
      message: "CAPTCHA verification failed",
      error: result.error,
    });
  }

  // Attach CAPTCHA result to request for logging
  req.captchaResult = result;
  next();
};
