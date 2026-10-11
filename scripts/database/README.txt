T2 双数据库使用说明

范围：原 Appwrite t2_data 的全部业务读写。Notion、Clerk 登录和原有其它 Supabase 功能不受此选择影响。
未设置 DATABASE_PROVIDER 时继续使用 Appwrite。不会自动降级、双写或自动同步两个库。

一、使用 Appwrite
在 .env.local 或部署平台配置：
DATABASE_PROVIDER=appwrite
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=69ca8e510018b435866c
APPWRITE_DATABASE_ID=t2_data
APPWRITE_API_KEY=<服务端密钥>
原有 APPWRITE_ADMIN_*_TABLE_ID / APPWRITE_SHORT_LINK_*_TABLE_ID 覆盖仍有效。
保留行读写权限，以及后台初始化表所需的表/列/索引权限。

二、使用已迁移的 Supabase
DATABASE_PROVIDER=supabase
SUPABASE_URL=https://upmfsfnhpmosqrctdysz.supabase.co
SUPABASE_SECRET_KEY=<Supabase 服务端 secret key>
SUPABASE_DB_SCHEMA=appwrite_t2_data
旧式服务端 key 可配置为 SUPABASE_SERVICE_ROLE_KEY；SUPABASE_SECRET_KEY 优先。
请勿为服务端密钥添加 NEXT_PUBLIC_ 前缀。连接插件的授权不会自动为网站配置密钥。

云端 main 已安装本目录 ../../supabase/migrations/*_dual_business_database.sql。
新项目需要运行这份 SQL。其它 appwrite_* schema 需要具备相同十张表、默认值和服务端权限。
网站通过只允许 service_role 执行的 SECURITY INVOKER RPC 访问私有表；无需把私有 schema 加入公开 Data API。
评论设置可以读取现有明文 JSON。BUSINESS_SETTINGS_ENCRYPTION_KEY 可选，仅用于 Supabase 后续新写入设置的 AES-GCM 加密；若启用，应长期保留同一密钥。

三、切换和检查
修改环境变量后重启本地服务；部署平台需要重新部署，新的环境变量才会生效。
打开文章并检查评论加载、发布、编辑、删除、点赞与文章评价，再检查后台角色、公告、评论设置和旧短链接。
连接失败会提示重试，评论输入保留；短链接查询失败显示重试页面，不会误报链接不存在。
若选中的库报错，请检查对应密钥、权限、schema 和迁移安装状态。
切回 Appwrite 只需设置 DATABASE_PROVIDER=appwrite 并重启/重新部署。
两个库不会同步新数据；实际切换前应暂停写入并重新校验/迁移，避免源库在快照后继续写入。

四、今后批量迁移
要求 Python 3.10+、已登录的 Appwrite CLI；在 T2 根目录执行：
python3 scripts/database/appwrite_to_supabase.py export --project-dir . --database t2_data --out .tmp/database-migration/snapshot
python3 scripts/database/appwrite_to_supabase.py plan --snapshot .tmp/database-migration/snapshot/t2_data.json --schema appwrite_t2_data --out .tmp/database-migration/plan
python3 scripts/database/appwrite_to_supabase.py check-source --snapshot .tmp/database-migration/snapshot/t2_data.json --project-dir .

export 可重复指定 --database 导出多个库；省略则发现并导出全部库。
plan 生成可审查的建表、分批导入、逐字段校验 SQL。可通过已授权 Supabase MCP 或 SQL Editor 执行。
独立脚本直连需另外在本地配置 SUPABASE_ACCESS_TOKEN（Management API scoped access token）：
python3 scripts/database/appwrite_to_supabase.py import --plan .tmp/database-migration/plan --project-ref upmfsfnhpmosqrctdysz --apply --report .tmp/database-migration/report.json
python3 scripts/database/appwrite_to_supabase.py verify --plan .tmp/database-migration/plan --project-ref upmfsfnhpmosqrctdysz

脚本保留 ID、字段、时间及完整原始记录；重复运行不会产生重复数据，同 ID 内容不同会停止，不会覆盖。
云端网站开始写入后再跑旧快照的精确校验会报差异，这是预期行为；不要拿旧快照覆盖新数据。
备份及生成的数据 SQL 含私人数据，放在 .tmp/，不要提交 Git。
Node 兼容入口 scripts/database/migrate-appwrite.cjs 接受上述同一组参数。

五、验证范围
scripts/database/verify-runtime.sql 测试真实 Supabase CRUD、分页、过滤、点赞和评价，所有写入最后回滚。
当前原有 10 张表共 215 条记录在安装运行接口后已逐字段核对无变化。
网站真实成功读写仍需配置服务端密钥后验证；OAuth 插件 SQL 验证与本地 mock 测试不能代替这一检查。

参考：
https://supabase.com/docs/guides/database/functions
https://supabase.com/docs/guides/api/api-keys
https://appwrite.io/docs/products/databases/tablesdb/transactions
