/*
  # Add Student Access Policies for Quizzes

  1. Security Changes
    - Add RLS policies for students to view quizzes for courses they're enrolled in
    - Add RLS policies for students to view quiz questions
    - Students can only view approved quizzes
  
  2. Notes
    - Students must be enrolled in the course to access quizzes
    - Only approved quizzes are visible to students
    - Students cannot modify quizzes or questions
*/

-- Allow students to view approved quizzes for courses they're enrolled in
CREATE POLICY "Students can view approved quizzes for enrolled courses"
  ON quizzes FOR SELECT
  TO authenticated
  USING (
    approved = true AND
    EXISTS (
      SELECT 1 FROM student_course_enrollments
      WHERE student_course_enrollments.course_id = quizzes.course_id
      AND student_course_enrollments.student_id = auth.uid()
    )
  );

-- Allow students to view questions for approved quizzes they have access to
CREATE POLICY "Students can view questions for approved quizzes"
  ON quiz_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN student_course_enrollments ON student_course_enrollments.course_id = quizzes.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND quizzes.approved = true
      AND student_course_enrollments.student_id = auth.uid()
    )
  );
