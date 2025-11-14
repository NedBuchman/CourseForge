import { useState } from 'react';
import { CheckCircle, AlertTriangle, Shield, Edit, BookOpen, ChevronDown, ChevronUp, Sparkles, Wand2, Eye, Copy, Trash2, Check, X } from 'lucide-react';

interface Lesson {
  lesson_number: number;
  title: string;
  content: string;
  duration: string;
  objectives: string[];
}

interface CourseContent {
  course_title: string;
  total_lessons: number;
  estimated_duration: string;
  lessons: Lesson[];
}

export interface IssueState {
  status: 'pending' | 'accepted' | 'ignored';
  lesson: number;
  issue: string;
  suggestion: string;
}

interface CourseResultsProps {
  courseId: string;
  courseContent: CourseContent;
  onReturnToEdit: () => void;
  onVerify: () => void;
  onAccept: (issueStates: Record<string, IssueState>) => void;
  onAutoCorrect?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onEditAndRegenerate?: () => void;
  isVerifying: boolean;
  isCorrecting?: boolean;
  isViewMode?: boolean;
  verificationResults?: {
    verified: boolean;
    errors: Array<{ lesson: number; issue: string; suggestion: string }>;
    accuracy_score: number;
  };
}

export default function CourseResults({
  courseContent,
  onReturnToEdit,
  onVerify,
  onAccept,
  onAutoCorrect,
  onDuplicate,
  onDelete,
  onEditAndRegenerate,
  isVerifying,
  isCorrecting,
  isViewMode = false,
  verificationResults,
}: CourseResultsProps) {
  const [expandedLessons, setExpandedLessons] = useState<number[]>([]);
  const [issueStates, setIssueStates] = useState<Record<string, IssueState>>({});

  const toggleLesson = (lessonNumber: number) => {
    setExpandedLessons(prev =>
      prev.includes(lessonNumber)
        ? prev.filter(n => n !== lessonNumber)
        : [...prev, lessonNumber]
    );
  };

  const expandAll = () => {
    if (courseContent?.lessons) {
      setExpandedLessons(courseContent.lessons.map(l => l.lesson_number));
    }
  };

  const collapseAll = () => {
    setExpandedLessons([]);
  };

  const getIssueKey = (lesson: number, issue: string) => {
    return `${lesson}-${issue.substring(0, 50)}`;
  };

  const handleAcceptIssue = (lesson: number, issue: string, suggestion: string) => {
    const key = getIssueKey(lesson, issue);
    setIssueStates(prev => ({
      ...prev,
      [key]: { status: 'accepted', lesson, issue, suggestion }
    }));
  };

  const handleIgnoreIssue = (lesson: number, issue: string, suggestion: string) => {
    const key = getIssueKey(lesson, issue);
    setIssueStates(prev => ({
      ...prev,
      [key]: { status: 'ignored', lesson, issue, suggestion }
    }));
  };

  const handleAcceptAll = () => {
    if (!verificationResults?.errors) return;
    const newStates: Record<string, IssueState> = {};
    verificationResults.errors.forEach(error => {
      const key = getIssueKey(error.lesson, error.issue);
      newStates[key] = {
        status: 'accepted',
        lesson: error.lesson,
        issue: error.issue,
        suggestion: error.suggestion
      };
    });
    setIssueStates(newStates);
  };

  const handleIgnoreAll = () => {
    if (!verificationResults?.errors) return;
    const newStates: Record<string, IssueState> = {};
    verificationResults.errors.forEach(error => {
      const key = getIssueKey(error.lesson, error.issue);
      newStates[key] = {
        status: 'ignored',
        lesson: error.lesson,
        issue: error.issue,
        suggestion: error.suggestion
      };
    });
    setIssueStates(newStates);
  };

  const getIssueStatus = (lesson: number, issue: string): 'pending' | 'accepted' | 'ignored' => {
    const key = getIssueKey(lesson, issue);
    return issueStates[key]?.status || 'pending';
  };

  const allIssuesAddressed = () => {
    if (!verificationResults?.errors || verificationResults.errors.length === 0) return true;
    return verificationResults.errors.every(error => {
      const key = getIssueKey(error.lesson, error.issue);
      return issueStates[key] !== undefined;
    });
  };

  const getPendingCount = () => {
    if (!verificationResults?.errors) return 0;
    return verificationResults.errors.filter(error => {
      const key = getIssueKey(error.lesson, error.issue);
      return !issueStates[key];
    }).length;
  };

  const getAcceptedCount = () => {
    return Object.values(issueStates).filter(s => s.status === 'accepted').length;
  };

  const getIgnoredCount = () => {
    return Object.values(issueStates).filter(s => s.status === 'ignored').length;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900">{courseContent.course_title}</h2>
                <p className="text-slate-600 mt-1">
                  {courseContent.total_lessons} Lessons • {courseContent.estimated_duration}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-100 to-green-200 rounded-lg p-4 border-l-4 border-green-600">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-900 font-semibold">Course Generated Successfully!</p>
                  <p className="text-green-800 text-sm mt-1">
                    Your AI-generated course is ready. Review the lessons below and choose your next step.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={expandAll}
            className="text-sm px-3 py-1 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-sm px-3 py-1 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            Collapse All
          </button>
        </div>

        <div className="space-y-4">
          {courseContent.lessons.map((lesson) => {
            const isExpanded = expandedLessons.includes(lesson.lesson_number);
            const hasError = verificationResults?.errors?.some(e => e.lesson === lesson.lesson_number);

            return (
              <div
                key={lesson.lesson_number}
                className={`border-2 rounded-xl transition-all ${
                  hasError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <button
                  onClick={() => toggleLesson(lesson.lesson_number)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-100 transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-4 flex-1 text-left">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {lesson.lesson_number}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900">{lesson.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {lesson.duration}
                        </span>
                        {lesson.objectives && lesson.objectives.length > 0 && (
                          <span className="ml-3">• {lesson.objectives.length} objectives</span>
                        )}
                      </p>
                    </div>
                    {hasError && (
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 space-y-4">
                    <div className="border-t-2 border-slate-200 pt-4">
                      {lesson.objectives && lesson.objectives.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-bold text-slate-900 mb-2">Learning Objectives:</h4>
                          <ul className="list-disc list-inside space-y-1 text-slate-700">
                            {lesson.objectives.map((obj, idx) => (
                              <li key={idx}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <h4 className="font-bold text-slate-900 mb-2">Lesson Content:</h4>
                        <div className="bg-white rounded-lg p-4 border border-slate-300">
                          <div
                            className="prose prose-sm max-w-none text-slate-700"
                            dangerouslySetInnerHTML={{ __html: lesson.content }}
                          />
                        </div>
                      </div>

                      {hasError && verificationResults && (
                        <div className="mt-4 space-y-3">
                          {verificationResults.errors
                            .filter(e => e.lesson === lesson.lesson_number)
                            .map((error, idx) => {
                              const status = getIssueStatus(error.lesson, error.issue);
                              const bgColor = status === 'accepted' ? 'bg-green-50 border-green-300' :
                                             status === 'ignored' ? 'bg-slate-100 border-slate-300' :
                                             'bg-red-50 border-red-300';
                              return (
                                <div key={idx} className={`border-2 rounded-lg p-4 ${bgColor} transition-all`}>
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                      status === 'accepted' ? 'text-green-600' :
                                      status === 'ignored' ? 'text-slate-400' :
                                      'text-red-600'
                                    }`} />
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex-1">
                                          <h4 className={`font-bold mb-1 ${
                                            status === 'accepted' ? 'text-green-900' :
                                            status === 'ignored' ? 'text-slate-500 line-through' :
                                            'text-red-900'
                                          }`}>Issue: {error.issue}</h4>
                                          <p className={`text-sm ${
                                            status === 'accepted' ? 'text-green-800' :
                                            status === 'ignored' ? 'text-slate-500' :
                                            'text-red-700'
                                          }`}>
                                            <strong>Suggestion:</strong> {error.suggestion}
                                          </p>
                                        </div>
                                        {status === 'pending' && (
                                          <div className="flex gap-2 flex-shrink-0">
                                            <button
                                              onClick={() => handleAcceptIssue(error.lesson, error.issue, error.suggestion)}
                                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-1"
                                            >
                                              <Check className="w-4 h-4" />
                                              Accept
                                            </button>
                                            <button
                                              onClick={() => handleIgnoreIssue(error.lesson, error.issue, error.suggestion)}
                                              className="px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-semibold flex items-center gap-1"
                                            >
                                              <X className="w-4 h-4" />
                                              Ignore
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      {status === 'accepted' && (
                                        <div className="mt-2 flex items-center gap-2 text-green-700 text-sm font-semibold">
                                          <Check className="w-4 h-4" />
                                          Change will be applied
                                        </div>
                                      )}
                                      {status === 'ignored' && (
                                        <div className="mt-2 flex items-center gap-2 text-slate-500 text-sm font-semibold">
                                          <X className="w-4 h-4" />
                                          Issue ignored
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {verificationResults && (
        <div className={`rounded-2xl p-6 shadow-lg ${
          verificationResults.verified ? 'bg-green-50 border-2 border-green-300' : 'bg-yellow-50 border-2 border-yellow-300'
        }`}>
          <div className="flex items-start gap-3">
            {verificationResults.verified ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-bold text-lg mb-2 ${
                verificationResults.verified ? 'text-green-900' : 'text-yellow-900'
              }`}>
                {verificationResults.verified ? 'Verification Complete - All Clear!' : 'Verification Complete - Issues Found'}
              </h3>
              <p className={`mb-3 ${
                verificationResults.verified ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {verificationResults.verified
                  ? 'The AI has verified all content is accurate and properly sourced.'
                  : `Found ${verificationResults.errors.length} issue(s) that need attention. Review the highlighted lessons above.`}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      verificationResults.accuracy_score >= 80 ? 'bg-green-500' :
                      verificationResults.accuracy_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${verificationResults.accuracy_score}%` }}
                  />
                </div>
                <span className="font-bold text-slate-900 text-sm">
                  {verificationResults.accuracy_score}% Accuracy
                </span>
              </div>
            </div>
          </div>

          {!verificationResults.verified && verificationResults.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-yellow-300">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-yellow-900 font-bold mb-1">Issue Resolution Status</h4>
                  <p className="text-yellow-800 text-sm">
                    {getPendingCount()} pending • {getAcceptedCount()} accepted • {getIgnoredCount()} ignored
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAcceptAll}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Accept All
                  </button>
                  <button
                    onClick={handleIgnoreAll}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-semibold flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Ignore All
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-900 font-semibold mb-1">Review each issue above</p>
                    <p className="text-blue-800 text-sm">
                      Click "Accept Suggestion" to apply the AI's recommended fix, or "Ignore" if you want to keep the content as-is.
                      Once all issues are addressed, the "Accept & Continue" button will be enabled.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="font-bold text-slate-900 text-lg mb-4">
          {isViewMode ? 'Course Management' : 'Next Steps'}
        </h3>

        {isViewMode ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={onEditAndRegenerate}
              className="p-6 border-2 border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                <Edit className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Edit & Regenerate</h4>
              <p className="text-sm text-slate-600">
                Modify course details and regenerate with updated information.
              </p>
            </button>

            <button
              onClick={onDuplicate}
              className="p-6 border-2 border-slate-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                <Copy className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Duplicate Course</h4>
              <p className="text-sm text-slate-600">
                Create a copy of this course to modify without changing the original.
              </p>
            </button>

            <button
              onClick={() => onAccept(issueStates)}
              className="p-6 border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:border-orange-500 hover:from-orange-100 hover:to-orange-200 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-3 group-hover:bg-orange-600 transition-colors">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">View Full Course</h4>
              <p className="text-sm text-slate-600">
                View the complete course in a clean, presentation-ready format.
              </p>
            </button>

            <button
              onClick={onDelete}
              className="p-6 border-2 border-red-300 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-red-200 transition-colors">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Delete Course</h4>
              <p className="text-sm text-slate-600">
                Permanently remove this course from your library.
              </p>
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={onReturnToEdit}
            className="p-6 border-2 border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
              <Edit className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-bold text-slate-900 mb-2">Return to Edit</h4>
            <p className="text-sm text-slate-600">
              Go back to the course creation form, update your information, and regenerate the course.
            </p>
          </button>

          <button
            onClick={onVerify}
            disabled={isVerifying || !!verificationResults}
            className="p-6 border-2 border-slate-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-300 disabled:hover:bg-transparent"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-bold text-slate-900 mb-2">
              {isVerifying ? 'Verifying...' : verificationResults ? 'Verified' : 'Verify Content'}
            </h4>
            <p className="text-sm text-slate-600">
              {verificationResults
                ? 'Content verification complete. Review results above.'
                : 'Ask the AI to verify all information is true and accurate before proceeding.'}
            </p>
          </button>

          {verificationResults && !verificationResults.verified && verificationResults.errors.length > 0 && onAutoCorrect && (
            <button
              onClick={onAutoCorrect}
              disabled={isCorrecting}
              className="p-6 border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:border-purple-500 hover:from-purple-100 hover:to-purple-200 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-600 transition-colors">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">
                {isCorrecting ? 'Correcting...' : 'AI Auto-Correct'}
              </h4>
              <p className="text-sm text-slate-600">
                {isCorrecting
                  ? 'AI is automatically fixing the issues found...'
                  : 'Let AI automatically fix the issues and regenerate affected lessons.'}
              </p>
            </button>
          )}

          <button
            onClick={() => onAccept(issueStates)}
            disabled={verificationResults && !verificationResults.verified && !allIssuesAddressed()}
            className="p-6 border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:border-orange-500 hover:from-orange-100 hover:to-orange-200 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-orange-400 disabled:hover:from-orange-50 disabled:hover:to-orange-100"
          >
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-3 group-hover:bg-orange-600 transition-colors">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-bold text-slate-900 mb-2">Accept & Continue</h4>
            <p className="text-sm text-slate-600">
              {verificationResults && !verificationResults.verified && !allIssuesAddressed()
                ? `Address all ${getPendingCount()} pending issue(s) before continuing.`
                : 'Accept the course content and proceed to generate quizzes for each lesson.'}
            </p>
          </button>
          </div>
        )}
      </div>
    </div>
  );
}
