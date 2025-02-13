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

  console.log("📥 Received Data:", req.body);
  const { quest_types, submissionData } = req.body;

  // ✅ Updated extraction to match frontend data
  // ✅ Extract required fields including quest_id
  const discord_username = submissionData?.discord_username || null;
  const twitter_username = submissionData?.twitter_username || null;
  const user_status = submissionData?.user_status || null;
@@ -47,6 +47,7 @@
  const tweet_post_link = submissionData?.tweet_post_link || null;
  const reply_submission_link = submissionData?.reply_submission_link || null;
  const retweet_submission_link = submissionData?.retweet_submission_link || null;
  const quest_id = submissionData?.quest_id || null; // ✅ Added quest_id

  console.log("🔹 Extracted Data:", {
    quest_types,
@@ -57,11 +58,13 @@
    submission_link,
    tweet_post_link,
    reply_submission_link,
    retweet_submission_link
    retweet_submission_link,
    quest_id
  });

  // 🛑 Validate required fields before inserting
  if (
    !quest_id || // ✅ Ensure quest_id is always present
    (quest_types === 3 && (!discord_username || !twitter_username || !user_status)) ||  // Onboarding requires all 3 fields
    (quest_types === 1 && !discord_username) ||  // Discord quests require Discord username
    (quest_types === 2 && !twitter_username)    // Twitter quests require Twitter username
@@ -84,16 +87,17 @@

    console.log(`🔍 Inserting into table: ${pendingTable}`);

    // 🔍 **Check if the user has already completed this quest in accepted quests**
    let checkQuery = supabase.from(pendingTable).select('id');
    // 🔍 **Check if the user has already completed this specific quest**
    let checkQuery = supabase.from(pendingTable).select('id').eq('quest_id', quest_id);

    // ✅ Dynamically check only relevant fields
    // ✅ Dynamically check based on the quest type and username
    if (quest_types === 1 && discord_username) {
      checkQuery = checkQuery.eq('discord_username', discord_username);
    } else if (quest_types === 2 && twitter_username) {
      checkQuery = checkQuery.eq('twitter_username', twitter_username);
    } else if (quest_types === 3 && discord_username && twitter_username) {
      checkQuery = checkQuery.or(`discord_username.eq.${discord_username},twitter_username.eq.${twitter_username}`);
      checkQuery = checkQuery
        .or(`discord_username.eq.${discord_username},twitter_username.eq.${twitter_username}`);
    }

    const { data: existingQuest, error: checkError } = await checkQuery.maybeSingle();
@@ -116,26 +120,27 @@
      tweet_post_link,
      reply_submission_link,
      retweet_submission_link,
      quest_id, // ✅ Include quest_id
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
