import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Heart,
  AlertCircle,
  LogOut,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiCalls } from '@/lib/api';
import { ADMIN_KEY_STORAGE } from '@/lib/config';
import { PostoraLogo } from '@/components/PostoraLogo';

type HealthResult = {
  latest?: { status?: string; checked_at?: string };
  checks?: { endpoint?: string; status?: string; response_ms?: number }[];
};

type SystemError = {
  id: string;
  created_at: string;
  user_id?: string;
  job?: string;
  endpoint?: string;
  error?: string;
  message?: string;
  resolved?: boolean;
  profiles?: { email?: string; full_name?: string };
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [stats] = useState({
    users: 0,
    posts: 0,
    connections: 0,
  });
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = sessionStorage.getItem(ADMIN_KEY_STORAGE);
    if (!key) {
      navigate('/admin/login');
      return;
    }
    setAdminKey(key);
  }, [navigate]);

  useEffect(() => {
    if (!adminKey) return;

    const fetch = async () => {
      try {
        const [healthRes, errorsRes] = await Promise.all([
          apiCalls.adminHealth(adminKey) as Promise<HealthResult>,
          apiCalls.adminErrors(adminKey, 50) as Promise<SystemError[]>,
        ]);
        setHealth(healthRes);
        setErrors(Array.isArray(errorsRes) ? errorsRes : []);
      } catch {
        sessionStorage.removeItem(ADMIN_KEY_STORAGE);
        navigate('/admin/login');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [adminKey, navigate]);

  // Stats could be added via backend admin/stats endpoint

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    navigate('/admin/login');
  };

  const runHealthCheck = async () => {
    if (!adminKey) return;
    setIsRunningHealthCheck(true);
    try {
      const res = (await apiCalls.adminHealthRun(adminKey)) as HealthResult;
      setHealth(res);
    } catch {
      // ignore
    } finally {
      setIsRunningHealthCheck(false);
    }
  };

  const resolveError = async (id: string) => {
    if (!adminKey) return;
    try {
      await apiCalls.adminResolveError(adminKey, id);
      setErrors((e) => e.filter((x) => x.id !== id));
    } catch {
      // ignore
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const healthChecks = health?.checks || [];
  const systemStats = [
    { label: 'Total Users', value: String(stats.users), icon: Users },
    { label: 'Total Posts', value: String(stats.posts), icon: FileText },
    { label: 'Active Connections', value: String(stats.connections), icon: Heart },
    { label: 'Open Errors', value: String(errors.length), icon: AlertCircle },
  ];

  if (loading || !adminKey) {
    return (
      <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] overflow-x-hidden">
      <header className="bg-white border-b border-[#6B7098]/10 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PostoraLogo variant="icon" size="md" />
            <div className="min-w-0">
              <h1 className="font-semibold text-base sm:text-lg text-[#10153E]">Postora Admin</h1>
              <p className="text-xs text-[#6B7098] truncate">System overview, health, and errors</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="rounded-full min-h-[44px] touch-manipulation w-full sm:w-auto shrink-0">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <section>
          <h2 className="text-base sm:text-lg font-semibold text-[#10153E] mb-3 sm:mb-4">System Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {systemStats.map((stat, i) => (
              <Card key={i} className="card-shadow border-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-[#6366F1]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7098]">{stat.label}</p>
                      <p className="text-lg font-bold text-[#10153E]">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-[#10153E]">System Health</h2>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full min-h-[44px] touch-manipulation w-full sm:w-auto"
              onClick={runHealthCheck}
              disabled={isRunningHealthCheck}
            >
              <RefreshCw className={`w-4 h-4 mr-2 shrink-0 ${isRunningHealthCheck ? 'animate-spin' : ''}`} />
              Run Health Check
            </Button>
          </div>
          <Card className="card-shadow border-none overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Checked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthChecks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center p-8 text-[#6B7098]">
                        Run health check to see results
                      </TableCell>
                    </TableRow>
                  ) : (
                    healthChecks.map((check, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{check.endpoint || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(check.status || '')}
                            <span
                              className={`capitalize ${
                                check.status === 'healthy' || check.status === 'ok'
                                  ? 'text-green-600'
                                  : check.status === 'degraded'
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {check.status || '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {check.response_ms != null ? `${check.response_ms}ms` : '—'}
                        </TableCell>
                        <TableCell className="text-[#6B7098]">—</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-base sm:text-lg font-semibold text-[#10153E] mb-3 sm:mb-4">Recent Errors</h2>
          <Card className="card-shadow border-none overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Job/Endpoint</TableHead>
                    <TableHead>Error Message</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center p-8 text-[#6B7098]">
                        No recent errors
                      </TableCell>
                    </TableRow>
                  ) : (
                    errors.map((error) => (
                      <TableRow key={error.id}>
                        <TableCell className="text-[#6B7098]">
                          {new Date(error.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {error.profiles?.email || error.user_id || '—'}
                        </TableCell>
                        <TableCell>{error.job || error.endpoint || '—'}</TableCell>
                        <TableCell className="text-red-600">
                          {error.error || error.message || '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => resolveError(error.id)}
                          >
                            Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default AdminPanel;
