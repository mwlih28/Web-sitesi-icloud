'use strict';

// ===== MOCK DATA =====

const PHOTOS = [
  { id:1,  src:'https://picsum.photos/seed/ic1/400/400',  name:'IMG_0001.jpg', date:'Bugün, 14:32', size:'3.2 MB' },
  { id:2,  src:'https://picsum.photos/seed/ic2/400/400',  name:'IMG_0002.jpg', date:'Bugün, 14:30', size:'2.8 MB' },
  { id:3,  src:'https://picsum.photos/seed/ic3/400/400',  name:'IMG_0003.jpg', date:'Bugün, 11:15', size:'4.1 MB' },
  { id:4,  src:'https://picsum.photos/seed/ic4/400/400',  name:'IMG_0004.jpg', date:'Dün, 20:45', size:'2.5 MB' },
  { id:5,  src:'https://picsum.photos/seed/ic5/400/400',  name:'IMG_0005.jpg', date:'Dün, 19:22', size:'3.7 MB' },
  { id:6,  src:'https://picsum.photos/seed/ic6/400/400',  name:'IMG_0006.jpg', date:'Dün, 18:10', size:'2.2 MB' },
  { id:7,  src:'https://picsum.photos/seed/ic7/400/400',  name:'IMG_0007.jpg', date:'Dün, 16:55', size:'3.9 MB' },
  { id:8,  src:'https://picsum.photos/seed/ic8/400/400',  name:'IMG_0008.jpg', date:'Dün, 09:03', size:'2.1 MB' },
  { id:9,  src:'https://picsum.photos/seed/ic9/400/400',  name:'IMG_0009.jpg', date:'21 Haz, 22:00', size:'4.4 MB' },
  { id:10, src:'https://picsum.photos/seed/ic10/400/400', name:'IMG_0010.jpg', date:'21 Haz, 18:30', size:'2.6 MB' },
  { id:11, src:'https://picsum.photos/seed/ic11/400/400', name:'IMG_0011.jpg', date:'21 Haz, 15:14', size:'3.3 MB' },
  { id:12, src:'https://picsum.photos/seed/ic12/400/400', name:'IMG_0012.jpg', date:'21 Haz, 12:05', size:'2.9 MB' },
  { id:13, src:'https://picsum.photos/seed/ic13/400/400', name:'IMG_0013.jpg', date:'20 Haz, 20:10', size:'4.0 MB' },
  { id:14, src:'https://picsum.photos/seed/ic14/400/400', name:'IMG_0014.jpg', date:'20 Haz, 16:45', size:'2.4 MB' },
  { id:15, src:'https://picsum.photos/seed/ic15/400/400', name:'IMG_0015.jpg', date:'20 Haz, 10:30', size:'3.5 MB' },
  { id:16, src:'https://picsum.photos/seed/ic16/400/400', name:'IMG_0016.jpg', date:'19 Haz, 22:00', size:'2.7 MB' },
];

const DRIVE_FILES = [
  { id:1,  type:'folder', name:'Belgeler',        modified:'21 Haz 2026', size:'—',       items:12 },
  { id:2,  type:'folder', name:'Projeler',         modified:'20 Haz 2026', size:'—',       items:7  },
  { id:3,  type:'folder', name:'Yedeklemeler',     modified:'18 Haz 2026', size:'—',       items:3  },
  { id:4,  type:'pdf',    name:'CV_2026.pdf',      modified:'19 Haz 2026', size:'1.2 MB',  items:0  },
  { id:5,  type:'word',   name:'Rapor_Haziran.docx', modified:'21 Haz 2026', size:'840 KB', items:0 },
  { id:6,  type:'excel',  name:'Bütçe_2026.xlsx',  modified:'15 Haz 2026', size:'2.3 MB', items:0  },
  { id:7,  type:'image',  name:'logo.png',         modified:'10 Haz 2026', size:'450 KB', items:0  },
  { id:8,  type:'zip',    name:'arsiv.zip',         modified:'08 Haz 2026', size:'18.4 MB',items:0  },
  { id:9,  type:'text',   name:'notlar.txt',        modified:'21 Haz 2026', size:'12 KB',  items:0  },
  { id:10, type:'video',  name:'tatil.mp4',         modified:'05 Haz 2026', size:'1.1 GB', items:0  },
];

const FILE_ICONS = {
  folder:'📁', pdf:'📄', word:'📝', excel:'📊', image:'🖼️',
  zip:'🗜️', text:'📃', video:'🎬', audio:'🎵', default:'📎'
};

const MAILS = [
  { id:1, sender:'Apple', from:'noreply@apple.com', subject:'iCloud Depolama Alanı Bildirimi', body:'Depolama alanınızın %80\'ini kullandınız. Planınızı yükseltmeyi düşünün.', time:'Bugün 14:22', unread:true },
  { id:2, sender:'Ahmet Yılmaz', from:'ahmet@example.com', subject:'Proje Toplantısı — Pazartesi 10:00', body:'Merhaba, pazartesi günkü toplantı için bir hatırlatma yapmak istedim. Gündem: Q3 hedefleri ve yeni kampanya planlaması.', time:'Bugün 11:05', unread:true },
  { id:3, sender:'App Store', from:'noreply@apple.com', subject:'Haftalık Uygulamalar Bültenimiz', body:'Bu haftanın öne çıkan uygulamalarını keşfedin.', time:'Dün 16:30', unread:true },
  { id:4, sender:'Elif Şahin', from:'elif@example.com', subject:'Re: Teklif Dosyası', body:'Teşekkürler, dosyayı inceledim. Bazı sorularım var.', time:'Dün 09:14', unread:false },
  { id:5, sender:'GitHub', from:'noreply@github.com', subject:'Your daily digest', body:'3 new pull requests and 2 issues were opened today.', time:'Dün 08:00', unread:false },
  { id:6, sender:'LinkedIn', from:'no-reply@linkedin.com', subject:'5 kişi profilinizi görüntüledi', body:'Bu hafta profilinizi görüntüleyen kişileri görün.', time:'20 Haz', unread:false },
  { id:7, sender:'Banka', from:'bildirim@banka.com', subject:'Hesap hareketleriniz', body:'20 Haziran tarihinde hesabınızda işlem gerçekleşti.', time:'20 Haz', unread:false },
  { id:8, sender:'Fatma Kaya', from:'fatma@example.com', subject:'Doğum günü kutlaması', body:'Seni bu Cumartesi akşamı kutlamak istiyoruz!', time:'19 Haz', unread:false },
];

const CALENDAR_EVENTS = [
  { id:1, day:21, month:5, year:2026, title:'Toplantı: Q3 Planlama', time:'10:00 – 11:30', color:'blue' },
  { id:2, day:21, month:5, year:2026, title:'Öğle Yemeği',          time:'13:00',          color:'orange' },
  { id:3, day:24, month:5, year:2026, title:'Doğum Günü Kutlaması', time:'19:00',           color:'red' },
  { id:4, day:25, month:5, year:2026, title:'Sprint Review',        time:'14:00 – 15:00',   color:'blue' },
  { id:5, day:28, month:5, year:2026, title:'Dişçi Randevusu',      time:'09:30',           color:'green' },
  { id:6, day:30, month:5, year:2026, title:'Ay Sonu Raporu',       time:'17:00',           color:'orange' },
  { id:7, day:5,  month:6, year:2026, title:'İzin Başlangıcı',      time:'Tüm gün',         color:'green' },
];

const NOTES_DATA = [
  { id:1, title:'Proje Fikirleri', body:'• iCloud entegrasyonu\n• Yeni ürün tasarımı\n• Kullanıcı geri bildirimi analizi\n\nBu ay tamamlanması gereken öğeler...', date:'Bugün 14:00' },
  { id:2, title:'Alışveriş Listesi', body:'• Süt\n• Ekmek\n• Meyve\n• Deterjan\n• Şampuan', date:'Bugün 10:22' },
  { id:3, title:'Kitap Notları', body:'"Dune" — Frank Herbert\n\nTemel temalar:\n- Güç ve siyaset\n- Çevre ve ekoloji\n- Din ve mitoloji\n- Kaderin göreceliliği', date:'Dün 22:15' },
  { id:4, title:'Tatil Planı', body:'İstanbul → Antalya\n29 Haziran – 6 Temmuz\n\nYapılacaklar:\n• Otel rezervasyonu ✓\n• Uçak bileti ✓\n• Gezi planı ☐', date:'19 Haz' },
  { id:5, title:'Kod Snippet\'leri', body:'// Useful fetch helper\nasync function api(url, opts) {\n  const r = await fetch(url, opts);\n  if (!r.ok) throw new Error(r.statusText);\n  return r.json();\n}', date:'18 Haz' },
];

const REMINDERS = [
  { id:1, title:'Proje raporunu bitir',  due:'Bugün, 17:00',   done:false, priority:'high',   list:'İş'     },
  { id:2, title:'Dişçi randevusunu ara', due:'Yarın, 10:00',   done:false, priority:'medium', list:'Sağlık' },
  { id:3, title:'Su faturasını öde',     due:'23 Haz, 12:00',  done:false, priority:'medium', list:'Ev'     },
  { id:4, title:'Kitabı iade et',        due:'25 Haz',         done:false, priority:'low',    list:'Kişisel'},
  { id:5, title:'Arkadaşa mesaj at',     due:'Bugün',          done:true,  priority:'low',    list:'Kişisel'},
];

const CONTACTS = [
  { id:1,  name:'Ahmet Yılmaz',   phone:'+90 532 111 2233', email:'ahmet@example.com',  initials:'AY', color:'#0071e3' },
  { id:2,  name:'Ayşe Kara',      phone:'+90 545 222 3344', email:'ayse@example.com',   initials:'AK', color:'#ff3b30' },
  { id:3,  name:'Mehmet Demir',   phone:'+90 555 333 4455', email:'mehmet@example.com', initials:'MD', color:'#34c759' },
  { id:4,  name:'Fatma Çelik',    phone:'+90 536 444 5566', email:'fatma@example.com',  initials:'FC', color:'#ff9500' },
  { id:5,  name:'Elif Şahin',     phone:'+90 542 555 6677', email:'elif@example.com',   initials:'EŞ', color:'#5856d6' },
  { id:6,  name:'Ali Öztürk',     phone:'+90 533 666 7788', email:'ali@example.com',    initials:'AÖ', color:'#ff2d55' },
  { id:7,  name:'Zeynep Arslan',  phone:'+90 544 777 8899', email:'zeynep@example.com', initials:'ZA', color:'#00c7be' },
  { id:8,  name:'Hasan Aydın',    phone:'+90 553 888 9900', email:'hasan@example.com',  initials:'HA', color:'#636366' },
];

const DEVICES = [
  { id:1, name:'iPhone 15 Pro', icon:'📱', location:'İstanbul, Türkiye', status:'online',  battery:'85%' },
  { id:2, name:'MacBook Pro',   icon:'💻', location:'İstanbul, Türkiye', status:'online',  battery:'—'   },
  { id:3, name:'iPad Air',      icon:'📲', location:'Son görülme: Ankara', status:'offline', battery:'23%' },
  { id:4, name:'Apple Watch',   icon:'⌚', location:'İstanbul, Türkiye', status:'online',  battery:'62%' },
  { id:5, name:'AirPods Pro',   icon:'🎧', location:'Son görülme: Ev',    status:'offline', battery:'—'   },
];

const NOTIFICATIONS = [
  { icon:'📷', text:'3 yeni fotoğraf senkronize edildi', time:'5 dk önce' },
  { icon:'✉️', text:'Ahmet Yılmaz\'dan yeni mail',       time:'14 dk önce' },
  { icon:'💾', text:'Otomatik yedekleme tamamlandı',     time:'1 sa önce' },
];

const ALBUMS = [
  { id:1, name:'Favoriler',         count:128, cover:'https://picsum.photos/seed/alb_a/400/400' },
  { id:2, name:'Videolar',          count:45,  cover:'https://picsum.photos/seed/alb_b/400/400' },
  { id:3, name:'Ekran Görüntüleri', count:312, cover:'https://picsum.photos/seed/alb_c/400/400' },
  { id:4, name:'Selfie',            count:67,  cover:'https://picsum.photos/seed/alb_d/400/400' },
  { id:5, name:'Canlı Fotoğraflar', count:234, cover:'https://picsum.photos/seed/alb_e/400/400' },
  { id:6, name:'Portre',            count:89,  cover:'https://picsum.photos/seed/alb_f/400/400' },
  { id:7, name:'Panorama',          count:23,  cover:'https://picsum.photos/seed/alb_g/400/400' },
  { id:8, name:'Yemek',             count:56,  cover:'https://picsum.photos/seed/alb_h/400/400' },
];

const MEMORIES = [
  { id:1, title:'Bu Haftanın En İyileri', sub:'15 – 21 Haziran 2026', cover:'https://picsum.photos/seed/mem_a/900/520', count:23 },
  { id:2, title:'Bir Yıl Önce Bugün',     sub:'Haziran 2025',         cover:'https://picsum.photos/seed/mem_b/900/520', count:18 },
  { id:3, title:'Yaz Günleri',            sub:'Mayıs – Haziran 2026', cover:'https://picsum.photos/seed/mem_c/900/520', count:47 },
  { id:4, title:'Özel Anlar',            sub:'2026',                  cover:'https://picsum.photos/seed/mem_d/900/520', count:34 },
];
