import { createClient } from '@supabase/supabase-js';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: 'https://jupcatdemy.com', // Allow only your frontend domain
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper function to run CORS middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // ✅ Handle CORS preflight requests
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username, questTypeId, submissionData } = req.body;

  // ✅ Extract user_status from submissionData
  const user_status = submissionData?.user_status;

  // ✅ Debugging logs (REMOVE later in production)
  console.log("Received body:", req.body);
  console.log("Supabase URL:", process.env.SUPABASE_URL);

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
      .single(); // Get only one row if it exists

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(checkError.message);
    }

    // 🛑 If the user already completed the quest, reject the submission
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
          submitted_at: new Date(), // Timestamp
        }
      ]);

    if (error) {
      throw new Error(error.message);
    }

    res.status(200).json({ message: 'Submission received!', data });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ error: error.message });
  }
}
