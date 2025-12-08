import { BookOpen, Award, Users, TrendingUp } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: 'login' | 'register' | 'catalog') => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">CourseForge</span>
              <span className="text-sm text-gray-500 ml-2">Learn & Grow</span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Log In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Learn Anything, <span className="text-blue-600">Anytime</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Access expert-created courses with interactive lessons, quizzes, and video content.
              Track your progress and achieve your learning goals.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => onNavigate('register')}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg shadow-lg"
              >
                Start Learning Free
              </button>
              <button
                onClick={() => onNavigate('catalog')}
                className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-semibold text-lg shadow-lg border-2 border-blue-600"
              >
                Browse Courses
              </button>
            </div>
          </div>

          <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: BookOpen,
                title: 'Expert Content',
                description: 'Learn from professionally crafted courses',
              },
              {
                icon: Award,
                title: 'Track Progress',
                description: 'Monitor your learning journey with detailed analytics',
              },
              {
                icon: Users,
                title: 'Interactive Quizzes',
                description: 'Test your knowledge with engaging assessments',
              },
              {
                icon: TrendingUp,
                title: 'Flexible Learning',
                description: 'Learn at your own pace, on your own schedule',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600">
                Three simple steps to start your learning journey
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {[
                {
                  step: '1',
                  title: 'Create Account',
                  description: 'Sign up in seconds and explore available courses',
                },
                {
                  step: '2',
                  title: 'Enroll in Courses',
                  description: 'Choose courses that match your interests and goals',
                },
                {
                  step: '3',
                  title: 'Learn & Grow',
                  description: 'Watch videos, complete lessons, take quizzes, and earn achievements',
                },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 py-20 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Start Learning?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of learners who are already advancing their skills
            </p>
            <button
              onClick={() => onNavigate('register')}
              className="px-10 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-bold text-lg shadow-xl"
            >
              Create Free Account
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              <span className="text-xl font-bold">CourseForge</span>
            </div>
            <p className="text-gray-400">
              © 2024 CourseForge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
