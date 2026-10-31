# Futbol Elo · Next.js + Chakra UI

Bu klasör, var olan uygulamanın özelliklerini koruyarak hazırlanmış ayrı Next.js sürümüdür. Eski uygulama `Uygulama` klasöründe değişmeden durur.

## Başlatma

1. Eski uygulama açıksa eski siyah terminal penceresini kapat.
2. `Baslat_NextJS.bat` dosyasına çift tıkla. İlk çalıştırmada Next.js ve Chakra UI paketleri yüklenir; internet bağlantısı gerekir.
3. Dashboard `http://127.0.0.1:8765` adresinde açılır. Aynı tarayıcı adresi ve portu kullanıldığından mevcut tarayıcı fikstür, sonuç ve tahmin kayıtları korunur.
4. Skorları Excel'e yazan yerel Python bağlantısı arka planda `8766` portunda çalışır.

## Korunan özellikler

- Dashboard, maç takvimi, maç analizi ve tahmin performansı sayfaları
- Takvim filtresi ve elle fikstür ekleme
- Maç saati geçince skor girişi, Elo güncellemesi ve Excel'e skor yazımı
- Takım Elo puanları, son 5 genel/iç saha/deplasman maçları ve maç tahminleri
- Tahminin maç öncesi sabitlenmesi; skor girilince tahmin tuttu/tutmadı değerlendirmesi
- Tarih aralığı ve lig/turnuva performans filtreleri

## Teknoloji

- Next.js App Router
- Chakra UI v3
- Mevcut Elo verisi `lib/data.json` içinde; Excel kayıt köprüsü `server.py` olarak korunmuştur.
- Başlatma için Node.js 20.9+ ve skorların Excel'e yazılması için çalışan Python ortamı gerekir.

## Çevrim içi ortak kayıt kurulumu

Vercel dağıtımında fikstür ve sonuçların kalıcı olması için Supabase projesi gerekir. Supabase SQL Editor'da `supabase/setup.sql` dosyasını bir kez çalıştırın. Ardından Vercel > Project > Settings > Environment Variables bölümüne `.env.example` içindeki dört değişkeni ekleyin. `SUPABASE_SECRET_KEY` yalnızca Vercel sunucu ayarı olarak kalmalı; istemciye veya GitHub'a koymayın. `APP_ADMIN_PASSWORD` için güçlü, benzersiz bir parola; `APP_SESSION_SECRET` için en az 32 karakterlik rastgele bir değer kullanın. Değişkenleri ekledikten sonra Vercel'de yeniden dağıtım yapın.

Dağıtım tamamlanınca `/settings` sayfasından yönetici parolasıyla giriş yapın. Eski bilgisayardaki `http://127.0.0.1:8765/settings` sayfasında **Yedek dosyasını indir** seçeneğiyle fikstür, skor ve tahmin yedeği alın; sonra Vercel sitesinin `/settings` sayfasında **Yedek dosyasını içeri aktar** ile yükleyin. Bu işlem çevrim içi kayıtların yerini alır. İlk aktarım sırasında mevcut çevrim içi kayıtlar boşsa sorun olmaz.

Supabase bağlantısı tamamlanmadan uygulama eski biçimde yalnızca o tarayıcıya kayıt yapmayı sürdürür.
