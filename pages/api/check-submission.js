import { createClient } from '@supabase/supabase-js';
import Cors from 'cors';

// ✅ Initialize CORS middleware c
const cors = Cors({
  methods: ['GET'],
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

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username, quest_id, quest_type } = req.query;

  if (!username || !quest_id || !quest_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  let pendingTable = "";
  if (quest_type === "3") {
    pendingTable = "onboarding_pending_submissions";
  } else if (quest_type === "1") {
    pendingTable = "discord_pending_submissions";
  } else if (quest_type === "2") {
    pendingTable = "twitter_pending_submissions";
  } else {
    return res.status(400).json({ error: "Invalid quest type" });
  }

  console.log(`🔍 Checking submission for username: ${username}, quest_id: ${quest_id} in ${pendingTable}`);

  try {
    let checkQuery = supabase.from(pendingTable).select('id').eq('quest_id', quest_id);

    if (quest_type === "1") {
      checkQuery = checkQuery.eq('discord_username', username);
    } else if (quest_type === "2") {
      checkQuery = checkQuery.eq('twitter_username', username);
    } else if (quest_type === "3") {
      checkQuery = checkQuery.or(`discord_username.eq.${username},twitter_username.eq.${username}`);
    }

    const { data: existingQuest, error: checkError } = await checkQuery.maybeSingle();

    if (checkError) {
      throw new Error(`Supabase Check Error: ${checkError.message}`);
    }

    if (existingQuest) {
      return res.status(200).json({ exists: true, message: "You have already submitted this quest." });
    }

    return res.status(200).json({ exists: false });
  } catch (error) {
    console.error("❌ Error occurred:", error);
    res.status(500).json({ error: error.message });
  }
}
