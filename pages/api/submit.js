import { createClient } from '@supabase/supabase-js';
import Cors from 'cors';

// Initialize the CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'], // Allow GET, POST, and OPTIONS requests
  origin: 'https://jupcatdemy.com', // Allow requests from your frontend domain
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper function to run the CORS middleware
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
  // Run the CORS middleware
  await runMiddleware(req, res, cors);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username, taskType, submissionData } = req.body;

  console.log("Received body:", req.body); // Log the request body
  console.log("Supabase URL:", process.env.SUPABASE_URL); // Log environment variables

  try {
    const { data, error } = await supabase
      .from('quest_submissions')
      .insert([{ username, task_type: taskType, submission_data: submissionData, status: false }]);

    if (error) {
      throw new Error(error.message);
    }

    res.status(200).json({ message: 'Submission received', data });
  } catch (error) {
    console.error("Error occurred:", error); // Log the error
    res.status(500).json({ error: error.message });
  }
}
