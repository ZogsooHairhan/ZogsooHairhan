export const LANGUAGES = [
  { code: 'mn', label: 'МН', name: 'Монгол' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ru', label: 'РУ', name: 'Русский' },
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
    keyInfo: 'Үндсэн мэдээлэл',
    address: 'Хаяг',
    hours: 'Цагийн хуваарь',
    services: 'Үйлчилгээ',
    payment: 'Төлбөр',
    phone: 'Утас',
    about: 'Бидний тухай',
    ourMenu: 'Манай цэсэнд',
    gallery: 'Зургийн цомог',
    directions: 'Google Maps-аас чиглэл авах →',
    mapTitle: 'Газрын зураг',
    search: 'Хоол хайх',
    soldOut: 'Дууссан',
    noResults: 'Хоол олдсонгүй.',
    loading: 'Цэс ачаалж байна...',
    loadFailed: 'Цэс татахад алдаа гарлаа. Хуудсаа дахин ачаална уу.',
    emptyMenu: 'Цэс хоосон байна.',
    itemCount: (count) => `${count} төрөл`,
  },
  en: {
    openMenu: 'Open navigation',
    closeMenu: 'Close navigation',
    navigation: 'Main navigation',
    menu: 'Food Menu',
    location: 'Location',
    language: 'Choose language',
    keyInfo: 'Key information',
    address: 'Address',
    hours: 'Opening hours',
    services: 'Services',
    payment: 'Payment',
    phone: 'Phone',
    about: 'About Us',
    ourMenu: 'On Our Menu',
    gallery: 'Gallery',
    directions: 'Get directions on Google Maps →',
    mapTitle: 'Map',
    search: 'Search food',
    soldOut: 'Sold out',
    noResults: 'No food found.',
    loading: 'Loading menu...',
    loadFailed: 'Could not load the menu. Please reload the page.',
    emptyMenu: 'The menu is empty.',
    itemCount: (count) => `${count} ${count === 1 ? 'item' : 'items'}`,
  },
  ru: {
    openMenu: 'Открыть навигацию',
    closeMenu: 'Закрыть навигацию',
    navigation: 'Основная навигация',
    menu: 'Меню',
    location: 'Как нас найти',
    language: 'Выбрать язык',
    keyInfo: 'Основная информация',
    address: 'Адрес',
    hours: 'Часы работы',
    services: 'Услуги',
    payment: 'Оплата',
    phone: 'Телефон',
    about: 'О нас',
    ourMenu: 'В нашем меню',
    gallery: 'Галерея',
    directions: 'Проложить маршрут в Google Maps →',
    mapTitle: 'Карта',
    search: 'Поиск блюд',
    soldOut: 'Нет в наличии',
    noResults: 'Блюда не найдены.',
    loading: 'Загрузка меню...',
    loadFailed: 'Не удалось загрузить меню. Обновите страницу.',
    emptyMenu: 'Меню пока пустое.',
    itemCount: (count) => `Позиций: ${count}`,
  },
};

// Хоолны нэр, ангиллын орчуулга. Түлхүүр нь Supabase дахь монгол нэрийн жижиг үсгээрх хэлбэр.
// Энд байхгүй шинэ хоол монгол нэрээрээ харагдана.
const menuTranslations = {
  // Ангилал
  '1-р хоол': { en: 'First Courses', ru: 'Первые блюда' },
  '2-р хоол': { en: 'Main Courses', ru: 'Вторые блюда' },
  'багц хоол': { en: 'Group Sets', ru: 'Наборы' },
  'бусад': { en: 'Other', ru: 'Прочее' },
  'салат': { en: 'Salads', ru: 'Салаты' },
  'сэт хоол': { en: 'Set Meals', ru: 'Сеты' },
  'уух зүйл': { en: 'Drinks', ru: 'Напитки' },
  'хос хоол': { en: 'Combo Plates', ru: 'Комбо-блюда' },
  'ширхэгийн хоол': { en: 'By the Piece', ru: 'Штучные блюда' },

  // 1-р хоол
  '5 цул шөл': { en: '5 Tsul Soup', ru: 'Суп «5 цул»' },
  'банштай хар шөл': { en: 'Meat Broth with Bansh Dumplings', ru: 'Мясной бульон с баншами' },
  'банштай цай': { en: 'Milk Tea with Bansh Dumplings', ru: 'Чай с баншами' },
  'битүү шөл': { en: 'Bituu Soup', ru: 'Суп «Битүү»' },
  'гурилтай шөл': { en: 'Noodle Soup', ru: 'Суп с домашней лапшой' },
  'ногоотой шөл': { en: 'Vegetable Soup', ru: 'Овощной суп' },
  'тактуритан': { en: 'Dakdoritang (Spicy Chicken Stew)', ru: 'Дакторитан (острое тушёное куриное мясо)' },
  'хавиргатай шөл': { en: 'Rib Soup', ru: 'Суп с рёбрышками' },
  'хар шөл': { en: 'Meat Broth', ru: 'Мясной бульон' },
  'хөц будаатай шөл': { en: 'Barley Soup', ru: 'Суп с перловкой' },
  'хууйцай': { en: 'Braised Meat and Vegetables', ru: 'Тушёное мясо с овощами' },
  'чанадаг гоймон': { en: 'Boiled Noodles', ru: 'Варёная лапша' },

  // 2-р хоол
  'будаатай хуурга': { en: 'Stir-Fried Meat with Rice', ru: 'Жаркое с рисом' },
  'гуляш': { en: 'Goulash', ru: 'Гуляш' },
  'жигнэсэн ногоотой мах': { en: 'Steamed Meat with Vegetables', ru: 'Мясо с овощами на пару' },
  'калбижим': { en: 'Galbijjim (Braised Short Ribs)', ru: 'Кальбиччим (тушёные рёбрышки)' },
  'мантуутай гахайн мах': { en: 'Pork with Steamed Buns', ru: 'Свинина с мантоу' },
  'өндөгтэй бифштекс': { en: 'Beefsteak with Egg', ru: 'Бифштекс с яйцом' },
  'өндөгтэй хуурга': { en: 'Stir-Fried Meat with Egg', ru: 'Жаркое с яйцом' },
  'өндөгтэй цуйван': { en: 'Tsuivan with Egg', ru: 'Цуйван с яйцом' },
  'пүнтүүзтэй хуурга': { en: 'Glass Noodle Stir-Fry', ru: 'Жаркое с фунчозой' },
  'соустай тахианы мөч': { en: 'Chicken Leg in Sauce', ru: 'Куриная ножка в соусе' },
  'тахиан махан ороомог': { en: 'Chicken Roll', ru: 'Куриный рулет' },
  'төмсны хучмал': { en: 'Potato Casserole', ru: 'Картофельная запеканка' },
  'хавиргатай цуйван': { en: 'Tsuivan with Ribs', ru: 'Цуйван с рёбрышками' },
  'цуйван': { en: 'Tsuivan (Stir-Fried Noodles)', ru: 'Цуйван (жареная лапша с мясом)' },
  'шаржигнуур тахиа': { en: 'Crispy Chicken', ru: 'Хрустящая курица' },
  'шарсан мах': { en: 'Fried Meat', ru: 'Жареное мясо' },

  // Багц хоол
  '3-4 хүний багц': { en: 'Set for 3–4 People', ru: 'Набор на 3–4 персоны' },
  '5-6 хүний багц': { en: 'Set for 5–6 People', ru: 'Набор на 5–6 персон' },
  '7-8 хүний багц': { en: 'Set for 7–8 People', ru: 'Набор на 7–8 персон' },
  '9-10 хүний багц': { en: 'Set for 9–10 People', ru: 'Набор на 9–10 персон' },
  'монгол багц': { en: 'Mongolian Set', ru: 'Монгольский набор' },

  // Бусад
  'ногоон пакет': { en: 'Green Bag', ru: 'Зелёный пакет' },
  'цагаан пакет': { en: 'White Bag', ru: 'Белый пакет' },

  // Салат
  'байцааны салат': { en: 'Cabbage Salad', ru: 'Салат из капусты' },
  'луувангийн салат': { en: 'Carrot Salad', ru: 'Морковный салат' },
  'өндөгний салат': { en: 'Egg Salad', ru: 'Яичный салат' },
  'төмсний салат': { en: 'Potato Salad', ru: 'Картофельный салат' },
  'цоо байцааны салат': { en: 'Fresh Cabbage Salad', ru: 'Салат из свежей капусты' },

  // Сэт хоол
  'бифштекс сэт': { en: 'Beefsteak Set', ru: 'Сет с бифштексом' },
  'буузны сэт': { en: 'Buuz Set', ru: 'Сет с буузами' },
  'гуляш сэт': { en: 'Goulash Set', ru: 'Сет с гуляшом' },
  'төмсны хучмалын сэт': { en: 'Potato Casserole Set', ru: 'Сет с картофельной запеканкой' },
  'хуушуурны сэт': { en: 'Khuushuur Set', ru: 'Сет с хушуурами' },
  'цуйван сэт': { en: 'Tsuivan Set', ru: 'Сет с цуйваном' },

  // Уух зүйл
  '1.25l ундаа': { en: 'Soft Drink 1.25 L', ru: 'Газировка 1,25 л' },
  '1л цай': { en: 'Tea 1 L', ru: 'Чай 1 л' },
  '2l ундаа': { en: 'Soft Drink 2 L', ru: 'Газировка 2 л' },
  '500ml ундаа': { en: 'Soft Drink 500 ml', ru: 'Газировка 500 мл' },
  'bonaqua 1.5l ус': { en: 'Bonaqua Water 1.5 L', ru: 'Вода Bonaqua 1,5 л' },
  'fuze tea жижиг': { en: 'Fuze Tea Small', ru: 'Fuze Tea маленький' },
  'fuze tea том': { en: 'Fuze Tea Large', ru: 'Fuze Tea большой' },
  'айраг dembee': { en: 'Dembee Airag (Fermented Mare’s Milk)', ru: 'Айраг Dembee (кумыс)' },
  'аягатай үзэмний шүүс': { en: 'Grape Juice (Cup)', ru: 'Виноградный сок (стакан)' },
  'кофе': { en: 'Coffee', ru: 'Кофе' },
  'мөстэй кола': { en: 'Cola with Ice', ru: 'Кола со льдом' },
  'сүүтэй цай': { en: 'Milk Tea', ru: 'Чай с молоком' },
  'ус': { en: 'Water', ru: 'Вода' },
  'уух зүйл авахгүй': { en: 'No Drink', ru: 'Без напитка' },
  'үзэмний шүүс': { en: 'Grape Juice', ru: 'Виноградный сок' },

  // Хос хоол
  'төмс бууз хос': { en: 'Potato and Buuz Combo', ru: 'Комбо: картофель и буузы' },
  'цуйван гулш хос': { en: 'Tsuivan and Goulash Combo', ru: 'Комбо: цуйван и гуляш' },
  'шарсан мах тахианы хос': { en: 'Fried Meat and Chicken Combo', ru: 'Комбо: жареное мясо и курица' },

  // Ширхэгийн хоол
  '5 цул бууз': { en: '5 Tsul Buuz', ru: 'Буузы «5 цул»' },
  '5 цул хуушуур': { en: '5 Tsul Khuushuur', ru: 'Хушуур «5 цул»' },
  'аягатай тахиа': { en: 'Chicken in a Cup', ru: 'Курица в стаканчике' },
  'будаа': { en: 'Rice', ru: 'Рис' },
  'бууз': { en: 'Buuz (Steamed Dumpling)', ru: 'Бууз (паровая манта)' },
  'дугуй хуушуур': { en: 'Round Khuushuur', ru: 'Круглый хушуур' },
  'кимбаб': { en: 'Gimbap', ru: 'Кимпаб' },
  'мантуу': { en: 'Steamed Bun', ru: 'Мантоу' },
  'мантуун бууз': { en: 'Steamed Meat Bun', ru: 'Паровая булочка с мясом' },
  'ороомог': { en: 'Meat Roll', ru: 'Мясной рулет' },
  'пирошки': { en: 'Piroshki', ru: 'Пирожок' },
  'соустай будаа': { en: 'Rice with Sauce', ru: 'Рис с соусом' },
  'талх': { en: 'Bread', ru: 'Хлеб' },
  'тахиа мөч': { en: 'Chicken Leg', ru: 'Куриная ножка' },
  'хавчуурга': { en: 'Sandwich', ru: 'Сэндвич' },
  'хуушуур': { en: 'Khuushuur (Fried Meat Pastry)', ru: 'Хушуур (жареный пирожок с мясом)' },
  'чанасан өндөг': { en: 'Boiled Egg', ru: 'Варёное яйцо' },
  'шарсан өндөг': { en: 'Fried Egg', ru: 'Яичница' },
};

export function translateMenuText(text, language) {
  return menuTranslations[text.trim().toLowerCase()]?.[language] || text;
}

// Текст нь энгийн string эсвэл { mn, en, ru } байж болно. Орчуулга байхгүй бол монголоор нь харуулна.
export function localize(value, language) {
  if (typeof value === 'string') return value;
  return value[language] || value[DEFAULT_LANGUAGE] || '';
}
