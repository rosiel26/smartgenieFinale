-- File: supabase/migrations/20251126112000_baseline_add_stores.sql
-- This migration safely inserts multiple stores into the "stores" table
-- It only inserts each store if it does not already exist

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '1', 'Local Market A', 'Bohol', '[https://localmarketA.ph](https://localmarketA.ph)'
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '1');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '2', 'Grocery Store B', 'Tagbilaran', '[https://grocerystoreB.ph](https://grocerystoreB.ph)'
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '2');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '3', 'Online Grocery C', 'Philippines', '[https://onlinegroceryC.ph](https://onlinegroceryC.ph)'
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '3');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '4', 'Island City Mall Supermarket', 'Tagbilaran City', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '4');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '5', 'Tagbilaran Public Market', 'Tagbilaran City', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '5');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '6', 'Alturas Panglao', 'Panglao', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '6');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '7', 'Panglao Public Market', 'Panglao', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '7');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '8', 'Dauis Public Market', 'Dauis', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '8');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '9', 'Tubigon Public Market', 'Tubigon', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '9');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '10', 'Talibon Public Market', 'Talibon', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '10');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '11', 'Ubay Public Market', 'Ubay', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '11');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '12', 'BQ Supermarket', 'Tagbilaran City', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '12');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '13', 'Plaza Marcela Supermarket', 'Tagbilaran City', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '13');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '14', 'Dao Public Market', 'Tagbilaran City', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '14');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '15', 'Alturas Talibon', 'Talibon', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '15');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '16', 'Talibon Public Market', 'Talibon', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '16');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '17', 'Alturas Tubigon', 'Tubigon', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '17');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '18', 'Tubigon Public Market', 'Tubigon', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '18');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '19', 'Alta Citta Supermarket', 'Tagbilaran City', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '19');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '20', 'Jagna Public Market', 'Jagna', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '20');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '21', 'Carmen Public Market', 'Carmen', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '21');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '22', 'Loon Public Market', 'Loon', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '22');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '23', 'Mercado de Loon', 'Loon', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '23');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '24', 'Inabanga Public Market', 'Inabanga', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '24');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '25', 'Trinidad Public Market', 'Trinidad', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '25');

INSERT INTO "public"."stores" ("id", "name", "location", "online_link")
SELECT '26', 'Bien Unido Public Market', 'Bien Unido', ''
WHERE NOT EXISTS (SELECT 1 FROM "public"."stores" WHERE id = '26');
