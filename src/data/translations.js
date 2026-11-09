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
    news: 'Шинэ',
    contact: 'Холбоо барих',
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
    news: "What's New",
    contact: 'Contact',
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
  // Тува орчуулгыг тува хэлтэй хүнээр шалгуулна уу (тува толь, Википедиагаар хэсэгчлэн шалгасан).
  tyv: {
    openMenu: 'Менюну ажыдар',
    closeMenu: 'Менюну хаар',
    navigation: 'Кол меню',
    menu: 'Аъш-чем менюзу',
    location: 'Турар чер',
    language: 'Дыл шилиири',
    about: 'Бистиң дугайында',
    news: 'Чаа медээлер',
    contact: 'Харылзаа',
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
  '5 цул шөл': { en: '5 Tsul Soup', tyv: '5 цул мүн' },
  'банштай хар шөл': { en: 'Meat Broth with Bansh Dumplings', tyv: 'Банштыг кара мүн' },
  'банштай цай': { en: 'Milk Tea with Bansh Dumplings', tyv: 'Банштыг шай' },
  'битүү шөл': { en: 'Bituu Soup', tyv: 'Битүү мүн' },
  'гурилтай шөл': { en: 'Noodle Soup', tyv: 'Далган үскен' },
  'ногоотой шөл': { en: 'Vegetable Soup', tyv: 'Ногаалыг мүн' },
  'тактуритан': { en: 'Dakdoritang (Spicy Chicken Stew)' },
  'хавиргатай шөл': { en: 'Rib Soup', tyv: 'Кавыргалыг мүн' },
  'хар шөл': { en: 'Meat Broth', tyv: 'Кара мүн' },
  'хөц будаатай шөл': { en: 'Barley Soup', tyv: 'Арбайлыг мүн' },
  'хууйцай': { en: 'Braised Meat and Vegetables' },
  'чанадаг гоймон': { en: 'Boiled Noodles', tyv: 'Хайындырар лапша' },

  // 2-р хоол
  'будаатай хуурга': { en: 'Stir-Fried Meat with Rice', tyv: 'Ристиг хуурга' },
  'гуляш': { en: 'Goulash' },
  'жигнэсэн ногоотой мах': { en: 'Steamed Meat with Vegetables', tyv: 'Буска хайындырган ногаалыг эът' },
  'калбижим': { en: 'Galbijjim (Braised Short Ribs)' },
  'мантуутай гахайн мах': { en: 'Pork with Steamed Buns', tyv: 'Мантуулуг хаван эъди' },
  'өндөгтэй бифштекс': { en: 'Beefsteak with Egg', tyv: 'Чуургалыг бифштекс' },
  'өндөгтэй хуурга': { en: 'Stir-Fried Meat with Egg', tyv: 'Чуургалыг хуурга' },
  'өндөгтэй цуйван': { en: 'Tsuivan with Egg', tyv: 'Чуургалыг цуйван' },
  'пүнтүүзтэй хуурга': { en: 'Glass Noodle Stir-Fry', tyv: 'Фунчозалыг хуурга' },
  'соустай тахианы мөч': { en: 'Chicken Leg in Sauce', tyv: 'Соустуг дагаа буду' },
  'тахиан махан ороомог': { en: 'Chicken Roll', tyv: 'Дагаа эъди рулет' },
  'төмсны хучмал': { en: 'Potato Casserole', tyv: 'Картофель запеканказы' },
  'хавиргатай цуйван': { en: 'Tsuivan with Ribs', tyv: 'Кавыргалыг цуйван' },
  'цуйван': { en: 'Tsuivan (Stir-Fried Noodles)' },
  'шаржигнуур тахиа': { en: 'Crispy Chicken', tyv: 'Быжырган дагаа' },
  'шарсан мах': { en: 'Fried Meat', tyv: 'Быжырган эът' },

  // Багц хоол
  '3-4 хүний багц': { en: 'Set for 3–4 People', tyv: '3–4 кижиге набор' },
  '5-6 хүний багц': { en: 'Set for 5–6 People', tyv: '5–6 кижиге набор' },
  '7-8 хүний багц': { en: 'Set for 7–8 People', tyv: '7–8 кижиге набор' },
  '9-10 хүний багц': { en: 'Set for 9–10 People', tyv: '9–10 кижиге набор' },
  'монгол багц': { en: 'Mongolian Set', tyv: 'Моол набор' },

  // Бусад
  'ногоон пакет': { en: 'Green Bag', tyv: 'Ногаан пакет' },
  'цагаан пакет': { en: 'White Bag', tyv: 'Ак пакет' },

  // Салат
  'байцааны салат': { en: 'Cabbage Salad', tyv: 'Капуста салады' },
  'луувангийн салат': { en: 'Carrot Salad', tyv: 'Морковь салады' },
  'өндөгний салат': { en: 'Egg Salad', tyv: 'Чуурга салады' },
  'төмсний салат': { en: 'Potato Salad', tyv: 'Картофель салады' },
  'цоо байцааны салат': { en: 'Fresh Cabbage Salad', tyv: 'Чаа капуста салады' },

  // Сэт хоол
  'бифштекс сэт': { en: 'Beefsteak Set', tyv: 'Бифштекс сет' },
  'буузны сэт': { en: 'Buuz Set', tyv: 'Бууза сет' },
  'гуляш сэт': { en: 'Goulash Set', tyv: 'Гуляш сет' },
  'төмсны хучмалын сэт': { en: 'Potato Casserole Set', tyv: 'Запеканка сет' },
  'хуушуурны сэт': { en: 'Khuushuur Set', tyv: 'Хуужуур сет' },
  'цуйван сэт': { en: 'Tsuivan Set', tyv: 'Цуйван сет' },

  // Уух зүйл
  '1.25l ундаа': { en: 'Soft Drink 1.25 L', tyv: 'Лимонад 1,25 л' },
  '1л цай': { en: 'Tea 1 L', tyv: 'Шай 1 л' },
  '2l ундаа': { en: 'Soft Drink 2 L', tyv: 'Лимонад 2 л' },
  '500ml ундаа': { en: 'Soft Drink 500 ml', tyv: 'Лимонад 500 мл' },
  'bonaqua 1.5l ус': { en: 'Bonaqua Water 1.5 L', tyv: 'Bonaqua суг 1,5 л' },
  'fuze tea жижиг': { en: 'Fuze Tea Small', tyv: 'Fuze Tea биче' },
  'fuze tea том': { en: 'Fuze Tea Large', tyv: 'Fuze Tea улуг' },
  'айраг dembee': { en: 'Dembee Airag (Fermented Mare’s Milk)', tyv: 'Хымыс Dembee' },
  'аягатай үзэмний шүүс': { en: 'Grape Juice (Cup)', tyv: 'Виноград согу (аяк)' },
  'кофе': { en: 'Coffee', tyv: 'Кофе' },
  'мөстэй кола': { en: 'Cola with Ice', tyv: 'Доштуг кола' },
  'сүүтэй цай': { en: 'Milk Tea', tyv: 'Сүттүг шай' },
  'ус': { en: 'Water', tyv: 'Суг' },
  'уух зүйл авахгүй': { en: 'No Drink', tyv: 'Суксун чок' },
  'үзэмний шүүс': { en: 'Grape Juice', tyv: 'Виноград согу' },

  // Хос хоол
  'төмс бууз хос': { en: 'Potato and Buuz Combo', tyv: 'Картофель болгаш бууза' },
  'цуйван гулш хос': { en: 'Tsuivan and Goulash Combo', tyv: 'Цуйван болгаш гуляш' },
  'шарсан мах тахианы хос': { en: 'Fried Meat and Chicken Combo', tyv: 'Быжырган эът болгаш дагаа' },

  // Ширхэгийн хоол
  '5 цул бууз': { en: '5 Tsul Buuz', tyv: '5 цул бууза' },
  '5 цул хуушуур': { en: '5 Tsul Khuushuur', tyv: '5 цул хуужуур' },
  'аягатай тахиа': { en: 'Chicken in a Cup', tyv: 'Аяк дагаа' },
  'будаа': { en: 'Rice', tyv: 'Рис' },
  'бууз': { en: 'Buuz (Steamed Dumpling)', tyv: 'Бууза' },
  'дугуй хуушуур': { en: 'Round Khuushuur', tyv: 'Төгерик хуужуур' },
  'кимбаб': { en: 'Gimbap' },
  'мантуу': { en: 'Steamed Bun' },
  'мантуун бууз': { en: 'Steamed Meat Bun', tyv: 'Мантуу бууза' },
  'ороомог': { en: 'Meat Roll', tyv: 'Эът рулет' },
  'пирошки': { en: 'Piroshki', tyv: 'Пирожок' },
  'соустай будаа': { en: 'Rice with Sauce', tyv: 'Соустуг рис' },
  'талх': { en: 'Bread', tyv: 'Хлеб' },
  'тахиа мөч': { en: 'Chicken Leg', tyv: 'Дагаа буду' },
  'хавчуурга': { en: 'Sandwich', tyv: 'Бутерброд' },
  'хуушуур': { en: 'Khuushuur (Fried Meat Pastry)', tyv: 'Хуужуур' },
  'чанасан өндөг': { en: 'Boiled Egg', tyv: 'Хайындырган чуурга' },
  'шарсан өндөг': { en: 'Fried Egg', tyv: 'Быжырган чуурга' },
};

export function translateMenuText(text, language) {
  return menuTranslations[text.trim().toLowerCase()]?.[language] || text;
}

// Текст нь энгийн string эсвэл { mn, en, tyv } байж болно. Орчуулга байхгүй бол монголоор нь харуулна.
export function localize(value, language) {
  if (typeof value === 'string') return value;
  return value[language] || value[DEFAULT_LANGUAGE] || '';
}
