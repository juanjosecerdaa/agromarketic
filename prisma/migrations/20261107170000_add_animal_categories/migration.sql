INSERT INTO "Category" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES
  ('2c2d1f6e-1a0d-4c5c-8f72-9b1d3a6e4101', 'Ganado Bovino', 'ganado-bovino', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('2c2d1f6e-1a0d-4c5c-8f72-9b1d3a6e4102', 'Ganado Porcino', 'ganado-porcino', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('2c2d1f6e-1a0d-4c5c-8f72-9b1d3a6e4103', 'Ganado Equino', 'ganado-equino', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('2c2d1f6e-1a0d-4c5c-8f72-9b1d3a6e4104', 'Ganado Ovino', 'ganado-ovino', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('2c2d1f6e-1a0d-4c5c-8f72-9b1d3a6e4105', 'Ganado Caprino', 'ganado-caprino', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('2c2d1f6e-1a0d-4c5c-8f72-9b1d3a6e4106', 'Aves de Corral', 'aves-de-corral', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "isActive" = true,
    "updatedAt" = CURRENT_TIMESTAMP;
