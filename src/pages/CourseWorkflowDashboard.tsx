import { useState } from 'react';
import { CheckCircle, Lock, AlertTriangle, ArrowRight, Edit, FileText, Brain, Presentation, Globe, Rocket, Download, BarChart3, Video, LogOut } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

interface CourseWorkflowDashboardProps {
  courseId: string;
  courseTitle: string;
  currentStep: number;
  lastCompletedStep: number;
  contentStatus: string;
  videosStatus: string;
  quizzesStatus: string;
  presentationStatus: string;
  landingPageStatus: string;
  publishedStatus: string;
  downloadedStatus: string;
  contentFormat: string;
  onContinue: () => void;
  onEditStep: (step: number) => void;
  onBack: () => void;
  onViewAnalytics?: () => void;
  onLogout?: () => void;
}

interface WorkflowStep {
  number: number;
  title: string;
  description: string;
  icon: any;
  status: 'completed' | 'current' | 'needs_redo' | 'locked';
  canEdit: boolean;
}

export default function CourseWorkflowDashboard({
  courseId,
  courseTitle,
  currentStep,
  lastCompletedStep,
  contentStatus,
  videosStatus,
  quizzesStatus,
  presentationStatus,
  landingPageStatus,
  publishedStatus,
  downloadedStatus,
  contentFormat,
  onContinue,
  onEditStep,
  onBack,
  onViewAnalytics,
  onLogout
}: CourseWorkflowDashboardProps) {
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [selectedStepToEdit, setSelectedStepToEdit] = useState<WorkflowStep | null>(null);
  const [affectedSteps, setAffectedSteps] = useState<WorkflowStep[]>([]);

  const hasVideoFormat = contentFormat === 'video' || contentFormat === 'hybrid';

  const getStepStatus = (stepNumber: number, statusValue: string): 'completed' | 'current' | 'needs_redo' | 'locked' => {
    if (stepNumber > lastCompletedStep + 1) return 'locked';
    if (statusValue === 'needs_redo' || statusValue === 'needs_republish') return 'needs_redo';
    if (stepNumber <= lastCompletedStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'locked';
  };

  const baseSteps: WorkflowStep[] = [
    {
      number: 1,
      title: 'Content Generation',
      description: 'AI generates course lessons and materials',
      icon: Brain,
      status: getStepStatus(1, contentStatus),
      canEdit: lastCompletedStep >= 1
    },
    {
      number: 2,
      title: 'Review Lesson Content',
      description: hasVideoFormat ? 'Review and approve lesson content (optimized for video)' : 'Review and approve lesson content',
      icon: Edit,
      status: getStepStatus(2, contentStatus === 'completed' && lastCompletedStep >= 2 ? 'completed' : contentStatus),
      canEdit: lastCompletedStep >= 2
    },
    {
      number: 3,
      title: 'Quiz Generation',
      description: 'Create assessments for each lesson',
      icon: FileText,
      status: getStepStatus(3, quizzesStatus),
      canEdit: lastCompletedStep >= 3
    },
    {
      number: 4,
      title: 'Presentation Setup',
      description: 'Configure presentation theme and settings',
      icon: Presentation,
      status: getStepStatus(4, presentationStatus),
      canEdit: lastCompletedStep >= 4
    },
    {
      number: 5,
      title: 'Landing Page',
      description: 'Customize your course marketing page',
      icon: Globe,
      status: getStepStatus(5, landingPageStatus),
      canEdit: lastCompletedStep >= 5
    }
  ];

  if (hasVideoFormat) {
    baseSteps.push({
      number: 6,
      title: 'Review Videos',
      description: 'Preview and approve generated lesson videos',
      icon: Video,
      status: getStepStatus(6, videosStatus),
      canEdit: lastCompletedStep >= 6
    });
  }

  const remainingSteps: WorkflowStep[] = [
    {
      number: hasVideoFormat ? 7 : 6,
      title: 'Publish Course',
      description: 'Make your course live for students',
      icon: Rocket,
      status: getStepStatus(hasVideoFormat ? 7 : 6, publishedStatus),
      canEdit: lastCompletedStep >= (hasVideoFormat ? 7 : 6)
    },
    {
      number: hasVideoFormat ? 8 : 7,
      title: 'Download Package',
      description: 'Export your complete course',
      icon: Download,
      status: getStepStatus(hasVideoFormat ? 8 : 7, downloadedStatus),
      canEdit: lastCompletedStep >= (hasVideoFormat ? 8 : 7)
    }
  ];

  const steps: WorkflowStep[] = [...baseSteps, ...remainingSteps];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-500 text-green-700';
      case 'current': return 'bg-blue-100 border-blue-500 text-blue-700';
      case 'needs_redo': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'locked': return 'bg-slate-100 border-slate-300 text-slate-400';
      default: return 'bg-slate-100 border-slate-300 text-slate-400';
    }
  };

  const getStatusIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'current':
        return <ArrowRight className="w-6 h-6 text-blue-600" />;
      case 'needs_redo':
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'locked':
        return <Lock className="w-6 h-6 text-slate-400" />;
    }
  };

  const getStatusBadge = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-600 text-white">Completed</span>;
      case 'current':
        return <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-600 text-white">Current Step</span>;
      case 'needs_redo':
        return <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-600 text-white">Needs Update</span>;
      case 'locked':
        return <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-400 text-white">Locked</span>;
    }
  };

  const handleEditStep = (step: WorkflowStep) => {
    if (!step.canEdit || step.status === 'locked') return;

    const subsequentSteps = steps.filter(s => s.number > step.number && s.number <= lastCompletedStep);

    if (subsequentSteps.length > 0) {
      setSelectedStepToEdit(step);
      setAffectedSteps(subsequentSteps);
      setShowEditWarning(true);
    } else {
      onEditStep(step.number);
    }
  };

  const handleConfirmEdit = () => {
    if (selectedStepToEdit) {
      setShowEditWarning(false);
      onEditStep(selectedStepToEdit.number);
    }
  };

  const handleCancelEdit = () => {
    setShowEditWarning(false);
    setSelectedStepToEdit(null);
    setAffectedSteps([]);
  };

  const getProgressPercentage = () => {
    const totalSteps = hasVideoFormat ? 7 : 6;
    return Math.round((lastCompletedStep / totalSteps) * 100);
  };

  const getCurrentStatusMessage = () => {
    const totalSteps = hasVideoFormat ? 7 : 6;
    if (lastCompletedStep === 0) {
      return 'Ready to start - Begin with content generation';
    } else if (lastCompletedStep === totalSteps) {
      return 'All steps complete - Course is fully published!';
    } else if (steps.some(s => s.status === 'needs_redo')) {
      const needsRedo = steps.filter(s => s.status === 'needs_redo');
      return `${needsRedo[0].title} was edited - Please review subsequent steps`;
    } else {
      return `In progress - Continue with ${steps[currentStep - 1]?.title}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-4 shadow-lg">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/CourseForgeLogo.png" alt="CourseForge" className="h-8 w-auto" />
            <span className="text-2xl font-black tracking-tight">COURSEFORGE</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-white hover:text-blue-200 transition-colors">
              ← Back to Courses
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-blue-100 hover:text-white transition-colors flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-6 py-12">
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
          <div className="mb-6">
            <h1 className="text-4xl font-black text-slate-900 mb-2">{courseTitle}</h1>
            <p className="text-lg text-slate-600">{getCurrentStatusMessage()}</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Overall Progress</span>
              <span className="text-sm font-bold text-blue-600">{getProgressPercentage()}% Complete</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>

          {publishedStatus === 'published' && downloadedStatus === 'downloaded' && onViewAnalytics && (
            <div className="mb-6">
              <button
                onClick={onViewAnalytics}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-lg"
              >
                <BarChart3 className="w-6 h-6" />
                View Course Analytics Dashboard
              </button>
            </div>
          )}

          {steps.some(s => s.status === 'needs_redo') && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-orange-900">Action Required</p>
                  <p className="text-orange-800 text-sm">
                    Some steps need to be updated after recent changes. Review and complete the steps marked "Needs Update" below.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Course Creation Workflow</h2>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.number}>
                <div className={`border-2 rounded-xl p-6 transition-all ${getStatusColor(step.status)} ${
                  step.status === 'current' ? 'shadow-lg scale-105' : ''
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          step.status === 'completed' ? 'bg-green-600' :
                          step.status === 'current' ? 'bg-blue-600' :
                          step.status === 'needs_redo' ? 'bg-orange-600' :
                          'bg-slate-300'
                        }`}>
                          <step.icon className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                          {getStatusBadge(step)}
                        </div>
                        <p className={`text-sm ${
                          step.status === 'locked' ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusIcon(step)}

                      {step.status === 'current' && (
                        <button
                          onClick={onContinue}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md flex items-center gap-2"
                        >
                          Continue <ArrowRight className="w-4 h-4" />
                        </button>
                      )}

                      {step.canEdit && step.status !== 'current' && step.status !== 'locked' && (
                        <button
                          onClick={() => handleEditStep(step)}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                            step.status === 'needs_redo'
                              ? 'bg-orange-600 text-white hover:bg-orange-700'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                          {step.status === 'needs_redo' ? 'Update' : 'Edit'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div className="flex justify-center my-2">
                    <div className={`w-1 h-8 ${
                      step.status === 'completed' ? 'bg-green-500' : 'bg-slate-300'
                    }`}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-3">Quick Tips</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm"><strong>New courses:</strong> Complete steps sequentially from top to bottom</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm"><strong>In-progress courses:</strong> Click "Continue" to resume where you left off</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm"><strong>Completed courses:</strong> Click "Edit" on any step to make changes</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm"><strong>Note:</strong> Editing a step requires updating all subsequent steps</span>
            </li>
          </ul>
        </div>
      </div>

      {showEditWarning && selectedStepToEdit && (
        <ConfirmationModal
          isOpen={showEditWarning}
          title={`Edit "${selectedStepToEdit.title}"?`}
          message={
            <div className="space-y-4">
              <p className="text-slate-700">
                Making changes to <strong>{selectedStepToEdit.title}</strong> will affect the steps that come after it.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="font-semibold text-blue-900 mb-2">The following steps will need to be reviewed:</p>
                <ul className="space-y-1">
                  {affectedSteps.map(step => (
                    <li key={step.number} className="flex items-center gap-2 text-blue-800">
                      <ArrowRight className="w-4 h-4 flex-shrink-0" />
                      <span>{step.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-slate-600 text-sm">
                Don't worry - your existing work is saved. You'll be able to review and update each step as needed.
              </p>
            </div>
          }
          confirmLabel="Yes, Let Me Edit"
          cancelLabel="Cancel"
          onConfirm={handleConfirmEdit}
          onCancel={handleCancelEdit}
          type="warning"
        />
      )}
    </div>
  );
}
