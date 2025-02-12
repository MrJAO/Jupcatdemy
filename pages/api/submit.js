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

  const { questTypeId, submissionData } = req.body;

  // ✅ Extract user fields from submissionData
  const discord_username = submissionData?.discord || null;
  const twitter_username = submissionData?.twitter || null;
  const user_status = submissionData?.user_status || null;
  const short_answer = submissionData?.short_answer || null;
  const submission_link = submissionData?.submission_link || null;
  const tweet_post_link = submissionData?.tweet_post_link || null;
  const reply_submission_link = submissionData?.reply_submission_link || null;
  const retweet_submission_link = submissionData?.retweet_submission_link || null;

  // 🛑 Validate required fields before inserting
  if (
    (questTypeId === 3 && (!discord_username || !twitter_username)) ||  // Onboarding requires both
    (questTypeId === 1 && !discord_username) ||  // Discord quests require Discord username
    (questTypeId === 2 && !twitter_username)    // Twitter quests require Twitter username
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // ✅ Determine the correct table based on questTypeId
    let pendingTable = "";
    if (questTypeId === 3) {
      pendingTable = "onboarding_pending_submissions";
    } else if (questTypeId === 1) {
      pendingTable = "discord_pending_submissions";
    } else if (questTypeId === 2) {
      pendingTable = "twitter_pending_submissions";
    } else {
      return res.status(400).json({ error: "Invalid quest type" });
    }

    // 🔍 **Check if the user has already completed this quest**
    const { data: existingQuest, error: checkError } = await supabase
      .from('accepted_quests')
      .select('id')
      .or(
        `discord_username.eq.${discord_username},twitter_username.eq.${twitter_username}`
      )
      .eq('quest_type_id', questTypeId)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Supabase Check Error: ${checkError.message}`);
    }

    if (existingQuest) {
      return res.status(400).json({ error: "You have already completed this quest." });
    }

    // ✅ **Check if the user already has a pending submission**
    const { data: pendingQuest, error: pendingError } = await supabase
      .from(pendingTable)
      .select('id')
      .or(
        `discord_username.eq.${discord_username},twitter_username.eq.${twitter_username}`
      )
      .maybeSingle();

    if (pendingError) {
      throw new Error(`Supabase Pending Check Error: ${pendingError.message}`);
    }

    if (pendingQuest) {
      return res.status(400).json({ error: "You have already submitted this quest and it's pending approval." });
    }

    // ✅ **Insert into the correct pending_submissions table**
    const submissionPayload = {
      discord_username,
      twitter_username,
      user_status,
      short_answer,
      submission_link,
      tweet_post_link,
      reply_submission_link,
      retweet_submission_link,
      status: false, // Default as pending
      submitted_at: new Date(),
    };

    // Remove null values to prevent errors
    Object.keys(submissionPayload).forEach(
      (key) => submissionPayload[key] === null && delete submissionPayload[key]
    );

    const { data, error } = await supabase
      .from(pendingTable)
      .insert([submissionPayload]);

    if (error) {
      throw new Error(error.message);
    }

    res.status(200).json({ message: '✅ Submission received!', data });
  } catch (error) {
    console.error("❌ Error occurred:", error);
    res.status(500).json({ error: error.message });
  }
}
