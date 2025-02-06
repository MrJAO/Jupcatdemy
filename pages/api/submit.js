import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
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
