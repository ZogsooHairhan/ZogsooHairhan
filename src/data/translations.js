export const LANGUAGES = [
  { code: 'mn', label: 'МН', name: 'Монгол' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'tyv', label: 'ТЫВ', name: 'Тыва' },
];

export const DEFAULT_LANGUAGE = 'mn';

export const uiText = {
  mn: {
    openMenu: 'Цэс нээх',
    closeMenu: 'Цэс хаах',
    navigation: 'Үндсэн цэс',
    menu: 'Хоолны цэс',
    location: 'Байршил',
    language: 'Хэл сонгох',
    about: 'Бидний тухай',
    gallery: 'Зургийн цомог',
    directions: 'Google Maps-аас чиглэл авах →',
    mapTitle: 'Газрын зураг',
    search: 'Хоол хайх',
    soldOut: 'Дууссан',
    noResults: 'Хоол олдсонгүй.',
    loading: 'Цэс ачаалж байна...',
    loadFailed: 'Цэс татахад алдаа гарлаа. Хуудсаа дахин ачаална уу.',
    emptyMenu: 'Цэс хоосон байна.',
  },
  en: {
    openMenu: 'Open navigation',
    closeMenu: 'Close navigation',
    navigation: 'Main navigation',
    menu: 'Food Menu',
    location: 'Location',
    language: 'Choose language',
    about: 'About Us',
    gallery: 'Gallery',
    directions: 'Get directions on Google Maps →',
    mapTitle: 'Map',
    search: 'Search food',
    soldOut: 'Sold out',
    noResults: 'No food found.',
    loading: 'Loading menu...',
    loadFailed: 'Could not load the menu. Please reload the page.',
    emptyMenu: 'The menu is empty.',
  },
  // Тува орчуулгыг тува хэлтэй хүнээр шалгуулна уу.
  tyv: {
    openMenu: 'Менюну ажыдар',
    closeMenu: 'Менюну хаар',
    navigation: 'Кол меню',
    menu: 'Аъш-чем менюзу',
    location: 'Турар чер',
    language: 'Дыл шилиири',
    about: 'Бистиң дугайывыста',
    gallery: 'Чуруктар',
    directions: 'Google Maps-ка орукту көөр →',
    mapTitle: 'Карта',
    search: 'Аъш-чем дилээр',
    soldOut: 'Төнген',
    noResults: 'Аъш-чем тывылбады.',
    loading: 'Меню киирип турар...',
    loadFailed: 'Менюну киирип шыдаваан. Арынны катап ажыдыңар.',
    emptyMenu: 'Меню куруг.',
  },
};

// Хоолны нэр, ангиллын орчуулга. Түлхүүр нь Supabase дахь монгол нэрийн жижиг үсгээрх хэлбэр.
// Энд байхгүй хоол, эсвэл орчуулгагүй хэл дээр монгол нэрээрээ харагдана.
const menuTranslations = {
  // Ангилал
  '1-р хоол': { en: 'First Courses', tyv: 'Бирги аъш-чем' },
  '2-р хоол': { en: 'Main Courses', tyv: 'Ийиги аъш-чем' },
  'багц хоол': { en: 'Group Sets', tyv: 'Наборлар' },
  'бусад': { en: 'Other', tyv: 'Өскелери' },
  'салат': { en: 'Salads', tyv: 'Салаттар' },
  'сэт хоол': { en: 'Set Meals', tyv: 'Сеттер' },
  'уух зүйл': { en: 'Drinks', tyv: 'Суксуннар' },
  'хос хоол': { en: 'Combo Plates', tyv: 'Комбо аъш-чем' },
  'ширхэгийн хоол': { en: 'By the Piece', tyv: 'Тус-тус аъш-чем' },

  // 1-р хоол
  '5 цул шөл': { en: '5 Tsul Soup' },
  'банштай хар шөл': { en: 'Meat Broth with Bansh Dumplings' },
  'банштай цай': { en: 'Milk Tea with Bansh Dumplings' },
  'битүү шөл': { en: 'Bituu Soup' },
  'гурилтай шөл': { en: 'Noodle Soup' },
  'ногоотой шөл': { en: 'Vegetable Soup' },
  'тактуритан': { en: 'Dakdoritang (Spicy Chicken Stew)' },
  'хавиргатай шөл': { en: 'Rib Soup' },
  'хар шөл': { en: 'Meat Broth' },
  'хөц будаатай шөл': { en: 'Barley Soup' },
  'хууйцай': { en: 'Braised Meat and Vegetables' },
  'чанадаг гоймон': { en: 'Boiled Noodles' },

  // 2-р хоол
  'будаатай хуурга': { en: 'Stir-Fried Meat with Rice' },
  'гуляш': { en: 'Goulash' },
  'жигнэсэн ногоотой мах': { en: 'Steamed Meat with Vegetables' },
  'калбижим': { en: 'Galbijjim (Braised Short Ribs)' },
  'мантуутай гахайн мах': { en: 'Pork with Steamed Buns' },
  'өндөгтэй бифштекс': { en: 'Beefsteak with Egg' },
  'өндөгтэй хуурга': { en: 'Stir-Fried Meat with Egg' },
  'өндөгтэй цуйван': { en: 'Tsuivan with Egg' },
  'пүнтүүзтэй хуурга': { en: 'Glass Noodle Stir-Fry' },
  'соустай тахианы мөч': { en: 'Chicken Leg in Sauce' },
  'тахиан махан ороомог': { en: 'Chicken Roll' },
  'төмсны хучмал': { en: 'Potato Casserole' },
  'хавиргатай цуйван': { en: 'Tsuivan with Ribs' },
  'цуйван': { en: 'Tsuivan (Stir-Fried Noodles)' },
  'шаржигнуур тахиа': { en: 'Crispy Chicken' },
  'шарсан мах': { en: 'Fried Meat' },

  // Багц хоол
  '3-4 хүний багц': { en: 'Set for 3–4 People' },
  '5-6 хүний багц': { en: 'Set for 5–6 People' },
  '7-8 хүний багц': { en: 'Set for 7–8 People' },
  '9-10 хүний багц': { en: 'Set for 9–10 People' },
  'монгол багц': { en: 'Mongolian Set' },

  // Бусад
  'ногоон пакет': { en: 'Green Bag' },
  'цагаан пакет': { en: 'White Bag' },

  // Салат
  'байцааны салат': { en: 'Cabbage Salad' },
  'луувангийн салат': { en: 'Carrot Salad' },
  'өндөгний салат': { en: 'Egg Salad' },
  'төмсний салат': { en: 'Potato Salad' },
  'цоо байцааны салат': { en: 'Fresh Cabbage Salad' },

  // Сэт хоол
  'бифштекс сэт': { en: 'Beefsteak Set' },
  'буузны сэт': { en: 'Buuz Set' },
  'гуляш сэт': { en: 'Goulash Set' },
  'төмсны хучмалын сэт': { en: 'Potato Casserole Set' },
  'хуушуурны сэт': { en: 'Khuushuur Set' },
  'цуйван сэт': { en: 'Tsuivan Set' },

  // Уух зүйл
  '1.25l ундаа': { en: 'Soft Drink 1.25 L' },
  '1л цай': { en: 'Tea 1 L', tyv: 'Шай 1 л' },
  '2l ундаа': { en: 'Soft Drink 2 L' },
  '500ml ундаа': { en: 'Soft Drink 500 ml' },
  'bonaqua 1.5l ус': { en: 'Bonaqua Water 1.5 L', tyv: 'Bonaqua суг 1,5 л' },
  'fuze tea жижиг': { en: 'Fuze Tea Small' },
  'fuze tea том': { en: 'Fuze Tea Large' },
  'айраг dembee': { en: 'Dembee Airag (Fermented Mare’s Milk)' },
  'аягатай үзэмний шүүс': { en: 'Grape Juice (Cup)' },
  'кофе': { en: 'Coffee', tyv: 'Кофе' },
  'мөстэй кола': { en: 'Cola with Ice' },
  'сүүтэй цай': { en: 'Milk Tea', tyv: 'Сүттүг шай' },
  'ус': { en: 'Water', tyv: 'Суг' },
  'уух зүйл авахгүй': { en: 'No Drink' },
  'үзэмний шүүс': { en: 'Grape Juice' },

  // Хос хоол
  'төмс бууз хос': { en: 'Potato and Buuz Combo' },
  'цуйван гулш хос': { en: 'Tsuivan and Goulash Combo' },
  'шарсан мах тахианы хос': { en: 'Fried Meat and Chicken Combo' },

  // Ширхэгийн хоол
  '5 цул бууз': { en: '5 Tsul Buuz' },
  '5 цул хуушуур': { en: '5 Tsul Khuushuur' },
  'аягатай тахиа': { en: 'Chicken in a Cup' },
  'будаа': { en: 'Rice' },
  'бууз': { en: 'Buuz (Steamed Dumpling)', tyv: 'Бууза' },
  'дугуй хуушуур': { en: 'Round Khuushuur' },
  'кимбаб': { en: 'Gimbap' },
  'мантуу': { en: 'Steamed Bun' },
  'мантуун бууз': { en: 'Steamed Meat Bun' },
  'ороомог': { en: 'Meat Roll' },
  'пирошки': { en: 'Piroshki' },
  'соустай будаа': { en: 'Rice with Sauce' },
  'талх': { en: 'Bread', tyv: 'Хлеб' },
  'тахиа мөч': { en: 'Chicken Leg' },
  'хавчуурга': { en: 'Sandwich' },
  'хуушуур': { en: 'Khuushuur (Fried Meat Pastry)' },
  'чанасан өндөг': { en: 'Boiled Egg' },
  'шарсан өндөг': { en: 'Fried Egg' },
};

export function translateMenuText(text, language) {
  return menuTranslations[text.trim().toLowerCase()]?.[language] || text;
}

// Текст нь энгийн string эсвэл { mn, en, tyv } байж болно. Орчуулга байхгүй бол монголоор нь харуулна.
export function localize(value, language) {
  if (typeof value === 'string') return value;
  return value[language] || value[DEFAULT_LANGUAGE] || '';
}
