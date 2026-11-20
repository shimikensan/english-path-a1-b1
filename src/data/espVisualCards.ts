import type { EspTrackId } from './lessonsESP';

export interface EspVisualVocabCard {
  id: string;
  trackId: EspTrackId;
  lessonId: string;
  vocabId: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  meaningVi: string;
  visualCueVi: string;
  exampleEn: string;
  exampleVi: string;
  imageUrl: string;
  imageAltVi: string;
  relatedTerms: Array<{ word: string; meaningVi: string }>;
}

export const ESP_VISUAL_CARDS: EspVisualVocabCard[] = [
  // =========================================================================
  // CHUYÊN NGÀNH 1: CHẾ ÁP VÔ TUYẾN & PHÁT HIỆN, CHẾ ÁP UAV
  // =========================================================================
  {
    id: 'vis_ew_01',
    trackId: 'ew_uav',
    lessonId: 'esp_ew_01',
    vocabId: 'esp_ew_01_v09',
    word: 'directional antenna',
    ipa: '/dəˈrekʃənl ænˈtenə/',
    partOfSpeech: 'noun',
    meaningVi: 'ăng-ten định hướng',
    visualCueVi:
      'Cụm ăng-ten dạng dàn định hướng gắn trên chân đế tripod, tập trung chùm sóng RF theo đúng góc phương vị mục tiêu để chế áp chính xác mà hạn chế can nhiễu xung quanh.',
    exampleEn: 'Aim the directional antenna toward bearing 240 degrees.',
    exampleVi: 'Hướng ăng-ten định hướng về góc phương vị 240 độ.',
    imageUrl: '/src/assets/images/vocab_ew_directional_antenna_1795137657163.jpg',
    imageAltVi: 'Thiết bị ăng-ten định hướng tần số vô tuyến gắn trên giá đỡ ba chân',
    relatedTerms: [
      { word: 'jamming', meaningVi: 'gây nhiễu / chế áp sóng' },
      { word: 'spectrum', meaningVi: 'phổ tần số điện từ' },
      { word: 'uplink', meaningVi: 'đường truyền lệnh lên' },
    ],
  },
  {
    id: 'vis_ew_02',
    trackId: 'ew_uav',
    lessonId: 'esp_ew_02',
    vocabId: 'esp_ew_02_v04',
    word: 'thermal imaging',
    ipa: '/ˈθɜːml ˈɪmɪdʒɪŋ/',
    partOfSpeech: 'noun',
    meaningVi: 'ảnh nhiệt / cảm biến hồng ngoại',
    visualCueVi:
      'Màn hình quang-điện tử ban đêm hiển thị tín hiệu nhiệt phát ra từ động cơ và pin của UAV quadcopter đang bay treo (hover), giúp nhận diện rõ trong điều kiện thiếu sáng.',
    exampleEn: 'Thermal imaging helps detect UAV motors during night operations.',
    exampleVi: 'Ảnh nhiệt giúp phát hiện động cơ UAV trong các ca trực ban đêm.',
    imageUrl: '/src/assets/images/vocab_ew_thermal_uav_1795137657959.jpg',
    imageAltVi: 'Màn hình buồng lái hiển thị ảnh nhiệt hồng ngoại phát hiện UAV ban đêm',
    relatedTerms: [
      { word: 'electro-optical', meaningVi: 'quang-điện tử (EO)' },
      { word: 'hover', meaningVi: 'bay treo tại chỗ' },
      { word: 'altitude', meaningVi: 'độ cao mục tiêu' },
    ],
  },
  {
    id: 'vis_ew_03',
    trackId: 'ew_uav',
    lessonId: 'esp_ew_03',
    vocabId: 'esp_ew_03_v01',
    word: 'counter-UAS',
    ipa: '/ˌkaʊntə juː eɪ ˈes/',
    partOfSpeech: 'noun',
    meaningVi: 'hệ thống phòng chống UAV (C-UAS)',
    visualCueVi:
      'Trụ cảm biến đa tầng trên nóc đài kiểm soát sân bay gồm vòm radar micro-Doppler, tháp camera EO/IR và dàn ăng-ten định hướng RF nhằm bảo vệ vùng cấm bay.',
    exampleEn: 'The counter-UAS console alerted the watch team within three seconds.',
    exampleVi: 'Bàn điều khiển phòng chống UAV đã cảnh báo kíp trực trong vòng ba giây.',
    imageUrl: '/src/assets/images/vocab_ew_counter_uas_1795137657837.jpg',
    imageAltVi: 'Tổ hợp cảm biến phòng chống UAV gồm vòm radar, camera quang-điện tử và mảng ăng-ten RF tại sân bay',
    relatedTerms: [
      { word: 'radar cross-section', meaningVi: 'diện tích phản xạ radar' },
      { word: 'exclusion zone', meaningVi: 'vùng cấm bay' },
      { word: 'neutralization', meaningVi: 'vô hiệu hóa mục tiêu' },
    ],
  },

  // =========================================================================
  // CHUYÊN NGÀNH 2: KIỂM TRA AN NINH
  // =========================================================================
  {
    id: 'vis_sec_01',
    trackId: 'security',
    lessonId: 'esp_sec_01',
    vocabId: 'esp_sec_01_v04',
    word: 'X-ray scanner',
    ipa: '/ˈeks reɪ ˈskænə(r)/',
    partOfSpeech: 'noun',
    meaningVi: 'máy soi chiếu hành lý tia X',
    visualCueVi:
      'Máy soi chiếu hành lý sân bay với băng chuyền (conveyor belt), khay đựng đồ cá nhân (tray) chứa laptop và màn hình hiển thị vật chất phân màu (cam: hữu cơ, xanh dương: kim loại).',
    exampleEn: 'Place your laptop and backpack flat on the X-ray scanner belt.',
    exampleVi: 'Vui lòng đặt máy tính xách tay và ba lô phẳng trên băng chuyền máy soi tia X.',
    imageUrl: '/src/assets/images/vocab_sec_xray_scanner_1795137655959.jpg',
    imageAltVi: 'Máy soi chiếu tia X hành lý sân bay kèm băng chuyền, khay đồ và màn hình phân tích ảnh X-quang',
    relatedTerms: [
      { word: 'tray', meaningVi: 'khay đựng đồ cá nhân' },
      { word: 'conveyor belt', meaningVi: 'băng chuyền máy soi' },
      { word: 'density', meaningVi: 'mật độ vật chất' },
    ],
  },
  {
    id: 'vis_sec_02',
    trackId: 'security',
    lessonId: 'esp_sec_01',
    vocabId: 'esp_sec_01_v03',
    word: 'metal detector',
    ipa: '/ˈmetl dɪˈtektə(r)/',
    partOfSpeech: 'noun',
    meaningVi: 'cổng dò kim loại (WTMD)',
    visualCueVi:
      'Cổng từ đi bộ bằng thép không gỉ có đèn định vị vùng báo động dọc thân trụ, đặt cạnh bàn có tay dò kim loại cầm tay (handheld wand) phục vụ kiểm tra bổ sung.',
    exampleEn: 'Please step through the walk-through metal detector one at a time.',
    exampleVi: 'Xin vui lòng đi qua cổng dò kim loại từng người một.',
    imageUrl: '/src/assets/images/vocab_sec_metal_detector_1795137657389.jpg',
    imageAltVi: 'Cổng dò kim loại đi bộ WTMD và tay dò kim loại cầm tay tại chốt an ninh sân bay',
    relatedTerms: [
      { word: 'handheld wand', meaningVi: 'tay dò kim loại cầm tay' },
      { word: 'checkpoint', meaningVi: 'chốt kiểm tra an ninh' },
      { word: 'screening', meaningVi: 'soi chiếu sàng lọc' },
    ],
  },
  {
    id: 'vis_sec_03',
    trackId: 'security',
    lessonId: 'esp_sec_01',
    vocabId: 'esp_sec_01_v12',
    word: 'swab',
    ipa: '/swɒb/',
    partOfSpeech: 'verb',
    meaningVi: 'lấy mẫu quét kiểm tra vết chất nổ (ETD)',
    visualCueVi:
      'Nhân viên an ninh đeo găng tay y tế dùng que quét vô trùng lau dọc khóa kéo và tay cầm vali, sau đó đưa mẫu vào máy phát hiện vết chất nổ để bàn (ETD).',
    exampleEn: 'I need to swab your carry-on bag for explosive trace detection.',
    exampleVi: 'Tôi cần quét mẫu túi xách tay của bạn để kiểm tra vết chất nổ.',
    imageUrl: '/src/assets/images/vocab_sec_trace_swab_1795137656427.jpg',
    imageAltVi: 'Nhân viên an ninh dùng que quét lấy mẫu vết chất nổ trên vali xách tay cạnh máy phân tích ETD',
    relatedTerms: [
      { word: 'explosive', meaningVi: 'chất nổ / vật liệu nổ' },
      { word: 'secondary inspection', meaningVi: 'kiểm tra thứ cấp' },
      { word: 'contraband', meaningVi: 'hàng cấm' },
    ],
  },

  // =========================================================================
  // CHUYÊN NGÀNH 3: KIỂM NGHIỆM THỰC PHẨM
  // =========================================================================
  {
    id: 'vis_food_01',
    trackId: 'food_testing',
    lessonId: 'esp_food_01',
    vocabId: 'esp_food_01_v03',
    word: 'sterile',
    ipa: '/ˈsteraɪl/',
    partOfSpeech: 'adjective',
    meaningVi: 'vô trùng / quy trình lấy mẫu vô trùng',
    visualCueVi:
      'Kiểm nghiệm viên mặc bảo hộ, găng tay vô trùng dùng kẹp tiệt trùng gắp mẫu thực phẩm vào túi mẫu kín bên cạnh thùng bảo quản lạnh (cold chain) và nhiệt kế đầu dò kiểm tra nhiệt độ 2–4°C.',
    exampleEn: 'Transfer the sample into a sterile container using sanitized tongs.',
    exampleVi: 'Chuyển mẫu vào túi/lọ vô trùng bằng kẹp đã khử trùng.',
    imageUrl: '/src/assets/images/vocab_food_sampling_sterile_1795137655317.jpg',
    imageAltVi: 'Quy trình lấy mẫu thực phẩm vô trùng bằng kẹp tiệt trùng, túi kín, thùng bảo quản lạnh và nhiệt kế',
    relatedTerms: [
      { word: 'sample', meaningVi: 'mẫu thử kiểm nghiệm' },
      { word: 'cold chain', meaningVi: 'chuỗi bảo quản lạnh' },
      { word: 'cross-contamination', meaningVi: 'nhiễm chéo' },
    ],
  },
  {
    id: 'vis_food_02',
    trackId: 'food_testing',
    lessonId: 'esp_food_02',
    vocabId: 'esp_food_02_v06',
    word: 'chromatography',
    ipa: '/ˌkrəʊməˈtɒɡrəfi/',
    partOfSpeech: 'noun',
    meaningVi: 'phương pháp sắc ký (HPLC)',
    visualCueVi:
      'Hệ thống sắc ký lỏng hiệu năng cao (HPLC) trên bàn thí nghiệm với các bình dung môi pha động phía trên và khay tiêm mẫu tự động chứa hàng chục lọ mẫu nhỏ (vials).',
    exampleEn: 'High-performance liquid chromatography separates chemical additives accurately.',
    exampleVi: 'Sắc ký lỏng hiệu năng cao tách các phụ gia hóa học một cách chính xác.',
    imageUrl: '/src/assets/images/vocab_food_hplc_lab_1795137657511.jpg',
    imageAltVi: 'Thiết bị sắc ký lỏng hiệu năng cao HPLC với bình dung môi và khay tiêm mẫu tự động trong phòng Lab thực phẩm',
    relatedTerms: [
      { word: 'pesticide residue', meaningVi: 'dư lượng thuốc BVTV' },
      { word: 'concentration', meaningVi: 'nồng độ phân tích' },
      { word: 'additive', meaningVi: 'phụ gia thực phẩm' },
    ],
  },
  {
    id: 'vis_food_03',
    trackId: 'food_testing',
    lessonId: 'esp_food_02',
    vocabId: 'esp_food_02_v09',
    word: 'colony count',
    ipa: '/ˈkɒləni kaʊnt/',
    partOfSpeech: 'noun',
    meaningVi: 'đếm mật độ khuẩn lạc (CFU)',
    visualCueVi:
      'Đĩa thạch Petri sau giai đoạn ủ mẫu (incubation) hiển thị rõ các chấm khuẩn lạc vi sinh vật, đặt cạnh ống hút định lượng micropipette và máy đếm khuẩn lạc kỹ thuật số.',
    exampleEn: 'The total aerobic colony count remained well below the acceptable limit.',
    exampleVi: 'Tổng số khuẩn lạc hiếu khí vẫn ở mức thấp hơn nhiều so với giới hạn cho phép.',
    imageUrl: '/src/assets/images/vocab_food_colony_petri_1795137657988.jpg',
    imageAltVi: 'Đĩa thạch petri chứa khuẩn lạc vi sinh vật cùng micropipette và máy đếm khuẩn lạc trong phòng thí nghiệm vi sinh',
    relatedTerms: [
      { word: 'incubation', meaningVi: 'quá trình ủ mẫu vi sinh' },
      { word: 'pathogen', meaningVi: 'vi sinh vật gây bệnh' },
      { word: 'pipette', meaningVi: 'ống hút định lượng' },
    ],
  },
];

// Lookup map used inside Lesson VocabularySection so learners see illustrations right on their lesson flashcards & list
export const ESP_VOCAB_IMAGE_MAP: Record<string, { imageUrl: string; captionVi: string; altVi: string }> = {
  esp_ew_01_v09: {
    imageUrl: '/src/assets/images/vocab_ew_directional_antenna_1795137657163.jpg',
    captionVi: 'Ăng-ten định hướng RF gắn trên tripod',
    altVi: 'Ăng-ten định hướng RF',
  },
  esp_ew_01_v02: {
    imageUrl: '/src/assets/images/vocab_ew_directional_antenna_1795137657163.jpg',
    captionVi: 'Thiết bị phát chùm sóng chế áp định hướng (jamming)',
    altVi: 'Thiết bị chế áp vô tuyến định hướng',
  },
  esp_ew_02_v04: {
    imageUrl: '/src/assets/images/vocab_ew_thermal_uav_1795137657959.jpg',
    captionVi: 'Màn hình ảnh nhiệt hồng ngoại theo dõi UAV',
    altVi: 'Ảnh nhiệt hồng ngoại phát hiện UAV',
  },
  esp_ew_02_v13: {
    imageUrl: '/src/assets/images/vocab_ew_thermal_uav_1795137657959.jpg',
    captionVi: 'UAV đang bay treo (hover) trong tầm ngắm cảm biến nhiệt',
    altVi: 'UAV bay treo trên màn hình nhiệt',
  },
  esp_ew_03_v01: {
    imageUrl: '/src/assets/images/vocab_ew_counter_uas_1795137657837.jpg',
    captionVi: 'Tổ hợp cảm biến phòng chống UAV (Counter-UAS) tại sân bay',
    altVi: 'Hệ thống phòng chống UAV tại sân bay',
  },
  esp_sec_01_v04: {
    imageUrl: '/src/assets/images/vocab_sec_xray_scanner_1795137655959.jpg',
    captionVi: 'Máy soi chiếu hành lý tia X sân bay',
    altVi: 'Máy soi chiếu tia X',
  },
  esp_sec_01_v05: {
    imageUrl: '/src/assets/images/vocab_sec_xray_scanner_1795137655959.jpg',
    captionVi: 'Khay đựng đồ cá nhân (tray) trên băng chuyền máy soi',
    altVi: 'Khay đựng đồ tại chốt soi chiếu',
  },
  esp_sec_01_v14: {
    imageUrl: '/src/assets/images/vocab_sec_xray_scanner_1795137655959.jpg',
    captionVi: 'Băng chuyền máy soi (conveyor belt) đưa hành lý qua buồng tia X',
    altVi: 'Băng chuyền máy soi tia X',
  },
  esp_sec_01_v03: {
    imageUrl: '/src/assets/images/vocab_sec_metal_detector_1795137657389.jpg',
    captionVi: 'Cổng dò kim loại đi bộ WTMD tại sân bay',
    altVi: 'Cổng dò kim loại đi bộ',
  },
  esp_sec_01_v15: {
    imageUrl: '/src/assets/images/vocab_sec_metal_detector_1795137657389.jpg',
    captionVi: 'Tay dò kim loại cầm tay đặt cạnh cổng từ',
    altVi: 'Tay dò kim loại cầm tay',
  },
  esp_sec_01_v12: {
    imageUrl: '/src/assets/images/vocab_sec_trace_swab_1795137656427.jpg',
    captionVi: 'Thao tác quét mẫu (swab) kiểm tra vết chất nổ trên vali',
    altVi: 'Quét mẫu vết chất nổ trên hành lý',
  },
  esp_sec_02_v07: {
    imageUrl: '/src/assets/images/vocab_sec_trace_swab_1795137656427.jpg',
    captionVi: 'Kiểm tra thứ cấp (secondary inspection) bằng máy dò vết ETD',
    altVi: 'Kiểm tra thứ cấp hành lý',
  },
  esp_food_01_v01: {
    imageUrl: '/src/assets/images/vocab_food_sampling_sterile_1795137655317.jpg',
    captionVi: 'Quy trình lấy mẫu thực phẩm đại diện vào túi kín',
    altVi: 'Lấy mẫu thực phẩm kiểm nghiệm',
  },
  esp_food_01_v03: {
    imageUrl: '/src/assets/images/vocab_food_sampling_sterile_1795137655317.jpg',
    captionVi: 'Thao tác lấy mẫu vô trùng (sterile) bằng găng tay & kẹp tiệt trùng',
    altVi: 'Lấy mẫu thực phẩm vô trùng',
  },
  esp_food_01_v15: {
    imageUrl: '/src/assets/images/vocab_food_sampling_sterile_1795137655317.jpg',
    captionVi: 'Thùng bảo quản chuỗi lạnh (cold chain) & nhiệt kế đầu dò',
    altVi: 'Thùng bảo quản lạnh mẫu thực phẩm',
  },
  esp_food_02_v06: {
    imageUrl: '/src/assets/images/vocab_food_hplc_lab_1795137657511.jpg',
    captionVi: 'Hệ thống sắc ký lỏng hiệu năng cao (HPLC) trong phòng Lab',
    altVi: 'Thiết bị sắc ký lỏng HPLC',
  },
  esp_food_02_v08: {
    imageUrl: '/src/assets/images/vocab_food_colony_petri_1795137657988.jpg',
    captionVi: 'Đĩa thạch sau quá trình ủ mẫu vi sinh (incubation)',
    altVi: 'Đĩa thạch ủ mẫu vi sinh',
  },
  esp_food_02_v09: {
    imageUrl: '/src/assets/images/vocab_food_colony_petri_1795137657988.jpg',
    captionVi: 'Đếm mật độ khuẩn lạc (colony count) bằng đĩa Petri & máy đếm',
    altVi: 'Đếm khuẩn lạc trên đĩa Petri',
  },
};
