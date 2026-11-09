// Зоогийн газрын мэдээлэл. Хоосон ('') эсвэл [] үлдээсэн талбар хуудсан дээр харагдахгүй.
// Текстийг { mn, en, tyv } гэж гурван хэлээр, эсвэл энгийн '...' гэж бичиж болно.
// Энгийн текст бичвэл бүх хэл дээр адилхан харагдана.
export const restaurantInfo = {
  name: { mn: 'ЗОГСОО ХАЙРХАН', en: 'ZOGSOO HAIRHAN', tyv: 'ЗОГСОО ХАЙРХАН' },
  tagline: {
    mn: 'Зоогийн газар • Тавтай морилно уу',
    en: 'Restaurant • Welcome',
    tyv: 'Ресторан • Кирип моорлаңар',
  },
  description: {
    mn: 'Шөл, бууз, хуушуур, цуйван зэрэг хоолтой зоогийн газар.',
    en: 'A restaurant serving soups, buuz, khuushuur, tsuivan and more.',
    tyv: 'Мүн, бууза, хуужуур, цуйван болгаш өске-даа аъш-чем белеткээр ресторан.',
  },
  phone: '86839090', // Жишээ: '9911 2233'

  // "Бидний тухай" хэсгийн бичвэр. Мөр нэмэх тусам хуудсан дээр нэмэгдэнэ.
  about: [
    {
      mn: '2015 оноос хойш үйл ажиллагаа явуулж байна.',
      en: 'Serving our guests since 2015.',
      tyv: '2015 чылдан бээр ажылдап турар бис.',
    },
  ],

  // "Бидний тухай" доор гарчигтай нэмэлт хэсгүүд.
  // Жишээ: { title: { mn: 'Хүргэлт', en: 'Delivery', tyv: '...' }, text: { mn: '...', en: '...', tyv: '...' } }
  sections: [],

  map: {
    link: 'https://maps.app.goo.gl/T7MnSh4r4Amysqc27',
    embedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2565.56!2d92.0702728!3d49.9820667!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5d49d71161e78ac9%3A0x6a1a92fa06cc5f42!2sZogsoo%20Khayrkhan%20Gazar!5e0!3m2!1smn!2smn!4v1700000000000!5m2!1smn!2smn',
  },

  // Зургийн цомог. Зургаа public/images хавтсанд хийгээд нэмнэ.
  // Жишээ: { src: '/images/zaal.jpg', alt: 'Манай заал' }
  gallery: [],

  // Хуудасны доод хэсэгт гарах холбоосууд.
  links: [
    { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61558305202341' },
  ],
};
