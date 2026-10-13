-- AI-OS Backend Database Schema
-- Converted from PostgreSQL to MySQL
-- Compatible with MySQL 8.0+

-- =====================================================================
-- CORE TABLES
-- =====================================================================

-- Students table
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(30),
    department VARCHAR(120),
    section VARCHAR(60),
    batch_start_year INT,
    batch_end_year INT,
    leetcode_id VARCHAR(120) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_email ON students(email);

-- Teachers table
CREATE TABLE teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    department VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teachers_email ON teachers(email);

-- Admins table
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admins_email ON admins(email);

-- Courses table
CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(120),
    difficulty_rating FLOAT DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Department Courses table
CREATE TABLE department_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(120) NOT NULL,
    semester INT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES teachers(id)
);

CREATE INDEX idx_department_courses_department ON department_courses(department);
CREATE INDEX idx_department_courses_semester ON department_courses(semester);

-- Department Course Units table
CREATE TABLE department_course_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    unit_number INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES department_courses(id) ON DELETE CASCADE
);

-- Enrollments table
CREATE TABLE enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    semester VARCHAR(20) NOT NULL,
    current_grade FLOAT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- LMS Activities table
CREATE TABLE lms_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT,
    downloads INT DEFAULT 0,
    forum_posts INT DEFAULT 0,
    time_on_task_minutes FLOAT DEFAULT 0.0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Assessments table
CREATE TABLE assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT,
    title VARCHAR(255) NOT NULL,
    score FLOAT,
    max_score FLOAT DEFAULT 100.0,
    submitted_on_time TINYINT(1) DEFAULT 1,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Engagement Signals table
CREATE TABLE engagement_signals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    attendance_pct FLOAT DEFAULT 100.0,
    help_seeking_events INT DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Risk Scores table
CREATE TABLE risk_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    at_risk_probability FLOAT NOT NULL,
    academic_health_score FLOAT NOT NULL,
    burnout_category ENUM('none', 'disengagement', 'conceptual_confusion', 'cognitive_overload') DEFAULT 'none',
    shap_explanation TEXT,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Interventions table
CREATE TABLE interventions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    intervention_type ENUM('nudge', 'peer_match', 'tutoring', 'advisor_meeting') NOT NULL,
    message TEXT NOT NULL,
    is_dismissed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
-- =====================================================================
-- FORUM TABLES
-- =====================================================================

-- Forum Posts table
CREATE TABLE forum_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id INT NOT NULL,
    title VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    course_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Forum Replies table
CREATE TABLE forum_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    author_id INT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =====================================================================
-- QUIZ TABLES
-- =====================================================================

-- Quizzes table
CREATE TABLE quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    course_id INT,
    created_by INT NOT NULL,
    assigned_department VARCHAR(120),
    is_active TINYINT(1) DEFAULT 1,
    duration_minutes INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (created_by) REFERENCES teachers(id)
);

-- Quiz Questions table
CREATE TABLE quiz_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    `order` INT DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Quiz Options table
CREATE TABLE quiz_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_text VARCHAR(500) NOT NULL,
    is_correct TINYINT(1) DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

-- Quiz Attempts table
CREATE TABLE quiz_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    student_id INT NOT NULL,
    score FLOAT,
    total_questions INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Quiz Answers table
CREATE TABLE quiz_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_option_id INT,
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id),
    FOREIGN KEY (selected_option_id) REFERENCES quiz_options(id)
);

-- =====================================================================
-- PEER REQUESTS
-- =====================================================================

CREATE TABLE peer_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_student_id INT NOT NULL,
    to_student_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (from_student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (to_student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =====================================================================
-- CHAT TABLES
-- =====================================================================

-- Conversations table
CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_a_id INT NOT NULL,
    student_b_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_a_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (student_b_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Chat Messages table
CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    body TEXT NOT NULL,
    attachment_path VARCHAR(500),
    attachment_name VARCHAR(255),
    attachment_mime_type VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Peer Blocks table
CREATE TABLE peer_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blocker_id INT NOT NULL,
    blocked_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blocker_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =====================================================================
-- EXAM MARKS
-- =====================================================================

CREATE TABLE exam_marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    exam_name VARCHAR(255) NOT NULL,
    marks FLOAT NOT NULL,
    exam_date VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =====================================================================
-- ATTENDANCE
-- =====================================================================

CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    teacher_id INT NOT NULL,
    date VARCHAR(10) NOT NULL,
    status ENUM('present', 'absent') NOT NULL DEFAULT 'present',
    subject VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- =====================================================================
-- STUDENT COMPETITIONS
-- =====================================================================

CREATE TABLE student_competitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    competition_name VARCHAR(300) NOT NULL,
    competition_date VARCHAR(20) NOT NULL,
    status ENUM('Winner', 'Runner-up', 'Participated') NOT NULL,
    proof_file VARCHAR(500),
    approval_status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES teachers(id)
);

-- =====================================================================
-- ASSIGNMENTS
-- =====================================================================

-- Assignments table
CREATE TABLE assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    due_date VARCHAR(20) NOT NULL,
    department VARCHAR(120) NOT NULL,
    batch_start_year INT NOT NULL,
    batch_end_year INT NOT NULL,
    section VARCHAR(60),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES teachers(id) ON DELETE CASCADE
);

-- Assignment Submissions table
CREATE TABLE assignment_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_approved TINYINT(1) DEFAULT 0,
    marks FLOAT,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =====================================================================
-- STUDY RESOURCES
-- =====================================================================

CREATE TABLE study_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    subject VARCHAR(120) NOT NULL,
    description TEXT,
    tags VARCHAR(500),
    file_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    teacher_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE INDEX idx_study_resources_subject ON study_resources(subject);
CREATE INDEX idx_study_resources_teacher_id ON study_resources(teacher_id);

-- =====================================================================
-- STUDY STREAKS
-- =====================================================================

CREATE TABLE study_streaks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT UNIQUE NOT NULL,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =====================================================================
-- STUDENT NOTIFICATION SEEN
-- =====================================================================

CREATE TABLE student_notification_seen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    notification_id VARCHAR(120) NOT NULL,
    seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_student_notification_seen_student_id ON student_notification_seen(student_id);
CREATE INDEX idx_student_notification_seen_notification_id ON student_notification_seen(notification_id);

-- =====================================================================
-- CIS (COLLABORATIVE INTELLIGENCE SCORE) TABLES
-- =====================================================================

-- Forum Interactions table
CREATE TABLE forum_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_student_id INT NOT NULL,
    to_student_id INT NOT NULL,
    forum_post_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_interactions_from_student_id ON forum_interactions(from_student_id);
CREATE INDEX idx_forum_interactions_to_student_id ON forum_interactions(to_student_id);

-- Peer Chat Interactions table
CREATE TABLE peer_chat_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_student_id INT NOT NULL,
    to_student_id INT NOT NULL,
    message_count INT NOT NULL DEFAULT 1,
    last_active TIMESTAMP NULL
);

CREATE INDEX idx_peer_chat_interactions_from_student_id ON peer_chat_interactions(from_student_id);
CREATE INDEX idx_peer_chat_interactions_to_student_id ON peer_chat_interactions(to_student_id);

-- Assignment Help table
CREATE TABLE assignment_help (
    id INT AUTO_INCREMENT PRIMARY KEY,
    helper_student_id INT NOT NULL,
    helped_student_id INT NOT NULL,
    assignment_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignment_help_helper_student_id ON assignment_help(helper_student_id);
CREATE INDEX idx_assignment_help_helped_student_id ON assignment_help(helped_student_id);

-- CIS Scores table
CREATE TABLE cis_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT UNIQUE NOT NULL,
    score FLOAT NOT NULL,
    label VARCHAR(50) NOT NULL,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cis_scores_student_id ON cis_scores(student_id);

-- =====================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- =====================================================================

-- Foreign key indexes for better join performance
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_lms_activities_student_id ON lms_activities(student_id);
CREATE INDEX idx_lms_activities_course_id ON lms_activities(course_id);
CREATE INDEX idx_assessments_student_id ON assessments(student_id);
CREATE INDEX idx_assessments_course_id ON assessments(course_id);
CREATE INDEX idx_engagement_signals_student_id ON engagement_signals(student_id);
CREATE INDEX idx_risk_scores_student_id ON risk_scores(student_id);
CREATE INDEX idx_interventions_student_id ON interventions(student_id);
CREATE INDEX idx_forum_posts_author_id ON forum_posts(author_id);
CREATE INDEX idx_forum_posts_course_id ON forum_posts(course_id);
CREATE INDEX idx_forum_replies_post_id ON forum_replies(post_id);
CREATE INDEX idx_forum_replies_author_id ON forum_replies(author_id);
CREATE INDEX idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_options_question_id ON quiz_options(question_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_answers_attempt_id ON quiz_answers(attempt_id);
CREATE INDEX idx_peer_requests_from_student_id ON peer_requests(from_student_id);
CREATE INDEX idx_peer_requests_to_student_id ON peer_requests(to_student_id);
CREATE INDEX idx_conversations_student_a_id ON conversations(student_a_id);
CREATE INDEX idx_conversations_student_b_id ON conversations(student_b_id);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_peer_blocks_blocker_id ON peer_blocks(blocker_id);
CREATE INDEX idx_peer_blocks_blocked_id ON peer_blocks(blocked_id);
CREATE INDEX idx_exam_marks_student_id ON exam_marks(student_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_teacher_id ON attendance(teacher_id);
CREATE INDEX idx_student_competitions_student_id ON student_competitions(student_id);
CREATE INDEX idx_student_competitions_approved_by ON student_competitions(approved_by);
CREATE INDEX idx_assignments_created_by ON assignments(created_by);
CREATE INDEX idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX idx_department_course_units_course_id ON department_course_units(course_id);
