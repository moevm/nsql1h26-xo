import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/Button';
import { forgotPassword } from '../api/client';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('Обязательное поле');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Неверный формат email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="mb-2">Письмо отправлено</h2>
            <p className="text-gray-600 mb-6">
              Мы отправили инструкции по восстановлению пароля на адрес <strong>{email}</strong>
            </p>
            <Link to="/login">
              <Button variant="primary" className="w-full">
                Вернуться к входу
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9 9h6v6H9z" />
              <path d="M3 3h6v6H3z" />
              <path d="M15 3h6v6h-6z" />
              <path d="M3 15h6v6H3z" />
              <path d="M15 15h6v6h-6z" />
            </svg>
          </div>
          <h1 className="mb-1">Восстановление пароля</h1>
          <p className="text-muted-foreground">
            Введите email, и мы отправим вам инструкции
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block mb-2">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  onBlur={() => validateEmail(email)}
                  className={`w-full px-4 py-2.5 bg-input-background rounded-lg border ${
                    emailError ? 'border-red-500' : 'border-transparent'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="user@example.com"
                />
                {emailError && (
                  <p className="mt-1.5 text-red-600">{emailError}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full"
              >
                Отправить инструкции
              </Button>
            </div>
          </form>

          {/* Back to Login */}
          <div className="mt-6">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться к входу
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
