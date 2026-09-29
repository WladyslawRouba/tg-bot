select
  c.id,
  c.telegram_user_id,
  c.chat_id,
  c.username,
  c.first_name,
  c.last_name,
  c.last_message_at,
  c.last_client_message_at,
  c.last_bot_message_at,
  count(m.id) as messages_count
from public.clients c
left join public.messages m on m.client_id = c.id
group by c.id
order by c.last_message_at desc nulls last;
