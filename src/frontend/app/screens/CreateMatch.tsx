import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Card, CardBody, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { ArrowLeft, ArrowRight, Play, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { BotRecord, createMatch, getBots } from '../api/client';

type SelectableBot = BotRecord & { compatible?: boolean };


const boardSizes = ['13', '15', '19', '25'];
const winConditions = ['3', '4', '5', '6'];
const logLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];

export function CreateMatch() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    botA: '',
    botB: '',
    boardSize: '15',
    winCondition: '5',
    timeLimit: '5000',
    moveTimeLimit: '1000',
    sandboxEnabled: true,
    retries: '3',
    logLevel: 'INFO',
    deterministicSeed: '',
    generateSeed: true,
  });
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [showDropdownA, setShowDropdownA] = useState(false);
  const [showDropdownB, setShowDropdownB] = useState(false);
  const [bots, setBots] = useState<SelectableBot[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getBots()
      .then((data) => setBots(data.map((bot) => ({ ...bot, compatible: bot.status === 'active' }))))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Не удалось загрузить ботов'))
      .finally(() => setLoadingBots(false));
  }, []);

  const filteredBotsA = bots.filter(bot => 
    bot.name.toLowerCase().includes(searchA.toLowerCase()) ||
    bot.id.toLowerCase().includes(searchA.toLowerCase())
  );

  const filteredBotsB = bots.filter(bot => 
    bot.name.toLowerCase().includes(searchB.toLowerCase()) ||
    bot.id.toLowerCase().includes(searchB.toLowerCase())
  );

  const selectedBotA = bots.find(b => b.id === formData.botA);
  const selectedBotB = bots.find(b => b.id === formData.botB);

  const hasWarnings = () => {
    const warnings = [];
    if (selectedBotA && !selectedBotA.compatible) {
      warnings.push(`${selectedBotA.name} помечен как несовместимый`);
    }
    if (selectedBotB && !selectedBotB.compatible) {
      warnings.push(`${selectedBotB.name} помечен как несовместимый`);
    }
    if (selectedBotA && selectedBotB && selectedBotA.id === selectedBotB.id) {
      warnings.push('Выбран один и тот же бот для обеих сторон');
    }
    return warnings;
  };

  const canProceed = () => {
    if (step === 1) {
      return Boolean(formData.botA && formData.botB && formData.botA !== formData.botB);
    }
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleCreate = async () => {
    if (!canProceed()) {
      toast.error('Выберите двух разных ботов');
      return;
    }

    setCreating(true);
    try {
      const match = await createMatch({
        botAId: formData.botA,
        botBId: formData.botB,
        boardSize: Number(formData.boardSize),
        winCondition: Number(formData.winCondition),
        timeLimitMs: Number(formData.moveTimeLimit),
        memoryLimitMb: 512,
        maxMoves: 225,
        logLevel: formData.logLevel,
      });
      toast.success(`Матч ${match.id} создан успешно!`);
      navigate(`/matches/${match.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось создать матч');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectBotA = (botId: string) => {
    setFormData(prev => ({ ...prev, botA: botId }));
    const bot = bots.find(b => b.id === botId);
    setSearchA(bot?.name || '');
    setShowDropdownA(false);
  };

  const handleSelectBotB = (botId: string) => {
    setFormData(prev => ({ ...prev, botB: botId }));
    const bot = bots.find(b => b.id === botId);
    setSearchB(bot?.name || '');
    setShowDropdownB(false);
  };

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Матчи', href: '/matches' },
        { label: 'Создать матч' }
      ]} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Создать матч</h1>
        <p className="text-gray-600 mt-1">Настройка нового матча между ботами</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {[1, 2, 3].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                step >= s ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-400'
              }`}>
                {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
              </div>
              <div className="ml-3 mr-8">
                <p className={`text-sm font-medium ${step >= s ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s === 1 ? 'Выбор ботов' : s === 2 ? 'Настройки' : 'Подтверждение'}
                </p>
              </div>
              {idx < 2 && (
                <div className={`w-16 h-1 mx-4 ${step > s ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Step 1: Choose Bots and Rules */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Шаг 1: Выбор ботов и правил</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                {/* Bot Selection */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Бот A <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchA}
                          onChange={(e) => {
                            setSearchA(e.target.value);
                            setShowDropdownA(true);
                          }}
                          onFocus={() => setShowDropdownA(true)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Поиск бота..."
                        />
                      </div>
                      {showDropdownA && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {loadingBots ? (
                            <div className="px-4 py-3 text-sm text-gray-500">Загрузка ботов...</div>
                          ) : filteredBotsA.map(bot => (
                            <button
                              key={bot.id}
                              onClick={() => handleSelectBotA(bot.id)}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium text-gray-900">{bot.name}</div>
                                <div className="text-xs text-gray-500">{bot.id} • {bot.language}</div>
                              </div>
                              {!bot.compatible && (
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedBotA && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{selectedBotA.name}</span> • {selectedBotA.language} • v{selectedBotA.version}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Бот B <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchB}
                          onChange={(e) => {
                            setSearchB(e.target.value);
                            setShowDropdownB(true);
                          }}
                          onFocus={() => setShowDropdownB(true)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Поиск бота..."
                        />
                      </div>
                      {showDropdownB && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {loadingBots ? (
                            <div className="px-4 py-3 text-sm text-gray-500">Загрузка ботов...</div>
                          ) : filteredBotsB.map(bot => (
                            <button
                              key={bot.id}
                              onClick={() => handleSelectBotB(bot.id)}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium text-gray-900">{bot.name}</div>
                                <div className="text-xs text-gray-500">{bot.id} • {bot.language}</div>
                              </div>
                              {!bot.compatible && (
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedBotB && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{selectedBotB.name}</span> • {selectedBotB.language} • v{selectedBotB.version}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Warnings */}
                {hasWarnings().length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900 mb-1">Предупреждения:</p>
                        <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                          {hasWarnings().map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rules */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Правила игры</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Размер поля (N×N)
                      </label>
                      <select
                        value={formData.boardSize}
                        onChange={(e) => setFormData(prev => ({ ...prev, boardSize: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {boardSizes.map(size => (
                          <option key={size} value={size}>{size}×{size}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Условие победы (K в ряд)
                      </label>
                      <select
                        value={formData.winCondition}
                        onChange={(e) => setFormData(prev => ({ ...prev, winCondition: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {winConditions.map(k => (
                          <option key={k} value={k}>{k} в ряд</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Time Limits */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Лимиты времени</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Общий лимит времени (ms)
                      </label>
                      <input
                        type="number"
                        value={formData.timeLimit}
                        onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1000"
                        max="30000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Лимит времени на ход (ms)
                      </label>
                      <input
                        type="number"
                        value={formData.moveTimeLimit}
                        onChange={(e) => setFormData(prev => ({ ...prev, moveTimeLimit: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="100"
                        max="10000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 2: Execution Settings */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Шаг 2: Настройки выполнения</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Песочница (Sandbox)</p>
                    <p className="text-sm text-gray-600">Изолированная среда выполнения</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sandboxEnabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, sandboxEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Количество повторов при ошибке
                  </label>
                  <input
                    type="number"
                    value={formData.retries}
                    onChange={(e) => setFormData(prev => ({ ...prev, retries: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Уровень логирования
                  </label>
                  <select
                    value={formData.logLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, logLevel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {logLevels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Детерминизм</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="generateSeed"
                        checked={formData.generateSeed}
                        onChange={(e) => setFormData(prev => ({ ...prev, generateSeed: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="generateSeed" className="text-sm text-gray-700">
                        Генерировать случайный seed автоматически
                      </label>
                    </div>
                    {!formData.generateSeed && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Детерминистический seed
                        </label>
                        <input
                          type="text"
                          value={formData.deterministicSeed}
                          onChange={(e) => setFormData(prev => ({ ...prev, deterministicSeed: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Введите seed (hex)"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Шаг 3: Подтверждение</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    Проверьте настройки перед созданием матча. После создания некоторые параметры нельзя будет изменить.
                  </p>
                </div>

                <div>
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Боты</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Бот A</p>
                      <p className="font-semibold text-gray-900">{selectedBotA?.name}</p>
                      <p className="text-sm text-gray-600">{selectedBotA?.language} • v{selectedBotA?.version}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Бот B</p>
                      <p className="font-semibold text-gray-900">{selectedBotB?.name}</p>
                      <p className="text-sm text-gray-600">{selectedBotB?.language} • v{selectedBotB?.version}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Правила игры</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Размер поля:</span>
                      <span className="ml-2 font-medium text-gray-900">{formData.boardSize}×{formData.boardSize}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Условие победы:</span>
                      <span className="ml-2 font-medium text-gray-900">{formData.winCondition} в ряд</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Лимит времени:</span>
                      <span className="ml-2 font-medium text-gray-900">{formData.timeLimit}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Лимит на ход:</span>
                      <span className="ml-2 font-medium text-gray-900">{formData.moveTimeLimit}ms</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Настройки выполнения</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Sandbox:</span>
                      <Badge variant={formData.sandboxEnabled ? 'success' : 'default'} className="ml-2">
                        {formData.sandboxEnabled ? 'Включен' : 'Выключен'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">Повторы:</span>
                      <span className="ml-2 font-medium text-gray-900">{formData.retries}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Уровень логов:</span>
                      <span className="ml-2 font-medium text-gray-900">{formData.logLevel}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Seed:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.generateSeed ? 'Автоматический' : formData.deterministicSeed}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <Button variant="secondary" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Button>
          ) : (
            <div></div>
          )}
          
          {step < 3 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Далее
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} loading={creating}>
              <Play className="w-4 h-4" />
              Создать матч
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
