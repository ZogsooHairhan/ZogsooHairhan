// Хоолны гол орц. Цэсэнд хоолны нэрний хажууд хаалтанд харагдана.
// Жорын дагуу шалгаж засна уу. Энд байхгүй хоолонд орц харагдахгүй.

// Орц бүрийн нэр гурван хэлээр. Тува нэрсийг тува хэлтэй хүнээр шалгуулна уу.
const INGREDIENTS = {
  meat: { mn: 'хонь, үхрийн мах', en: 'mutton, beef', tyv: 'хой, инек эъди' },
  ribs: { mn: 'хавирга', en: 'ribs', tyv: 'кавырга' },
  pork: { mn: 'гахайн мах', en: 'pork', tyv: 'хаван эъди' },
  chicken: { mn: 'тахианы мах', en: 'chicken', tyv: 'дагаа эъди' },
  potato: { mn: 'төмс', en: 'potato', tyv: 'картошка' },
  carrot: { mn: 'лууван', en: 'carrot', tyv: 'морковь' },
  onion: { mn: 'сонгино', en: 'onion', tyv: 'согаан' },
  cabbage: { mn: 'байцаа', en: 'cabbage', tyv: 'капуста' },
  pepper: { mn: 'чинжүү', en: 'pepper', tyv: 'перец' },
  cucumber: { mn: 'өргөст хэмх', en: 'cucumber', tyv: 'огурец' },
  dough: { mn: 'гурил', en: 'dough', tyv: 'далган' },
  noodles: { mn: 'гоймон', en: 'noodles', tyv: 'тутпаш' },
  glassNoodles: { mn: 'пүнтүүз', en: 'glass noodles', tyv: 'фунчоза' },
  rice: { mn: 'будаа', en: 'rice', tyv: 'рис' },
  barley: { mn: 'хөц будаа', en: 'barley', tyv: 'арбай' },
  egg: { mn: 'өндөг', en: 'egg', tyv: 'чуурга' },
  bansh: { mn: 'банш', en: 'bansh dumplings', tyv: 'банш' },
  buns: { mn: 'мантуу', en: 'steamed buns', tyv: 'мантуу' },
  bread: { mn: 'талх', en: 'bread', tyv: 'хлеб' },
  milkTea: { mn: 'сүүтэй цай', en: 'milk tea', tyv: 'сүттүг шай' },
  sauce: { mn: 'соус', en: 'sauce', tyv: 'соус' },
  mayonnaise: { mn: 'майонез', en: 'mayonnaise', tyv: 'майонез' },
};

// Түлхүүр нь Supabase дахь монгол нэрийн жижиг үсгээрх хэлбэр.
const DISH_INGREDIENTS = {
  // 1-р хоол
  'банштай хар шөл': ['bansh', 'meat', 'onion'],
  'банштай цай': ['bansh', 'milkTea'],
  'битүү шөл': ['meat', 'potato', 'carrot', 'dough'],
  'гурилтай шөл': ['meat', 'dough', 'potato', 'carrot', 'onion'],
  'ногоотой шөл': ['meat', 'potato', 'carrot', 'cabbage', 'onion'],
  'тактуритан': ['chicken', 'potato', 'carrot', 'onion', 'pepper'],
  'хавиргатай шөл': ['ribs', 'potato', 'carrot', 'onion'],
  'хар шөл': ['meat', 'onion'],
  'хөц будаатай шөл': ['meat', 'barley', 'potato', 'carrot'],
  'хууйцай': ['meat', 'potato', 'cabbage', 'glassNoodles', 'carrot'],
  'чанадаг гоймон': ['noodles'],

  // 2-р хоол
  'будаатай хуурга': ['meat', 'rice', 'carrot', 'onion'],
  'гуляш': ['meat', 'sauce', 'carrot', 'onion'],
  'жигнэсэн ногоотой мах': ['meat', 'potato', 'carrot', 'cabbage'],
  'калбижим': ['ribs', 'potato', 'carrot', 'sauce'],
  'мантуутай гахайн мах': ['pork', 'buns', 'sauce'],
  'өндөгтэй бифштекс': ['meat', 'egg', 'onion'],
  'өндөгтэй хуурга': ['meat', 'egg', 'rice', 'onion'],
  'өндөгтэй цуйван': ['meat', 'noodles', 'egg', 'carrot', 'cabbage'],
  'пүнтүүзтэй хуурга': ['meat', 'glassNoodles', 'carrot', 'cabbage'],
  'соустай тахианы мөч': ['chicken', 'sauce'],
  'тахиан махан ороомог': ['chicken'],
  'төмсны хучмал': ['meat', 'potato', 'onion'],
  'хавиргатай цуйван': ['ribs', 'noodles', 'carrot', 'cabbage'],
  'цуйван': ['meat', 'noodles', 'carrot', 'cabbage', 'onion'],
  'шаржигнуур тахиа': ['chicken'],
  'шарсан мах': ['meat', 'onion', 'pepper'],

  // Салат
  'байцааны салат': ['cabbage', 'carrot'],
  'луувангийн салат': ['carrot'],
  'өндөгний салат': ['egg', 'potato', 'mayonnaise'],
  'төмсний салат': ['potato', 'carrot', 'mayonnaise'],
  'цоо байцааны салат': ['cabbage'],

  // Сэт хоол
  'бифштекс сэт': ['meat', 'egg'],
  'буузны сэт': ['meat', 'dough'],
  'гуляш сэт': ['meat', 'sauce'],
  'төмсны хучмалын сэт': ['meat', 'potato'],
  'хуушуурны сэт': ['meat', 'dough'],
  'цуйван сэт': ['meat', 'noodles'],

  // Хос хоол
  'төмс бууз хос': ['meat', 'potato', 'dough'],
  'цуйван гулш хос': ['meat', 'noodles', 'sauce'],
  'шарсан мах тахианы хос': ['meat', 'chicken'],

  // Ширхэгийн хоол
  '5 цул бууз': ['meat', 'dough'],
  '5 цул хуушуур': ['meat', 'dough'],
  'аягатай тахиа': ['chicken'],
  'бууз': ['meat', 'dough', 'onion'],
  'дугуй хуушуур': ['meat', 'dough', 'onion'],
  'кимбаб': ['rice', 'egg', 'carrot', 'cucumber'],
  'мантуу': ['dough'],
  'мантуун бууз': ['meat', 'dough'],
  'ороомог': ['meat', 'dough'],
  'пирошки': ['meat', 'dough'],
  'соустай будаа': ['rice', 'sauce'],
  'тахиа мөч': ['chicken'],
  'хавчуурга': ['bread', 'meat'],
  'хуушуур': ['meat', 'dough', 'onion'],
};

export function getIngredients(dishName, language) {
  const keys = DISH_INGREDIENTS[dishName.trim().toLowerCase()];
  if (!keys) return '';
  return keys.map(key => INGREDIENTS[key][language] || INGREDIENTS[key].mn).join(', ');
}
