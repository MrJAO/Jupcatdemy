import { createClient } from '@supabase/supabase-js';
import Cors from 'cors';

// ✅ Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: 'https://jupcatdemy.com',
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ✅ Helper function to run CORS middleware
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
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username, questTypeId, submissionData } = req.body;

  // ✅ Extract user fields from submissionData
  const user_status = submissionData?.user_status;
  const twitter_username = submissionData?.twitter || null; // Ensure it's defined

  // 🛑 Validate required fields before inserting
  if (!username || !questTypeId || !submissionData || !user_status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 🔍 **Check if the user has already completed this quest**
    const { data: existingQuest, error: checkError } = await supabase
      .from('accepted_quests')
      .select('id')
      .eq('username', username)
      .eq('quest_type_id', questTypeId)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Supabase Check Error: ${checkError.message}`);
    }

    if (existingQuest) {
      return res.status(400).json({ error: "This username has already completed this quest." });
    }

    // ✅ **Check if the user already has a pending submission**
    const { data: pendingQuest, error: pendingError } = await supabase
      .from('pending_submissions')
      .select('id')
      .eq('username', username)
      .eq('quest_type_id', questTypeId)
      .maybeSingle();

    if (pendingError) {
      throw new Error(`Supabase Pending Check Error: ${pendingError.message}`);
    }

    if (pendingQuest) {
      return res.status(400).json({ error: "You have already submitted this quest and it's pending approval." });
    }

    // ✅ **Insert into pending_submissions (without twitter_username as a separate field)**
    const { data, error } = await supabase
      .from('pending_submissions')
      .insert([
        {
          username,
          quest_type_id: questTypeId,
          submission_data: submissionData, // ✅ Twitter username is already inside this JSON field
          user_status,
          status: false, // Default as pending
          submitted_at: new Date(),
        }
      ]);

    if (error) {
      throw new Error(error.message);
    }

    res.status(200).json({ message: '✅ Submission received!', data });
  } catch (error) {
    console.error("❌ Error occurred:", error);
    res.status(500).json({ error: error.message });
  }
}
