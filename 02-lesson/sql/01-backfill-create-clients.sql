insert into public.clients (
  telegram_user_id,
  chat_id,
  username,
  first_name,
  last_name,
  last_message_at,
  last_client_message_at,
  last_bot_message_at
)
select distinct on ((payload #>> '{message,from,id}')::bigint)
  (payload #>> '{message,from,id}')::bigint as telegram_user_id,
  (payload #>> '{message,chat,id}')::bigint as chat_id,
  payload #>> '{message,from,username}' as username,
  payload #>> '{message,from,first_name}' as first_name,
  payload #>> '{message,from,last_name}' as last_name,
  created_at as last_message_at,
  created_at as last_client_message_at,
  null as last_bot_message_at
from public.messages
where direction = 'client'
  and payload #>> '{message,from,id}' is not null
order by (payload #>> '{message,from,id}')::bigint, created_at desc
on conflict (telegram_user_id) do update set
  chat_id = excluded.chat_id,
  username = excluded.username,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  last_message_at = greatest(public.clients.last_message_at, excluded.last_message_at),
  last_client_message_at = greatest(public.clients.last_client_message_at, excluded.last_client_message_at),
  updated_at = now();
