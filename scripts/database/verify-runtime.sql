-- Run against a prepared Supabase database. Every test write is rolled back.
begin;
set local role service_role;
do $test$
declare
  result jsonb;
  original_hash text;
  final_hash text;
  comment_data jsonb := '{"postId":"__adapter_test","authorType":"guest","authorName":"Tester","actorHash":"tester","content":"Temporary","status":"published","likes":0,"edited":false}';
begin
  select md5(string_agg(_appwrite_document::text, '' order by id)) into original_hash from appwrite_t2_data.native_comments;
  result := public.t2_business_database('appwrite_t2_data','create','{"tableId":"short_links","rowId":"__adapter_link","data":{"code":"__test_link","targetHash":"__adapter_hash","targetUrl":"https://example.com/a?x=it''s"}}');
  if result->>'id' <> '__adapter_link' or result->>'created_at' is null then raise exception 'Create failed'; end if;
  perform public.t2_business_database('appwrite_t2_data','update','{"tableId":"short_links","rowId":"__adapter_link","data":{"targetUrl":"https://example.com/updated"}}');
  result := public.t2_business_database('appwrite_t2_data','get','{"tableId":"short_links","rowId":"__adapter_link"}');
  if result->>'targetUrl' <> 'https://example.com/updated' or result->'_appwrite_document'->>'targetUrl' <> 'https://example.com/updated' then raise exception 'Update failed'; end if;
  perform public.t2_business_database('appwrite_t2_data','delete','{"tableId":"short_links","rowId":"__adapter_link"}');
  begin
    perform public.t2_business_database('appwrite_t2_data','get','{"tableId":"short_links","rowId":"__adapter_link"}');
    raise exception 'Expected missing row';
  exception when no_data_found then null; end;
  perform public.t2_business_database('appwrite_t2_data','create',jsonb_build_object('tableId','native_comments','rowId','__adapter_a','data',comment_data));
  perform public.t2_business_database('appwrite_t2_data','create',jsonb_build_object('tableId','native_comments','rowId','__adapter_b','data',comment_data || '{"parentId":"root"}'));
  perform public.t2_business_database('appwrite_t2_data','create',jsonb_build_object('tableId','native_comments','rowId','__adapter_c','data',comment_data || '{"parentId":"root"}'));
  result := public.t2_business_database('appwrite_t2_data','list','{"tableId":"native_comments","queries":[{"type":"equal","column":"postId","value":"__adapter_test"},{"type":"order","column":"parentId","ascending":false},{"type":"limit","value":1}]}');
  if result->>'total' <> '3' or result->'rows'->0->>'id' <> '__adapter_b' then raise exception 'Order/total failed: %',result; end if;
  result := public.t2_business_database('appwrite_t2_data','list','{"tableId":"native_comments","queries":[{"type":"equal","column":"postId","value":"__adapter_test"},{"type":"order","column":"parentId","ascending":false},{"type":"cursor","value":"__adapter_b"}]}');
  if jsonb_array_length(result->'rows')<>2 or result->'rows'->0->>'id'<>'__adapter_c' or result->'rows'->1->>'id'<>'__adapter_a' then raise exception 'Tie/null cursor failed: %',result; end if;
  result := public.t2_business_database('appwrite_t2_data','list','{"tableId":"native_comments","queries":[{"type":"equal","column":"postId","value":["__adapter_test"]},{"type":"equal","column":"parentId","value":null}]}');
  if result->>'total'<>'1' then raise exception 'Array/null filter failed: %',result; end if;
  result := public.t2_business_database('appwrite_t2_data','like','{"commentId":"__adapter_a","actorHash":"actor1"}');
  if result<> '{"liked":true,"likes":1}'::jsonb then raise exception 'Like failed: %',result; end if;
  result := public.t2_business_database('appwrite_t2_data','like','{"commentId":"__adapter_a","actorHash":"actor1"}');
  if result<> '{"liked":false,"likes":0}'::jsonb then raise exception 'Unlike failed'; end if;
  result := public.t2_business_database('appwrite_t2_data','reaction','{"postId":"__adapter_test","actorHash":"actor1","reaction":"love"}');
  if result->'counts'->>'love'<>'1' or result->>'selected'<>'love' then raise exception 'Reaction failed: %',result; end if;
  result := public.t2_business_database('appwrite_t2_data','reaction','{"postId":"__adapter_test","actorHash":"actor1","reaction":"useful"}');
  if result->'counts'->>'love'<>'0' or result->'counts'->>'useful'<>'1' then raise exception 'Reaction change failed'; end if;
  result := public.t2_business_database('appwrite_t2_data','reaction','{"postId":"__adapter_test","actorHash":"actor1","reaction":"useful"}');
  if result->'counts'->>'useful'<>'0' or result->>'selected' is not null then raise exception 'Reaction undo failed'; end if;
  perform public.t2_business_database('appwrite_t2_data','delete','{"tableId":"native_comments","rowId":"__adapter_a"}');
  perform public.t2_business_database('appwrite_t2_data','delete','{"tableId":"native_comments","rowId":"__adapter_b"}');
  perform public.t2_business_database('appwrite_t2_data','delete','{"tableId":"native_comments","rowId":"__adapter_c"}');
  select md5(string_agg(_appwrite_document::text, '' order by id)) into final_hash from appwrite_t2_data.native_comments;
  if original_hash is distinct from final_hash then raise exception 'Existing comments changed'; end if;
end;
$test$;
reset role;
select not has_function_privilege('anon','public.t2_business_database(text,text,jsonb)','execute') as anon_blocked,
       not has_function_privilege('authenticated','public.t2_business_database(text,text,jsonb)','execute') as users_blocked,
       has_function_privilege('service_role','public.t2_business_database(text,text,jsonb)','execute') as server_allowed;
rollback;
