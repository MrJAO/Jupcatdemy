import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // ✅ Add CORS Headers (Fixes your issue)
  res.setHeader("Access-Control-Allow-Origin", "https://jupcatdemy.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle CORS Preflight Request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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
