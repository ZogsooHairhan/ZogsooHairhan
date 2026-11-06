// Зоогийн газрын мэдээлэл. Хоосон ('') эсвэл [] үлдээсэн талбар хуудсан дээр харагдахгүй.
// Текстийг { mn, en, ru } гэж гурван хэлээр, эсвэл энгийн '...' гэж бичиж болно.
// Энгийн текст бичвэл бүх хэл дээр адилхан харагдана.
export const restaurantInfo = {
  name: { mn: 'ЗОГСОО ХАЙРХАН', en: 'ZOGSOO HAIRHAN', ru: 'ЗОГСОО ХАЙРХАН' },
  tagline: {
    mn: 'Зоогийн газар • Тавтай морилно уу',
    en: 'Restaurant • Welcome',
    ru: 'Ресторан • Добро пожаловать',
  },
  description: {
    mn: 'Шөл, бууз, хуушуур, цуйван зэрэг хоолтой зоогийн газар.',
    en: 'A restaurant serving soups, buuz, khuushuur, tsuivan and more.',
    ru: 'Ресторан, где подают супы, буузы, хушуур, цуйван и другие блюда.',
  },
  address: { mn: 'Улаангом, Увс', en: 'Ulaangom, Uvs', ru: 'Улаангом, Увс' },
  phone: '86839090', // Жишээ: '9911 2233'
  hours: '', // Жишээ: { mn: 'Даваа–Ням 09:00–21:00', en: 'Mon–Sun 09:00–21:00', ru: 'Пн–Вс 09:00–21:00' }
  services: [
    { mn: 'Зааланд идэх', en: 'Dine in', ru: 'В зале' },
    { mn: 'Авч явах', en: 'Takeaway', ru: 'С собой' },
  ],
  paymentNote: {
    mn: 'Тооцоог касс дээр хийнэ.',
    en: 'Please pay at the cashier.',
    ru: 'Оплата на кассе.',
  },

  map: {
    link: 'https://maps.app.goo.gl/T7MnSh4r4Amysqc27',
    embedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2565.56!2d92.0702728!3d49.9820667!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5d49d71161e78ac9%3A0x6a1a92fa06cc5f42!2sZogsoo%20Khayrkhan%20Gazar!5e0!3m2!1smn!2smn!4v1700000000000!5m2!1smn!2smn',
  },

  // "Бидний тухай" хэсэг. Хэдэн ч зүйл нэмж болно.
  // Жишээ: { title: { mn: 'Манай түүх', en: 'Our Story', ru: 'Наша история' }, text: { mn: '...', en: '...', ru: '...' } }
  sections: [],

  // Зургийн цомог. Зургаа public/images хавтсанд хийгээд нэмнэ.
  // Жишээ: { src: '/images/zaal.jpg', alt: 'Манай заал' }
  gallery: [],

  // Footer дахь холбоосууд.
  // Жишээ: { label: 'Facebook', url: 'https://facebook.com/...' }
  links: [],
};
