update public.messages m
set client_id = c.id
from public.clients c
where m.client_id is null
  and m.payload #>> '{message,from,id}' is not null
  and (m.payload #>> '{message,from,id}')::bigint = c.telegram_user_id;
