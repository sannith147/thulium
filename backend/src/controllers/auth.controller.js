import { supabase } from "../lib/supabase.js";

export async function loginSync(req, res) {
  const { role, name, mssId } = req.body;

  try {
    console.log("Login Sync Request:", { role, name, mssId });

    if (!mssId || !name) {
      return res.status(400).json({ error: "Full Name and MSS ID are required." });
    }

    // 1. Upsert the user row (create if new, leave existing untouched)
    const { data: userData, error: upsertError } = await supabase
      .from("users")
      .upsert(
        { email: mssId, full_name: name, role },
        { onConflict: "email", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("User Upsert Error:", upsertError);
      throw upsertError;
    }

    // 2. Verify the stored role matches the requested role
    if (userData.role !== role) {
      return res.status(403).json({
        error: `Unauthorized: This MSS ID is registered as a ${userData.role}.`
      });
    }

    // 3. Always upsert the role-specific profile row
    //    This is idempotent — safe even if the row already exists.
    if (role === "student") {
      const { error: studentError } = await supabase
        .from("students")
        .upsert({ id: userData.id }, { onConflict: "id", ignoreDuplicates: true });
      if (studentError) {
        console.error("Student profile sync error:", studentError.message);
        throw studentError;
      }
    } else if (role === "evaluator") {
      const { error: evalError } = await supabase
        .from("evaluators")
        .upsert({ id: userData.id }, { onConflict: "id", ignoreDuplicates: true });
      if (evalError) {
        console.error("Evaluator profile sync error:", evalError.message);
        throw evalError;
      }
    }

    return res.json({ id: userData.id, name: userData.full_name, role: userData.role });
  } catch (error) {
    console.error("Login Sync Error:", error);
    return res.status(500).json({ error: "An internal server error occurred." });
  }
}
