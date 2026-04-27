import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Login } from './screens/Login';
import { Overview } from './screens/Overview';
import { Bots } from './screens/Bots';
import { BotDetail } from './screens/BotDetail';
import { UploadBot } from './screens/UploadBot';
import { Matches } from './screens/Matches';
import { MatchDetail } from './screens/MatchDetail';
import { Logs } from './screens/Logs';
import { LogViewer } from './screens/LogViewer';

export const router = createBrowserRouter([
  { path: '/login', Component: Login },
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Overview },
      { path: 'bots', Component: Bots },
      { path: 'bots/upload', Component: UploadBot },
      { path: 'bots/:id', Component: BotDetail },
      { path: 'matches', Component: Matches },
      { path: 'matches/:id', Component: MatchDetail },
      { path: 'logs', Component: Logs },
      { path: 'logs/:id', Component: LogViewer },
    ],
  },
]);
