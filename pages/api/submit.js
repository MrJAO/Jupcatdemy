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

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username, questTypeId, submissionData } = req.body;

  // ✅ Debugging logs (REMOVE this later in production)
  console.log("Received body:", req.body);
  console.log("Supabase URL:", process.env.SUPABASE_URL);

  // 🛑 Validate required fields before inserting
  if (!username || !questTypeId || !submissionData) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Insert into pending_submissions
    const { data, error } = await supabase
      .from('pending_submissions')
      .insert([
        {
          username,
          quest_type_id: questTypeId,  // 🔹 Ensure correct ID
          submission_data: submissionData,
          status: false,  // Default as pending
          submitted_at: new Date(),  // Timestamp
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
