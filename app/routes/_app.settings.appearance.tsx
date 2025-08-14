import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Button } from "~/components/ui/button";
import { requireAuth } from "~/lib/auth.server";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

export async function loader({ request }: { request: Request }) {
  await requireAuth(request);
  return json({
    theme: "light", // You can implement theme detection/storage
    language: "id",
    fontSize: "normal",
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAuth(request);
  const formData = await request.formData();
  // Implement the logic to save appearance settings
  return json({ success: true });
}

export default function AppearanceSettings() {
  const { theme, language, fontSize } = useLoaderData<typeof loader>();

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tampilan</h1>
        <p className="text-muted-foreground">
          Sesuaikan tampilan aplikasi dengan preferensi Anda
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tema</CardTitle>
            <CardDescription>
              Pilih tema yang sesuai dengan preferensi Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mode Gelap</Label>
                    <p className="text-sm text-muted-foreground">
                      Aktifkan mode gelap untuk mengurangi ketegangan mata
                    </p>
                  </div>
                  <Switch name="darkMode" defaultChecked={theme === "dark"} />
                </div>

                <div className="grid gap-2">
                  <Label>Bahasa</Label>
                  <Select name="language" defaultValue={language}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih bahasa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id">Bahasa Indonesia</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Ukuran Font</Label>
                  <Select name="fontSize" defaultValue={fontSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih ukuran font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Kecil</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="large">Besar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Animasi</Label>
                    <p className="text-sm text-muted-foreground">
                      Aktifkan animasi antarmuka
                    </p>
                  </div>
                  <Switch name="animations" defaultChecked />
                </div>

                <Button type="submit">Simpan Perubahan</Button>
              </div>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tata Letak</CardTitle>
            <CardDescription>
              Sesuaikan tata letak elemen antarmuka
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode Compact</Label>
                  <p className="text-sm text-muted-foreground">
                    Tampilkan lebih banyak konten dalam satu layar
                  </p>
                </div>
                <Switch name="compactMode" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sidebar Mini</Label>
                  <p className="text-sm text-muted-foreground">
                    Tampilkan sidebar dalam mode minimal
                  </p>
                </div>
                <Switch name="miniSidebar" />
              </div>

              <Button type="submit">Simpan Perubahan</Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
