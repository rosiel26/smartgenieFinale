-- File: supabase/migrations/20251126113000_baseline_add_store_details_full.sql
-- Safely insert all store details into "store_details" table

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '4', 'supermarket', 'Island City Mall Supermarket - Bohol', NULL, NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '4');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '5', 'public_market', 'Tagbilaran Public Market - Bohol', 'tagbilaran', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '5');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '6', 'supermarket', 'Alturas Panglao - Bohol', 'panglao', NULL, NULL, 'true', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '6');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '7', 'public_market', 'Panglao Public Market - Bohol', 'panglao', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '7');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '8', 'public_market', 'Dauis Public Market - Bohol', 'dauis', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '8');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '9', 'public_market', 'Tubigon Public Market - Bohol', 'tubigon', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '9');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '10', 'public_market', 'Talibon Public Market - Bohol', 'talibon', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '10');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '11', 'public_market', 'Ubay Public Market - Bohol', 'ubay', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '11');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '12', 'supermarket', 'BQ Supermarket - Bohol', 'tagbilaran', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '12');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '13', 'supermarket', 'Plaza Marcela Supermarket - Bohol', 'tagbilaran', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '13');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '14', 'public_market', 'Dao Public Market - Bohol', 'tagbilaran', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '14');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '15', 'supermarket', 'Alturas Talibon - Bohol', 'talibon', NULL, NULL, 'true', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '15');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '16', 'public_market', 'Talibon Public Market - Bohol', 'talibon', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '16');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '17', 'supermarket', 'Alturas Tubigon - Bohol', 'tubigon', NULL, NULL, 'true', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '17');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '18', 'public_market', 'Tubigon Public Market - Bohol', 'tubigon', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '18');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '19', 'supermarket', 'Alta Citta Supermarket - Bohol', 'tagbilaran', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '19');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '20', 'public_market', 'Jagna Public Market - Bohol', 'jagna', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '20');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '21', 'public_market', 'Carmen Public Market - Bohol', 'carmen', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '21');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '22', 'public_market', 'Loon Public Market - Bohol', 'loon', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '22');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '23', 'public_market', 'Mercado de Loon - Bohol', 'loon', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '23');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '24', 'public_market', 'Inabanga Public Market - Bohol', 'inabanga', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '24');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '25', 'public_market', 'Trinidad Public Market - Bohol', 'trinidad', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '25');

INSERT INTO "public"."store_details" ("id", "type", "address", "city_id", "latitude", "longitude", "delivery", "active")
SELECT '26', 'public_market', 'Bien Unido Public Market - Bohol', 'bienunido', NULL, NULL, 'false', 'true'
WHERE NOT EXISTS (SELECT 1 FROM "public"."store_details" WHERE id = '26');
