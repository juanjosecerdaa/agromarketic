-- Add the municipalities of Chinandega without changing existing location data.
DO $$
DECLARE
    chinandega_id UUID;
BEGIN
    SELECT "id"
    INTO chinandega_id
    FROM "Department"
    WHERE "name" = 'Chinandega';

    IF chinandega_id IS NULL THEN
        RAISE EXCEPTION 'Department Chinandega does not exist';
    END IF;

    INSERT INTO "Municipality" ("id", "name", "code", "departmentId")
    VALUES
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a101', 'Chinandega', 'CHN', chinandega_id),
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a102', 'Cinco Pinos', 'CIN', chinandega_id),
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a103', 'Corinto', 'COR', chinandega_id),
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a104', 'El Realejo', 'REL', chinandega_id),
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a105', 'El Viejo', 'VIE', chinandega_id),
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a106', 'Posoltega', 'POS', chinandega_id),
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a107', 'Puerto Morazán', 'PMO', chinandega_id),
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a108', 'San Francisco del Norte', 'SFN', chinandega_id),
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a109', 'San Pedro del Norte', 'SPN', chinandega_id),
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a110', 'Santo Tomás del Norte', 'STN', chinandega_id),
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a111', 'Somotillo', 'SOM', chinandega_id),
        ('7d6a5bf4-7af4-4fdc-bb11-0e66e5c4a112', 'Villanueva', 'VIL', chinandega_id)
    ON CONFLICT ("departmentId", "name") DO NOTHING;
END $$;
