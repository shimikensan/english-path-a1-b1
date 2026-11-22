import type { ReadingPassageDoc } from '../types';

export const READING_CATEGORIES = [
  'Động lực & Cuộc sống',
  'Thói quen tích cực',
  'Giao tiếp & Ứng xử',
  'Sức khỏe & Cân bằng',
  'Học tập & Sự nghiệp',
  'Trải nghiệm & Khám phá',
] as const;

export const DEFAULT_READING_PASSAGES: ReadingPassageDoc[] = [
  {
    passageId: 'read_no_pain_no_gain',
    titleEn: 'No Pain, No Gain',
    titleVi: 'Không Có Nỗ Lực, Không Có Thành Công',
    levelId: 'B1',
    category: 'Động lực & Cuộc sống',
    contentEn:
      "Success never comes without effort, and growth rarely happens inside your comfort zone. Every meaningful achievement demands patience, discipline, and the courage to face challenges. There will be days when you feel tired, discouraged, and ready to give up, but remember that every small step forward brings you closer to your goal. Learning a new skill, building a career, or changing your life requires consistent effort and determination. Don't be afraid of challenges; they are opportunities to discover your true potential. Remember, the road to success may not be easy, but every struggle teaches you something valuable. No pain, no gain—because nothing truly worthwhile comes without effort.",
    contentVi:
      'Thành công không bao giờ đến mà không có sự nỗ lực, và sự trưởng thành hiếm khi xảy ra bên trong vùng an toàn của bạn. Mọi thành tựu ý nghĩa đều đòi hỏi sự kiên nhẫn, tính kỷ luật và lòng dũng cảm để đối mặt với thử thách. Sẽ có những ngày bạn cảm thấy mệt mỏi, nản lòng và muốn bỏ cuộc, nhưng hãy nhớ rằng mỗi bước tiến nhỏ đều đưa bạn đến gần mục tiêu hơn. Học một kỹ năng mới, xây dựng sự nghiệp hay thay đổi cuộc đời đều cần sự cố gắng bền bỉ và lòng quyết tâm. Đừng sợ hãi những thử thách; chúng chính là cơ hội để bạn khám phá tiềm năng thực sự của bản thân. Hãy nhớ rằng con đường dẫn tới thành công có thể không dễ dàng, nhưng mỗi lần vấp ngã và cố gắng đều dạy cho bạn một bài học quý giá. Có làm mới có ăn — bởi chẳng có điều gì thực sự xứng đáng mà đến mà không cần nỗ lực.',
    keyPhrases: [
      { phrase: 'comfort zone', meaningVi: 'vùng an toàn' },
      { phrase: 'meaningful achievement', meaningVi: 'thành tựu ý nghĩa' },
      { phrase: 'discouraged', meaningVi: 'nản lòng, chán nản' },
      { phrase: 'consistent effort', meaningVi: 'nỗ lực bền bỉ, đều đặn' },
      { phrase: 'true potential', meaningVi: 'tiềm năng thực sự' },
      { phrase: 'worthwhile', meaningVi: 'xứng đáng, đáng giá' },
    ],
    estimatedMinutes: 3,
    order: 1,
    isPublished: true,
  },
  {
    passageId: 'read_small_morning_habits',
    titleEn: 'Small Morning Habits',
    titleVi: 'Những Thói Quen Buổi Sáng Nhỏ Bé',
    levelId: 'A1',
    category: 'Thói quen tích cực',
    contentEn:
      'How you start your morning often shapes the rest of your day. When you wake up, try not to check your phone right away. Instead, drink a glass of warm water, open the window for fresh air, and stretch your body for five minutes. Take a quiet moment to write down three simple things you want to finish today. Even small habits like making your bed or eating a healthy breakfast give you a calm sense of control. You do not need a perfect morning—just a peaceful start that helps you feel ready and focused.',
    contentVi:
      'Cách bạn bắt đầu buổi sáng thường định hình phần còn lại của cả ngày. Khi vừa thức dậy, hãy cố gắng đừng kiểm tra điện thoại ngay lập tức. Thay vào đó, hãy uống một ly nước ấm, mở cửa sổ đón không khí trong lành và giãn cơ trong năm phút. Dành một khoảnh khắc yên tĩnh để viết ra ba việc đơn giản bạn muốn hoàn thành hôm nay. Ngay cả những thói quen nhỏ như dọn giường hay ăn một bữa sáng lành mạnh cũng mang lại cảm giác chủ động và bình tĩnh. Bạn không cần một buổi sáng hoàn hảo — chỉ cần một khởi đầu thư thái giúp bạn cảm thấy sẵn sàng và tập trung.',
    keyPhrases: [
      { phrase: 'right away', meaningVi: 'ngay lập tức' },
      { phrase: 'stretch your body', meaningVi: 'vươn vai, giãn cơ' },
      { phrase: 'write down', meaningVi: 'viết ra, ghi chép lại' },
      { phrase: 'sense of control', meaningVi: 'cảm giác làm chủ, chủ động' },
      { phrase: 'peaceful start', meaningVi: 'khởi đầu bình yên' },
    ],
    estimatedMinutes: 2,
    order: 2,
    isPublished: true,
  },
  {
    passageId: 'read_power_of_thank_you',
    titleEn: 'The Power of a Simple "Thank You"',
    titleVi: 'Sức Mạnh Của Một Lời "Cảm Ơn" Giản Dị',
    levelId: 'A1',
    category: 'Giao tiếp & Ứng xử',
    contentEn:
      'Two short words—"thank you"—can brighten someone\'s entire day. In our busy lives, it is easy to take kindness for granted. A smiling cashier, a colleague who shares a helpful note, or a family member who cooks dinner all deserve our appreciation. Saying thank you sincerely shows respect and warmth. Even better, expressing gratitude also makes you happier because it trains your mind to notice the good things around you. Today, try saying thank you with eye contact and a genuine smile—you might be surprised by how much positive energy comes back.',
    contentVi:
      'Hai từ ngắn gọn — "cảm ơn" — có thể làm bừng sáng cả một ngày của ai đó. Trong nhịp sống bận rộn, ta rất dễ xem sự tử tế là điều hiển nhiên. Một nhân viên thu ngân mỉm cười, một đồng nghiệp chia sẻ ghi chú hữu ích hay người thân nấu bữa tối đều xứng đáng nhận được sự trân trọng của chúng ta. Nói lời cảm ơn chân thành thể hiện sự tôn trọng và ấm áp. Tuyệt vời hơn nữa, bày tỏ lòng biết ơn cũng giúp chính bạn hạnh phúc hơn vì nó rèn luyện tâm trí nhận ra những điều tốt đẹp xung quanh. Hôm nay, hãy thử nói cảm ơn kèm ánh mắt thân thiện và nụ cười chân thật — bạn có thể sẽ bất ngờ với nguồn năng lượng tích cực quay trở lại đấy.',
    keyPhrases: [
      { phrase: 'brighten someone\'s day', meaningVi: 'làm bừng sáng một ngày của ai đó' },
      { phrase: 'take ... for granted', meaningVi: 'xem điều gì là hiển nhiên' },
      { phrase: 'sincerely', meaningVi: 'một cách chân thành' },
      { phrase: 'express gratitude', meaningVi: 'bày tỏ lòng biết ơn' },
      { phrase: 'genuine smile', meaningVi: 'nụ cười chân thật' },
    ],
    estimatedMinutes: 2,
    order: 3,
    isPublished: true,
  },
  {
    passageId: 'read_short_walk_clears_mind',
    titleEn: 'Why a Short Walk Clears Your Mind',
    titleVi: 'Vì Sao Một Chuyến Đi Bộ Ngắn Giúp Đầu Óc Minh Mẫn',
    levelId: 'A2',
    category: 'Sức khỏe & Cân bằng',
    contentEn:
      'When you stare at a screen for hours, your thoughts can start to feel heavy and tangled. Stepping outside for a fifteen-minute walk is one of the simplest ways to refresh your brain. As you move at an easy pace, your breathing slows down, your shoulders relax, and blood flow to your brain increases. Notice the trees, the sky, and the everyday sounds around you instead of replaying stressful tasks in your head. Many great ideas appear not when we force ourselves to think harder, but when we give our minds room to breathe.',
    contentVi:
      'Khi bạn nhìn chằm chằm vào màn hình suốt nhiều giờ liền, suy nghĩ rất dễ trở nên nặng nề và rối rắm. Bước ra ngoài đi bộ khoảng mười lăm phút là một trong những cách đơn giản nhất để làm mới bộ não. Khi bạn sải bước nhẹ nhàng, nhịp thở chậm lại, đôi vai thả lỏng và lượng máu lưu thông lên não tăng lên. Hãy để ý đến hàng cây, bầu trời và những âm thanh đời thường xung quanh thay vì cứ xoay vòng với những công việc căng thẳng trong đầu. Rất nhiều ý tưởng tuyệt vời xuất hiện không phải lúc ta ép mình suy nghĩ căng hơn, mà khi ta cho tâm trí một khoảng trống để hít thở.',
    keyPhrases: [
      { phrase: 'stare at a screen', meaningVi: 'nhìn chằm chằm vào màn hình' },
      { phrase: 'tangled', meaningVi: 'rối rắm, rối tung' },
      { phrase: 'refresh your brain', meaningVi: 'làm mới bộ não' },
      { phrase: 'at an easy pace', meaningVi: 'với nhịp độ thư thái' },
      { phrase: 'room to breathe', meaningVi: 'không gian để thở / thư giãn' },
    ],
    estimatedMinutes: 2,
    order: 4,
    isPublished: true,
  },
  {
    passageId: 'read_learning_from_mistakes',
    titleEn: 'Mistakes Are Stepping Stones',
    titleVi: 'Sai Lầm Là Những Viên Đá Lót Đường',
    levelId: 'A2',
    category: 'Học tập & Sự nghiệp',
    contentEn:
      'Many English learners stay quiet because they are afraid of making grammar mistakes or mispronouncing a word. Yet nobody learns to ride a bicycle without losing balance a few times first. Every mistake gives you clear feedback about what to practice next. Native speakers rarely judge you for imperfect sentences; in fact, most people admire anyone who tries to communicate in a second language. Treat each error as a useful lesson rather than a failure. Speak bravely, listen carefully, and keep moving forward—confidence grows through practice, not perfection.',
    contentVi:
      'Nhiều người học tiếng Anh thường giữ im lặng vì sợ mắc lỗi ngữ pháp hay phát âm sai một từ nào đó. Thế nhưng chẳng ai học đi xe đạp mà chưa từng mất thăng bằng vài lần trước đó. Mỗi lỗi sai đều mang lại phản hồi rõ ràng về điều bạn cần luyện tập tiếp theo. Người bản xứ hiếm khi phán xét bạn vì những câu nói chưa hoàn hảo; thực tế, hầu hết mọi người đều ngưỡng mộ bất kỳ ai đang cố gắng giao tiếp bằng ngôn ngữ thứ hai. Hãy xem mỗi lỗi sai là một bài học hữu ích chứ không phải thất bại. Cứ mạnh dạn nói, chăm chú lắng nghe và tiếp tục tiến lên — sự tự tin lớn dần nhờ luyện tập, chứ không phải nhờ sự hoàn hảo.',
    keyPhrases: [
      { phrase: 'stepping stones', meaningVi: 'bàn đạp, viên đá lót đường' },
      { phrase: 'mispronounce', meaningVi: 'phát âm sai' },
      { phrase: 'lose balance', meaningVi: 'mất thăng bằng' },
      { phrase: 'clear feedback', meaningVi: 'phản hồi rõ ràng' },
      { phrase: 'rather than', meaningVi: 'thay vì, chứ không phải' },
    ],
    estimatedMinutes: 3,
    order: 5,
    isPublished: true,
  },
  {
    passageId: 'read_art_of_listening',
    titleEn: 'The Art of Listening Well',
    titleVi: 'Nghệ Thuật Lắng Nghe Đúng Cách',
    levelId: 'B1',
    category: 'Giao tiếp & Ứng xử',
    contentEn:
      'We often think great communicators are the people who speak the most, yet real connection begins with listening. Too many times, while someone is talking, we are already planning our reply instead of truly hearing their story. Active listening means putting away distractions, paying attention to tone and feelings, and asking thoughtful follow-up questions. When people feel genuinely heard, trust grows naturally and misunderstandings fade away. Whether at work or at home, offering someone your undivided attention is one of the rarest and most valuable gifts you can give.',
    contentVi:
      'Chúng ta thường nghĩ những người giao tiếp giỏi là người nói nhiều nhất, nhưng sự kết nối thực sự lại bắt đầu từ việc lắng nghe. Quá nhiều lần, trong khi người khác đang nói, ta đã vội chuẩn bị sẵn câu trả lời thay vì thực sự lắng nghe câu chuyện của họ. Lắng nghe chủ động nghĩa là gạt bỏ các yếu tố gây xao nhãng, chú ý đến giọng điệu cùng cảm xúc và đặt ra những câu hỏi tiếp nối tinh tế. Khi mọi người cảm thấy mình thực sự được lắng nghe, niềm tin sẽ lớn dần một cách tự nhiên và những hiểu lầm cũng tan biến. Dù ở nơi làm việc hay trong gia đình, dành cho ai đó sự chú tâm trọn vẹn chính là một trong những món quà hiếm có và quý giá nhất bạn có thể trao đi.',
    keyPhrases: [
      { phrase: 'active listening', meaningVi: 'lắng nghe chủ động' },
      { phrase: 'put away distractions', meaningVi: 'gạt bỏ điều gây xao nhãng' },
      { phrase: 'follow-up questions', meaningVi: 'câu hỏi tiếp nối, hỏi sâu thêm' },
      { phrase: 'fade away', meaningVi: 'tan biến, mờ dần' },
      { phrase: 'undivided attention', meaningVi: 'sự tập trung trọn vẹn' },
    ],
    estimatedMinutes: 3,
    order: 6,
    isPublished: true,
  },
  {
    passageId: 'read_digital_detox_focus',
    titleEn: 'Reclaiming Focus in a Noisy World',
    titleVi: 'Lấy Lại Sự Tập Trung Giữa Thế Giới Ồn Ào',
    levelId: 'B2',
    category: 'Thói quen tích cực',
    contentEn:
      'Notifications, endless feeds, and constant messages compete for our attention every waking minute. Although digital tools connect us across continents and accelerate our work, unchecked screen time quietly fragments our concentration and leaves us mentally exhausted. Reclaiming focus does not require abandoning technology; rather, it calls for deliberate boundaries. Setting phone-free study blocks, muting non-essential alerts, and reading long-form articles instead of skimming headlines can restore deep thinking. When you protect your attention with intention, you regain both clarity and the calm satisfaction of doing meaningful work well.',
    contentVi:
      'Thông báo liên tục, bảng tin vô tận và tin nhắn dồn dập tranh giành sự chú ý của chúng ta trong từng phút thức giấc. Dù các công cụ số giúp ta kết nối xuyên lục địa và đẩy nhanh tiến độ công việc, thời gian sử dụng màn hình thiếu kiểm soát lại âm thầm làm vụn vỡ khả năng tập trung và khiến tinh thần kiệt quệ. Lấy lại sự tập trung không đòi hỏi phải từ bỏ công nghệ; đúng hơn, nó cần những ranh giới có chủ đích. Thiết lập các khung giờ học không điện thoại, tắt những thông báo không thiết yếu và đọc các bài viết chuyên sâu thay vì chỉ lướt tiêu đề có thể khôi phục tư duy sâu sắc. Khi bạn chủ động bảo vệ sự chú tâm của mình, bạn sẽ tìm lại cả sự sáng suốt lẫn niềm mãn nguyện bình yên khi hoàn thành trọn vẹn những việc thực sự ý nghĩa.',
    keyPhrases: [
      { phrase: 'compete for attention', meaningVi: 'tranh giành sự chú ý' },
      { phrase: 'fragment concentration', meaningVi: 'làm phân tán/vụn vỡ sự tập trung' },
      { phrase: 'deliberate boundaries', meaningVi: 'ranh giới có chủ đích' },
      { phrase: 'non-essential alerts', meaningVi: 'thông báo không thiết yếu' },
      { phrase: 'deep thinking', meaningVi: 'tư duy sâu sắc' },
    ],
    estimatedMinutes: 4,
    order: 7,
    isPublished: true,
  },
  {
    passageId: 'read_quiet_resilience',
    titleEn: 'Quiet Resilience in Uncertain Times',
    titleVi: 'Bản Lĩnh Thầm Lặng Giữa Những Thời Điểm Bất Định',
    levelId: 'C1',
    category: 'Động lực & Cuộc sống',
    contentEn:
      'Resilience is often pictured as dramatic heroism, yet in everyday life it usually looks far quieter. It is the steady refusal to let a setback define your entire trajectory, and the humility to adapt when plans unravel unexpectedly. Navigating uncertainty demands distinguishing between circumstances beyond our influence and the choices still firmly within our hands—our attitude, our preparation, and our integrity. Over time, those who cultivate quiet resilience discover that adversity does not merely test character; it refines judgment, deepens empathy, and builds an enduring inner compass.',
    contentVi:
      'Sự kiên cường thường được hình dung như những hành động anh hùng đầy kịch tính, thế nhưng trong đời sống thường nhật, nó lại lặng lẽ hơn nhiều. Đó là sự kiên định không để một cú vấp ngã định đoạt cả hành trình của mình, cùng sự khiêm nhường biết thích nghi khi mọi kế hoạch bất ngờ đảo lộn. Vượt qua giai đoạn bất định đòi hỏi khả năng phân biệt giữa những hoàn cảnh nằm ngoài tầm kiểm soát với những lựa chọn vẫn nằm chắc trong tay ta — thái độ sống, sự chuẩn bị và chính trực của bản thân. Theo thời gian, những người rèn luyện được bản lĩnh thầm lặng sẽ nhận ra nghịch cảnh không chỉ thử thách nhân cách; nó còn tôi luyện khả năng phán đoán, làm sâu sắc thêm lòng thấu cảm và xây dựng một chiếc la bàn nội tâm bền vững.',
    keyPhrases: [
      { phrase: 'resilience', meaningVi: 'sự kiên cường, khả năng phục hồi' },
      { phrase: 'setback', meaningVi: 'trở ngại, bước lùi' },
      { phrase: 'unravel unexpectedly', meaningVi: 'đổ vỡ/rối tung bất ngờ' },
      { phrase: 'beyond our influence', meaningVi: 'ngoài tầm ảnh hưởng của ta' },
      { phrase: 'inner compass', meaningVi: 'la bàn nội tâm, kim chỉ nam bên trong' },
    ],
    estimatedMinutes: 4,
    order: 8,
    isPublished: true,
  },
];
