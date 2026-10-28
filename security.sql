-- منصة تعليمية - Schema + RLS + RPC + Triggers
-- الصق هذا الملف كاملاً في Supabase SQL Editor

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, phone text UNIQUE, parent_phone text, grade text,
  role text DEFAULT 'student' CHECK (role IN ('student','teacher','super_admin')),
  wallet numeric DEFAULT 0, isblocked boolean DEFAULT false, image text,
  enrolled_courses text[] DEFAULT '{}', created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS courses (
  id text PRIMARY KEY, teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL, description text, image text, grade text NOT NULL,
  price numeric DEFAULT 0, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lectures (
  id text PRIMARY KEY, course_id text REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL, videos jsonb DEFAULT '[]', pdfs jsonb DEFAULT '[]',
  mcq_exams jsonb DEFAULT '[]', essay_exams jsonb DEFAULT '[]',
  is_preview boolean DEFAULT false, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS codes (
  id text PRIMARY KEY, code text UNIQUE NOT NULL, amount numeric NOT NULL,
  used boolean DEFAULT false, used_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY, user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text CHECK (type IN ('credit','debit')), amount numeric NOT NULL,
  note text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS exam_submissions (
  id text PRIMARY KEY, type text CHECK (type IN ('mcq','essay')),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  student_name text, course_id text, lecture_id text, exam_id text,
  answers jsonb, answer text, score int, total int,
  status text DEFAULT 'جاري التصحيح' CHECK (status IN ('جاري التصحيح','تم التصحيح')),
  grade int, teacher_note text, submitted_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY, user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  text text NOT NULL, read boolean DEFAULT false, created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_grade ON courses(grade);
CREATE INDEX IF NOT EXISTS idx_lectures_course ON lectures(course_id);
CREATE INDEX IF NOT EXISTS idx_lectures_teacher ON lectures(teacher_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON exam_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_lecture ON exam_submissions(lecture_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin');
$$;
CREATE OR REPLACE FUNCTION public.is_teacher() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, parent_phone, grade, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name','مستخدم'),
    COALESCE(NEW.raw_user_meta_data->>'phone', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'parent_phone', NEW.raw_user_meta_data->>'grade', 'student');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.profiles_guard_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.wallet IS DISTINCT FROM OLD.wallet OR NEW.isblocked IS DISTINCT FROM OLD.isblocked
       OR NEW.role IS DISTINCT FROM OLD.role OR NEW.enrolled_courses IS DISTINCT FROM OLD.enrolled_courses THEN
      RAISE EXCEPTION 'غير مسموح بتعديل هذه الحقول';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_guard ON profiles;
CREATE TRIGGER trg_profiles_guard BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_update();

CREATE OR REPLACE FUNCTION public.notify_new_submission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_teacher uuid;
BEGIN
  SELECT teacher_id INTO v_teacher FROM lectures WHERE id = NEW.lecture_id;
  IF v_teacher IS NOT NULL THEN
    INSERT INTO notifications (id,user_id,text) VALUES (gen_random_uuid()::text, v_teacher,
      'تسليم جديد من ' || COALESCE(NEW.student_name,'طالب') || ' - ' || NEW.type);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_submission ON exam_submissions;
CREATE TRIGGER trg_notify_submission AFTER INSERT ON exam_submissions FOR EACH ROW EXECUTE FUNCTION public.notify_new_submission();

CREATE OR REPLACE FUNCTION public.notify_graded_submission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'تم التصحيح' AND (OLD.status IS NULL OR OLD.status <> 'تم التصحيح') THEN
    INSERT INTO notifications (id,user_id,text) VALUES (gen_random_uuid()::text, NEW.student_id,
      'تم تصحيح ' || NEW.type || ' بدرجة ' || COALESCE(NEW.grade::text,'-'));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_graded ON exam_submissions;
CREATE TRIGGER trg_notify_graded AFTER UPDATE ON exam_submissions FOR EACH ROW EXECUTE FUNCTION public.notify_graded_submission();

CREATE OR REPLACE FUNCTION public.notify_new_lecture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE role='student' AND NEW.course_id = ANY(enrolled_courses)
  LOOP
    INSERT INTO notifications (id,user_id,text) VALUES (gen_random_uuid()::text, r.id, 'محاضرة جديدة: ' || NEW.title);
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_lecture ON lectures;
CREATE TRIGGER trg_notify_lecture AFTER INSERT ON lectures FOR EACH ROW EXECUTE FUNCTION public.notify_new_lecture();

CREATE OR REPLACE FUNCTION public.notify_new_student() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.role = 'student' THEN
    FOR r IN SELECT id FROM profiles WHERE role='super_admin'
    LOOP
      INSERT INTO notifications (id,user_id,text) VALUES (gen_random_uuid()::text, r.id, 'طالب جديد: ' || NEW.name);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_student ON profiles;
CREATE TRIGGER trg_notify_student AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION public.notify_new_student();

CREATE OR REPLACE FUNCTION public.redeem_code(code_input text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code record; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'غير مسجل دخول'; END IF;
  SELECT * INTO v_code FROM codes WHERE code = code_input AND used = false FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'كود غير صحيح أو مستخدم'; END IF;
  UPDATE codes SET used = true, used_by = v_uid WHERE id = v_code.id;
  UPDATE profiles SET wallet = wallet + v_code.amount WHERE id = v_uid;
  INSERT INTO transactions (id,user_id,type,amount,note) VALUES (gen_random_uuid()::text, v_uid, 'credit', v_code.amount, 'شحن بكود');
  INSERT INTO notifications (id,user_id,text) VALUES (gen_random_uuid()::text, v_uid, 'تم شحن ' || v_code.amount || ' ج.م');
  RETURN jsonb_build_object('success', true, 'amount', v_code.amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_course(course_id_input text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_course record; v_profile record; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'غير مسجل دخول'; END IF;
  SELECT * INTO v_course FROM courses WHERE id = course_id_input;
  IF NOT FOUND THEN RAISE EXCEPTION 'الكورس غير موجود'; END IF;
  SELECT * INTO v_profile FROM profiles WHERE id = v_uid FOR UPDATE;
  IF course_id_input = ANY(v_profile.enrolled_courses) THEN RAISE EXCEPTION 'أنت مشترك بالفعل'; END IF;
  IF v_profile.wallet < v_course.price THEN RAISE EXCEPTION 'رصيد المحفظة غير كافٍ'; END IF;
  UPDATE profiles SET wallet = wallet - v_course.price,
    enrolled_courses = array_append(enrolled_courses, course_id_input) WHERE id = v_uid;
  INSERT INTO transactions (id,user_id,type,amount,note) VALUES (gen_random_uuid()::text, v_uid, 'debit', v_course.price, 'اشتراك في ' || v_course.title);
  INSERT INTO notifications (id,user_id,text) VALUES (gen_random_uuid()::text, v_uid, 'اشتركت في: ' || v_course.title);
  RETURN jsonb_build_object('success', true);
END;
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid() OR public.is_admin()
  OR (public.is_teacher() AND EXISTS (
    SELECT 1 FROM profiles p2 WHERE p2.id <> auth.uid() AND p2.role='student'
      AND p2.enrolled_courses && (SELECT array_agg(c.id) FROM courses c WHERE c.teacher_id = auth.uid())
  ))
);
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS profiles_delete ON profiles;
CREATE POLICY profiles_delete ON profiles FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS courses_select ON courses;
CREATE POLICY courses_select ON courses FOR SELECT USING (true);
DROP POLICY IF EXISTS courses_insert ON courses;
CREATE POLICY courses_insert ON courses FOR INSERT WITH CHECK (teacher_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS courses_update ON courses;
CREATE POLICY courses_update ON courses FOR UPDATE USING (teacher_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS courses_delete ON courses;
CREATE POLICY courses_delete ON courses FOR DELETE USING (teacher_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS lectures_select ON lectures;
CREATE POLICY lectures_select ON lectures FOR SELECT USING (true);
DROP POLICY IF EXISTS lectures_insert ON lectures;
CREATE POLICY lectures_insert ON lectures FOR INSERT WITH CHECK (teacher_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS lectures_update ON lectures;
CREATE POLICY lectures_update ON lectures FOR UPDATE USING (teacher_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS lectures_delete ON lectures;
CREATE POLICY lectures_delete ON lectures FOR DELETE USING (teacher_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS codes_all ON codes;
CREATE POLICY codes_all ON codes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS transactions_select ON transactions;
CREATE POLICY transactions_select ON transactions FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS transactions_insert ON transactions;
CREATE POLICY transactions_insert ON transactions FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS submissions_select ON exam_submissions;
CREATE POLICY submissions_select ON exam_submissions FOR SELECT USING (
  student_id = auth.uid() OR public.is_admin()
  OR EXISTS (SELECT 1 FROM lectures l WHERE l.id = exam_submissions.lecture_id AND l.teacher_id = auth.uid())
);
DROP POLICY IF EXISTS submissions_insert ON exam_submissions;
CREATE POLICY submissions_insert ON exam_submissions FOR INSERT WITH CHECK (
  student_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role='student')
);
DROP POLICY IF EXISTS submissions_update ON exam_submissions;
CREATE POLICY submissions_update ON exam_submissions FOR UPDATE USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM lectures l WHERE l.id = exam_submissions.lecture_id AND l.teacher_id = auth.uid())
);

DROP POLICY IF EXISTS notif_select ON notifications;
CREATE POLICY notif_select ON notifications FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS notif_update ON notifications;
CREATE POLICY notif_update ON notifications FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS notif_insert ON notifications;
CREATE POLICY notif_insert ON notifications FOR INSERT WITH CHECK (public.is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE courses;
ALTER PUBLICATION supabase_realtime ADD TABLE lectures;
ALTER PUBLICATION supabase_realtime ADD TABLE exam_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
