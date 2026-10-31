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
