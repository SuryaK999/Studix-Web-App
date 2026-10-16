import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  TrendingUp,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export function AnalyticsDashboard({ roomId }) {
  const [hourlyData, setHourlyData] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const { user } = useAuth();

  // Fetch analytics data
  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = [];
      const userMap = new Map();
      const hourlyMap = new Map<number, { messages; users: Set<string> }>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push(data);

        // User activity
        const userStats = userMap.get(data.senderId) || { count: 0, lastActive: 0 };
        userStats.count++;
        userStats.lastActive = Math.max(userStats.lastActive, new Date(data.createdAt).getTime());
        userMap.set(data.senderId, userStats);

        // Hourly data
        const hour = new Date(data.createdAt).getHours();
        const hourData = hourlyMap.get(hour) || { messages: 0, users: new Set() };
        hourData.messages++;
        hourData.users.add(data.senderId);
        hourlyMap.set(hour, hourData);
      });

      setTotalMessages(messages.length);
      setActiveUsers(userMap.size);

      // Format hourly data
      const hourlyArray = [];
      for (let i = 0; i < 24; i++) {
        const data = hourlyMap.get(i);
        hourlyArray.push({
          hour: `${i}:00`,
          messages: data?.messages || 0,
          activeUsers: data?.users.size || 0,
        });
      }
      setHourlyData(hourlyArray);

      // Format user activity
      const userArray = Array.from(userMap.entries()).map(([userId, stats]) => ({
        userId,
        displayName: messages.find(m => m.senderId === userId)?.senderName || 'Unknown',
        messageCount: stats.count,
        lastActive: stats.lastActive,
      }));
      setUserActivity(userArray.sort((a, b) => b.messageCount - a.messageCount));
    });

    return () => unsubscribe();
  }, [roomId]);

  // Mock errors for demo
  useEffect(() => {
    const mockErrors = [
      {
        id: '1',
        message: 'Failed to sync notes',
        severity: 'medium',
        timestamp: Date.now() - 3600000,
        userId: user?.uid,
        roomId,
      },
      {
        id: '2',
        message: 'Network timeout during file upload',
        severity: 'low',
        timestamp: Date.now() - 7200000,
        roomId,
      },
    ];
    setErrors(mockErrors);
  }, [roomId, user]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm">Total Messages</p>
                  <p className="text-3xl font-bold">{totalMessages}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-indigo-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Active Users</p>
                  <p className="text-3xl font-bold">{activeUsers}</p>
                </div>
                <Users className="h-8 w-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">Avg Response</p>
                  <p className="text-3xl font-bold">2.3s</p>
                </div>
                <Clock className="h-8 w-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-rose-100 text-sm">Engagement</p>
                  <p className="text-3xl font-bold">87%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-rose-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                Hourly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval={3} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="messages" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* User Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={userActivity.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="messageCount"
                    nameKey="displayName"
                  >
                    {userActivity.slice(0, 5).map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {userActivity.slice(0, 5).map((u, index) => (
                  <Badge
                    key={u.userId}
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    className="text-white"
                  >
                    {u.displayName}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Error Log Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex justify-end"
      >
        <Button
          variant="outline"
          onClick={() => setShowErrors(true)}
          className="flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4" />
          View Error Logs ({errors.length})
        </Button>
      </motion.div>

      {/* Error Dialog */}
      <Dialog open={showErrors} onOpenChange={setShowErrors}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Error Log</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {errors.map((error) => (
                <div
                  key={error.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted text-foreground"
                >
                  <div className={`w-3 h-3 rounded-full mt-1 ${getSeverityColor(error.severity)}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{error.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(error.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">{error.severity}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
