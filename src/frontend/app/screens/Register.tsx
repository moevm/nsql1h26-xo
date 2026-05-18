import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/Button';
import { register } from '../api/client';

export function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const validateName = (value: string) => {
    if (!value.trim()) {
      return 'Обязательное поле';
    }
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value) {
      return 'Обязательное поле';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Неверный формат email';
    }
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) {
      return 'Обязательное поле';
    }
    if (value.length < 8) {
      return 'Минимум 8 символов';
    }
    return '';
  };

  const validateConfirmPassword = (value: string, password: string) => {
    if (!value) {
      return 'Обязательное поле';
    }
    if (value !== password) {
      return 'Пароли не совпадают';
    }
    return '';
  };

  const handleBlur = (field: keyof typeof formData) => {
    let errorMsg = '';
    switch (field) {
      case 'name':
        errorMsg = validateName(formData.name);
        break;
      case 'email':
        errorMsg = validateEmail(formData.email);
        break;
      case 'password':
        errorMsg = validatePassword(formData.password);
        break;
      case 'confirmPassword':
        errorMsg = validateConfirmPassword(formData.confirmPassword, formData.password);
        break;
    }
    setErrors(prev => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error on change if exists
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    const newErrors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      confirmPassword: validateConfirmPassword(formData.confirmPassword, formData.password),
    };
    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(err => err !== '');
    if (hasErrors || !acceptTerms) {
      return;
    }

    setLoading(true);

    try {
      await register(formData.name, formData.email, formData.password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Регистрация не выполнена');
    } finally {
      setLoading(false);
    }
  };


  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[460px]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="mb-2">Аккаунт создан</h2>
            <p className="text-gray-600 mb-6">
              Регистрация прошла успешно. Теперь вы можете войти в систему.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/')}
              className="w-full"
            >
              Перейти в систему
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-[560px]">
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
          <h1>Создать аккаунт</h1>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Two-column form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block mb-2">Имя</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    className={`w-full px-4 py-2.5 bg-input-background rounded-lg border ${
                      errors.name ? 'border-red-500' : 'border-transparent'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Иван Иванов"
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block mb-2">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`w-full px-4 py-2.5 bg-input-background rounded-lg border ${
                      errors.email ? 'border-red-500' : 'border-transparent'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="user@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block mb-2">Пароль</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      className={`w-full px-4 py-2.5 bg-input-background rounded-lg border ${
                        errors.password ? 'border-red-500' : 'border-transparent'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 pr-11`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-red-600">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block mb-2">Повторите пароль</label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      onBlur={() => handleBlur('confirmPassword')}
                      className={`w-full px-4 py-2.5 bg-input-background rounded-lg border ${
                        errors.confirmPassword ? 'border-red-500' : 'border-transparent'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 pr-11`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Role Block */}
              <div className="pt-2">
                <label className="block mb-2">Роль</label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg">
                      Пользователь
                    </div>
                    <div className="px-3 py-1.5 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed">
                      Модератор
                    </div>
                    <div className="px-3 py-1.5 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed">
                      Администратор
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-gray-600">
                  Роль назначается администратором. По умолчанию создаётся роль 'Пользователь'.
                </p>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">
                  Я принимаю условия использования
                </span>
              </label>

              {/* Primary Button */}
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!acceptTerms}
                className="w-full"
              >
                Зарегистрироваться
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">Уже есть аккаунт?</span>{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
