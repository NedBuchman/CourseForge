import { ArrowRight, Clock, DollarSign, GraduationCap, Zap, Target, TrendingUp, BarChart3, Shield, RefreshCw, Brain, Award } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderSticky(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isHeaderSticky
            ? 'bg-white shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!imageError ? (
                <img
                  src="/CourseForgeLogo.png"
                  alt="CourseForge"
                  className="h-12 w-auto"
                  onError={() => setImageError(true)}
                  loading="eager"
                />
              ) : (
                <GraduationCap className={`h-12 w-12 ${isHeaderSticky ? 'text-blue-600' : 'text-white'}`} />
              )}
              <span className={`text-2xl font-bold ${isHeaderSticky ? 'text-slate-900' : 'text-white'}`}>CourseForge</span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#features" className={`font-medium transition-colors ${
                isHeaderSticky
                  ? 'text-slate-700 hover:text-blue-600'
                  : 'text-white hover:text-yellow-400'
              }`}>
                Features
              </a>
              <button
                onClick={onGetStarted}
                className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </nav>
      </header>

      <section className="relative pt-32 pb-20 px-6 bg-gradient-to-br from-blue-600 via-blue-700 to-slate-800 overflow-hidden">

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-12">
            {!imageError ? (
              <img
                src="/CourseForgeLogo.png"
                alt="CourseForge"
                className="h-24 w-auto mx-auto mb-8"
                onError={() => setImageError(true)}
                loading="eager"
              />
            ) : (
              <GraduationCap className="h-24 w-24 text-yellow-400 mx-auto mb-8" />
            )}

            <h1 className="text-6xl md:text-7xl font-black text-white mb-6 leading-tight">
              Create Professional Courses<br />
              <span className="text-yellow-400">in Minutes, Not Months</span>
            </h1>

            <div className="inline-block bg-red-500 text-white px-8 py-4 rounded-full text-2xl font-bold mb-8 shadow-xl">
              Transform 40 Hours into 4 Minutes
            </div>

            <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
              AI-powered course creation that handles everything: curriculum design, quizzes, presentations, and landing pages. No expertise required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={onGetStarted}
                className="px-10 py-5 bg-yellow-400 text-slate-900 text-xl font-bold rounded-lg hover:bg-yellow-300 transition-all shadow-2xl flex items-center gap-2"
              >
                Start Creating Free <ArrowRight className="w-6 h-6" />
              </button>
              <button
                onClick={onGetStarted}
                className="px-10 py-5 bg-white text-blue-600 text-xl font-bold rounded-lg hover:bg-blue-50 transition-all shadow-xl flex items-center gap-2"
              >
                See How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-br from-red-50 to-red-100">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black text-red-900 mb-4">The Problem</h2>
            <p className="text-xl text-red-700">Creating courses the traditional way is broken</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border-l-4 border-red-500">
              <Clock className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-3">The Time Problem</h3>
              <p className="text-red-700 text-lg leading-relaxed">
                Creating a single course takes <strong>40-80 hours</strong> of work. Most creators give up before finishing.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border-l-4 border-red-500">
              <DollarSign className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-3">The Cost Barrier</h3>
              <p className="text-red-700 text-lg leading-relaxed">
                Professional tools cost <strong>$2K-$10K per year</strong>. Small creators can't afford the tech stack.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border-l-4 border-red-500">
              <GraduationCap className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-3">The Expertise Gap</h3>
              <p className="text-red-700 text-lg leading-relaxed">
                <strong>72% cite lack of skills</strong> as the biggest barrier. Instructional design is complex.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-br from-blue-50 to-slate-100">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black text-blue-900 mb-4">The Solution</h2>
            <p className="text-xl text-blue-700">CourseForge automates the entire process</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-black text-blue-600">1</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Enter Topic</h3>
              <p className="text-slate-600 text-lg">
                Describe your course in plain English
              </p>
              <div className="mt-4 text-blue-600 font-semibold">30 seconds</div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-black text-blue-600">2</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">AI Generates Everything</h3>
              <p className="text-slate-600 text-lg">
                Course content, lesson plans, quizzes, presentations, and landing page
              </p>
              <div className="mt-4 text-blue-600 font-semibold">3 minutes</div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-black text-blue-600">3</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Review & Publish</h3>
              <p className="text-slate-600 text-lg">
                Make final tweaks and launch your course
              </p>
              <div className="mt-4 text-blue-600 font-semibold">1 minute</div>
            </div>
          </div>

          <div className="text-center bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-2xl shadow-xl">
            <p className="text-3xl font-bold">
              Professional quality courses in under <span className="text-yellow-400">15 minutes</span>
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black text-slate-900 mb-4">Benefits</h2>
            <p className="text-xl text-slate-600">Why CourseForge is the future of course creation</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg">
              <Zap className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">95% Faster</h3>
              <p className="text-slate-700 text-lg">
                What took 40 hours now takes 4 minutes. Launch more courses, earn more revenue.
              </p>
            </div>

            <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg">
              <DollarSign className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">90% Cost Savings</h3>
              <p className="text-slate-700 text-lg">
                Replace expensive tools with one affordable platform. No hidden fees.
              </p>
            </div>

            <div className="p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg">
              <Target className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Zero Learning Curve</h3>
              <p className="text-slate-700 text-lg">
                No instructional design degree needed. AI handles the complexity.
              </p>
            </div>

            <div className="p-8 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg">
              <BarChart3 className="w-12 h-12 text-orange-600 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Built-In Analytics</h3>
              <p className="text-slate-700 text-lg">
                Track student progress, completion rates, and quiz performance automatically.
              </p>
            </div>

            <div className="p-8 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl shadow-lg">
              <RefreshCw className="w-12 h-12 text-teal-600 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Always Current</h3>
              <p className="text-slate-700 text-lg">
                Update courses instantly with AI. Stay relevant in fast-changing fields.
              </p>
            </div>

            <div className="p-8 bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl shadow-lg">
              <Brain className="w-12 h-12 text-rose-600 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Pedagogically Sound</h3>
              <p className="text-slate-700 text-lg">
                Based on proven learning principles. Better outcomes for students.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black text-slate-900 mb-4">Features</h2>
            <p className="text-xl text-slate-600">Everything you need to create and sell courses</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Brain className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">AI Course Generation</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Generates complete course outlines, lesson plans, learning objectives, and structured curriculum in seconds
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Auto Quiz Creation</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Creates multiple-choice, true/false, and short answer questions with explanations automatically
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Learner Management</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Track student enrollment, progress, quiz scores, and completion rates in real-time
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Analytics Dashboard</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Visualize engagement metrics, identify struggling students, and optimize your content
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise Security</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Bank-level encryption, secure data storage, and compliance with educational standards
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-8 h-8 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">LMS Integration</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Export to popular platforms or use our built-in LMS. Works with your existing tools
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-br from-yellow-50 to-yellow-100">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black text-yellow-900 mb-4">Social Proof</h2>
            <p className="text-xl text-yellow-700">Join the course creation revolution</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <div className="text-5xl font-black text-slate-900 mb-2">95%</div>
              <p className="text-slate-700 text-lg">Time Reduction</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <TrendingUp className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <div className="text-5xl font-black text-slate-900 mb-2">10x</div>
              <p className="text-slate-700 text-lg">Productivity Increase</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <DollarSign className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <div className="text-5xl font-black text-slate-900 mb-2">$370B</div>
              <p className="text-slate-700 text-lg">Training Market</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <Clock className="w-16 h-16 text-purple-500 mx-auto mb-4" />
              <div className="text-5xl font-black text-slate-900 mb-2">4 Min</div>
              <p className="text-slate-700 text-lg">Average Creation Time</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 via-blue-700 to-slate-800">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-5xl font-black text-white mb-6">
            Ready to Transform Course Creation?
          </h2>
          <p className="text-2xl text-blue-100 mb-10">
            Join thousands of creators who've automated their course production
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={onGetStarted}
              className="px-12 py-5 bg-yellow-400 text-slate-900 text-xl font-bold rounded-lg hover:bg-yellow-300 transition-all shadow-2xl"
            >
              Start Free Trial
            </button>
            <button
              onClick={onGetStarted}
              className="px-12 py-5 bg-white text-blue-600 text-xl font-bold rounded-lg hover:bg-blue-50 transition-all shadow-xl"
            >
              Schedule Demo
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-blue-100 text-lg">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-2xl">✓</span>
              <span>Free first course</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-2xl">✓</span>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-2xl">✓</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Use Cases</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sales</a></li>
                <li><a href="#" className="hover:text-white transition-colors">hello@courseforge.com</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center">
            <p>&copy; 2025 CourseForge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
