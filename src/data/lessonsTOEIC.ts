import type { GrammarContent, LessonDoc, QuizQuestion } from '../types';
import { buildLesson, type PatternSeedTuple } from './lessonBuilder';
import {
  TOEIC_RAW_TOPICS_PART1,
  type ToeicCategoryId,
  type ToeicRawTopic,
} from './toeicDataPart1';
import { TOEIC_RAW_TOPICS_PART2 } from './toeicDataPart2';
import { TOEIC_RAW_TOPICS_PART3 } from './toeicDataPart3';

export type { ToeicCategoryId };

export interface ToeicCategoryMeta {
  id: ToeicCategoryId;
  rangeLabel: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
}

export interface ToeicTopicMeta {
  id: string;
  num: number;
  code: string;
  categoryId: ToeicCategoryId;
  titleVi: string;
  titleEn: string;
  summaryVi: string;
  examTipVi: string;
  lessonId: string;
  wordCount: number;
}

export interface ToeicWordFamilyItem {
  id: string;
  categoryId: ToeicCategoryId;
  rootMeaningVi: string;
  noun?: string;
  verb?: string;
  adjective?: string;
  adverb?: string;
  examTipVi: string;
  exampleEn: string;
  exampleVi: string;
}

export interface ToeicPart5Question {
  id: string;
  categoryId: ToeicCategoryId;
  categoryVi: string;
  sentence: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanationVi: string;
  completedSentence: string;
}

export const TOEIC_CATEGORIES: ToeicCategoryMeta[] = [
  {
    id: 'business_contracts',
    rangeLabel: '1 – 5',
    titleVi: 'Kinh doanh & Hợp đồng',
    titleEn: 'Business & Contracts',
    descriptionVi: 'Hợp đồng, Tiếp thị, Bảo hành, Kế hoạch kinh doanh và Hội nghị.',
  },
  {
    id: 'office_tech',
    rangeLabel: '6 – 10',
    titleVi: 'Văn phòng & Công nghệ',
    titleEn: 'Office & Technology',
    descriptionVi: 'Máy tính, Công nghệ văn phòng, Thủ tục hành chính, Điện tử và Thư tín.',
  },
  {
    id: 'hr_recruiting',
    rangeLabel: '11 – 14',
    titleVi: 'Nhân sự & Tuyển dụng',
    titleEn: 'HR & Recruiting',
    descriptionVi: 'Mô tả công việc, Ứng tuyển & phỏng vấn, Đào tạo và Lương phúc lợi.',
  },
  {
    id: 'shopping_logistics',
    rangeLabel: '15 – 19',
    titleVi: 'Mua sắm & Chuỗi cung ứng',
    titleEn: 'Shopping & Logistics',
    descriptionVi: 'Mua sắm, Đặt hàng nhà cung cấp, Vận chuyển, Hóa đơn và Hàng tồn kho.',
  },
  {
    id: 'finance_tax',
    rangeLabel: '20 – 24',
    titleVi: 'Tài chính, Ngân hàng & Thuế',
    titleEn: 'Finance, Banking & Taxes',
    descriptionVi: 'Ngân hàng, Kế toán, Đầu tư, Báo cáo tài chính và Thuế.',
  },
  {
    id: 'management_property',
    rangeLabel: '25 – 28',
    titleVi: 'Quản trị, Sản phẩm & Thuê mặt bằng',
    titleEn: 'Management & Property',
    descriptionVi: 'Tài sản & phòng ban, Phát triển sản phẩm, Quản trị chất lượng và Thuê & cho thuê.',
  },
  {
    id: 'dining_travel',
    rangeLabel: '29 – 34',
    titleVi: 'Ẩm thực, Sự kiện & Du lịch',
    titleEn: 'Dining, Events & Travel',
    descriptionVi: 'Đi ăn ngoài, Đặt bữa trưa, Sự kiện, Du lịch, Hàng không và Khách sạn.',
  },
  {
    id: 'culture_health_life',
    rangeLabel: '35 – 44',
    titleVi: 'Giải trí, Y tế & Đời sống xã hội',
    titleEn: 'Culture, Health & Society',
    descriptionVi: 'Phim ảnh, Âm nhạc, Bảo tàng, Truyền thông, Bệnh viện, Hiệu thuốc, Cảm xúc, Nghề nghiệp, Chính trị & Giao thông.',
  },
];

const ALL_RAW_TOPICS: ToeicRawTopic[] = [
  ...TOEIC_RAW_TOPICS_PART1,
  ...TOEIC_RAW_TOPICS_PART2,
  ...TOEIC_RAW_TOPICS_PART3,
];

const CATEGORY_GRAMMAR: Record<ToeicCategoryId, GrammarContent> = {
  business_contracts: {
    title: 'Cụm giới từ cố định & Từ loại trong Hợp đồng (TOEIC Part 5)',
    summaryVi:
      'Nhóm chủ đề Hợp đồng – Tiếp thị – Bảo hành rất hay kiểm tra giới từ đi kèm động từ/tính từ (abide by, subject to, comply with) và cấu trúc cụm danh từ.',
    formula: 'Determiner + [Adverb] + [Adjective] + NOUN  |  abide by / subject to + Noun',
    usageVi: [
      'Sau mạo từ (a/an/the) hoặc tính từ sở hữu (our/their) cần một Danh từ hoặc Cụm danh từ.',
      'Ghi nhớ nhóm đồng nghĩa pháp lý: abide BY = comply WITH = adhere TO (tuân thủ).',
      'Khi rút gọn mệnh đề quan hệ bị động trong điều khoản hợp đồng, dùng V-ed: "the terms specified in Section 4".',
    ],
    examples: [
      {
        en: 'All vendors must abide by the warranty provisions specified in the agreement.',
        vi: 'Mọi nhà cung cấp phải tuân thủ các điều khoản bảo hành quy định trong thỏa thuận.',
        highlight: 'abide by / specified',
      },
      {
        en: 'Our marketing strategy significantly boosted customer satisfaction.',
        vi: 'Chiến lược tiếp thị của chúng tôi đã nâng cao đáng kể sự hài lòng của khách hàng.',
        highlight: 'significantly (adv) + boosted (v)',
      },
    ],
    commonMistakes: [
      {
        wrong: 'Both parties must abide with the signed contract.',
        right: 'Both parties must abide by the signed contract.',
        explanationVi: '"Abide" luôn đi với giới từ "by", còn "comply" đi với "with".',
      },
      {
        wrong: 'All discounts are subject for management approval.',
        right: 'All discounts are subject to management approval.',
        explanationVi: 'Cụm chuẩn TOEIC là "be subject to + Noun" (tùy thuộc vào).',
      },
    ],
    miniPractice: [
      {
        id: 'cat_bc_1',
        prompt: 'Every contractor is obligated to abide _______ site safety regulations.',
        options: ['with', 'by', 'to', 'on'],
        correctIndex: 1,
        explanationVi: 'Cụm động từ cố định: "abide by" = tuân thủ.',
      },
      {
        id: 'cat_bc_2',
        prompt: 'The revised warranty policy will provide greater _______ for buyers.',
        options: ['protect', 'protected', 'protection', 'protective'],
        correctIndex: 2,
        explanationVi: 'Sau tính từ so sánh "greater" cần một danh từ -> "protection".',
      },
    ],
  },
  office_tech: {
    title: 'Đảo ngữ Điều kiện loại 1 (Should + S + V) & Bị động Công sở',
    summaryVi:
      'Trong email, thông báo kỹ thuật và thủ tục văn phòng TOEIC Part 5–6, cấu trúc đảo ngữ "Should + S + V-inf" và câu bị động xuất hiện cực kỳ dày đặc.',
    formula: 'Should + S + V-inf, please + V-inf  |  S + be + V-ed/V3 (bị động)',
    usageVi: [
      '"Should you encounter any technical failure..." = "If you encounter..." (mang sắc thái trang trọng trong email).',
      'Sau "Should + S" luôn dùng động từ nguyên mẫu không chia -s/-es.',
      'Phân biệt: "compatible with" (tương thích với), "access to" (quyền truy cập vào), "in charge of" (phụ trách).',
    ],
    examples: [
      {
        en: 'Should the printer error recur, please contact IT support immediately.',
        vi: 'Nếu lỗi máy in tái diễn, vui lòng liên hệ hỗ trợ CNTT ngay lập tức.',
        highlight: 'Should + S + V-inf',
      },
      {
        en: 'All archived files are automatically backed up to encrypted servers.',
        vi: 'Mọi tệp lưu trữ đều được sao lưu tự động lên máy chủ mã hóa.',
        highlight: 'are automatically backed up',
      },
    ],
    commonMistakes: [
      {
        wrong: 'Should the software fails to load, restart your workstation.',
        right: 'Should the software fail to load, restart your workstation.',
        explanationVi: 'Trong đảo ngữ "Should + S + V-inf", động từ luôn để nguyên mẫu "fail".',
      },
      {
        wrong: 'This scanner is compatible to all office computers.',
        right: 'This scanner is compatible with all office computers.',
        explanationVi: 'Tính từ "compatible" đi với giới từ "with".',
      },
    ],
    miniPractice: [
      {
        id: 'cat_ot_1',
        prompt: '_______ you have trouble opening the attachment, please reply to this memo.',
        options: ['Should', 'Were', 'Had', 'Unless'],
        correctIndex: 0,
        explanationVi: 'Đảo ngữ câu điều kiện loại 1 với nguyên mẫu "have" -> chọn "Should".',
      },
      {
        id: 'cat_ot_2',
        prompt: 'Ensure the new billing application is fully compatible _______ our database.',
        options: ['to', 'for', 'with', 'by'],
        correctIndex: 2,
        explanationVi: 'Cụm cố định: "compatible with".',
      },
    ],
  },
  hr_recruiting: {
    title: 'Đại từ quan hệ (Who / Whose / Those who) trong Tuyển dụng & Nhân sự',
    summaryVi:
      'Tin tuyển dụng và chính sách đãi ngộ TOEIC Part 5–7 thường xuyên kiểm tra đại từ quan hệ chỉ người và các cụm tính từ chỉ điều kiện hưởng phúc lợi.',
    formula: 'Those who + V (số nhiều)  |  Candidates whose + Noun + V  |  be eligible for + Noun',
    usageVi: [
      'Dùng "Those who + V" (Những người mà...) để mở đầu thông báo nhân sự.',
      'Dùng "whose + danh từ" chỉ sở hữu: "applicants whose qualifications match...".',
      'Ghi nhớ cụm giới từ HR: eligible FOR (đủ điều kiện), commensurate WITH (tương xứng với), responsible FOR (chịu trách nhiệm).',
    ],
    examples: [
      {
        en: 'Those who complete the orientation will be eligible for full medical benefits.',
        vi: 'Những người hoàn thành buổi định hướng sẽ đủ điều kiện hưởng đầy đủ bảo hiểm y tế.',
        highlight: 'Those who / eligible for',
      },
      {
        en: 'Starting compensation is commensurate with relevant industry experience.',
        vi: 'Mức đãi ngộ khởi điểm tương xứng với kinh nghiệm liên quan trong ngành.',
        highlight: 'commensurate with',
      },
    ],
    commonMistakes: [
      {
        wrong: 'They who submit resumes early will be interviewed first.',
        right: 'Those who submit resumes early will be interviewed first.',
        explanationVi: 'Trước mệnh đề quan hệ "who...", tiếng Anh dùng "Those", không dùng "They".',
      },
      {
        wrong: 'Full-time staff are eligible to paid parental leave.',
        right: 'Full-time staff are eligible for paid parental leave.',
        explanationVi: 'Đi với danh từ ("paid parental leave") dùng "eligible for"; đi với động từ mới dùng "eligible to + V".',
      },
    ],
    miniPractice: [
      {
        id: 'cat_hr_1',
        prompt: '_______ who possess bilingual skills are encouraged to apply before Friday.',
        options: ['They', 'Them', 'Those', 'Their'],
        correctIndex: 2,
        explanationVi: 'Cấu trúc chuẩn TOEIC: "Those who + V".',
      },
      {
        id: 'cat_hr_2',
        prompt: 'Employees become eligible _______ annual bonuses after sixty days of probation.',
        options: ['for', 'with', 'on', 'at'],
        correctIndex: 0,
        explanationVi: 'Cụm cố định: "be eligible for + Noun".',
      },
    ],
  },
  shopping_logistics: {
    title: 'Danh từ không đếm được & Liên từ Nhượng bộ (Although vs. Despite)',
    summaryVi:
      'Trong chủ đề Mua sắm – Vận chuyển – Hóa đơn – Tồn kho, đề TOEIC hay bẫy danh từ không đếm được (merchandise, inventory, equipment) và cặp liên từ Although / Despite.',
    formula: 'Although / Even though + S + V  |  Despite / In spite of + Noun / V-ing',
    usageVi: [
      '"Merchandise", "luggage", "equipment", "stationery" là danh từ KHÔNG đếm được — không thêm -s và luôn chia động từ số ít.',
      'Sau "Although / Though / Even though" phải là mệnh đề có Chủ ngữ + Động từ.',
      'Sau "Despite / In spite of" là cụm danh từ hoặc V-ing.',
    ],
    examples: [
      {
        en: 'Despite tight holiday schedules, the warehouse fulfilled every order promptly.',
        vi: 'Bất chấp lịch lễ bận rộn, kho hàng vẫn hoàn tất mọi đơn hàng đúng hạn.',
        highlight: 'Despite + Noun phrase',
      },
      {
        en: 'All returned merchandise is inspected before refunds are issued.',
        vi: 'Mọi hàng hóa đổi trả đều được kiểm tra trước khi hoàn tiền.',
        highlight: 'merchandise is (số ít)',
      },
    ],
    commonMistakes: [
      {
        wrong: 'Despite the shipment arrived late, the items were undamaged.',
        right: 'Although the shipment arrived late, the items were undamaged.',
        explanationVi: 'Trước mệnh đề "the shipment arrived late" phải dùng "Although".',
      },
      {
        wrong: 'All damaged merchandises were subtracted from inventory.',
        right: 'All damaged merchandise was subtracted from inventory.',
        explanationVi: '"Merchandise" không đếm được nên không thêm -s và dùng động từ số ít "was".',
      },
    ],
    miniPractice: [
      {
        id: 'cat_sl_1',
        prompt: '_______ a brief warehouse delay, all express parcels arrived on time.',
        options: ['Although', 'Even though', 'Despite', 'Because'],
        correctIndex: 2,
        explanationVi: '"a brief warehouse delay" là cụm danh từ -> chọn giới từ "Despite".',
      },
      {
        id: 'cat_sl_2',
        prompt: 'All discounted _______ must be exchanged within ten days with a receipt.',
        options: ['merchandise', 'merchandises', 'merchant', 'merchants'],
        correctIndex: 0,
        explanationVi: '"Merchandise" là danh từ không đếm được chỉ hàng hóa.',
      },
    ],
  },
  finance_tax: {
    title: 'Giới từ Số liệu (Increase by vs. to) & Trạng từ bổ nghĩa Động từ',
    summaryVi:
      'Các bài báo cáo tài chính, ngân hàng và thuế rất hay kiểm tra giới từ chỉ mức độ biến động (by / to) và phân biệt Because (liên từ) vs. Due to (giới từ).',
    formula: 'rise / drop BY + [mức chênh lệch %]  |  due to + Noun  vs.  because + S + V',
    usageVi: [
      'Dùng "by" chỉ mức thay đổi thêm/bớt: "Revenue grew BY 14%."',
      'Dùng "to" chỉ mốc đạt tới: "Expenses dropped TO $50,000."',
      'Trạng từ đứng trước hoặc sau động từ để mô tả cách thức: "reconcile accounts accurately", "operate profitably".',
    ],
    examples: [
      {
        en: 'Quarterly earnings increased by 15 percent due to strong export demand.',
        vi: 'Lợi nhuận quý tăng thêm 15% nhờ nhu cầu xuất khẩu mạnh.',
        highlight: 'by 15 percent / due to + N',
      },
      {
        en: 'Auditors carefully reviewed every outstanding tax statement.',
        vi: 'Kiểm toán viên đã rà soát cẩn thận từng bản kê thuế còn tồn đọng.',
        highlight: 'carefully (adv)',
      },
    ],
    commonMistakes: [
      {
        wrong: 'Annual revenue rose to 12 percent last year.',
        right: 'Annual revenue rose by 12 percent last year.',
        explanationVi: 'Chỉ tỷ lệ phần trăm tăng thêm phải dùng giới từ "by".',
      },
      {
        wrong: 'Due to interest rates rose, fewer clients took out mortgages.',
        right: 'Because interest rates rose, fewer clients took out mortgages.',
        explanationVi: '"Due to" chỉ đi với cụm danh từ; trước mệnh đề dùng "Because".',
      },
    ],
    miniPractice: [
      {
        id: 'cat_ft_1',
        prompt: 'Net profit expanded _______ 18 percent after automating the accounting workflow.',
        options: ['by', 'to', 'at', 'with'],
        correctIndex: 0,
        explanationVi: 'Chỉ mức phần trăm tăng thêm dùng "by".',
      },
      {
        id: 'cat_ft_2',
        prompt: '_______ unexpected tax changes, the firm revised its Q3 financial forecast.',
        options: ['Because', 'Since', 'Due to', 'Although'],
        correctIndex: 2,
        explanationVi: '"unexpected tax changes" là cụm danh từ -> chọn "Due to".',
      },
    ],
  },
  management_property: {
    title: 'Động từ nguyên mẫu (to V) & Phân từ mô tả Trạng thái (V-ed / V-ing)',
    summaryVi:
      'Chủ đề Quản trị chất lượng, Phát triển sản phẩm và Thuê mặt bằng hay kiểm tra động từ theo sau bởi to-V (opt to, aim to, fail to) và cặp tính từ chủ động/bị động.',
    formula: 'opt / decide / plan + TO V-inf  |  be conducive TO / be adjacent TO + Noun',
    usageVi: [
      'Nhớ các giới từ đi kèm tính từ quan trọng: adjacent TO (liền kề), conducive TO (có lợi cho), open TO (cởi mở với).',
      'Sau "opt to", "plan to", "expect to" luôn dùng động từ nguyên mẫu.',
      'Dùng phân từ quá khứ (V-ed) bổ nghĩa cho vật bị tác động: "leased property", "inspected garments".',
    ],
    examples: [
      {
        en: 'Several departments opted to relocate to a workspace adjacent to transit.',
        vi: 'Một số phòng ban chọn chuyển đến văn phòng liền kề giao thông công cộng.',
        highlight: 'opted to / adjacent to',
      },
      {
        en: 'All newly developed prototypes must conform to strict quality standards.',
        vi: 'Mọi nguyên mẫu mới phát triển phải tuân thủ tiêu chuẩn chất lượng nghiêm ngặt.',
        highlight: 'conform to',
      },
    ],
    commonMistakes: [
      {
        wrong: 'The laboratory is adjacent with the main warehouse.',
        right: 'The laboratory is adjacent to the main warehouse.',
        explanationVi: '"Adjacent" luôn đi với giới từ "to".',
      },
      {
        wrong: 'Every batch must conform with international safety codes.',
        right: 'Every batch must conform to international safety codes.',
        explanationVi: '"Conform" đi với giới từ "to" (còn "comply" đi với "with").',
      },
    ],
    miniPractice: [
      {
        id: 'cat_mp_1',
        prompt: 'The new research wing is located immediately adjacent _______ the main lobby.',
        options: ['with', 'to', 'by', 'from'],
        correctIndex: 1,
        explanationVi: 'Cụm cố định: "adjacent to" = liền kề với.',
      },
      {
        id: 'cat_mp_2',
        prompt: 'All exported electronics must conform _______ regional energy regulations.',
        options: ['to', 'by', 'on', 'at'],
        correctIndex: 0,
        explanationVi: 'Cụm cố định: "conform to" = tuân thủ theo tiêu chuẩn.',
      },
    ],
  },
  dining_travel: {
    title: 'Cấu trúc Lịch trình (Be scheduled to / Prior to) & Nội động từ Take Place',
    summaryVi:
      'Trong chủ đề Nhà hàng, Sự kiện, Du lịch, Hàng không và Khách sạn, đề TOEIC hay kiểm tra cấu trúc thông báo lịch trình và giới từ chỉ thời gian.',
    formula: 'S + be scheduled to + V-inf  |  prior to + Noun/V-ing  |  take place (chủ động)',
    usageVi: [
      'Cấu trúc "is scheduled to + V-inf" thay cho tương lai đơn trong thông báo sân bay/sự kiện.',
      '"Prior to" = "Before" (trang trọng), đi với danh từ hoặc V-ing: "prior to departure / prior to boarding".',
      '"Take place" (diễn ra) là nội động từ — KHÔNG chia bị động ("will take place", không dùng "will be taken place").',
    ],
    examples: [
      {
        en: 'Flight VN215 is scheduled to depart from Gate 12 prior to noon.',
        vi: 'Chuyến bay VN215 được lên lịch khởi hành từ Cửa 12 trước buổi trưa.',
        highlight: 'is scheduled to depart / prior to',
      },
      {
        en: 'The hospitality awards banquet will take place at Grand Harbor Hotel.',
        vi: 'Tiệc trao giải ngành lưu trú sẽ diễn ra tại khách sạn Grand Harbor.',
        highlight: 'will take place',
      },
    ],
    commonMistakes: [
      {
        wrong: 'The annual food festival will be taken place on Saturday.',
        right: 'The annual food festival will take place on Saturday.',
        explanationVi: '"Take place" không bao giờ dùng ở thể bị động.',
      },
      {
        wrong: 'Please confirm your reservation prior departure.',
        right: 'Please confirm your reservation prior to departure.',
        explanationVi: 'Cụm đúng phải có giới từ "to": "prior to + Noun/V-ing".',
      },
    ],
    miniPractice: [
      {
        id: 'cat_dt_1',
        prompt: 'The complimentary airport shuttle is scheduled _______ every twenty minutes.',
        options: ['depart', 'to depart', 'departing', 'departure'],
        correctIndex: 1,
        explanationVi: 'Cấu trúc chuẩn: "be scheduled to + V-inf".',
      },
      {
        id: 'cat_dt_2',
        prompt: 'Guests must check out _______ 12:00 P.M. to avoid an extra nightly rate.',
        options: ['prior to', 'prior', 'during', 'since'],
        correctIndex: 0,
        explanationVi: '"prior to + thời điểm" = trước lúc...',
      },
    ],
  },
  culture_health_life: {
    title: 'Tính từ mô tả Cảm xúc (-ed vs. -ing) & Bị động trong Thông báo Công cộng',
    summaryVi:
      'Nhóm chủ đề Giải trí, Y tế, Cảm xúc, Chính trị & Giao thông hay kiểm tra tính từ đuôi -ed (cảm xúc người) vs. -ing (tính chất sự vật) và câu bị động trong bản tin.',
    formula: 'Người + be + V-ed (delighted, relieved)  |  Sự vật + be + V-ing (exciting, demanding)',
    usageVi: [
      'Dùng tính từ đuôi -ed để nói cảm xúc của người: "The audience was impressed", "Drivers felt frustrated".',
      'Dùng tính từ đuôi -ing để mô tả bản chất sự việc: "an exciting concert", "a frustrating traffic delay".',
      'Trong bản tin báo chí, bệnh viện và giao thông: "is designated for", "was enacted by", "is closed for repairs".',
    ],
    examples: [
      {
        en: 'Commuters were relieved to hear that the downtown intersection reopened.',
        vi: 'Người đi làm cảm thấy nhẹ nhõm khi nghe tin ngã tư trung tâm đã mở lại.',
        highlight: 'relieved (-ed chỉ người)',
      },
      {
        en: 'The museum exhibit offers a truly inspiring look at maritime heritage.',
        vi: 'Triển lãm bảo tàng mang lại góc nhìn đầy cảm hứng về di sản hàng hải.',
        highlight: 'inspiring (-ing chỉ vật)',
      },
    ],
    commonMistakes: [
      {
        wrong: 'Patients were very satisfying with the clinic’s fast test results.',
        right: 'Patients were very satisfied with the clinic’s fast test results.',
        explanationVi: 'Miêu tả cảm nhận của bệnh nhân (con người) dùng tính từ đuôi -ed: "satisfied".',
      },
      {
        wrong: 'The highway congestion was extremely frustrated during rush hour.',
        right: 'The highway congestion was extremely frustrating during rush hour.',
        explanationVi: 'Miêu tả tính chất gây bực bội của tắc đường (sự việc) dùng đuôi -ing: "frustrating".',
      },
    ],
    miniPractice: [
      {
        id: 'cat_chl_1',
        prompt: 'Ticket holders were _______ by the orchestra’s final performance.',
        options: ['impress', 'impressing', 'impressed', 'impression'],
        correctIndex: 2,
        explanationVi: 'Chỉ cảm xúc của khán giả ("Ticket holders") -> tính từ đuôi -ed: "impressed".',
      },
      {
        id: 'cat_chl_2',
        prompt: 'The east lane of River Bridge is temporarily _______ for pavement repairs.',
        options: ['close', 'closing', 'closed', 'closure'],
        correctIndex: 2,
        explanationVi: 'Câu bị động/trạng thái: "is temporarily closed" (tạm thời đóng cửa).',
      },
    ],
  },
};

function buildTopicPatterns(raw: ToeicRawTopic): PatternSeedTuple[] {
  const v0 = raw.vocabulary[0];
  const v1 = raw.vocabulary[1];
  const v2 = raw.vocabulary[2];
  const v3 = raw.vocabulary[3];
  const v4 = raw.vocabulary[4];
  const v5 = raw.vocabulary[5];

  return [
    [
      `Please make sure to review [${v0[0]}] & [${v1[0]}]`,
      `Vui lòng đảm bảo rà soát về "${v0[3]}" và "${v1[3]}"`,
      `Mẫu câu trao đổi công việc chuẩn TOEIC trong chủ đề ${raw.titleVi} (${raw.titleEn}).`,
      v0[4],
      v0[5],
      `Have you checked the latest update regarding ${v1[0]}?`,
      `Bạn đã kiểm tra cập nhật mới nhất liên quan đến ${v1[3]} chưa?`,
      `Yes. ${v0[4]}`,
      `Rồi. ${v0[5]}`,
    ],
    [
      `We need to prioritize [${v2[0]}] before the deadline`,
      `Chúng ta cần ưu tiên "${v2[3]}" trước thời hạn`,
      `Dùng trong hội thoại TOEIC Part 3 khi thảo luận công việc thuộc chủ đề ${raw.titleVi}.`,
      v2[4],
      v2[5],
      `What should our team focus on first for ${raw.titleEn.toLowerCase()}?`,
      `Nhóm mình nên tập trung vào việc gì trước trong mảng ${raw.titleVi.toLowerCase()}?`,
      `${v3[4]}`,
      `${v3[5]}`,
    ],
    [
      `Please be advised regarding [${v4[0]}] & [${v5[0]}]`,
      `Xin lưu ý thông báo liên quan đến "${v4[3]}" và "${v5[3]}"`,
      `Cấu trúc thông báo/email trang trọng thường gặp ở TOEIC Part 6–7.`,
      v4[4],
      v4[5],
      `Could you clarify our current status on ${v5[0]}?`,
      `Bạn có thể làm rõ tình trạng hiện tại về ${v5[3]} không?`,
      `Certainly. ${v5[4]}`,
      `Chắc chắn rồi. ${v5[5]}`,
    ],
  ];
}

function buildTopicCustomQuiz(raw: ToeicRawTopic): Omit<QuizQuestion, 'id'>[] {
  const v = raw.vocabulary;
  const g = CATEGORY_GRAMMAR[raw.categoryId];

  // Build 7 varied TOEIC-authentic custom questions per topic (combined with 8 auto-generated = 15 total!)
  const q1: Omit<QuizQuestion, 'id'> = {
    type: 'grammar',
    question: g.miniPractice[0].prompt,
    options: g.miniPractice[0].options,
    correctIndex: g.miniPractice[0].correctIndex,
    explanationVi: g.miniPractice[0].explanationVi,
  };

  const q2: Omit<QuizQuestion, 'id'> = {
    type: 'grammar',
    question: g.miniPractice[1].prompt,
    options: g.miniPractice[1].options,
    correctIndex: g.miniPractice[1].correctIndex,
    explanationVi: g.miniPractice[1].explanationVi,
  };

  const q3: Omit<QuizQuestion, 'id'> = {
    type: 'vocab_en_to_vi',
    question: `Trong chủ đề "${raw.titleVi} (${raw.titleEn})", từ "${v[8][0]}" (${v[8][1]}) có nghĩa là gì?`,
    options: [v[8][3], v[3][3], v[11][3], v[5][3]],
    correctIndex: 0,
    explanationVi: `"${v[8][0]}" (${v[8][2]}) nghĩa là "${v[8][3]}". Ví dụ: "${v[8][4]}"`,
  };

  const q4: Omit<QuizQuestion, 'id'> = {
    type: 'vocab_vi_to_en',
    question: `Chọn từ tiếng Anh TOEIC mang nghĩa "${v[12][3]}":`,
    options: [v[12][0], v[4][0], v[7][0], v[10][0]],
    correctIndex: 0,
    explanationVi: `"${v[12][3]}" trong tiếng Anh là "${v[12][0]}" (${v[12][1]}).`,
  };

  const q5: Omit<QuizQuestion, 'id'> = {
    type: 'sentence_pattern',
    question: `Câu ví dụ nào sử dụng chính xác từ "${v[13][0]}" (${v[13][3]})?`,
    options: [
      v[13][4],
      `The office will ${v[13][0]} tomorrow in the meeting room yesterday.`,
      `Please ${v[13][0]}ing before submit the document.`,
      `Every staff are ${v[13][0]} to the building quickly.`,
    ],
    correctIndex: 0,
    explanationVi: `Câu chuẩn xác nhất là: "${v[13][4]}" (${v[13][5]}).`,
  };

  const q6: Omit<QuizQuestion, 'id'> = {
    type: 'reading_comprehension',
    passage: `TOEIC BRIEFING — Topic: ${raw.titleEn}. ${v[0][4]} ${v[2][4]} ${v[6][4]}`,
    question: `Theo đoạn thông báo ngắn trên, nội dung nào sau đây là chính xác?`,
    options: [
      v[0][5],
      'Thông báo yêu cầu tạm dừng toàn bộ hoạt động trong tháng tới.',
      'Tài liệu này chỉ dành riêng cho nhân sự đã nghỉ hưu.',
      'Không có bất kỳ thay đổi hay yêu cầu nào được đề cập.',
    ],
    correctIndex: 0,
    explanationVi: `Câu mở đầu nêu rõ: "${v[0][4]}" — tức là "${v[0][5]}".`,
  };

  const q7: Omit<QuizQuestion, 'id'> = {
    type: 'reading_comprehension',
    passage: `TOEIC BRIEFING — Topic: ${raw.titleEn}. ${v[0][4]} ${v[2][4]} ${v[6][4]}`,
    question: `Ý nào sau đây cũng được đề cập trong đoạn văn?`,
    options: [
      v[6][5],
      'Tất cả các chi nhánh quốc tế sẽ đóng cửa vĩnh viễn.',
      'Khách hàng phải trả gấp đôi mức phí hiện tại.',
      'Báo cáo quý trước bị hủy bỏ hoàn toàn.',
    ],
    correctIndex: 0,
    explanationVi: `Câu cuối nêu rõ: "${v[6][4]}" — nghĩa là "${v[6][5]}".`,
  };

  return [q1, q2, q3, q4, q5, q6, q7];
}

export const TOEIC_TOPICS: ToeicTopicMeta[] = ALL_RAW_TOPICS.map((raw) => {
  const padded = String(raw.num).padStart(2, '0');
  return {
    id: raw.slug,
    num: raw.num,
    code: `${raw.num}`,
    categoryId: raw.categoryId,
    titleVi: raw.titleVi,
    titleEn: raw.titleEn,
    summaryVi: raw.summaryVi,
    examTipVi: raw.examTipVi,
    lessonId: `toeic_${padded}`,
    wordCount: raw.vocabulary.length,
  };
});

export const LESSONS_TOEIC: LessonDoc[] = ALL_RAW_TOPICS.map((raw) => {
  const padded = String(raw.num).padStart(2, '0');
  return buildLesson({
    lessonId: `toeic_${padded}`,
    levelId: 'TOEIC',
    topic: `${raw.num}. ${raw.titleVi}`,
    topicOrder: raw.num,
    title: `${raw.num}. ${raw.titleVi} (${raw.titleEn})`,
    description: `${raw.summaryVi} Gồm ${raw.vocabulary.length} từ vựng TOEIC trọng tâm, mẫu câu ngữ cảnh, mẹo ngữ pháp Part 5 và 15 câu trắc nghiệm nhận Ngọc.`,
    order: 60 + raw.num,
    estimatedMinutes: 15,
    dialogueSpeakers: ['Ms. Linh', 'Mr. Nam'],
    vocabulary: raw.vocabulary,
    sentencePatterns: buildTopicPatterns(raw),
    grammar: CATEGORY_GRAMMAR[raw.categoryId],
    customQuiz: buildTopicCustomQuiz(raw),
  });
});

export const TOEIC_WORD_FAMILIES: ToeicWordFamilyItem[] = [
  {
    id: 'wf_01',
    categoryId: 'business_contracts',
    rootMeaningVi: 'Thỏa thuận / Đồng ý',
    noun: 'agreement',
    verb: 'agree',
    adjective: 'agreeable',
    adverb: 'agreeably',
    examTipVi: 'Collocation chuẩn: reach an agreement / sign a binding agreement.',
    exampleEn: 'Both executives signed the licensing agreement before the deadline.',
    exampleVi: 'Cả hai giám đốc đã ký thỏa thuận cấp phép trước hạn chót.',
  },
  {
    id: 'wf_02',
    categoryId: 'business_contracts',
    rootMeaningVi: 'Nghĩa vụ / Ràng buộc',
    noun: 'obligation',
    verb: 'obligate',
    adjective: 'obligatory / obligated',
    examTipVi: 'Cấu trúc hay ra: "under no obligation to + V" (không có nghĩa vụ phải làm gì).',
    exampleEn: 'Clients are under no obligation to renew the annual maintenance plan.',
    exampleVi: 'Khách hàng không bắt buộc phải gia hạn gói bảo trì thường niên.',
  },
  {
    id: 'wf_03',
    categoryId: 'business_contracts',
    rootMeaningVi: 'Cạnh tranh / Đối thủ',
    noun: 'competition / competitor',
    verb: 'compete',
    adjective: 'competitive',
    adverb: 'competitively',
    examTipVi: 'Cụm hay gặp Part 5: competitive pricing (giá cạnh tranh), fierce competition.',
    exampleEn: 'Our brand offers competitive pricing without sacrificing product quality.',
    exampleVi: 'Thương hiệu của chúng tôi cung cấp mức giá cạnh tranh mà không giảm chất lượng.',
  },
  {
    id: 'wf_04',
    categoryId: 'business_contracts',
    rootMeaningVi: 'Bảo vệ / Bảo hành',
    noun: 'protection',
    verb: 'protect',
    adjective: 'protective',
    examTipVi: 'Extended warranties provide extra protection against repair costs.',
    exampleEn: 'Extended warranties offer reliable protection against accidental failure.',
    exampleVi: 'Gói bảo hành mở rộng mang lại sự bảo vệ đáng tin cậy trước sự cố bất ngờ.',
  },
  {
    id: 'wf_05',
    categoryId: 'office_tech',
    rootMeaningVi: 'Tương thích',
    noun: 'compatibility',
    verb: '—',
    adjective: 'compatible',
    adverb: 'compatibly',
    examTipVi: 'Luôn dùng giới từ WITH: "compatible with existing hardware".',
    exampleEn: 'Verify software compatibility before rolling out the company update.',
    exampleVi: 'Kiểm tra độ tương thích phần mềm trước khi triển khai cập nhật toàn công ty.',
  },
  {
    id: 'wf_06',
    categoryId: 'office_tech',
    rootMeaningVi: 'Khả năng chi trả / Phải chăng',
    noun: 'affordability',
    verb: 'afford',
    adjective: 'affordable',
    adverb: 'affordably',
    examTipVi: 'Collocation chuẩn TOEIC: affordable pricing / affordable office solutions.',
    exampleEn: 'Cloud platforms deliver affordable automation for growing businesses.',
    exampleVi: 'Nền tảng đám mây mang đến giải pháp tự động hóa phải chăng cho doanh nghiệp đang lớn.',
  },
  {
    id: 'wf_07',
    categoryId: 'office_tech',
    rootMeaningVi: 'Xác nhận / Đính kèm',
    noun: 'attachment',
    verb: 'attach',
    adjective: 'attached',
    examTipVi: '"Please see the attached file" (tính từ) vs. "open the attachment" (danh từ).',
    exampleEn: 'I have attached the invoice; let me know if the attachment fails to open.',
    exampleVi: 'Tôi đã đính kèm hóa đơn; hãy báo cho tôi nếu tệp đính kèm không mở được.',
  },
  {
    id: 'wf_08',
    categoryId: 'hr_recruiting',
    rootMeaningVi: 'Đủ tiêu chuẩn / Bằng cấp',
    noun: 'qualification',
    verb: 'qualify',
    adjective: 'qualified',
    examTipVi: '"be qualified for + N" hoặc "highly qualified candidates" cực hay xuất hiện Part 5.',
    exampleEn: 'Only highly qualified applicants will qualify for the final interview.',
    exampleVi: 'Chỉ các ứng viên đủ năng lực cao mới vượt qua vòng phỏng vấn cuối.',
  },
  {
    id: 'wf_09',
    categoryId: 'hr_recruiting',
    rootMeaningVi: 'Ứng tuyển / Hồ sơ',
    noun: 'application / applicant',
    verb: 'apply',
    adjective: 'applicable',
    examTipVi: 'Application (đơn ứng tuyển) vs. Applicant (người nộp đơn); applicable to (áp dụng cho).',
    exampleEn: 'Every applicant must submit a completed application form online.',
    exampleVi: 'Mỗi ứng viên phải nộp mẫu đơn ứng tuyển hoàn chỉnh trực tuyến.',
  },
  {
    id: 'wf_10',
    categoryId: 'hr_recruiting',
    rootMeaningVi: 'Đền bù / Trả công',
    noun: 'compensation',
    verb: 'compensate',
    adjective: 'compensatory',
    examTipVi: 'Compensation package = gói đãi ngộ (lương + thưởng + bảo hiểm).',
    exampleEn: 'The firm offers an attractive compensation package to senior engineers.',
    exampleVi: 'Công ty đưa ra gói đãi ngộ hấp dẫn cho các kỹ sư cấp cao.',
  },
  {
    id: 'wf_11',
    categoryId: 'shopping_logistics',
    rootMeaningVi: 'Chính xác',
    noun: 'accuracy',
    verb: '—',
    adjective: 'accurate',
    adverb: 'accurately',
    examTipVi: 'Check inventory accurately (trạng từ bổ nghĩa cho động từ check).',
    exampleEn: 'Barcode scanners track warehouse inventory with remarkable accuracy.',
    exampleVi: 'Máy quét mã vạch theo dõi tồn kho với độ chính xác vượt trội.',
  },
  {
    id: 'wf_12',
    categoryId: 'shopping_logistics',
    rootMeaningVi: 'Hiệu quả / Năng suất',
    noun: 'efficiency',
    verb: '—',
    adjective: 'efficient',
    adverb: 'efficiently',
    examTipVi: 'Collocation: energy-efficient / process invoices efficiently.',
    exampleEn: 'Automated billing helps staff process vendor invoices more efficiently.',
    exampleVi: 'Hệ thống hóa đơn tự động giúp nhân viên xử lý chứng từ hiệu quả hơn.',
  },
  {
    id: 'wf_13',
    categoryId: 'shopping_logistics',
    rootMeaningVi: 'Giao hàng / Chuyển phát',
    noun: 'delivery',
    verb: 'deliver',
    adjective: 'deliverable',
    examTipVi: 'Express delivery (giao hàng hỏa tốc); prompt delivery (giao hàng kịp thời).',
    exampleEn: 'The courier will deliver your parcel with guaranteed next-day delivery.',
    exampleVi: 'Nhân viên chuyển phát sẽ giao bưu kiện của bạn vào ngày hôm sau.',
  },
  {
    id: 'wf_14',
    categoryId: 'finance_tax',
    rootMeaningVi: 'Tài chính',
    noun: 'finance / financier',
    verb: 'finance',
    adjective: 'financial',
    adverb: 'financially',
    examTipVi: 'Financial statement (báo cáo tài chính), financially stable (ổn định tài chính).',
    exampleEn: 'The board reviewed the quarterly financial report before approving expansion.',
    exampleVi: 'Hội đồng quản trị xem xét báo cáo tài chính quý trước khi duyệt mở rộng.',
  },
  {
    id: 'wf_15',
    categoryId: 'finance_tax',
    rootMeaningVi: 'Lợi nhuận / Sinh lời',
    noun: 'profit / profitability',
    verb: 'profit',
    adjective: 'profitable',
    adverb: 'profitably',
    examTipVi: 'Rất hay gặp Part 5: "a highly profitable quarter" / "operate profitably".',
    exampleEn: 'All regional outlets operated profitably throughout the fourth quarter.',
    exampleVi: 'Toàn bộ chi nhánh khu vực đều hoạt động có lãi suốt quý tư.',
  },
  {
    id: 'wf_16',
    categoryId: 'finance_tax',
    rootMeaningVi: 'Khấu trừ / Giảm trừ thuế',
    noun: 'deduction',
    verb: 'deduct',
    adjective: 'deductible',
    examTipVi: 'Tax-deductible expenses = chi phí được khấu trừ thuế.',
    exampleEn: 'Keep business travel receipts to claim every eligible tax deduction.',
    exampleVi: 'Giữ biên lai công tác để yêu cầu mọi khoản khấu trừ thuế hợp lệ.',
  },
  {
    id: 'wf_17',
    categoryId: 'management_property',
    rootMeaningVi: 'Cộng tác / Phối hợp',
    noun: 'collaboration / collaborator',
    verb: 'collaborate',
    adjective: 'collaborative',
    adverb: 'collaboratively',
    examTipVi: 'Collocation: in collaboration with / collaborative workspace.',
    exampleEn: 'Design and engineering teams work collaboratively on new prototypes.',
    exampleVi: 'Đội thiết kế và kỹ thuật phối hợp chặt chẽ trên các nguyên mẫu mới.',
  },
  {
    id: 'wf_18',
    categoryId: 'management_property',
    rootMeaningVi: 'Kiểm định / Thanh tra',
    noun: 'inspection / inspector',
    verb: 'inspect',
    adjective: '—',
    examTipVi: 'Pass inspection (vượt qua kiểm định); safety inspector (thanh tra an toàn).',
    exampleEn: 'Every manufacturing lot undergoes a strict quality inspection prior to shipping.',
    exampleVi: 'Mỗi lô sản xuất đều trải qua cuộc kiểm định chất lượng nghiêm ngặt trước khi giao.',
  },
  {
    id: 'wf_19',
    categoryId: 'dining_travel',
    rootMeaningVi: 'Đặt chỗ trước',
    noun: 'reservation',
    verb: 'reserve',
    adjective: 'reserved',
    examTipVi: 'Make a reservation (đặt chỗ trước); reserved seating (chỗ đã đặt trước).',
    exampleEn: 'Please reserve your hotel room early, as reservations fill up fast.',
    exampleVi: 'Vui lòng đặt phòng khách sạn sớm vì lượt đặt chỗ rất nhanh kín.',
  },
  {
    id: 'wf_20',
    categoryId: 'dining_travel',
    rootMeaningVi: 'Tiết kiệm / Kinh tế',
    noun: 'economy / economist',
    verb: 'economize',
    adjective: 'economical / economic',
    adverb: 'economically',
    examTipVi: 'Phân biệt: economic (thuộc kinh tế) vs. economical (tiết kiệm chi phí).',
    exampleEn: 'Booking direct trains proved to be the most economical travel option.',
    exampleVi: 'Đặt tàu thẳng đã chứng tỏ là lựa chọn di chuyển tiết kiệm nhất.',
  },
  {
    id: 'wf_21',
    categoryId: 'dining_travel',
    rootMeaningVi: 'Xác nhận',
    noun: 'confirmation',
    verb: 'confirm',
    adjective: 'confirmed',
    examTipVi: 'Booking confirmation (thư xác nhận đặt chỗ); confirmed itinerary.',
    exampleEn: 'Bring your printed hotel confirmation number to the reception desk.',
    exampleVi: 'Mang mã xác nhận khách sạn đã in tới quầy lễ tân.',
  },
  {
    id: 'wf_22',
    categoryId: 'culture_health_life',
    rootMeaningVi: 'Đăng ký theo dõi / Đặt báo',
    noun: 'subscription / subscriber',
    verb: 'subscribe',
    adjective: '—',
    examTipVi: 'Subscribe TO + báo/kênh; renew a subscription (gia hạn gói đăng ký).',
    exampleEn: 'Digital subscribers receive breaking economic alerts every morning.',
    exampleVi: 'Độc giả đăng ký bản số nhận bản tin kinh tế nóng mỗi sáng.',
  },
  {
    id: 'wf_23',
    categoryId: 'culture_health_life',
    rootMeaningVi: 'Ủy quyền / Cho phép',
    noun: 'authorization / authority',
    verb: 'authorize',
    adjective: 'authorized',
    examTipVi: 'Authorized personnel only (chỉ nhân sự được phép); prior authorization.',
    exampleEn: 'Only authorized clinic staff may access electronic patient records.',
    exampleVi: 'Chỉ nhân viên phòng khám được ủy quyền mới được truy cập bệnh án điện tử.',
  },
  {
    id: 'wf_24',
    categoryId: 'culture_health_life',
    rootMeaningVi: 'Thay thế / Phương án khác',
    noun: 'alternative',
    verb: 'alternate',
    adjective: 'alternative',
    adverb: 'alternatively',
    examTipVi: 'Alternative route (tuyến đường thay thế) rất hay gặp trong bản tin giao thông Part 4.',
    exampleEn: 'Commuters are advised to take an alternative route around the bridge repairs.',
    exampleVi: 'Người đi làm được khuyên chọn tuyến đường thay thế vòng qua đoạn sửa cầu.',
  },
];

export const TOEIC_PART5_DRILLS: ToeicPart5Question[] = [
  {
    id: 'p5_01',
    categoryId: 'business_contracts',
    categoryVi: '1. Hợp đồng · Giới từ cố định',
    sentence: 'All outside contractors must abide _______ the safety provisions outlined in the contract.',
    options: ['with', 'by', 'to', 'on'],
    correctIndex: 1,
    explanationVi: 'Cụm động từ chuẩn TOEIC: "abide by" = tuân thủ.',
    completedSentence: 'All outside contractors must abide by the safety provisions outlined in the contract.',
  },
  {
    id: 'p5_02',
    categoryId: 'business_contracts',
    categoryVi: '2. Tiếp thị · Word Form',
    sentence: 'The autumn advertising campaign attracted a _______ larger audience than expected.',
    options: ['significance', 'significant', 'significantly', 'signify'],
    correctIndex: 2,
    explanationVi: 'Trước tính từ so sánh hơn "larger" cần trạng từ bổ nghĩa -> "significantly".',
    completedSentence: 'The autumn advertising campaign attracted a significantly larger audience than expected.',
  },
  {
    id: 'p5_03',
    categoryId: 'business_contracts',
    categoryVi: '3. Bảo hành · Từ vựng ngữ cảnh',
    sentence: 'The standard manufacturer warranty does not _______ damage caused by misuse.',
    options: ['cover', 'cancel', 'obligate', 'disrupt'],
    correctIndex: 0,
    explanationVi: '"cover" trong chính sách bảo hành/bảo hiểm mang nghĩa "bao gồm chi trả".',
    completedSentence: 'The standard manufacturer warranty does not cover damage caused by misuse.',
  },
  {
    id: 'p5_04',
    categoryId: 'office_tech',
    categoryVi: '6. Máy tính · Giới từ tính từ',
    sentence: 'Please confirm that the new accounting software is fully compatible _______ our servers.',
    options: ['to', 'for', 'with', 'by'],
    correctIndex: 2,
    explanationVi: 'Cụm cố định: "be compatible with" (tương thích với).',
    completedSentence: 'Please confirm that the new accounting software is fully compatible with our servers.',
  },
  {
    id: 'p5_05',
    categoryId: 'office_tech',
    categoryVi: '10. Thư tín · Đảo ngữ điều kiện',
    sentence: '_______ you experience any issue opening the PDF attachment, notify IT support immediately.',
    options: ['Should', 'Were', 'Had', 'Unless'],
    correctIndex: 0,
    explanationVi: 'Đảo ngữ câu điều kiện loại 1 với động từ nguyên mẫu "experience" -> "Should".',
    completedSentence: 'Should you experience any issue opening the PDF attachment, notify IT support immediately.',
  },
  {
    id: 'p5_06',
    categoryId: 'office_tech',
    categoryVi: '7. Công nghệ văn phòng · Word Form',
    sentence: 'Switching to digital forms led to a 30 percent _______ in annual printing expenses.',
    options: ['reduce', 'reduced', 'reduction', 'reducible'],
    correctIndex: 2,
    explanationVi: 'Sau cụm "a 30 percent" cần một danh từ -> "reduction" (sự cắt giảm).',
    completedSentence: 'Switching to digital forms led to a 30 percent reduction in annual printing expenses.',
  },
  {
    id: 'p5_07',
    categoryId: 'hr_recruiting',
    categoryVi: '11. Tuyển dụng · Đại từ chỉ người',
    sentence: '_______ who meet the bilingual qualifications are encouraged to submit a resume online.',
    options: ['They', 'Them', 'Those', 'Their'],
    correctIndex: 2,
    explanationVi: 'Cấu trúc chuẩn TOEIC: "Those who + V" = Những người mà...',
    completedSentence: 'Those who meet the bilingual qualifications are encouraged to submit a resume online.',
  },
  {
    id: 'p5_08',
    categoryId: 'hr_recruiting',
    categoryVi: '14. Lương & phúc lợi · Giới từ',
    sentence: 'Employees become eligible _______ comprehensive health benefits after sixty days.',
    options: ['for', 'to', 'with', 'at'],
    correctIndex: 0,
    explanationVi: 'Cụm cố định: "be eligible for + Noun" (đủ điều kiện hưởng).',
    completedSentence: 'Employees become eligible for comprehensive health benefits after sixty days.',
  },
  {
    id: 'p5_09',
    categoryId: 'hr_recruiting',
    categoryVi: '12. Phỏng vấn · Word Form',
    sentence: 'The hiring panel interviewed five highly _______ candidates for the operations role.',
    options: ['qualify', 'qualification', 'qualified', 'qualifying'],
    correctIndex: 2,
    explanationVi: 'Sau trạng từ "highly" và trước danh từ "candidates" cần tính từ -> "qualified".',
    completedSentence: 'The hiring panel interviewed five highly qualified candidates for the operations role.',
  },
  {
    id: 'p5_10',
    categoryId: 'shopping_logistics',
    categoryVi: '15. Mua sắm · Danh từ không đếm được',
    sentence: 'All seasonal _______ returned with an original receipt qualifies for a full refund.',
    options: ['merchandise', 'merchandises', 'merchant', 'merchants'],
    correctIndex: 0,
    explanationVi: '"Merchandise" là danh từ không đếm được, tương hợp với động từ số ít "qualifies".',
    completedSentence: 'All seasonal merchandise returned with an original receipt qualifies for a full refund.',
  },
  {
    id: 'p5_11',
    categoryId: 'shopping_logistics',
    categoryVi: '17. Vận chuyển · Liên từ nhượng bộ',
    sentence: '_______ the coastal storm, our regional carrier fulfilled every express order on time.',
    options: ['Although', 'Even though', 'Despite', 'Because'],
    correctIndex: 2,
    explanationVi: '"the coastal storm" là cụm danh từ nên dùng giới từ "Despite".',
    completedSentence: 'Despite the coastal storm, our regional carrier fulfilled every express order on time.',
  },
  {
    id: 'p5_12',
    categoryId: 'shopping_logistics',
    categoryVi: '18. Hóa đơn · Từ vựng nghiệp vụ',
    sentence: 'Our billing department will _______ the duplicate invoice charge within twenty-four hours.',
    options: ['rectify', 'impose', 'accumulate', 'withhold'],
    correctIndex: 0,
    explanationVi: '"rectify" nghĩa là khắc phục/sửa chữa sai sót trên hóa đơn.',
    completedSentence: 'Our billing department will rectify the duplicate invoice charge within twenty-four hours.',
  },
  {
    id: 'p5_13',
    categoryId: 'finance_tax',
    categoryVi: '23. Báo cáo tài chính · Giới từ số liệu',
    sentence: 'Annual subscription revenue increased _______ 16 percent following the mobile redesign.',
    options: ['to', 'by', 'at', 'with'],
    correctIndex: 1,
    explanationVi: 'Chỉ mức chênh lệch phần trăm tăng thêm dùng giới từ "by".',
    completedSentence: 'Annual subscription revenue increased by 16 percent following the mobile redesign.',
  },
  {
    id: 'p5_14',
    categoryId: 'finance_tax',
    categoryVi: '21. Kế toán · Trạng từ',
    sentence: 'All four regional offices operated _______ throughout the third fiscal quarter.',
    options: ['profit', 'profitable', 'profitability', 'profitably'],
    correctIndex: 3,
    explanationVi: 'Bổ nghĩa cho động từ "operated" cần trạng từ -> "profitably" (có lãi).',
    completedSentence: 'All four regional offices operated profitably throughout the third fiscal quarter.',
  },
  {
    id: 'p5_15',
    categoryId: 'finance_tax',
    categoryVi: '24. Thuế · Word Form',
    sentence: 'Business travelers must retain original receipts to claim every eligible tax _______.',
    options: ['deduct', 'deducted', 'deduction', 'deducting'],
    correctIndex: 2,
    explanationVi: 'Sau tính từ "eligible tax" cần danh từ -> "deduction" (khoản khấu trừ thuế).',
    completedSentence: 'Business travelers must retain original receipts to claim every eligible tax deduction.',
  },
  {
    id: 'p5_16',
    categoryId: 'management_property',
    categoryVi: '25. Phòng ban · Giới từ tính từ',
    sentence: 'The new engineering laboratory is located directly adjacent _______ the main warehouse.',
    options: ['with', 'to', 'by', 'from'],
    correctIndex: 1,
    explanationVi: 'Cụm cố định: "adjacent to" = liền kề với.',
    completedSentence: 'The new engineering laboratory is located directly adjacent to the main warehouse.',
  },
  {
    id: 'p5_17',
    categoryId: 'management_property',
    categoryVi: '27. Chất lượng · Cụm động từ',
    sentence: 'All exported medical devices must conform _______ strict international safety standards.',
    options: ['to', 'by', 'on', 'at'],
    correctIndex: 0,
    explanationVi: 'Cụm cố định: "conform to + standards" (tuân thủ theo tiêu chuẩn).',
    completedSentence: 'All exported medical devices must conform to strict international safety standards.',
  },
  {
    id: 'p5_18',
    categoryId: 'management_property',
    categoryVi: '28. Thuê & cho thuê · Cụm giới từ',
    sentence: 'Any structural modifications to the leased suite are subject _______ landlord approval.',
    options: ['with', 'for', 'to', 'by'],
    correctIndex: 2,
    explanationVi: 'Cụm cố định: "be subject to + Noun" (tùy thuộc vào sự phê duyệt).',
    completedSentence: 'Any structural modifications to the leased suite are subject to landlord approval.',
  },
  {
    id: 'p5_19',
    categoryId: 'dining_travel',
    categoryVi: '33. Hàng không · Lịch trình',
    sentence: 'Flight VN402 is scheduled _______ from International Terminal 2 at 8:15 A.M.',
    options: ['depart', 'to depart', 'departing', 'departure'],
    correctIndex: 1,
    explanationVi: 'Cấu trúc chuẩn TOEIC: "be scheduled to + V-inf".',
    completedSentence: 'Flight VN402 is scheduled to depart from International Terminal 2 at 8:15 A.M.',
  },
  {
    id: 'p5_20',
    categoryId: 'dining_travel',
    categoryVi: '31. Sự kiện · Nội động từ',
    sentence: 'The annual hospitality expo will _______ at the Harbor Convention Center in October.',
    options: ['take place', 'be taken place', 'taking place', 'took place'],
    correctIndex: 0,
    explanationVi: '"Take place" là nội động từ không chia bị động; sau "will" dùng nguyên mẫu.',
    completedSentence: 'The annual hospitality expo will take place at the Harbor Convention Center in October.',
  },
  {
    id: 'p5_21',
    categoryId: 'dining_travel',
    categoryVi: '34. Khách sạn · Giới từ thời gian',
    sentence: 'Guests must notify reception _______ 2:00 P.M. to request a complimentary late checkout.',
    options: ['prior to', 'prior', 'during', 'since'],
    correctIndex: 0,
    explanationVi: 'Cụm giới từ chuẩn: "prior to + thời điểm" (trước lúc...).',
    completedSentence: 'Guests must notify reception prior to 2:00 P.M. to request a complimentary late checkout.',
  },
  {
    id: 'p5_22',
    categoryId: 'culture_health_life',
    categoryVi: '41. Cảm xúc · Tính từ -ed vs -ing',
    sentence: 'Over 95 percent of clinic patients reported feeling _______ with the online test portal.',
    options: ['satisfy', 'satisfying', 'satisfied', 'satisfaction'],
    correctIndex: 2,
    explanationVi: 'Diễn tả cảm xúc hài lòng của người ("clinic patients") -> dùng tính từ đuôi -ed: "satisfied".',
    completedSentence: 'Over 95 percent of clinic patients reported feeling satisfied with the online test portal.',
  },
  {
    id: 'p5_23',
    categoryId: 'culture_health_life',
    categoryVi: '38. Truyền thông · Word Form',
    sentence: 'New digital _______ receive instant access to our weekly investigative business briefings.',
    options: ['subscribe', 'subscribers', 'subscribed', 'subscribing'],
    correctIndex: 1,
    explanationVi: 'Vị trí chủ ngữ chỉ người theo sau "New digital" và động từ số nhiều "receive" -> "subscribers".',
    completedSentence: 'New digital subscribers receive instant access to our weekly investigative business briefings.',
  },
  {
    id: 'p5_24',
    categoryId: 'culture_health_life',
    categoryVi: '44. Giao thông · Từ vựng ngữ cảnh',
    sentence: 'Due to bridge pavement repairs, commuters should take an _______ route during rush hour.',
    options: ['alternative', 'obligatory', 'defective', 'overcrowded'],
    correctIndex: 0,
    explanationVi: 'Cụm chuẩn bản tin giao thông Part 4: "take an alternative route" (chọn tuyến đường thay thế).',
    completedSentence: 'Due to bridge pavement repairs, commuters should take an alternative route during rush hour.',
  },
];
