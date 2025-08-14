import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Button } from "~/components/ui/button";
import { requireAuth } from "~/lib/auth.server";
import { Input } from "~/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Shield, AlertTriangle, Key } from "lucide-react";

export async function loader({ request }: { request: Request }) {
  await requireAuth(request);
  return json({
    twoFactorEnabled: false,
    ipWhitelist: "",
    sessionTimeout: 60,
    lastLogin: new Date().toISOString(),
    activeSessions: [
      {
        id: 1,
        device: "Chrome on Windows",
        location: "Jakarta, Indonesia",
        lastActive: new Date().toISOString(),
      },
    ],
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAuth(request);
  const formData = await request.formData();
  // Implement the logic to save security settings
  return json({ success: true });
}

export default function SecuritySettings() {
  const { twoFactorEnabled, ipWhitelist, sessionTimeout, lastLogin, activeSessions } = useLoaderData<typeof loader>();

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Keamanan</h1>
        <p className="text-muted-foreground">
          Kelola pengaturan keamanan akun Anda
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Otentikasi
            </CardTitle>
            <CardDescription>
              Tingkatkan keamanan akun dengan otentikasi multi-faktor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Otentikasi Dua Faktor</Label>
                  <p className="text-sm text-muted-foreground">
                    Aktifkan verifikasi tambahan saat login
                  </p>
                </div>
                <Switch name="twoFactor" defaultChecked={twoFactorEnabled} />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Rekomendasi Keamanan</AlertTitle>
                <AlertDescription>
                  Kami sangat menyarankan untuk mengaktifkan otentikasi dua faktor untuk meningkatkan keamanan akun Anda.
                </AlertDescription>
              </Alert>

              <Button type="submit">Simpan Perubahan</Button>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Pembatasan Akses
            </CardTitle>
            <CardDescription>
              Atur pembatasan akses untuk meningkatkan keamanan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="ipWhitelist">Whitelist IP</Label>
                <Input
                  id="ipWhitelist"
                  name="ipWhitelist"
                  placeholder="Contoh: 192.168.1.1, 10.0.0.0/24"
                  defaultValue={ipWhitelist}
                />
                <p className="text-sm text-muted-foreground">
                  Pisahkan beberapa IP dengan koma
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sessionTimeout">Batas Waktu Sesi (menit)</Label>
                <Input
                  id="sessionTimeout"
                  name="sessionTimeout"
                  type="number"
                  min="15"
                  max="480"
                  defaultValue={sessionTimeout}
                />
                <p className="text-sm text-muted-foreground">
                  Sesi akan berakhir setelah tidak aktif selama periode ini
                </p>
              </div>

              <Button type="submit">Simpan Perubahan</Button>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sesi Aktif</CardTitle>
            <CardDescription>
              Kelola sesi login yang aktif pada akun Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm">
                Login terakhir: {new Date(lastLogin).toLocaleString('id-ID')}
              </div>

              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{session.device}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.location} • Aktif terakhir:{' '}
                        {new Date(session.lastActive).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      Akhiri Sesi
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="destructive" className="w-full">
                Akhiri Semua Sesi
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
