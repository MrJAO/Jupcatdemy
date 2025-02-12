import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // ✅ Set CORS Headers manually
  res.setHeader("Access-Control-Allow-Origin", "https://jupcatdemy.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // ✅ Handle CORS preflight request
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username, questTypeId, submissionData } = req.body;

  const user_status = submissionData?.user_status; // ✅ Extract user status

  // 🛑 Validate required fields before inserting
  if (!username || !questTypeId || !submissionData || !user_status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 🔍 Check if the user has already completed this quest
    const { data: existingQuest, error: checkError } = await supabase
      .from('accepted_quests')
      .select('id')
      .eq('username', username)
      .eq('quest_type_id', questTypeId)
      .maybeSingle(); // ✅ Better way to handle single row check

    if (checkError) {
      throw new Error(`Supabase Check Error: ${checkError.message}`);
    }

    if (existingQuest) {
      return res.status(400).json({ error: "This username has already completed this quest." });
    }

    // ✅ Insert into pending_submissions
    const { data, error } = await supabase
      .from('pending_submissions')
      .insert([
        {
          username,
          quest_type_id: questTypeId, // ✅ Ensure correct field name
          submission_data: submissionData,
          user_status, // ✅ Extracted correctly
          status: false, // Default as pending
          submitted_at: new Date(), // ✅ Timestamp
        }
      ]);

    if (error) {
      throw new Error(`Supabase Insert Error: ${error.message}`);
    }

    res.status(200).json({ message: '✅ Submission received!', data });
  } catch (error) {
    console.error("❌ Error occurred:", error);
    res.status(500).json({ error: error.message });
  }
}
