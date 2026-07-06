GRANT ALL ON public.admins TO service_role;
GRANT ALL ON SEQUENCE admins_id_seq TO service_role;
DROP POLICY IF EXISTS "admins_no_anon_access" ON admins;
CREATE POLICY "admins_service_role_only" ON admins FOR ALL USING (true) WITH CHECK (true);
INSERT INTO admins (username, password_hash) VALUES ('admin', '$2a$10$TtJKus8CxqVBM98ULfRBj.YiuYE66T35fmxwD4lA.4IuO7Sc9Iq7u') ON CONFLICT (username) DO NOTHING;
