import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertTriangle, CheckCircle, Users } from "lucide-react";

interface DropoffStats {
  total: number;
  verified: number;
  abandoned: number;
  abandoned_list: { email: string; created_at: string }[];
}

const SignupDropoffCard = () => {
  const [stats, setStats] = useState<DropoffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState("30");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc(
          "get_signup_dropoff_stats" as any,
          { days_back: parseInt(daysBack) }
        );
        if (rpcError) throw rpcError;
        setStats(data as unknown as DropoffStats);
      } catch (err: any) {
        setError(err.message || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [daysBack]);

  const dropoffRate = stats && stats.total > 0
    ? Math.round((stats.abandoned / stats.total) * 100)
    : 0;

  const getStatusColor = () => {
    if (!stats || stats.total === 0) return "text-muted-foreground";
    if (dropoffRate >= 15) return "text-destructive";
    if (dropoffRate >= 5) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusIcon = () => {
    if (!stats || stats.total === 0) return <Users className="h-5 w-5 text-muted-foreground" />;
    if (dropoffRate >= 15) return <AlertTriangle className="h-5 w-5 text-destructive" />;
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "< 1h ago";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Signup Drop-off Monitor</CardTitle>
          </div>
          <ToggleGroup
            type="single"
            value={daysBack}
            onValueChange={(v) => v && setDaysBack(v)}
            size="sm"
          >
            <ToggleGroupItem value="7">7d</ToggleGroupItem>
            <ToggleGroupItem value="30">30d</ToggleGroupItem>
            <ToggleGroupItem value="90">90d</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : stats ? (
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">OTPs sent</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.verified}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${getStatusColor()}`}>
                  {stats.abandoned}
                </p>
                <p className="text-xs text-muted-foreground">Abandoned</p>
              </div>
              <div>
                <Badge
                  variant={dropoffRate >= 15 ? "destructive" : "secondary"}
                  className="text-sm"
                >
                  {dropoffRate}% drop-off
                </Badge>
              </div>
            </div>

            {stats.abandoned_list.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Recent abandoned signups
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {stats.abandoned_list.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0"
                    >
                      <span className="text-muted-foreground truncate max-w-[200px]">
                        {item.email}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default SignupDropoffCard;
