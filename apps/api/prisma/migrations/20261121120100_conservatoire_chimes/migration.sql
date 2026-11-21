-- Le Conservatoire accueille le Carillon : quatre énigmes s'intercalent entre ses Suites.
-- Écrit par scripts/carillon-migration.ts. Sans effet sur une base vide (le seed les crée).
UPDATE "Level" SET "order" = "order" * 2 WHERE "worldId" = (SELECT "id" FROM "World" WHERE "slug" = 'conservatoire') AND NOT EXISTS (SELECT 1 FROM "Level" WHERE "id" = 'carillon-1');
INSERT INTO "Level" ("id", "worldId", "order", "title", "description", "hints", "symbols", "columns", "mechanic", "puzzle", "kind", "groups", "published", "updatedAt")
SELECT 'carillon-1', w."id", 1, 'Le premier carillon', 'Trois cloches, une courte phrase : écoute, puis rejoue-la.', ARRAY['Fredonne la phrase dans ta tête avant de la rejouer.', 'Repère les cloches par leur symbole : la phrase devient un petit dessin.'], ARRAY[]::text[], 4, 'CHIMES'::"Mechanic",
       '{"bells":3,"sequence":[2,0,1,1],"mode":"repeat"}'::jsonb, 'PAIRS'::"LevelKind", '[]'::jsonb, true, now()
FROM "World" w WHERE w."slug" = 'conservatoire' AND NOT EXISTS (SELECT 1 FROM "Level" WHERE "id" = 'carillon-1');
INSERT INTO "Level" ("id", "worldId", "order", "title", "description", "hints", "symbols", "columns", "mechanic", "puzzle", "kind", "groups", "published", "updatedAt")
SELECT 'carillon-2', w."id", 3, 'La ritournelle', 'La phrase grandit d''une note à chaque fois.', ARRAY['Fredonne la phrase dans ta tête avant de la rejouer.', 'Repère les cloches par leur symbole : la phrase devient un petit dessin.'], ARRAY[]::text[], 4, 'CHIMES'::"Mechanic",
       '{"bells":4,"sequence":[2,0,0,3,2,2,0],"mode":"progressive"}'::jsonb, 'PAIRS'::"LevelKind", '[]'::jsonb, true, now()
FROM "World" w WHERE w."slug" = 'conservatoire' AND NOT EXISTS (SELECT 1 FROM "Level" WHERE "id" = 'carillon-2');
INSERT INTO "Level" ("id", "worldId", "order", "title", "description", "hints", "symbols", "columns", "mechanic", "puzzle", "kind", "groups", "published", "updatedAt")
SELECT 'carillon-3', w."id", 5, 'Les cloches du soir', 'Plus de cloches, une mélodie plus longue.', ARRAY['Fredonne la phrase dans ta tête avant de la rejouer.', 'Repère les cloches par leur symbole : la phrase devient un petit dessin.'], ARRAY[]::text[], 4, 'CHIMES'::"Mechanic",
       '{"bells":5,"sequence":[1,2,3,0,0,2,4,2,4],"mode":"progressive"}'::jsonb, 'PAIRS'::"LevelKind", '[]'::jsonb, true, now()
FROM "World" w WHERE w."slug" = 'conservatoire' AND NOT EXISTS (SELECT 1 FROM "Level" WHERE "id" = 'carillon-3');
INSERT INTO "Level" ("id", "worldId", "order", "title", "description", "hints", "symbols", "columns", "mechanic", "puzzle", "kind", "groups", "published", "updatedAt")
SELECT 'carillon-4', w."id", 7, 'Le grand carillon', 'Toute la mélodie du Conservatoire.', ARRAY['Fredonne la phrase dans ta tête avant de la rejouer.', 'Repère les cloches par leur symbole : la phrase devient un petit dessin.'], ARRAY[]::text[], 4, 'CHIMES'::"Mechanic",
       '{"bells":6,"sequence":[4,1,4,1,3,0,3,3,1,4,5,5],"mode":"progressive"}'::jsonb, 'PAIRS'::"LevelKind", '[]'::jsonb, true, now()
FROM "World" w WHERE w."slug" = 'conservatoire' AND NOT EXISTS (SELECT 1 FROM "Level" WHERE "id" = 'carillon-4');
