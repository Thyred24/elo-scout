"use client";

import { useRef, useState } from "react";
import { Badge, Box, Button, Flex, Heading, Input, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useFootballStore } from "@/components/store";

export default function SettingsPage(){
  const {fixtures,results,forecasts,hydrated,cloudEnabled,cloudStatus,adminAuthenticated,adminConfigured,signIn,signOut,replaceAll}=useFootballStore();
  const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const fileRef=useRef(null);
  const bundle={fixtures,results,forecasts};
  const exportBackup=()=>{
    const file={app:"EloScout",version:1,exportedAt:new Date().toISOString(),...bundle};
    const url=URL.createObjectURL(new Blob([JSON.stringify(file,null,2)],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download=`eloscout-yedek-${new Date().toISOString().slice(0,10)}.json`;link.click();URL.revokeObjectURL(url);
    setMessage("Yedek dosyası indirildi. Dosyayı güvenli bir yerde sakla.");
  };
  const importBackup=async(event)=>{
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    setBusy(true);setMessage("");
    try{
      if(file.size>15*1024*1024)throw new Error("Yedek dosyası 15 MB sınırını aşıyor.");
      const parsed=JSON.parse(await file.text());
      if(parsed.app!=="EloScout"||!Array.isArray(parsed.fixtures)||!Array.isArray(parsed.results)||!Array.isArray(parsed.forecasts))throw new Error("Bu dosya geçerli bir EloScout yedeği değil.");
      if(!window.confirm(`${parsed.fixtures.length} fikstür, ${parsed.results.length} skor ve ${parsed.forecasts.length} tahmin aktarılacak. Mevcut kayıtların yerini alacak. Devam edilsin mi?`))return;
      const ok=await replaceAll(parsed);
      if(!ok)throw new Error("Aktarım tamamlanamadı. Yönetici girişi ve veritabanı bağlantısını kontrol et.");
      setMessage("Yedek başarıyla aktarıldı.");
    }catch(error){setMessage(error.message||"Yedek okunamadı.");}
    finally{setBusy(false);}
  };
  const login=async(event)=>{event.preventDefault();setBusy(true);setMessage("");try{await signIn(password);setPassword("");setMessage("Yönetici girişi açıldı. Ortak kayıtları düzenleyebilirsin.");}catch(error){setMessage(error.message);}finally{setBusy(false);}};

  return <Stack gap={5}>
    <Box><Text color="#58cbbb" fontSize="xs" fontWeight="800" letterSpacing=".14em">KAYITLAR VE YEDEK</Text><Heading size={{base:"xl",md:"2xl"}}>Veri yönetimi</Heading><Text color="#92a6bb" mt={2}>Eski tarayıcı kayıtlarını yedekle, çevrim içi siteye aktar ve ortak kayıt durumunu gör.</Text></Box>
    <Box className="surface-card" bg="#111f31" border="1px solid #26384c" rounded="2xl" p={{base:4,md:5}}>
      <Flex justify="space-between" align="center" gap={3} wrap="wrap"><Box><Text color="#58cbbb" fontSize="xs" fontWeight="800" letterSpacing=".1em">KAYIT YERİ</Text><Heading size="md" mt={1}>{cloudEnabled?"Çevrim içi ortak kayıt":"Bu tarayıcı"}</Heading></Box><Badge className={`status-pill ${cloudEnabled?"status-success":"status-warning"}`}>{cloudEnabled?"Bulut bağlantısı":"Yerel kayıt"}</Badge></Flex>
      <Text color="#a4b6c9" fontSize="sm" mt={3}>{cloudStatus}</Text>
      <SimpleGrid columns={{base:1,sm:3}} gap={3} mt={4}>{[["Fikstür",fixtures.length],["Kaydedilmiş skor",results.length],["Tahmin",forecasts.length]].map(([label,count])=><Box key={label} bg="#17283b" border="1px solid #2b4057" rounded="xl" p={3}><Text color="#91a6bc" fontSize="xs">{label}</Text><Text color="#eef4fa" fontWeight="900" fontSize="2xl">{hydrated?count:"—"}</Text></Box>)}</SimpleGrid>
      {!cloudEnabled&&<Text color="#f0c878" fontSize="sm" mt={4}>Bu adres yalnızca kendi tarayıcındaki verileri görüyor. Vercel ortam değişkenleri ve Supabase kurulunca aynı kayıtlar tüm cihazlarda kullanılabilir.</Text>}
    </Box>
    {cloudEnabled&&<Box className="surface-card" bg="#111f31" border="1px solid #26384c" rounded="2xl" p={{base:4,md:5}}>
      <Heading size="md">Yönetici girişi</Heading><Text color="#92a6bb" fontSize="sm" mt={2}>Çevrim içi fikstür, skor ve tahminleri değiştirme yetkisini açar.</Text>
      {adminAuthenticated?<Flex align="center" gap={3} mt={4} wrap="wrap"><Badge className="status-pill status-success">Giriş yapıldı</Badge><Button variant="outline" onClick={async()=>{await signOut();setMessage("Yönetici oturumu kapatıldı.");}}>Oturumu kapat</Button></Flex>:<Box as="form" onSubmit={login} mt={4}><Stack direction={{base:"column",sm:"row"}} align={{sm:"end"}} gap={3}><Box flex="1"><Text color="#92a6bb" fontSize="xs" mb={1}>Yönetici parolası</Text><Input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Vercel ayarlarında belirlenen parola"/></Box><Button type="submit" className="btn-primary" disabled={busy||!adminConfigured}>{busy?"Kontrol ediliyor…":"Giriş yap"}</Button></Stack></Box>}
      {!adminConfigured&&<Text color="#f0c878" fontSize="sm" mt={3}>Sunucu ayarları henüz tamamlanmadı; yönetici girişi kullanılamıyor.</Text>}
    </Box>}
    <Box className="surface-card" bg="#111f31" border="1px solid #26384c" rounded="2xl" p={{base:4,md:5}}>
      <Heading size="md">Yedekle ve aktar</Heading><Text color="#92a6bb" fontSize="sm" mt={2}>Eski uygulamanın açık olduğu bilgisayarda bu sayfadan yedek indir; ardından Vercel sitesinde aynı dosyayı içeri aktar.</Text>
      <Flex gap={3} mt={4} wrap="wrap"><Button className="btn-primary" onClick={exportBackup} disabled={!hydrated}>Yedek dosyasını indir</Button><Button variant="outline" onClick={()=>fileRef.current?.click()} disabled={busy||!hydrated||(cloudEnabled&&!adminAuthenticated)}>{busy?"Aktarılıyor…":"Yedek dosyasını içeri aktar"}</Button><Input ref={fileRef} type="file" accept=".json,application/json" display="none" onChange={importBackup}/></Flex>
      {cloudEnabled&&!adminAuthenticated&&<Text color="#f0c878" fontSize="xs" mt={3}>Buluta aktarım için önce yönetici girişi yap.</Text>}
      {message&&<Text role="status" color={message.includes("başarıyla")||message.includes("indirildi")||message.includes("açıldı")?"#70e0ae":"#f0c878"} fontSize="sm" mt={3}>{message}</Text>}
    </Box>
    <Box bg="#17283b" border="1px solid #26384c" rounded="xl" p={4}><Text color="#e5edf5" fontWeight="800">Kayıtları kaybetmemek için</Text><Text color="#92a6bb" fontSize="sm" mt={1}>Eski `127.0.0.1:8765` adresindeki veriler otomatik silinmez. Önce oradan yedek indir, sonra çevrim içi sitede içeri aktar. İçeri aktarma mevcut çevrim içi kayıtların yerini alır.</Text></Box>
  </Stack>;
}
