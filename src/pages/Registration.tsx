import { useState } from 'react';
import { User, FileText, Shield, ArrowLeft, ArrowRight, Printer, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RegistrationProps {
  onComplete: () => void;
}

export default function Registration({ onComplete }: RegistrationProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });

  const [acceptanceStatus, setAcceptanceStatus] = useState({
    terms: false,
    privacy: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isFormValid = () => {
    return Object.values(formData).every(val => val.trim() !== '');
  };

  const canProceed = () => {
    return isFormValid() && acceptanceStatus.terms && acceptanceStatus.privacy;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const acceptDocument = (type: 'terms' | 'privacy') => {
    setAcceptanceStatus(prev => ({ ...prev, [type]: true }));
  };

  const declineDocument = (type: 'terms' | 'privacy') => {
    setAcceptanceStatus(prev => ({ ...prev, [type]: false }));
    alert('You must accept both documents to proceed with enrollment.');
  };

  const printDocument = (type: 'terms' | 'privacy') => {
    const content = type === 'terms' ? termsContent : privacyContent;
    const title = type === 'terms' ? 'Terms and Conditions' : 'Data Privacy Notice';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 2rem; color: #333; }
            h3 { color: #1a202c; margin-top: 1.5rem; }
            p { margin-bottom: 1rem; }
            ul { margin: 1rem 0 1rem 2rem; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p><strong>CourseForge</strong></p>
          <p><strong>Printed on:</strong> ${new Date().toLocaleDateString()}</p>
          <hr>
          ${content}
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProceed()) return;

    setLoading(true);
    setError('');

    try {
      if (!supabase) {
        throw new Error('Application is not properly configured. Please contact support.');
      }

      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            country: formData.country,
            terms_accepted: true,
            privacy_accepted: true,
            registration_date: new Date().toISOString(),
          },
        },
      });

      if (authError) throw authError;

      alert(`🎉 Registration Successful!\n\nWelcome ${formData.firstName} ${formData.lastName}!\n\nYou are now enrolled in CourseForge.`);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const termsContent = `
    <h3>1. CourseForge Access</h3>
    <p>By using CourseForge, you are granted access to create unlimited courses using our AI-powered platform.</p>

    <h3>2. Intellectual Property Rights</h3>
    <p>All course materials created through CourseForge remain your intellectual property. CourseForge does not claim ownership of your content.</p>

    <h3>3. User Conduct</h3>
    <p>You agree to use CourseForge responsibly and not create content that violates laws or infringes on others' rights.</p>

    <h3>4. Refund Policy</h3>
    <p>Refund policies apply based on your subscription plan. Contact support for details.</p>

    <h3>5. Technical Requirements</h3>
    <p>You need a modern web browser and stable internet connection to use CourseForge.</p>

    <h3>6. Limitation of Liability</h3>
    <p>CourseForge is provided "as is" without warranties. We are not liable for outcomes from using the platform.</p>

    <h3>7. Termination</h3>
    <p>We reserve the right to terminate accounts that violate these terms.</p>

    <h3>8. Changes to Terms</h3>
    <p>We may update these terms. Continued use constitutes acceptance of changes.</p>

    <h3>9. Governing Law</h3>
    <p>These terms are governed by applicable laws.</p>

    <h3>10. Contact Information</h3>
    <p>For questions: support@courseforge.com</p>
  `;

  const privacyContent = `
    <h3>1. Information We Collect</h3>
    <p>We collect: name, email, phone, address, course activity, and usage data.</p>

    <h3>2. How We Use Your Information</h3>
    <p>To provide services, improve platform, communicate updates, and ensure security.</p>

    <h3>3. Legal Basis for Processing</h3>
    <p>Based on consent, contract performance, and legitimate interests.</p>

    <h3>4. How We Share Your Information</h3>
    <p>We don't sell data. We share only with service providers and when legally required.</p>

    <h3>5. Data Storage and Security</h3>
    <p>Data is encrypted and stored securely with regular backups.</p>

    <h3>6. Your Privacy Rights</h3>
    <p>You can access, correct, delete, and port your data. Contact privacy@courseforge.com</p>

    <h3>7. Cookies and Tracking</h3>
    <p>We use cookies for functionality, security, and analytics.</p>

    <h3>8. Children's Privacy</h3>
    <p>CourseForge is for users 16 and older.</p>

    <h3>9. International Transfers</h3>
    <p>Data may be processed in different countries with appropriate safeguards.</p>

    <h3>10. Changes to Privacy Notice</h3>
    <p>We'll notify you of significant changes.</p>

    <h3>11. Contact</h3>
    <p>privacy@courseforge.com</p>
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 shadow-lg">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/CourseForgeLogo.png" alt="CourseForge" className="h-8 w-auto" />
            <h1 className="text-3xl font-black">CourseForge Registration</h1>
          </div>
          <p className="text-blue-100">Create your account to start building courses</p>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-6 py-12">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl p-8 text-center mb-8 shadow-xl">
          <div className="text-5xl mb-4">🎓</div>
          <h2 className="text-3xl font-bold mb-2">Welcome! You are just minutes away from creating your first course!</h2>
          <p className="text-green-100 text-lg">Join thousands of creators automating their course production</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <User className="w-6 h-6" />
              Student Information
            </h2>
            <p className="text-slate-600 mb-6">All fields marked with <span className="text-red-500">*</span> are required</p>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
                  placeholder="Enter your first name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
                placeholder="Create a password"
                minLength={6}
                required
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
                placeholder="(555) 123-4567"
                required
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
                placeholder="123 Main Street"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
                  placeholder="Your city"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  State/Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
                  placeholder="Your state"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  ZIP/Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
                  placeholder="12345"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
                  placeholder="Your country"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 border-l-4 border-yellow-500 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-700 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-yellow-900 mb-1">Important: Review Required Documents</h3>
                <p className="text-yellow-800">
                  Before proceeding, please carefully review and accept both the Terms and Conditions and the Data Privacy Notice below.
                </p>
              </div>
            </div>
          </div>

          {[
            { type: 'terms', title: 'Terms and Conditions', icon: FileText, content: termsContent },
            { type: 'privacy', title: 'Data Privacy Notice', icon: Shield, content: privacyContent },
          ].map(({ type, title, icon: Icon, content }) => (
            <div key={type} className="bg-white rounded-2xl p-8 shadow-lg mb-8">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Icon className="w-6 h-6" />
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={() => printDocument(type as 'terms' | 'privacy')}
                  className="px-4 py-2 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg font-semibold hover:from-slate-600 hover:to-slate-700 transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>

              <div
                className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6 max-h-96 overflow-y-auto mb-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />

              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => declineDocument(type as 'terms' | 'privacy')}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-bold hover:from-red-600 hover:to-red-700 transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  I Don't Accept
                </button>
                <button
                  type="button"
                  onClick={() => acceptDocument(type as 'terms' | 'privacy')}
                  className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                    acceptanceStatus[type as 'terms' | 'privacy']
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  {acceptanceStatus[type as 'terms' | 'privacy'] ? '✓ Accepted' : 'I Accept'}
                </button>
              </div>

              {acceptanceStatus[type as 'terms' | 'privacy'] && (
                <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 text-center text-green-800 font-bold">
                  ✓ You have accepted the {title}
                </div>
              )}
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-8 text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex-1 px-8 py-4 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Landing Page
            </button>
            <button
              type="submit"
              disabled={!canProceed() || loading}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Account...' : 'Next: Begin Creating Your First Course'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
