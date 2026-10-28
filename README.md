# منصة التعليم الذكي

## التشغيل السريع

### 1) Supabase SQL Editor
الصق محتوى `security.sql` كاملاً → Run.

### 2) Authentication → Settings
- Email Confirmations = OFF
- Auto Confirm = ON

### 3) إنشاء الأدمن
Authentication → Users → Add User:
- Email: `01126346329@edu.local`
- Password: `66112009`
- Auto Confirm (مفعل)

ثم SQL:
UPDATE profiles SET role='super_admin', name='المالك', phone='01126346329'
WHERE id=(SELECT id FROM auth.users WHERE email='01126346329@edu.local');

### 4) Realtime
Database → Replication → فعّل: profiles, courses, lectures, exam_submissions, notifications

### 5) js/config.js
عدّل SUPABASE_KEY بـ anon key من Dashboard.

### 6) تشغيل محلي
python -m http.server 8080
افتح http://localhost:8080
