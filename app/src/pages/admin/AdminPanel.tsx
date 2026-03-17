import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  FileText, 
  Heart, 
  MessageCircle, 
  Reply, 
  AlertCircle,
  LogOut,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const systemStats = [
  { label: 'Total Users', value: '1,234', icon: Users },
  { label: 'Total Posts', value: '45,678', icon: FileText },
  { label: 'Total Likes', value: '892K', icon: Heart },
  { label: 'Total Comments', value: '234K', icon: MessageCircle },
  { label: 'Total Replies', value: '89K', icon: Reply },
  { label: 'Open Errors', value: '12', icon: AlertCircle },
];

const healthChecks = [
  { endpoint: 'Feed API', status: 'healthy', response: '45ms' },
  { endpoint: 'Like API', status: 'healthy', response: '32ms' },
  { endpoint: 'Comment API', status: 'healthy', response: '38ms' },
  { endpoint: 'Post API', status: 'degraded', response: '245ms' },
  { endpoint: 'Groq API', status: 'healthy', response: '120ms' },
  { endpoint: 'Supabase DB', status: 'healthy', response: '18ms' },
];

const users = [
  { name: 'John Doe', email: 'john@example.com', plan: 'Pro', postsUsed: 45, linkedIn: true, lastActive: '2 min ago', errors: 0 },
  { name: 'Jane Smith', email: 'jane@example.com', plan: 'Starter', postsUsed: 8, linkedIn: true, lastActive: '1 hour ago', errors: 0 },
  { name: 'Bob Johnson', email: 'bob@example.com', plan: 'Team', postsUsed: 128, linkedIn: false, lastActive: '3 hours ago', errors: 2 },
  { name: 'Alice Williams', email: 'alice@example.com', plan: 'Pro', postsUsed: 67, linkedIn: true, lastActive: '5 hours ago', errors: 0 },
  { name: 'Charlie Brown', email: 'charlie@example.com', plan: 'Starter', postsUsed: 3, linkedIn: true, lastActive: '1 day ago', errors: 1 },
];

const recentErrors = [
  { id: 1, date: '2024-03-13 14:23', email: 'bob@example.com', job: 'Like API', message: 'Rate limit exceeded' },
  { id: 2, date: '2024-03-13 13:45', email: 'charlie@example.com', job: 'Post API', message: 'Invalid cookie' },
  { id: 3, date: '2024-03-13 12:30', email: 'user@example.com', job: 'Comment API', message: 'Network timeout' },
];

const AdminPanel = () => {
  const navigate = useNavigate();
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('postpilot_admin');
    navigate('/admin/login');
  };

  const runHealthCheck = () => {
    setIsRunningHealthCheck(true);
    setTimeout(() => setIsRunningHealthCheck(false), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      {/* Header */}
      <header className="bg-white border-b border-[#6B7098]/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg text-[#10153E]">Admin Panel</h1>
              <p className="text-xs text-[#6B7098]">System overview, health, users, and errors</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="rounded-full">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* System Overview */}
        <section>
          <h2 className="text-lg font-semibold text-[#10153E] mb-4">System Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {systemStats.map((stat, i) => (
              <Card key={i} className="card-shadow border-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2D5AF6]/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-[#2D5AF6]" />
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

        {/* System Health */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#10153E]">System Health</h2>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full"
              onClick={runHealthCheck}
              disabled={isRunningHealthCheck}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRunningHealthCheck ? 'animate-spin' : ''}`} />
              Run Health Check
            </Button>
          </div>
          <Card className="card-shadow border-none">
            <CardContent className="p-0">
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
                  {healthChecks.map((check, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{check.endpoint}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(check.status)}
                          <span className={`capitalize ${
                            check.status === 'healthy' ? 'text-green-600' :
                            check.status === 'degraded' ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {check.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{check.response}</TableCell>
                      <TableCell className="text-[#6B7098]">Just now</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Users Table */}
        <section>
          <h2 className="text-lg font-semibold text-[#10153E] mb-4">Users</h2>
          <Card className="card-shadow border-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Posts Used</TableHead>
                    <TableHead>LinkedIn</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.plan === 'Pro' ? 'default' : user.plan === 'Team' ? 'secondary' : 'outline'}>
                          {user.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.postsUsed}</TableCell>
                      <TableCell>
                        {user.linkedIn ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-[#6B7098]">{user.lastActive}</TableCell>
                      <TableCell>
                        {user.errors > 0 ? (
                          <Badge className="bg-red-100 text-red-700">{user.errors}</Badge>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Recent Errors */}
        <section>
          <h2 className="text-lg font-semibold text-[#10153E] mb-4">Recent Errors</h2>
          <Card className="card-shadow border-none">
            <CardContent className="p-0">
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
                  {recentErrors.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell className="text-[#6B7098]">{error.date}</TableCell>
                      <TableCell>{error.email}</TableCell>
                      <TableCell>{error.job}</TableCell>
                      <TableCell className="text-red-600">{error.message}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="rounded-full">
                          Resolve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
