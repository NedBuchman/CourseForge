import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "register") {
      const { email, password, firstName, lastName }: RegisterRequest = await req.json();

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const { data: existingUser } = await supabase
        .from("student_accounts")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        throw new Error("An account with this email already exists");
      }

      const passwordHash = await bcrypt.hash(password);

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
        throw new Error("Failed to create account");
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Account created successfully",
          student: newStudent,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (action === "login") {
      const { email, password }: LoginRequest = await req.json();

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const { data: student, error: fetchError } = await supabase
        .from("student_accounts")
        .select("id, email, password_hash, first_name, last_name")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (fetchError || !student) {
        throw new Error("Invalid email or password");
      }

      const isValidPassword = await bcrypt.compare(password, student.password_hash);

      if (!isValidPassword) {
        throw new Error("Invalid email or password");
      }

      await supabase
        .from("student_accounts")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", student.id);

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
      const { email }: ForgotPasswordRequest = await req.json();

      if (!email) {
        throw new Error("Email is required");
      }

      const { data: student } = await supabase
        .from("student_accounts")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (!student) {
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
      }

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

      return new Response(
        JSON.stringify({
          success: true,
          message: "Password reset instructions sent to your email",
          resetToken,
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

      if (newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const { data: student } = await supabase
        .from("student_accounts")
        .select("id, reset_password_expires")
        .eq("reset_password_token", token)
        .maybeSingle();

      if (!student) {
        throw new Error("Invalid or expired reset token");
      }

      if (new Date(student.reset_password_expires) < new Date()) {
        throw new Error("Reset token has expired");
      }

      const passwordHash = await bcrypt.hash(newPassword);

      await supabase
        .from("student_accounts")
        .update({
          password_hash: passwordHash,
          reset_password_token: null,
          reset_password_expires: null,
        })
        .eq("id", student.id);

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