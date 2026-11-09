// Цэсэнд хоолны доор харагдах зургууд. Файлууд public/images/menu хавтсанд байна.
// Түлхүүр нь Supabase дахь монгол нэрийн жижиг үсгээрх хэлбэр.
// Энд байхгүй хоолонд админаас оруулсан зураг харагдана (олон хоолонд давхардсан түр зургаас бусад).
const MENU_IMAGES = {
  '3-4 хүний багц': '/images/menu/3-4-huniy-bagts.webp',
  '9-10 хүний багц': '/images/menu/9-10-huniy-bagts.webp',
  'банштай хар шөл': '/images/menu/banshtai-har-shol.webp',
  'гуляш': '/images/menu/gulyash.webp',
  'калбижим': '/images/menu/kalbijim.webp',
  'мантуутай гахайн мах': '/images/menu/mantuutai-gahain-mah.webp',
  'өндөгтэй бифштекс': '/images/menu/ondogtei-bifshteks.webp',
  'өндөгтэй хуурга': '/images/menu/ondogtei-huurga.webp',
  'тахиан махан ороомог': '/images/menu/tahian-mahan-oroomog.webp',
  'төмсны хучмал': '/images/menu/tomsny-huchmal.webp',
  'цуйван': '/images/menu/tsuivan.webp',
  'шаржигнуур тахиа': '/images/menu/sharjignuur-tahia.webp',
  'шарсан мах': '/images/menu/sharsan-mah.webp',
};

// Олон хоолонд давхар тавигдсан зураг нь буруу түр зураг тул харуулахгүй.
export function getDishImage(item, imageUses) {
  const own = MENU_IMAGES[item.name.trim().toLowerCase()];
  if (own) return own;
  return item.image_url && imageUses.get(item.image_url) === 1 ? item.image_url : null;
}
