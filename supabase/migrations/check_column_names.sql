-- Check actual column names in tables that might use user_id or userId
-- Run this in Supabase SQL Editor to see which tables use which naming convention

SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name IN ('user_id', 'userId', 'author_id', 'authorId', 'follower_id', 'followerId', 
                    'requester_id', 'requesterId', 'target_id', 'targetId', 'friend_id', 'friendId',
                    'chat_id', 'chatId', 'sender_id', 'senderId', 'nomination_id', 'nominationId')
    OR column_name LIKE '%user%'
    OR column_name LIKE '%author%'
    OR column_name LIKE '%follower%'
    OR column_name LIKE '%requester%'
    OR column_name LIKE '%target%'
    OR column_name LIKE '%friend%'
    OR column_name LIKE '%chat%'
    OR column_name LIKE '%sender%'
    OR column_name LIKE '%nomination%'
  )
ORDER BY table_name, column_name;
