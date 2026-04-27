import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Pause,
  Play,
  StepBack,
  StepForward,
  Send,
} from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card, CardBody } from "../components/Card";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { MatchRecord, getMatch } from "../api/client";

export function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "status">(
    "overview",
  );
  const [currentMove, setCurrentMove] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    getMatch(id)
      .then((data) => {
        setMatch(data);
        setCurrentMove(Math.min(1, data.movesCount));
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Ошибка загрузки"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const moveEvents = useMemo(
    () => (match?.events || []).filter((event) => event.kind === "move"),
    [match],
  );
  const logEvents = useMemo(
    () => (match?.events || []).filter((event) => event.kind === "log"),
    [match],
  );
  const visibleMoves = useMemo(
    () => moveEvents.slice(0, currentMove),
    [moveEvents, currentMove],
  );

  useEffect(() => {
    if (!isPlaying || !match) return;

    const timer = window.setInterval(() => {
      setCurrentMove((value) => {
        const nextValue = Math.min(moveEvents.length, value + 1);

        if (nextValue >= moveEvents.length) {
          setIsPlaying(false);
        }

        return nextValue;
      });
    }, 700);

    return () => window.clearInterval(timer);
  }, [isPlaying, match, moveEvents.length]);

  const boardCells = useMemo(() => {
    const cells = Array.from({ length: 25 }).map((_, index) => ({
      key: String(index),
      mark: "",
    }));

    const startIndex = Math.max(0, visibleMoves.length - 25);
    const movesForBoard = visibleMoves.slice(startIndex);

    movesForBoard.forEach((event, index) => {
      cells[index].mark = event.payload?.mark || "";
    });

    return cells;
  }, [visibleMoves]);

  const addComment = () => {
    if (!comment.trim()) return;
    setComments([comment.trim(), ...comments]);
    setComment("");
  };

  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  if (!match)
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        Матч не найден
      </div>
    );

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            to="/matches"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к матчам
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{match.id}</h1>
            <Badge
              variant={
                match.status === "Finished"
                  ? "success"
                  : match.status === "Failed"
                    ? "error"
                    : "info"
              }
            >
              {match.status}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">
            {match.botAName} vs {match.botBName}
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Бот A
              </label>
              <p className="text-gray-900">{match.botAName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Бот B
              </label>
              <p className="text-gray-900">{match.botBName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Правила
              </label>
              <p className="text-gray-900">{match.rules}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Результат
              </label>
              <Badge variant="success">{match.result}</Badge>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Начало
              </label>
              <p className="text-gray-900">{match.started}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Завершение
              </label>
              <p className="text-gray-900">{match.finished || "-"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Всего ходов
              </label>
              <p className="text-gray-900">{match.movesCount}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Логи
              </label>
              <p className="text-gray-900">{match.logCount}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: "overview", label: "Поле и replay" },
              { id: "status", label: "История статусов" },
              { id: "logs", label: "Логи матча" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <CardBody>
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)] gap-6 items-start">
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-4">
                  Поле / Replay
                </h3>

                <div className="inline-block bg-gray-100 border border-gray-300 rounded-lg p-1.5 overflow-hidden">
                  <div className="grid grid-cols-5 gap-1">
                    {boardCells.map((cell) => (
                      <div
                        key={cell.key}
                        className="w-7 h-7 bg-white rounded border border-gray-200 flex items-center justify-center text-sm leading-none font-bold text-gray-700"
                      >
                        {cell.mark}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-3 max-w-[190px]">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentMove((v) => Math.max(0, v - 1))}
                    >
                      <StepBack className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setCurrentMove((v) =>
                          Math.min(moveEvents.length, v + 1),
                        )
                      }
                    >
                      <StepForward className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="text-sm text-gray-600">
                    Ход #{currentMove} из {moveEvents.length}
                  </div>

                  <input
                    className="w-full"
                    type="range"
                    min="0"
                    max={moveEvents.length}
                    value={currentMove}
                    onChange={(e) => setCurrentMove(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-4">
                  Последние ходы
                </h3>
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {visibleMoves
                    .slice(-12)
                    .reverse()
                    .map((event) => (
                      <div
                        key={event.id}
                        className="p-3 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="flex justify-between text-sm gap-4">
                          <span className="font-medium">
                            #{event.seq} {event.botName}
                          </span>
                          <span className="text-gray-500 whitespace-nowrap">
                            {event.ts}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          {event.payload.mark}: ({event.payload.x},{" "}
                          {event.payload.y}) за {event.payload.decision_ms} мс
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "status" && (
            <div className="space-y-6">
              <div className="space-y-3">
                {match.statusHistory.map((item) => (
                  <div
                    key={`${item.status}-${item.time}`}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                  >
                    <Badge
                      variant={
                        item.status === "Finished"
                          ? "success"
                          : item.status === "Failed"
                            ? "error"
                            : "info"
                      }
                    >
                      {item.status}
                    </Badge>
                    <span className="text-gray-600">{item.time}</span>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-3">
                  Комментарии по матчу
                </h3>
                <div className="flex gap-2 mb-3">
                  <input
                    className="flex-1 px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Добавить комментарий"
                  />
                  <Button onClick={addComment}>
                    <Send className="w-4 h-4" />
                    Добавить
                  </Button>
                </div>
                <div className="space-y-2">
                  {comments.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-lg text-gray-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-2 font-mono text-sm max-h-[520px] overflow-y-auto bg-gray-950 text-gray-100 rounded-lg p-4">
              {logEvents.map((event) => (
                <div
                  key={event.id}
                  className={
                    event.payload.level === "ERROR"
                      ? "text-red-300"
                      : event.payload.level === "WARN"
                        ? "text-yellow-300"
                        : "text-gray-100"
                  }
                >
                  [{event.ts}] [{event.payload.level}] {event.botName}:{" "}
                  {event.payload.message}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
