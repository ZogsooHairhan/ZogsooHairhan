// Зоогийн газрын мэдээлэл. Хоосон ('') эсвэл [] үлдээсэн талбар хуудсан дээр харагдахгүй.
export const restaurantInfo = {
  name: 'ЗОГСОО ХАЙРХАН',
  tagline: 'Зоогийн газар • Тавтай морилно уу',
  description: 'Шөл, бууз, хуушуур, цуйван зэрэг хоолтой зоогийн газар.',
  address: 'Улаангом, Увс',
  phone: '86839090', // Жишээ: '9911 2233'
  hours: '', // Жишээ: 'Даваа–Ням 09:00–21:00'
  services: ['Зааланд идэх', 'Авч явах'],
  paymentNote: 'Тооцоог касс дээр хийнэ.',

  map: {
    link: 'https://maps.app.goo.gl/T7MnSh4r4Amysqc27',
    embedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2565.56!2d92.0702728!3d49.9820667!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5d49d71161e78ac9%3A0x6a1a92fa06cc5f42!2sZogsoo%20Khayrkhan%20Gazar!5e0!3m2!1smn!2smn!4v1700000000000!5m2!1smn!2smn',
  },

  // "Бидний тухай" хэсэг. Хэдэн ч зүйл нэмж болно.
  // Жишээ: { title: 'Манай түүх', text: '20.. оноос үйл ажиллагаагаа явуулж байна...' }
  sections: [],

  // Зургийн цомог. Зургаа public/images хавтсанд хийгээд нэмнэ.
  // Жишээ: { src: '/images/zaal.jpg', alt: 'Манай заал' }
  gallery: [],

  // Footer дахь холбоосууд.
  // Жишээ: { label: 'Facebook', url: 'https://facebook.com/...' }
  links: [],
};
