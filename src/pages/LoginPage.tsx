// 登录/注册页
// V1 单用户自用：注册即第一个用户，登录即用同一组邮箱密码

import { useState, FormEvent } from "react";
import { useAuth } from "@/pages/Login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setLoading(false);

    if (error) {
      setError(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#E8F4F0" }}>
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: "#5BB5A2", color: "#1A3C38" }}>艺</div>
            <h1 className="text-2xl font-bold tracking-wide" style={{ color: "#1A3C38" }}>艺时纪</h1>
          </div>
          <p className="text-center text-sm mb-6" style={{ color: "#5BB5A2" }}>
            记录每一刻艺术时光
          </p>
          <p className="text-gray-400 text-center mb-6 text-xs">
            {mode === "signin" ? "登录" : "注册"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@example.com"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full" style={{ backgroundColor: loading ? undefined : "#5BB5A2" }}>
              {loading ? "处理中..." : mode === "signin" ? "登录" : "注册"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
            >
              {mode === "signin" ? "没有账号？去注册" : "已有账号？去登录"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}