// 登录/注册页
// V1 单用户自用：注册即第一个用户，登录即用同一组邮箱密码

import { useState, FormEvent } from "react";
import { useAuth } from "@/pages/Login";
import { useT } from "@/i18n/useTypedTranslation";
import { translateSupabaseError } from "@/lib/i18n-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoFull } from "@/components/Logo";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { t } = useT();
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
      setError(translateSupabaseError(t, error) ?? error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#E8F4F0" }}>
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="flex justify-center mb-4">
            <LogoFull size="lg" />
          </div>
          <p className="text-center text-sm mb-6" style={{ color: "#5BB5A2" }}>
            {t("login.subtitle")}
          </p>
          <p className="text-gray-400 text-center mb-6 text-xs">
            {mode === "signin" ? t("login.signinHeading") : t("login.signupHeading")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">{t("login.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login.emailPlaceholder")}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">{t("login.passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("login.passwordPlaceholder")}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full" style={{ backgroundColor: loading ? undefined : "#5BB5A2" }}>
              {loading ? t("login.loadingButton") : mode === "signin" ? t("login.signInButton") : t("login.signUpButton")}
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
              {mode === "signin"
                ? `${t("login.noAccountPrompt")} ${t("login.noAccountLink")}`
                : `${t("login.haveAccountPrompt")} ${t("login.haveAccountLink")}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}