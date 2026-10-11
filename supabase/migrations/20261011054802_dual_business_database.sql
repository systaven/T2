-- Additive: existing migrated rows, timestamps and metadata are never rewritten.

create schema if not exists appwrite_t2_data;

revoke all on schema appwrite_t2_data from public, anon, authenticated;

grant usage on schema appwrite_t2_data to service_role;

create table if not exists appwrite_t2_data.short_links (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  _appwrite_document jsonb not null default '{}'::jsonb,
  "code" text not null check (char_length("code") <= 12),
  "targetHash" text not null check (char_length("targetHash") <= 64),
  "targetUrl" text not null
);

alter table appwrite_t2_data.short_links alter column created_at set default now(), alter column updated_at set default now(), alter column _appwrite_document set default '{}'::jsonb;

alter table appwrite_t2_data.short_links enable row level security;

revoke all on appwrite_t2_data.short_links from public, anon, authenticated;

grant select, insert, update, delete on appwrite_t2_data.short_links to service_role;

create unique index if not exists short_links_code_unique on appwrite_t2_data.short_links ("code");

create unique index if not exists short_links_target_hash_unique on appwrite_t2_data.short_links ("targetHash");

create table if not exists appwrite_t2_data.short_link_sources (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  _appwrite_document jsonb not null default '{}'::jsonb,
  "postId" text not null check (char_length("postId") <= 64),
  "targetHash" text not null check (char_length("targetHash") <= 64),
  "sourceKey" text not null check (char_length("sourceKey") <= 64)
);

alter table appwrite_t2_data.short_link_sources alter column created_at set default now(), alter column updated_at set default now(), alter column _appwrite_document set default '{}'::jsonb;

alter table appwrite_t2_data.short_link_sources enable row level security;

revoke all on appwrite_t2_data.short_link_sources from public, anon, authenticated;

grant select, insert, update, delete on appwrite_t2_data.short_link_sources to service_role;

create unique index if not exists short_link_sources_source_key_unique on appwrite_t2_data.short_link_sources ("sourceKey");

create index if not exists short_link_sources_post_id on appwrite_t2_data.short_link_sources ("postId");

create index if not exists short_link_sources_target_hash on appwrite_t2_data.short_link_sources ("targetHash");

create table if not exists appwrite_t2_data.admin_roles (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  _appwrite_document jsonb not null default '{}'::jsonb,
  "userId" text not null check (char_length("userId") <= 128),
  "email" text not null check (char_length("email") <= 320),
  "role" text not null check (char_length("role") <= 16)
);

alter table appwrite_t2_data.admin_roles alter column created_at set default now(), alter column updated_at set default now(), alter column _appwrite_document set default '{}'::jsonb;

alter table appwrite_t2_data.admin_roles enable row level security;

revoke all on appwrite_t2_data.admin_roles from public, anon, authenticated;

grant select, insert, update, delete on appwrite_t2_data.admin_roles to service_role;

create unique index if not exists admin_roles_user_id_unique on appwrite_t2_data.admin_roles ("userId");

create table if not exists appwrite_t2_data.admin_announcements (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  _appwrite_document jsonb not null default '{}'::jsonb,
  "title" text not null check (char_length("title") <= 255),
  "content" text,
  "published" boolean not null,
  "authorId" text not null check (char_length("authorId") <= 128)
);

alter table appwrite_t2_data.admin_announcements alter column created_at set default now(), alter column updated_at set default now(), alter column _appwrite_document set default '{}'::jsonb;

alter table appwrite_t2_data.admin_announcements enable row level security;

revoke all on appwrite_t2_data.admin_announcements from public, anon, authenticated;

grant select, insert, update, delete on appwrite_t2_data.admin_announcements to service_role;

create table if not exists appwrite_t2_data.admin_settings (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  _appwrite_document jsonb not null default '{}'::jsonb,
  "adminUserId" text not null check (char_length("adminUserId") <= 128)
);

alter table appwrite_t2_data.admin_settings alter column created_at set default now(), alter column updated_at set default now(), alter column _appwrite_document set default '{}'::jsonb;

alter table appwrite_t2_data.admin_settings enable row level security;

revoke all on appwrite_t2_data.admin_settings from public, anon, authenticated;

grant select, insert, update, delete on appwrite_t2_data.admin_settings to service_role;

create table if not exists appwrite_t2_data.native_comments (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  _appwrite_document jsonb not null default '{}'::jsonb,
  "postId" text not null check (char_length("postId") <= 128),
  "postTitle" text check (char_length("postTitle") <= 255),
  "href" text,
  "parentId" text check (char_length("parentId") <= 36),
  "rootId" text check (char_length("rootId") <= 36),
  "authorType" text not null check (char_length("authorType") <= 16),
  "authorId" text check (char_length("authorId") <= 128),
  "authorName" text not null check (char_length("authorName") <= 100),
  "authorEmail" text check (char_length("authorEmail") <= 320),
  "authorAvatar" text,
  "actorHash" text not null check (char_length("actorHash") <= 64),
  "guestTokenHash" text check (char_length("guestTokenHash") <= 64),
  "ipHash" text check (char_length("ipHash") <= 64),
  "content" text not null,
  "status" text not null check (char_length("status") <= 16),
  "likes" bigint not null,
  "edited" boolean not null
);

alter table appwrite_t2_data.native_comments alter column created_at set default now(), alter column updated_at set default now(), alter column _appwrite_document set default '{}'::jsonb;

alter table appwrite_t2_data.native_comments enable row level security;

revoke all on appwrite_t2_data.native_comments from public, anon, authenticated;

grant select, insert, update, delete on appwrite_t2_data.native_comments to service_role;

create index if not exists native_comments_post_status on appwrite_t2_data.native_comments ("postId", "status");

create index if not exists native_comments_post_hot on appwrite_t2_data.native_comments ("postId", "status", "likes");

create index if not exists native_comments_actor on appwrite_t2_data.native_comments ("actorHash");

create index if not exists native_comments_parent on appwrite_t2_data.native_comments ("parentId");

create table if not exists appwrite_t2_data.native_comment_likes (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  _appwrite_document jsonb not null default '{}'::jsonb,
  "commentId" text not null check (char_length("commentId") <= 36),
  "actorHash" text not null check (char_length("actorHash") <= 64)
);

alter table appwrite_t2_data.native_comment_likes alter column created_at set default now(), alter column updated_at set default now(), alter column _appwrite_document set default '{}'::jsonb;

alter table appwrite_t2_data.native_comment_likes enable row level security;

revoke all on appwrite_t2_data.native_comment_likes from public, anon, authenticated;

grant select, insert, update, delete on appwrite_t2_data.native_comment_likes to service_role;

create unique index if not exists native_comment_like_unique on appwrite_t2_data.native_comment_likes ("commentId", "actorHash");

create table if not exists appwrite_t2_data.native_article_reactions (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  _appwrite_document jsonb not null default '{}'::jsonb,
  "postId" text not null check (char_length("postId") <= 128),
  "votes" text not null
);

alter table appwrite_t2_data.native_article_reactions alter column created_at set default now(), alter column updated_at set default now(), alter column _appwrite_document set default '{}'::jsonb;

alter table appwrite_t2_data.native_article_reactions enable row level security;

revoke all on appwrite_t2_data.native_article_reactions from public, anon, authenticated;

grant select, insert, update, delete on appwrite_t2_data.native_article_reactions to service_role;

create unique index if not exists native_article_reaction_post on appwrite_t2_data.native_article_reactions ("postId");

create table if not exists appwrite_t2_data.native_comment_settings (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  _appwrite_document jsonb not null default '{}'::jsonb,
  "payload" text not null,
  "updatedBy" text check (char_length("updatedBy") <= 128)
);

alter table appwrite_t2_data.native_comment_settings alter column created_at set default now(), alter column updated_at set default now(), alter column _appwrite_document set default '{}'::jsonb;

alter table appwrite_t2_data.native_comment_settings enable row level security;

revoke all on appwrite_t2_data.native_comment_settings from public, anon, authenticated;

grant select, insert, update, delete on appwrite_t2_data.native_comment_settings to service_role;

create table if not exists appwrite_t2_data.wallpaper_settings (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  _appwrite_document jsonb not null default '{}'::jsonb,
  "payload" text not null,
  "updatedBy" text check (char_length("updatedBy") <= 128)
);

alter table appwrite_t2_data.wallpaper_settings alter column created_at set default now(), alter column updated_at set default now(), alter column _appwrite_document set default '{}'::jsonb;

alter table appwrite_t2_data.wallpaper_settings enable row level security;

revoke all on appwrite_t2_data.wallpaper_settings from public, anon, authenticated;

grant select, insert, update, delete on appwrite_t2_data.wallpaper_settings to service_role;

-- One service-only RPC exposes CRUD, not the private tables. Invoker privileges
-- apply to every statement; anon/authenticated cannot execute this function.
create or replace function public.t2_business_database(p_schema text, p_operation text, p_request jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog as $function$
declare
  tab text := p_request->>'tableId';
  rid text := p_request->>'rowId';
  qualified text;
  row_data jsonb;
  result jsonb;
  data jsonb;
  q jsonb;
  val jsonb;
  col text;
  columns_sql text := '';
  values_sql text := '';
  assignments text := '';
  conditions text := 'true';
  orders jsonb := '[]'::jsonb;
  order_sql text := '';
  cursor_conditions text := '';
  prefix text := 'true';
  cursor_row jsonb;
  page_limit integer := 25;
  page_offset integer := 0;
  count_rows bigint := 0;
  cursor_id text;
  ascending boolean;
  comment_id text := p_request->>'commentId';
  actor text := p_request->>'actorHash';
  post_id text := p_request->>'postId';
  reaction text := p_request->>'reaction';
  liked boolean;
  likes bigint;
  voters jsonb;
  counts jsonb := '{"love":0,"useful":0,"thinking":0,"surprised":0,"confused":0}';
  item text;
  ids text[] := array['love','useful','thinking','surprised','confused'];
begin
  if p_schema !~ '^appwrite_[a-zA-Z0-9_]+$' or not exists (select 1 from pg_namespace where nspname = p_schema) then
    raise exception 'Unknown business schema' using errcode = '22023';
  end if;
  if p_operation = 'like' then
    if coalesce(actor, '') = '' then raise exception 'Missing actor' using errcode = '22023'; end if;
    execute format('select to_jsonb(t) from %I.native_comments t where id = $1 for update', p_schema) into row_data using comment_id;
    if row_data is null then raise exception 'Comment not found' using errcode = 'P0002'; end if;
    execute format('select id from %I.native_comment_likes where "commentId"=$1 and "actorHash"=$2', p_schema) into rid using comment_id, actor;
    liked := rid is null;
    if liked then
      perform public.t2_business_database(p_schema, 'create', jsonb_build_object('tableId','native_comment_likes','rowId',gen_random_uuid()::text,'data',jsonb_build_object('commentId',comment_id,'actorHash',actor)));
    else
      perform public.t2_business_database(p_schema, 'delete', jsonb_build_object('tableId','native_comment_likes','rowId',rid));
    end if;
    likes := greatest(0, (row_data->>'likes')::bigint + case when liked then 1 else -1 end);
    perform public.t2_business_database(p_schema, 'update', jsonb_build_object('tableId','native_comments','rowId',comment_id,'data',jsonb_build_object('likes',likes)));
    return jsonb_build_object('liked',liked,'likes',likes);
  elsif p_operation = 'reaction' then
    if reaction is not null and (coalesce(actor,'') = '' or not reaction = any(ids)) then raise exception 'Invalid article reaction' using errcode = '22023'; end if;
    if reaction is not null then perform pg_advisory_xact_lock(hashtextextended(p_schema || ':reaction:' || post_id, 0)); end if;
    execute format('select to_jsonb(t) from %I.native_article_reactions t where "postId"=$1',p_schema) into row_data using post_id;
    begin
      voters := (row_data->>'votes')::jsonb->'voters';
    exception when invalid_text_representation then voters := '{}'::jsonb;
    end;
    if voters is null or jsonb_typeof(voters) <> 'object' then voters := '{}'::jsonb; end if;
    if reaction is not null then
      if voters->>actor = reaction then voters := voters - actor;
      else voters := voters || jsonb_build_object(actor,reaction); end if;
    end if;
    foreach item in array ids loop
      counts := jsonb_set(counts,array[item],to_jsonb((select count(*) from jsonb_each_text(voters) v where v.value = item)));
    end loop;
    if reaction is not null then
      data := jsonb_build_object('postId',post_id,'votes',jsonb_build_object('voters',voters,'counts',counts)::text);
      perform public.t2_business_database(p_schema,case when row_data is null then 'create' else 'update' end,jsonb_build_object('tableId','native_article_reactions','rowId',coalesce(row_data->>'id',gen_random_uuid()::text),'data',data));
    end if;
    return jsonb_build_object('counts',counts,'selected',voters->actor);
  end if;
  if tab is null or not tab = any(array['short_links','short_link_sources','admin_roles','admin_announcements','admin_settings','native_comments','native_comment_likes','native_article_reactions','native_comment_settings','wallpaper_settings']) then
    raise exception 'Unknown business table' using errcode = '22023';
  end if;
  qualified := format('%I.%I',p_schema,tab);
  if to_regclass(qualified) is null then raise exception 'Missing business table: %', tab using errcode = '42P01'; end if;
  if p_operation = 'table' then return jsonb_build_object('$id',tab); end if;
  if p_operation = 'list' then
    for q in select value from jsonb_array_elements(coalesce(p_request->'queries','[]'::jsonb)) loop
      if q->>'type' = 'limit' then page_limit := (q->>'value')::integer;
      elsif q->>'type' = 'offset' then page_offset := (q->>'value')::integer;
      elsif q->>'type' = 'cursor' then cursor_id := q->>'value';
      elsif q->>'type' in ('equal','order') then
        col := case q->>'column' when '$id' then 'id' when '$createdAt' then 'created_at' when '$updatedAt' then 'updated_at' else q->>'column' end;
        if col = '_appwrite_document' or not exists (select 1 from pg_attribute where attrelid = to_regclass(qualified) and attname = col and attnum > 0 and not attisdropped) then raise exception 'Unknown database column' using errcode = '22023'; end if;
        if q->>'type' = 'order' then orders := orders || jsonb_build_array(jsonb_build_object('column',col,'ascending',coalesce((q->>'ascending')::boolean,true)));
        else
          assignments := 'false';
          for val in select value from jsonb_array_elements(case when jsonb_typeof(q->'value')='array' then q->'value' else jsonb_build_array(q->'value') end) loop
            assignments := assignments || format(' or t.%I is not distinct from (jsonb_populate_record(null::%s,%L::jsonb)).%I',col,qualified,jsonb_build_object(col,val)::text,col);
          end loop;
          conditions := conditions || ' and (' || assignments || ')';
        end if;
      else raise exception 'Unknown database query' using errcode = '22023'; end if;
    end loop;
    if page_limit is null or page_limit < 1 or page_limit > 100000 or page_offset is null or page_offset < 0 then raise exception 'Invalid pagination' using errcode = '22023'; end if;
    if not exists (select 1 from jsonb_array_elements(orders) o where o->>'column'='id') then orders := orders || '[{"column":"id","ascending":true}]'::jsonb; end if;
    if coalesce((p_request->>'total')::boolean,true) then execute format('select count(*) from %s t where %s',qualified,conditions) into count_rows; end if;
    if cursor_id is not null then
      execute format('select to_jsonb(t) from %s t where %s and id=$1',qualified,conditions) into cursor_row using cursor_id;
      if cursor_row is null then raise exception 'Pagination cursor not found' using errcode = 'P0002'; end if;
    end if;
    for q in select value from jsonb_array_elements(orders) loop
      col := q->>'column'; ascending := (q->>'ascending')::boolean;
      order_sql := order_sql || case when order_sql='' then '' else ', ' end || format('t.%I %s nulls last',col,case when ascending then 'asc' else 'desc' end);
      if cursor_id is not null then
        -- Compare typed values; NULLS LAST is identical for both directions.
        values_sql := format('(jsonb_populate_record(null::%s,%L::jsonb)).%I',qualified,cursor_row::text,col);
        if cursor_row->col <> 'null'::jsonb then
          cursor_conditions := cursor_conditions || case when cursor_conditions='' then '' else ' or ' end || format('(%s and (t.%I %s %s or t.%I is null))',prefix,col,case when ascending then '>' else '<' end,values_sql,col);
        end if;
        prefix := prefix || format(' and t.%I is not distinct from %s',col,values_sql);
      end if;
    end loop;
    if cursor_id is not null then conditions := conditions || ' and (' || coalesce(nullif(cursor_conditions,''),'false') || ')'; end if;
    execute format('select coalesce(jsonb_agg(to_jsonb(page)),''[]''::jsonb) from (select t.* from %s t where %s order by %s limit %s offset %s) page',qualified,conditions,order_sql,page_limit,page_offset) into result;
    return jsonb_build_object('rows',result,'total',case when coalesce((p_request->>'total')::boolean,true) then count_rows else jsonb_array_length(result) end);
  elsif p_operation in ('create','update') then
    data := p_request->'data';
    if data is null or jsonb_typeof(data) <> 'object' then raise exception 'Missing row data' using errcode = '22023'; end if;
    columns_sql := ''; values_sql := ''; assignments := '';
    for col in select jsonb_object_keys(data) loop
      if col in ('id','created_at','updated_at','_appwrite_document') or not exists (select 1 from pg_attribute where attrelid=to_regclass(qualified) and attname=col and attnum>0 and not attisdropped) then raise exception 'Unknown writable column' using errcode = '22023'; end if;
      columns_sql := columns_sql || format(',%I',col);
      values_sql := values_sql || format(',r.%I',col);
      assignments := assignments || format('t.%I',col); -- overwritten below; UPDATE uses a complete typed record
    end loop;
    if p_operation='create' then
      execute format('insert into %s (id%s) select $2%s from jsonb_populate_record(null::%s,$1) r returning to_jsonb(%I.*)',qualified,columns_sql,values_sql,qualified,tab) into result using data,rid;
    else
      execute format('select to_jsonb(t) from %s t where id=$1 for update',qualified) into row_data using rid;
      if row_data is null then raise exception 'Record not found' using errcode='P0002'; end if;
      assignments := '';
      for col in select jsonb_object_keys(data) loop assignments := assignments || format('%I=r.%I,',col,col); end loop;
      execute format('update %s t set %s updated_at=clock_timestamp() from jsonb_populate_record(null::%s,$1) r where t.id=$2 returning to_jsonb(t)',qualified,assignments,qualified) into result using data,rid;
    end if;
    -- Maintain the original row envelope on future writes; migrated rows stay intact.
    row_data := coalesce(result->'_appwrite_document','{}'::jsonb) || (result - array['id','created_at','updated_at','_appwrite_document']) || jsonb_build_object('$id',result->'id','$createdAt',result->'created_at','$updatedAt',result->'updated_at');
    execute format('update %s set _appwrite_document=$1 where id=$2',qualified) using row_data,rid;
    return result;
  elsif p_operation='get' then
    execute format('select to_jsonb(t) from %s t where id=$1',qualified) into result using rid;
    if result is null then raise exception 'Record not found' using errcode='P0002'; end if;
    return result;
  elsif p_operation='delete' then
    execute format('delete from %s where id=$1 returning to_jsonb(%I.*)',qualified,tab) into result using rid;
    if result is null then raise exception 'Record not found' using errcode='P0002'; end if;
    return '{}'::jsonb;
  else raise exception 'Unknown database operation' using errcode='22023'; end if;
end;
$function$;
revoke all on function public.t2_business_database(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.t2_business_database(text,text,jsonb) to service_role;
notify pgrst, 'reload schema';
