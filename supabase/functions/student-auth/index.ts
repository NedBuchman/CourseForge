import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "npm:bcryptjs@2.4.3";

// Reverted to permissive CORS for development
// This was changed during security audit but broke cloud IDE environments
function getCorsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Allow-Credentials": "true",
  };
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

const rateLimiter = new Map<string, number[]>();

function isRateLimited(key: string, maxRequests = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const requests = rateLimiter.get(key) || [];
  const recentRequests = requests.filter(t => now - t < windowMs);

  if (recentRequests.length >= maxRequests) {
    return true;
  }

  rateLimiter.set(key, [...recentRequests, now]);
  return false;
}

function cleanupRateLimiter() {
  const now = Date.now();
  for (const [key, requests] of rateLimiter.entries()) {
    const recentRequests = requests.filter(t => now - t < 60000);
    if (recentRequests.length === 0) {
      rateLimiter.delete(key);
    } else {
      rateLimiter.set(key, recentRequests);
    }
  }
}

setInterval(cleanupRateLimiter, 60000);

function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters long" };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&#^()_\-+=\[\]{};:'",.<>\/\\|`~]/.test(password);

  if (!hasUpperCase) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!hasLowerCase) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!hasNumber) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  if (!hasSpecialChar) {
    return { valid: false, error: "Password must contain at least one special character" };
  }

  const commonPasswords = [
    'password123', 'Password123!', '123456789', 'qwerty123', 'Admin123!',
    'Welcome123!', 'Passw0rd!', 'Password1!', '12345678', 'abc123456'
  ];

  if (commonPasswords.includes(password)) {
    return { valid: false, error: "This password is too common, please choose a stronger one" };
  }

  return { valid: true };
}

async function constantTimeDelay(targetMs = 500) {
  const start = Date.now();
  const elapsed = Date.now() - start;
  const delay = Math.max(0, targetMs - elapsed);
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function logSecurityEvent(
  supabase: any,
  eventType: string,
  result: 'success' | 'failure',
  details?: any
) {
  try {
    await supabase.rpc('log_security_event', {
      p_event_type: eventType,
      p_resource_type: 'student_account',
      p_action: eventType,
      p_result: result,
      p_details: details || {}
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `${action}:${clientIp}`;

    if (isRateLimited(rateLimitKey, 10, 60000)) {
      await logSecurityEvent(supabase, `${action}_rate_limited`, 'failure', { ip: clientIp });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Too many requests. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === "register") {
      const { email, password, firstName, lastName }: RegisterRequest = await req.json();

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.error!);
      }

      const { data: existingUser } = await supabase
        .from("student_accounts")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        await logSecurityEvent(supabase, 'register_duplicate_email', 'failure', { email: email.toLowerCase() });
        throw new Error("An account with this email already exists");
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const { data: newStudent, error: insertError } = await supabase
        .from("student_accounts")
        .insert({
          email: email.toLowerCase(),
          password_hash: passwordHash,
          first_name: firstName || null,
          last_name: lastName || null,
          email_verified: false,
        })
        .select("id, email, first_name, last_name, created_at")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        await logSecurityEvent(supabase, 'register_failed', 'failure', { error: insertError.message });
        throw new Error("Failed to create account");
      }

      await logSecurityEvent(supabase, 'register_success', 'success', { student_id: newStudent.id });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Account created successfully",
          student: {
            id: newStudent.id,
            email: newStudent.email,
          },
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (action === "login") {
      const requestStart = Date.now();
      const { email, password }: LoginRequest = await req.json();

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const { data: student, error: fetchError } = await supabase
        .from("student_accounts")
        .select("id, email, password_hash, first_name, last_name")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      let isValidPassword = false;
      if (student) {
        isValidPassword = await bcrypt.compare(password, student.password_hash);
      } else {
        await bcrypt.hash(password, 10);
      }

      await constantTimeDelay(500);

      if (fetchError || !student || !isValidPassword) {
        await logSecurityEvent(supabase, 'login_failed', 'failure', { email: email.toLowerCase() });
        throw new Error("Invalid email or password");
      }

      await supabase
        .from("student_accounts")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", student.id);

      await logSecurityEvent(supabase, 'login_success', 'success', { student_id: student.id });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Login successful",
          student: {
            id: student.id,
            email: student.email,
            first_name: student.first_name,
            last_name: student.last_name,
          },
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (action === "forgot-password") {
      const requestStart = Date.now();
      const { email }: ForgotPasswordRequest = await req.json();

      if (!email) {
        throw new Error("Email is required");
      }

      const { data: student } = await supabase
        .from("student_accounts")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (student) {
        const resetToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        await supabase
          .from("student_accounts")
          .update({
            reset_password_token: resetToken,
            reset_password_expires: expiresAt.toISOString(),
          })
          .eq("id", student.id);

        await logSecurityEvent(supabase, 'forgot_password_initiated', 'success', {
          student_id: student.id
        });
      }

      await constantTimeDelay(500);

      return new Response(
        JSON.stringify({
          success: true,
          message: "If an account exists with this email, a password reset link has been sent",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (action === "reset-password") {
      const { token, newPassword }: ResetPasswordRequest = await req.json();

      if (!token || !newPassword) {
        throw new Error("Token and new password are required");
      }

      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.error!);
      }

      const { data: student } = await supabase
        .from("student_accounts")
        .select("id, reset_password_expires")
        .eq("reset_password_token", token)
        .maybeSingle();

      if (!student) {
        await logSecurityEvent(supabase, 'password_reset_invalid_token', 'failure', { token_prefix: token.substring(0, 8) });
        throw new Error("Invalid or expired reset token");
      }

      if (new Date(student.reset_password_expires) < new Date()) {
        await logSecurityEvent(supabase, 'password_reset_expired_token', 'failure', { student_id: student.id });
        throw new Error("Reset token has expired");
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await supabase
        .from("student_accounts")
        .update({
          password_hash: passwordHash,
          reset_password_token: null,
          reset_password_expires: null,
        })
        .eq("id", student.id);

      await logSecurityEvent(supabase, 'password_reset_success', 'success', { student_id: student.id });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Password reset successfully",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      throw new Error("Invalid action. Use: register, login, forgot-password, or reset-password");
    }
  } catch (error: any) {
    console.error("Student auth error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});