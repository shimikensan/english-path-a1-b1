import type { ReadingPassageDoc } from '../../types';

const CATEGORY = 'Sức khỏe & Cân bằng';

export const HEALTH_BALANCE_PASSAGES: ReadingPassageDoc[] = [
  {
    passageId: 'read_short_walk_clears_mind',
    titleEn: 'Why a Short Walk Clears Your Mind',
    titleVi: 'Vì Sao Một Chuyến Đi Bộ Ngắn Giúp Đầu Óc Minh Mẫn',
    levelId: 'A2',
    category: CATEGORY,
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
    passageId: 'read_hb_morning_sunlight_energy',
    titleEn: 'Catch Ten Minutes of Morning Sunlight',
    titleVi: 'Đón Mười Phút Nắng Sớm Mỗi Ngày',
    levelId: 'A1',
    category: CATEGORY,
    contentEn:
      'Before turning on bright office lights, step outside or stand near an open window for ten minutes of natural morning light. Soft sunlight gently tells your brain that daytime has started and it is time to feel awake. It also helps your body set a healthy sleep clock so you fall asleep more easily at night. You do not need to sit in hot noon sun—cool early morning light is enough. Drinking your tea on the porch or walking to the corner store is an easy, free way to boost your daily mood.',
    contentVi:
      'Trước khi bật đèn văn phòng sáng trưng, hãy bước ra ngoài hoặc đứng bên cửa sổ mở đón mười phút ánh sáng tự nhiên buổi sớm. Ánh nắng dịu nhẹ khẽ báo cho bộ não biết ban ngày đã bắt đầu và đã đến lúc tỉnh táo. Nó cũng giúp cơ thể thiết lập đồng hồ sinh học lành mạnh để ban đêm bạn dễ đi vào giấc ngủ hơn. Bạn không cần ngồi dưới nắng trưa gay gắt — ánh nắng sớm mát mẻ là đủ rồi. Uống tách trà ngoài hiên hay đi bộ ra cửa hàng đầu ngõ là cách miễn phí và đơn giản để nâng cao tâm trạng mỗi ngày.',
    keyPhrases: [
      { phrase: 'natural light', meaningVi: 'ánh sáng tự nhiên' },
      { phrase: 'sleep clock', meaningVi: 'đồng hồ giấc ngủ / nhịp sinh học' },
      { phrase: 'fall asleep', meaningVi: 'chìm vào giấc ngủ' },
      { phrase: 'boost your mood', meaningVi: 'nâng cao tâm trạng' },
    ],
    estimatedMinutes: 2,
    order: 105,
    isPublished: true,
  },
  {
    passageId: 'read_hb_deep_breathing_reset',
    titleEn: 'Three Deep Breaths to Calm Down',
    titleVi: 'Ba Nhịp Thở Sâu Để Lấy Lại Bình Tĩnh',
    levelId: 'A1',
    category: CATEGORY,
    contentEn:
      'When you feel stressed, your breath becomes short and fast without you even noticing. Luckily, you carry a free calming tool with you everywhere you go: your own lungs. Try breathing in slowly through your nose for four seconds, holding gently for two seconds, and breathing out through your mouth for six seconds. Repeat this just three times. A longer breath out tells your heart to slow down and your shoulders to drop. Whenever traffic, work, or worry feels too loud, three quiet breaths can bring you right back to center.',
    contentVi:
      'Khi bạn căng thẳng, hơi thở trở nên nông và gấp mà chính bạn cũng không nhận ra. May mắn là bạn luôn mang theo bên mình một công cụ xoa dịu miễn phí ở bất cứ đâu: chính lá phổi của bạn. Hãy thử hít vào chậm rãi bằng mũi trong bốn giây, giữ nhẹ hai giây rồi thở ra từ từ bằng miệng trong sáu giây. Lặp lại chỉ ba lần thôi. Nhịp thở ra dài hơn sẽ báo cho trái tim đập chậm lại và đôi vai thả lỏng xuống. Bất cứ khi nào kẹt xe, công việc hay lo âu trở nên quá ồn ào, ba hơi thở sâu tĩnh lặng có thể đưa bạn trở lại trạng thái cân bằng ngay lập tức.',
    keyPhrases: [
      { phrase: 'calming tool', meaningVi: 'công cụ giúp bình tĩnh/xoa dịu' },
      { phrase: 'breathe out slowly', meaningVi: 'thở ra chậm rãi' },
      { phrase: 'shoulders drop', meaningVi: 'đôi vai thả lỏng xuống' },
      { phrase: 'back to center', meaningVi: 'trở lại trạng thái cân bằng' },
    ],
    estimatedMinutes: 2,
    order: 106,
    isPublished: true,
  },
  {
    passageId: 'read_hb_rest_your_eyes_rule',
    titleEn: 'Give Your Eyes a Break Every Twenty Minutes',
    titleVi: 'Cho Đôi Mắt Nghỉ Ngơi Sau Mỗi Hai Mươi Phút',
    levelId: 'A1',
    category: CATEGORY,
    contentEn:
      'Phones, tablets, and laptops keep our eyes focused very close for hours every day. By evening, many people feel dry eyes, headaches, or blurry vision. Eye doctors recommend a super easy habit called the 20-20-20 rule. Every twenty minutes, look away from your screen at something about twenty feet away—like a tree or building outside your window—for twenty seconds. Blink a few times to keep your eyes fresh and moist. This tiny pause takes almost no time, yet it protects your sight for years to come.',
    contentVi:
      'Điện thoại, máy tính bảng và laptop khiến đôi mắt ta phải tập trung nhìn gần suốt nhiều giờ mỗi ngày. Đến tối, rất nhiều người bị khô mắt, đau đầu hoặc mờ mắt. Các bác sĩ nhãn khoa khuyên một thói quen cực kỳ dễ nhớ gọi là quy tắc 20-20-20. Sau mỗi hai mươi phút, hãy rời mắt khỏi màn hình và nhìn vào một vật ở cách xa khoảng sáu mét — như hàng cây hay tòa nhà ngoài cửa sổ — trong hai mươi giây. Chớp mắt vài lần để mắt được ẩm và dễ chịu. Quãng nghỉ tí hon này hầu như chẳng tốn thời gian, nhưng bảo vệ thị lực của bạn trong nhiều năm dài.',
    keyPhrases: [
      { phrase: 'blurry vision', meaningVi: 'tầm nhìn mờ, nhòe mắt' },
      { phrase: 'look away from', meaningVi: 'rời mắt khỏi' },
      { phrase: 'blink', meaningVi: 'chớp mắt' },
      { phrase: 'for years to come', meaningVi: 'trong nhiều năm tới' },
    ],
    estimatedMinutes: 2,
    order: 107,
    isPublished: true,
  },
  {
    passageId: 'read_hb_colorful_plate_eating',
    titleEn: 'Add More Color to Your Plate',
    titleVi: 'Thêm Sắc Màu Tự Nhiên Cho Bữa Ăn Của Bạn',
    levelId: 'A1',
    category: CATEGORY,
    contentEn:
      'Healthy eating does not have to be complicated or strict. One simple way to eat better is to look at the colors on your dinner plate. Green leafy vegetables, orange carrots, red tomatoes, and purple berries each carry different vitamins that help your body stay strong. You do not have to give up every treat you love. Just try adding one extra colorful vegetable or piece of fresh fruit to each meal. Over time, nourishing foods naturally give you lighter digestion and steadier energy all afternoon.',
    contentVi:
      'Ăn uống lành mạnh không nhất thiết phải phức tạp hay kiêng khem khắc nghiệt. Một cách đơn giản để ăn tốt hơn là nhìn vào màu sắc trên đĩa cơm của bạn. Rau xanh, cà rốt cam, cà chua đỏ và các loại quả mọng tím đều mang những loại vitamin khác nhau giúp cơ thể khỏe mạnh. Bạn không cần từ bỏ hoàn toàn mọi món ngon mình thích. Chỉ cần thử thêm một loại rau nhiều màu sắc hoặc một miếng trái cây tươi vào mỗi bữa ăn. Theo thời gian, thực phẩm giàu dưỡng chất sẽ tự nhiên giúp hệ tiêu hóa nhẹ nhàng hơn và duy trì năng lượng ổn định suốt buổi chiều.',
    keyPhrases: [
      { phrase: 'leafy vegetables', meaningVi: 'rau ăn lá' },
      { phrase: 'give up treats', meaningVi: 'từ bỏ các món khoái khẩu' },
      { phrase: 'nourishing foods', meaningVi: 'thực phẩm giàu dưỡng chất' },
      { phrase: 'lighter digestion', meaningVi: 'tiêu hóa nhẹ nhàng hơn' },
    ],
    estimatedMinutes: 2,
    order: 108,
    isPublished: true,
  },
  {
    passageId: 'read_hb_stretch_your_neck_desk',
    titleEn: 'Stand Up and Stretch Your Back',
    titleVi: 'Đứng Dậy Vươn Vai Và Giãn Lưng',
    levelId: 'A1',
    category: CATEGORY,
    contentEn:
      'Sitting in one chair all day makes your neck stiff and your lower back ache. Our bodies were built to move, bend, and walk—not stay frozen in one shape for eight hours. Every hour, stand up for just two minutes. Roll your shoulders backward, lift both arms high toward the ceiling, and gently turn your head from side to side. Walk across the room to refill your water glass. These quick stretches wake up tight muscles and keep you feeling comfortable and active long after the workday ends.',
    contentVi:
      'Ngồi yên trên một chiếc ghế suốt cả ngày khiến cổ bạn cứng đờ và vùng thắt lưng đau nhức. Cơ thể chúng ta vốn được tạo ra để vận động, cúi gập và đi lại — chứ không phải giữ nguyên một tư thế suốt tám tiếng. Mỗi giờ một lần, hãy đứng dậy chỉ trong hai phút. Xoay vai ra sau, vươn cao hai tay hướng lên trần nhà và nhẹ nhàng quay đầu sang hai bên. Đi một vòng quanh phòng để rót thêm nước. Những động tác giãn cơ nhanh này đánh thức các nhóm cơ bị căng cứng và giúp bạn luôn thấy dễ chịu, năng động ngay cả khi ngày làm việc đã kết thúc.',
    keyPhrases: [
      { phrase: 'stiff neck', meaningVi: 'cổ bị cứng, mỏi cổ' },
      { phrase: 'roll your shoulders', meaningVi: 'xoay khớp vai' },
      { phrase: 'tight muscles', meaningVi: 'các nhóm cơ căng cứng' },
      { phrase: 'refill your glass', meaningVi: 'rót thêm nước vào ly' },
    ],
    estimatedMinutes: 2,
    order: 109,
    isPublished: true,
  },
  {
    passageId: 'read_hb_sleep_is_superpower',
    titleEn: 'Good Sleep Is Your Daily Superpower',
    titleVi: 'Giấc Ngủ Ngon Là Siêu Năng Lực Hằng Ngày',
    levelId: 'A1',
    category: CATEGORY,
    contentEn:
      'Sometimes we stay up past midnight to watch one more episode or finish extra work, thinking sleep can wait. The next morning, however, everything feels harder—small problems feel huge, memory gets foggy, and sweet cravings rise. Seven to eight hours of calm sleep repairs your muscles, organizes what you studied, and refreshes your heart. Try dimming the lights and putting your phone away thirty minutes before bedtime. Treating sleep as a gift rather than wasted time will make every waking hour brighter and stronger.',
    contentVi:
      'Đôi khi ta thức quá nửa đêm để xem thêm một tập phim hay làm cố thêm chút việc, nghĩ rằng giấc ngủ có thể chờ. Thế nhưng sáng hôm sau, mọi thứ đều trở nên khó khăn hơn — rắc rối nhỏ hóa lớn, trí nhớ mờ mịt và cơn thèm đồ ngọt tăng vọt. Bảy đến tám tiếng ngủ êm ái giúp phục hồi cơ bắp, sắp xếp lại kiến thức bạn đã học và làm dịu trái tim. Hãy thử giảm ánh sáng đèn và cất điện thoại cách giờ ngủ ba mươi phút. Coi giấc ngủ như một món quà thay vì thời gian lãng phí sẽ khiến từng giờ thức giấc của bạn tươi tỉnh và tràn đầy sức sống hơn.',
    keyPhrases: [
      { phrase: 'stay up past midnight', meaningVi: 'thức quá nửa đêm' },
      { phrase: 'foggy memory', meaningVi: 'trí nhớ mụ mị, kém minh mẫn' },
      { phrase: 'dim the lights', meaningVi: 'giảm ánh sáng đèn' },
      { phrase: 'waking hours', meaningVi: 'những giờ thức giấc' },
    ],
    estimatedMinutes: 2,
    order: 110,
    isPublished: true,
  },
  {
    passageId: 'read_hb_eating_slowly_mindfully',
    titleEn: 'Slow Down and Actually Taste Your Food',
    titleVi: 'Ăn Chậm Lại Và Thực Sự Cảm Nhận Món Ăn',
    levelId: 'A2',
    category: CATEGORY,
    contentEn:
      'How often do you finish an entire lunch while scrolling your phone and barely remember how it tasted? Eating in a hurry makes it hard for your stomach to signal your brain that you are comfortably full, which often leads to overeating and afternoon sleepiness. Try setting your fork or chopsticks down between bites and noticing the flavors, warmth, and crunch of your meal. Slowing down by just ten minutes helps your body digest food better and turns a routine meal into a peaceful break in the middle of a busy day.',
    contentVi:
      'Có bao nhiêu lần bạn ăn xong cả bữa trưa trong lúc lướt điện thoại mà gần như chẳng nhớ món ăn có vị gì? Ăn quá vội khiến dạ dày khó kịp gửi tín hiệu lên não rằng bạn đã no vừa đủ, từ đó dễ dẫn tới ăn quá nhiều và buồn ngủ vào buổi chiều. Hãy thử đặt đũa hoặc nĩa xuống giữa các miếng ăn và cảm nhận hương vị, độ ấm cũng như độ giòn của món ăn. Chỉ cần ăn chậm hơn mười phút sẽ giúp cơ thể tiêu hóa tốt hơn và biến bữa ăn thường nhật thành quãng nghỉ bình yên giữa ngày bận rộn.',
    keyPhrases: [
      { phrase: 'in a hurry', meaningVi: 'vội vã, hấp tấp' },
      { phrase: 'comfortably full', meaningVi: 'no vừa đủ, dễ chịu' },
      { phrase: 'overeating', meaningVi: 'ăn quá mức' },
      { phrase: 'digest food better', meaningVi: 'tiêu hóa thức ăn tốt hơn' },
    ],
    estimatedMinutes: 3,
    order: 111,
    isPublished: true,
  },
  {
    passageId: 'read_hb_joyful_movement_over_punishment',
    titleEn: 'Choose Movement You Actually Enjoy',
    titleVi: 'Chọn Hình Thức Vận Động Mà Bạn Thực Sự Yêu Thích',
    levelId: 'A2',
    category: CATEGORY,
    contentEn:
      'Many people quit exercising after three weeks because they force themselves into workouts they secretly hate. If running on a treadmill feels like punishment, your brain will always look for excuses to skip it. Movement does not have to happen inside a gym to count. Swimming, badminton with friends, cycling through a park, dancing in your living room, or brisk walking with music all strengthen your heart and lift your spirits. The best exercise routine in the world is simply the one you look forward to doing again tomorrow.',
    contentVi:
      'Nhiều người bỏ tập thể dục chỉ sau ba tuần vì họ ép bản thân theo những bài tập mà trong lòng họ chẳng hề thích. Nếu chạy trên máy khiến bạn cảm thấy như bị phạt, bộ não sẽ luôn tìm cớ để trốn tập. Vận động không nhất thiết phải diễn ra trong phòng gym mới có giá trị. Bơi lội, đánh cầu lông cùng bạn bè, đạp xe qua công viên, nhảy theo nhạc trong phòng khách hay đi bộ nhanh nghe nhạc đều giúp tim khỏe hơn và tinh thần phấn chấn. Chế độ tập luyện tốt nhất thế giới đơn giản là hoạt động khiến bạn háo hức muốn lặp lại vào ngày mai.',
    keyPhrases: [
      { phrase: 'look for excuses', meaningVi: 'tìm cớ né tránh' },
      { phrase: 'brisk walking', meaningVi: 'đi bộ nhanh' },
      { phrase: 'lift your spirits', meaningVi: 'nâng cao tinh thần, làm vui vẻ hơn' },
      { phrase: 'look forward to', meaningVi: 'mong chờ, háo hức' },
    ],
    estimatedMinutes: 3,
    order: 112,
    isPublished: true,
  },
  {
    passageId: 'read_hb_caffeine_timing_sleep',
    titleEn: 'When Your Afternoon Coffee Steals Tonight’s Sleep',
    titleVi: 'Khi Ly Cà Phê Buổi Chiều Lấy Mất Giấc Ngủ Đêm Nay',
    levelId: 'A2',
    category: CATEGORY,
    contentEn:
      'A cup of iced coffee at four in the afternoon feels like a helpful boost when energy dips at the office. What many people do not realize is that caffeine stays active in the bloodstream for six to eight hours. Even if you manage to fall asleep at eleven, lingering caffeine quietly reduces the depth and quality of your rest, leaving you groggy the next morning and reaching for even more coffee. Try enjoying your favorite coffee before early afternoon and switching to herbal tea or lemon water later in the day.',
    contentVi:
      'Một ly cà phê đá lúc bốn giờ chiều mang lại cảm giác tỉnh táo tức thì khi năng lượng chùng xuống ở văn phòng. Điều nhiều người không để ý là caffeine vẫn hoạt động trong máu suốt sáu đến tám giờ đồng hồ. Ngay cả khi bạn vẫn ngủ được lúc mười một giờ đêm, lượng caffeine tồn dư vẫn âm thầm làm giảm độ sâu và chất lượng giấc ngủ, khiến sáng hôm sau bạn uể oải rồi lại tìm đến nhiều cà phê hơn. Hãy thử thưởng thức ly cà phê yêu thích trước đầu giờ chiều và chuyển sang trà thảo mộc hoặc nước chanh vào cuối ngày.',
    keyPhrases: [
      { phrase: 'energy dips', meaningVi: 'năng lượng sụt giảm, chùng xuống' },
      { phrase: 'lingering caffeine', meaningVi: 'lượng caffeine còn tồn dư' },
      { phrase: 'groggy', meaningVi: 'uể oải, lơ mơ chưa tỉnh táo' },
      { phrase: 'herbal tea', meaningVi: 'trà thảo mộc' },
    ],
    estimatedMinutes: 3,
    order: 113,
    isPublished: true,
  },
  {
    passageId: 'read_hb_power_of_twenty_minute_nap',
    titleEn: 'The Magic of a Twenty-Minute Power Nap',
    titleVi: 'Phép Màu Của Giấc Ngủ Trưa Hai Mươi Phút',
    levelId: 'A2',
    category: CATEGORY,
    contentEn:
      'Feeling sleepy right after lunch is not laziness—it is a natural dip in the human body’s daily rhythm. Instead of fighting tired eyes for two unproductive hours, a short nap of fifteen to twenty minutes can refresh your focus remarkably well. Keep the nap short so you wake up feeling light rather than heavy and disoriented. Rest in a dim, quiet spot, set a gentle alarm, and splash cool water on your face afterward. Even resting quietly with closed eyes gives a busy brain a welcome reset for the second half of the day.',
    contentVi:
      'Cảm thấy buồn ngủ ngay sau bữa trưa không phải là lười biếng — đó là nhịp chùng xuống tự nhiên trong đồng hồ sinh học hằng ngày của cơ thể người. Thay vì vật lộn với đôi mắt díp lại suốt hai giờ kém hiệu quả, một giấc chợp mắt ngắn từ mười lăm đến hai mươi phút có thể phục hồi sự tập trung đáng kinh ngạc. Hãy giữ giấc ngủ trưa ngắn để khi tỉnh dậy bạn thấy nhẹ nhàng chứ không nặng đầu choáng váng. Nghỉ ở nơi dịu sáng, yên tĩnh, đặt chuông báo nhẹ nhàng và rửa mặt bằng nước mát sau khi thức dậy. Ngay cả việc nhắm mắt nằm nghỉ yên lặng cũng mang lại khoảng tái tạo quý giá cho nửa ngày còn lại.',
    keyPhrases: [
      { phrase: 'power nap', meaningVi: 'giấc ngủ ngắn phục hồi năng lượng' },
      { phrase: 'daily rhythm', meaningVi: 'nhịp sinh học hằng ngày' },
      { phrase: 'disoriented', meaningVi: 'mất phương hướng, choáng váng' },
      { phrase: 'welcome reset', meaningVi: 'khoảng tái khởi động dễ chịu' },
    ],
    estimatedMinutes: 3,
    order: 114,
    isPublished: true,
  },
  {
    passageId: 'read_hb_nature_heals_stress',
    titleEn: 'Why Spending Time Around Trees Lowers Stress',
    titleVi: 'Vì Sao Ở Gần Cây Xanh Giúp Giảm Căng Thẳng',
    levelId: 'A2',
    category: CATEGORY,
    contentEn:
      'City life offers convenience and excitement, yet concrete walls, bright signs, and constant traffic noise quietly wear on our nerves. Spending even half an hour in a tree-lined park, near a river, or tending a few potted plants on a balcony gives your mind a gentle break. Studies show that looking at green leaves and hearing wind or birds lowers blood pressure and eases anxious thoughts. You do not need a weekend mountain trip to feel nature’s calm—a quiet bench under a shady tree on Sunday morning works wonders.',
    contentVi:
      'Đời sống thành thị mang lại nhiều tiện nghi và sôi động, nhưng những bức tường bê tông, biển hiệu chói mắt và tiếng xe cộ liên hồi lại âm thầm bào mòn thần kinh chúng ta. Dành dù chỉ nửa giờ ở công viên nhiều cây, bên bờ sông hay chăm sóc vài chậu cây nhỏ ngoài ban công sẽ cho tâm trí một khoảng nghỉ dịu dàng. Các nghiên cứu chỉ ra rằng ngắm tán lá xanh và lắng nghe tiếng gió hay tiếng chim giúp hạ huyết áp và xoa dịu nỗi lo âu. Bạn không cần một chuyến đi núi cuối tuần mới cảm nhận được sự bình yên của thiên nhiên — một chiếc ghế đá dưới tán cây râm mát sáng Chủ Nhật cũng mang lại hiệu quả tuyệt vời.',
    keyPhrases: [
      { phrase: 'wear on our nerves', meaningVi: 'làm căng thẳng/mòn mỏi thần kinh' },
      { phrase: 'potted plants', meaningVi: 'những chậu cây cảnh' },
      { phrase: 'lower blood pressure', meaningVi: 'giảm huyết áp' },
      { phrase: 'work wonders', meaningVi: 'mang lại hiệu quả kỳ diệu' },
    ],
    estimatedMinutes: 3,
    order: 115,
    isPublished: true,
  },
  {
    passageId: 'read_hb_listening_to_tired_body',
    titleEn: 'Rest Before Your Body Forces You To',
    titleVi: 'Hãy Nghỉ Ngơi Trước Khi Cơ Thể Bắt Buộc Bạn Phải Dừng Lại',
    levelId: 'A2',
    category: CATEGORY,
    contentEn:
      'When we have big goals, it is tempting to ignore mild warning signs like stiff shoulders, frequent colds, or short tempers. We promise ourselves we will rest once the project is finished, yet another busy week always follows. If you ignore your body’s whispers for too long, it eventually starts shouting through exhaustion or illness. Scheduling genuine rest—an early night, a quiet afternoon with no chores, or a gentle walk—is not a sign of weakness. Taking care of your health early keeps you strong enough to enjoy everything you work so hard to build.',
    contentVi:
      'Khi theo đuổi những mục tiêu lớn, ta rất dễ phớt lờ những tín hiệu cảnh báo nhẹ như đau mỏi vai gáy, hay cảm vặt hoặc dễ cáu gắt. Ta tự hứa sẽ nghỉ khi dự án xong, nhưng rồi một tuần bận rộn khác lại nối tiếp ngay sau đó. Nếu bạn bỏ ngoài tai những lời thì thầm của cơ thể quá lâu, cuối cùng nó sẽ buộc phải lên tiếng bằng sự kiệt quệ hay bệnh tật. Chủ động lên lịch nghỉ ngơi thực thụ — một buổi tối đi ngủ sớm, một buổi chiều thảnh thơi không việc nhà hay cuộc dạo bộ nhẹ nhàng — không phải biểu hiện của yếu đuối. Chăm sóc sức khỏe từ sớm giúp bạn đủ bền bỉ để tận hưởng mọi thành quả mình dày công gây dựng.',
    keyPhrases: [
      { phrase: 'warning signs', meaningVi: 'dấu hiệu cảnh báo' },
      { phrase: 'short temper', meaningVi: 'dễ nóng nảy, cáu gắt' },
      { phrase: 'genuine rest', meaningVi: 'sự nghỉ ngơi thực thụ' },
      { phrase: 'ignore whispers', meaningVi: 'phớt lờ những dấu hiệu sớm' },
    ],
    estimatedMinutes: 3,
    order: 116,
    isPublished: true,
  },
  {
    passageId: 'read_hb_laughter_real_medicine',
    titleEn: 'Why Genuine Laughter Protects Your Health',
    titleVi: 'Vì Sao Tiếng Cười Chân Thành Bảo Vệ Sức Khỏe Của Bạn',
    levelId: 'B1',
    category: CATEGORY,
    contentEn:
      'People often joke that laughter is the best medicine, and modern science largely agrees. A hearty laugh relaxes tight muscles, deepens breathing, releases feel-good hormones, and lowers stress chemicals in the body. Beyond physical benefits, sharing humor with coworkers or family softens tense situations and reminds us not to take minor setbacks too seriously. In an adult world packed with serious deadlines, making room for comedy, playful stories, and friends who make you laugh is not childish—it is essential emotional maintenance.',
    contentVi:
      'Người ta hay nói vui rằng một nụ cười bằng mười thang thuốc bổ, và khoa học hiện đại cũng phần lớn đồng tình với điều đó. Một tràng cười sảng khoái giúp giãn các nhóm cơ căng cứng, làm hơi thở sâu hơn, giải phóng hormone tạo cảm giác hạnh phúc và giảm các chất gây căng thẳng trong cơ thể. Vượt lên lợi ích thể chất, chia sẻ sự hài hước với đồng nghiệp hay gia đình giúp làm dịu tình huống căng thẳng và nhắc ta đừng quá nặng nề trước những trục trặc nhỏ. Trong thế giới người lớn đầy ắp hạn chót nghiêm túc, dành chỗ cho tiếng cười, những câu chuyện dí dỏm và bạn bè vui tính không hề trẻ con — đó là cách bảo dưỡng cảm xúc thiết yếu.',
    keyPhrases: [
      { phrase: 'hearty laugh', meaningVi: 'tràng cười sảng khoái' },
      { phrase: 'soften tense situations', meaningVi: 'làm dịu các tình huống căng thẳng' },
      { phrase: 'take ... too seriously', meaningVi: 'quá nặng nề, nghiêm trọng hóa' },
      { phrase: 'emotional maintenance', meaningVi: 'sự bảo dưỡng/chăm sóc cảm xúc' },
    ],
    estimatedMinutes: 3,
    order: 117,
    isPublished: true,
  },
  {
    passageId: 'read_hb_recognizing_burnout_early',
    titleEn: 'Spotting the Early Signs of Burnout',
    titleVi: 'Nhận Diện Sớm Những Dấu Hiệu Của Kiệt Sức Nghề Nghiệp',
    levelId: 'B1',
    category: CATEGORY,
    contentEn:
      'Burnout rarely strikes in a single afternoon; it builds gradually after months of running on empty without enough recovery. Early clues include waking up tired despite sleeping, feeling detached from work you once cared about, and struggling to focus on simple decisions. When burnout sets in, pushing even harder usually backfires and slows recovery further. Catching the pattern early allows you to make protective adjustments—delegating tasks, taking real days off without checking email, talking honestly with a manager or doctor, and reconnecting with hobbies outside of work.',
    contentVi:
      'Kiệt sức nghề nghiệp hiếm khi ập đến chỉ trong một buổi chiều; nó tích tụ dần sau nhiều tháng bạn chạy bằng năng lượng cạn kiệt mà thiếu phục hồi. Những dấu hiệu sớm bao gồm thức dậy vẫn mệt dù đã ngủ, cảm thấy thờ ơ với công việc mình từng yêu thích và chật vật tập trung vào cả những quyết định đơn giản. Khi kiệt sức đã hình thành, cố gồng mình làm mạnh hơn thường phản tác dụng và kéo dài quá trình hồi phục. Nhận diện quy luật này từ sớm giúp bạn chủ động điều chỉnh để tự bảo vệ — san sẻ đầu việc, nghỉ ngơi trọn vẹn không kiểm tra email, trao đổi thẳng thắn với quản lý hoặc bác sĩ và kết nối lại với sở thích ngoài công việc.',
    keyPhrases: [
      { phrase: 'run on empty', meaningVi: 'vận hành trong tình trạng cạn kiệt năng lượng' },
      { phrase: 'feel detached', meaningVi: 'cảm thấy xa cách, thờ ơ' },
      { phrase: 'backfire', meaningVi: 'phản tác dụng' },
      { phrase: 'delegate tasks', meaningVi: 'phân giao, san sẻ công việc' },
    ],
    estimatedMinutes: 3,
    order: 118,
    isPublished: true,
  },
  {
    passageId: 'read_hb_protecting_your_posture',
    titleEn: 'Caring for Your Spine in a Desk-Bound World',
    titleVi: 'Chăm Sóc Cột Sống Trong Thời Đại Ngồi Bàn Giấy',
    levelId: 'B1',
    category: CATEGORY,
    contentEn:
      'Hours of leaning forward toward laptops and looking down at smartphones place surprising extra strain on the neck and upper back. Over years, poor posture can trigger chronic aches, shallow breathing, and low energy. Fortunately, small ergonomic habits protect your spine remarkably well. Raise your laptop screen closer to eye level, keep both feet flat on the floor, and alternate between sitting and standing whenever possible. Pairing simple workspace adjustments with ten minutes of core and back strengthening a few times a week pays off for decades.',
    contentVi:
      'Hàng giờ rướn người về phía máy tính xách tay và cúi đầu nhìn điện thoại đặt một áp lực lớn đến bất ngờ lên vùng cổ và lưng trên. Qua nhiều năm, tư thế sai có thể gây đau nhức mạn tính, hơi thở nông và uể oải. May mắn là vài thói quen công thái học nhỏ giúp bảo vệ cột sống rất tốt. Hãy nâng màn hình máy tính lên gần ngang tầm mắt, đặt cả hai bàn chân phẳng trên sàn và luân phiên giữa ngồi với đứng bất cứ khi nào có thể. Kết hợp điều chỉnh góc làm việc đơn giản với mười phút tập tăng sức mạnh cơ lõi và lưng vài lần mỗi tuần sẽ mang lại lợi ích suốt nhiều thập kỷ.',
    keyPhrases: [
      { phrase: 'desk-bound', meaningVi: 'gắn liền với bàn làm việc, ít vận động' },
      { phrase: 'ergonomic habits', meaningVi: 'thói quen công thái học (tốt cho tư thế)' },
      { phrase: 'chronic aches', meaningVi: 'những cơn đau nhức mạn tính' },
      { phrase: 'pay off for decades', meaningVi: 'mang lại lợi ích suốt nhiều thập kỷ' },
    ],
    estimatedMinutes: 3,
    order: 119,
    isPublished: true,
  },
  {
    passageId: 'read_hb_hobby_without_monetizing',
    titleEn: 'Keeping a Hobby Just for Pure Joy',
    titleVi: 'Giữ Một Sở Thích Chỉ Vì Niềm Vui Thuần Khiết',
    levelId: 'B1',
    category: CATEGORY,
    contentEn:
      'Modern culture loves turning every personal interest into a side hustle. If you bake tasty bread, someone suggests opening an online shop; if you enjoy photography, you feel pressured to grow a huge social media following. Yet when every hobby is measured by likes or income, you lose your last safe playground for pure relaxation. Keeping at least one activity purely for fun—sketching imperfectly, tending a small garden, playing chess, or strumming a guitar—gives your nervous system permission to play without judgment or deadlines.',
    contentVi:
      'Văn hóa hiện đại rất thích biến mọi đam mê cá nhân thành một nghề tay trái. Nếu bạn nướng bánh mì ngon, ai đó sẽ gợi ý mở tiệm online; nếu bạn thích chụp ảnh, bạn lại thấy áp lực phải kéo thật nhiều người theo dõi trên mạng xã hội. Thế nhưng khi mọi sở thích đều bị đo bằng lượt thích hay thu nhập, bạn sẽ đánh mất sân chơi an toàn cuối cùng cho sự thư giãn thuần túy. Giữ lại ít nhất một hoạt động chỉ để vui — vẽ nguệch ngoạc chẳng cần đẹp, chăm khu vườn nhỏ, đánh cờ hay gảy đàn guitar — cho phép hệ thần kinh của bạn được vui chơi mà không có sự phán xét hay hạn chót nào.',
    keyPhrases: [
      { phrase: 'side hustle', meaningVi: 'nghề tay trái, công việc kiếm thêm' },
      { phrase: 'pure relaxation', meaningVi: 'sự thư giãn thuần túy' },
      { phrase: 'without judgment', meaningVi: 'không bị phán xét' },
      { phrase: 'safe playground', meaningVi: 'khoảng không gian vui chơi an toàn' },
    ],
    estimatedMinutes: 3,
    order: 120,
    isPublished: true,
  },
  {
    passageId: 'read_hb_hydration_and_focus',
    titleEn: 'How Mild Dehydration Quietly Affects Mood',
    titleVi: 'Thiếu Nước Nhẹ Ảnh Hưởng Thầm Lặng Tới Tâm Trạng Ra Sao',
    levelId: 'B1',
    category: CATEGORY,
    contentEn:
      'Most of us wait until our throat feels dry before reaching for water, yet thirst is actually a delayed signal that mild dehydration has already begun. Even a small drop in hydration can noticeably reduce short-term memory, slow reaction speed, and make small annoyances feel much heavier. In air-conditioned offices or hot humid climates, fluid loss happens steadily even when you are not sweating visibly. Sipping plain water consistently throughout the day—and eating water-rich fruits like oranges or watermelon—keeps both your concentration and your temper remarkably steady.',
    contentVi:
      'Phần lớn chúng ta đợi đến khi cổ họng khô rát mới với lấy nước, nhưng cơn khát thực chất là tín hiệu trễ báo rằng tình trạng thiếu nước nhẹ đã bắt đầu. Ngay cả một sự sụt giảm nhỏ về lượng nước trong cơ thể cũng có thể làm suy giảm rõ rệt trí nhớ ngắn hạn, chậm phản xạ và khiến những bực bội nhỏ trở nên nặng nề hơn nhiều. Trong văn phòng máy lạnh hay thời tiết nóng ẩm, cơ thể vẫn mất nước đều đặn ngay cả khi bạn không đổ mồ hôi thấy rõ. Uống nước lọc từng ngụm đều đặn cả ngày — kết hợp các loại trái cây giàu nước như cam hay dưa hấu — sẽ giữ cho cả sự tập trung lẫn tâm trạng của bạn ổn định đáng kể.',
    keyPhrases: [
      { phrase: 'delayed signal', meaningVi: 'tín hiệu chậm trễ' },
      { phrase: 'mild dehydration', meaningVi: 'tình trạng thiếu nước nhẹ' },
      { phrase: 'short-term memory', meaningVi: 'trí nhớ ngắn hạn' },
      { phrase: 'water-rich fruits', meaningVi: 'trái cây giàu nước' },
    ],
    estimatedMinutes: 3,
    order: 121,
    isPublished: true,
  },
  {
    passageId: 'read_hb_evening_wind_down',
    titleEn: 'Building a Gentle Bridge into Sleep',
    titleVi: 'Xây Dựng Khoảng Lắng Dịu Êm Trước Giờ Ngủ',
    levelId: 'B1',
    category: CATEGORY,
    contentEn:
      'We cannot expect the human brain to jump from intense work or bright social feeds straight into deep sleep like flipping a light switch. Just as an airplane needs a runway to slow down smoothly before landing, your mind needs an evening wind-down routine. During the final forty-five minutes before bed, switch to warm lamp lighting, take a warm shower, stretch lightly, or read a calming paper book. Keeping your bedroom cool, quiet, and dedicated to rest trains your brain to recognize bedtime signals automatically and drift off peacefully.',
    contentVi:
      'Chúng ta không thể kỳ vọng bộ não nhảy vọt từ công việc căng thẳng hay màn hình sáng rực sang giấc ngủ sâu ngay lập tức như bật tắt công tắc đèn. Cũng giống như máy bay cần đường băng để giảm tốc êm ái trước khi hạ cánh, tâm trí bạn cần một khoảng lắng nhẹ nhàng vào buổi tối. Trong bốn mươi lăm phút cuối trước khi ngủ, hãy chuyển sang ánh đèn vàng ấm, tắm nước ấm, giãn cơ nhẹ hoặc đọc một cuốn sách giấy êm dịu. Giữ phòng ngủ mát mẻ, yên tĩnh và chỉ dành cho nghỉ ngơi sẽ rèn cho não tự động nhận diện tín hiệu giờ ngủ và chìm vào giấc ngủ bình yên.',
    keyPhrases: [
      { phrase: 'wind-down routine', meaningVi: 'thói quen thư giãn cuối ngày' },
      { phrase: 'like flipping a switch', meaningVi: 'như bật/tắt một công tắc' },
      { phrase: 'warm lighting', meaningVi: 'ánh sáng vàng dịu ấm' },
      { phrase: 'drift off peacefully', meaningVi: 'chìm vào giấc ngủ êm ái' },
    ],
    estimatedMinutes: 3,
    order: 122,
    isPublished: true,
  },
  {
    passageId: 'read_hb_preventive_checkups',
    titleEn: 'Why Regular Checkups Beat Emergency Visits',
    titleVi: 'Vì Sao Khám Sức Khỏe Định Kỳ Tốt Hơn Nhiều So Với Chữa Cháy',
    levelId: 'B1',
    category: CATEGORY,
    contentEn:
      'Many busy adults treat doctor visits like car repairs—they only schedule an appointment once something breaks loudly. Yet silent issues such as elevated blood pressure, vitamin deficiencies, or early dental decay rarely cause pain in their beginning stages. A routine annual checkup takes just a couple of hours and gives you clear, reassuring information about how your body is actually doing. Catching small imbalances early makes treatment simpler, far less costly, and much gentler on your life. Investing a morning each year in preventive care is one of the smartest acts of self-respect.',
    contentVi:
      'Nhiều người trưởng thành bận rộn đối xử với việc đi khám bệnh giống như sửa xe — chỉ đặt lịch khi có thứ gì đó hỏng hóc ồn ào. Thế nhưng những vấn đề thầm lặng như huyết áp cao, thiếu hụt vitamin hay sâu răng giai đoạn đầu hiếm khi gây đau nhức lúc mới chớm. Một buổi khám sức khỏe tổng quát định kỳ hằng năm chỉ tốn vài giờ đồng hồ nhưng mang lại thông tin rõ ràng, an tâm về tình trạng thực sự của cơ thể. Phát hiện sớm các mất cân bằng nhỏ giúp việc điều chỉnh đơn giản hơn, ít tốn kém hơn nhiều và nhẹ nhàng cho cuộc sống. Dành một buổi sáng mỗi năm cho chăm sóc dự phòng là một trong những cách yêu thương bản thân thông minh nhất.',
    keyPhrases: [
      { phrase: 'annual checkup', meaningVi: 'khám sức khỏe định kỳ hằng năm' },
      { phrase: 'vitamin deficiencies', meaningVi: 'sự thiếu hụt vitamin' },
      { phrase: 'preventive care', meaningVi: 'chăm sóc sức khỏe dự phòng' },
      { phrase: 'self-respect', meaningVi: 'lòng tự trọng / sự trân trọng bản thân' },
    ],
    estimatedMinutes: 3,
    order: 123,
    isPublished: true,
  },
  {
    passageId: 'read_hb_circadian_rhythm_alignment',
    titleEn: 'Living in Harmony with Your Biological Clock',
    titleVi: 'Sống Hài Hòa Với Đồng Hồ Sinh Học Của Chính Bạn',
    levelId: 'B2',
    category: CATEGORY,
    contentEn:
      'Every cell in the human body follows an internal twenty-four-hour timetable called the circadian rhythm, governing hormone release, digestion, alertness, and tissue repair. When we eat heavy meals near midnight, expose our eyes to harsh blue light at 1 a.m., and sleep at wildly inconsistent hours between weekdays and weekends, we force our body into permanent "social jet lag." Aligning your daily habits with light and darkness—waking near the same hour, getting daylight early, and eating dinner a few hours before sleep—restores vitality far more reliably than any quick energy drink.',
    contentVi:
      'Mọi tế bào trong cơ thể con người đều tuân theo một thời gian biểu nội tại kéo dài hai mươi bốn giờ gọi là nhịp sinh học, điều phối quá trình tiết hormone, tiêu hóa, sự tỉnh táo và phục hồi mô. Khi ta ăn bữa tối nặng nề gần nửa đêm, để mắt tiếp xúc ánh sáng xanh gay gắt lúc một giờ sáng và ngủ lệch giờ giữa ngày thường với cuối tuần, ta đang đẩy cơ thể vào trạng thái "lệch múi giờ xã hội" triền miên. Đồng bộ thói quen hằng ngày với chu kỳ sáng tối — thức dậy gần cùng một giờ, đón ánh sáng ban ngày từ sớm và ăn tối cách giờ ngủ vài tiếng — sẽ khôi phục sinh lực bền vững hơn bất kỳ loại nước tăng lực nào.',
    keyPhrases: [
      { phrase: 'circadian rhythm', meaningVi: 'nhịp sinh học (chu kỳ ngày đêm)' },
      { phrase: 'social jet lag', meaningVi: 'hội chứng lệch nhịp sinh học do lối sống' },
      { phrase: 'tissue repair', meaningVi: 'sự phục hồi tế bào/mô' },
      { phrase: 'restore vitality', meaningVi: 'khôi phục sinh lực' },
    ],
    estimatedMinutes: 4,
    order: 124,
    isPublished: true,
  },
  {
    passageId: 'read_hb_emotional_granularity',
    titleEn: 'Naming Your Feelings to Soften Their Grip',
    titleVi: 'Gọi Đúng Tên Cảm Xúc Để Làm Dịu Sức Nặng Của Chúng',
    levelId: 'B2',
    category: CATEGORY,
    contentEn:
      'When someone asks how we are feeling on a rough day, we usually reach for broad, vague labels like "stressed" or "bad." Yet neuroscience suggests that describing emotions with greater precision actually calms the brain’s alarm center. Distinguishing between feeling overwhelmed by volume, lonely for connection, frustrated by unfairness, or simply physically exhausted immediately points toward the right remedy. You cannot solve loneliness with a productivity app, nor fix exhaustion with self-criticism. Learning to name what you truly feel turns vague discomfort into clear, actionable self-care.',
    contentVi:
      'Khi có ai hỏi ta cảm thấy thế nào vào một ngày khó khăn, ta thường dùng những nhãn dán chung chung như "căng thẳng" hay "tệ quá". Thế nhưng khoa học thần kinh cho thấy việc mô tả cảm xúc chính xác hơn thực sự giúp làm dịu trung tâm báo động của não bộ. Phân biệt rõ giữa cảm giác quá tải vì khối lượng việc, cô đơn vì thiếu kết nối, bực bội vì thiếu công bằng hay đơn giản chỉ là kiệt sức thể chất sẽ lập tức chỉ ra giải pháp đúng đắn. Bạn không thể chữa nỗi cô đơn bằng ứng dụng quản lý công việc, cũng chẳng thể giải quyết sự kiệt sức bằng việc tự trách mình. Học cách gọi đúng tên cảm xúc sẽ biến sự khó chịu mơ hồ thành hành động chăm sóc bản thân rõ ràng.',
    keyPhrases: [
      { phrase: 'greater precision', meaningVi: 'độ chính xác cao hơn' },
      { phrase: 'alarm center', meaningVi: 'trung tâm báo động (của não)' },
      { phrase: 'right remedy', meaningVi: 'liều thuốc / giải pháp đúng đắn' },
      { phrase: 'actionable self-care', meaningVi: 'sự tự chăm sóc cụ thể, áp dụng được' },
    ],
    estimatedMinutes: 4,
    order: 125,
    isPublished: true,
  },
  {
    passageId: 'read_hb_active_vs_passive_rest',
    titleEn: 'Why Scrolling Does Not Actually Rest Your Brain',
    titleVi: 'Vì Sao Lướt Mạng Không Thực Sự Giúp Não Nghỉ Ngơi',
    levelId: 'B2',
    category: CATEGORY,
    contentEn:
      'After an exhausting shift, collapsing onto the sofa and watching short videos for two hours feels like resting, yet many people stand up feeling oddly heavier and more restless than before. That happens because passive scrolling keeps the visual cortex and emotional centers firing rapidly without offering true mental recovery. Genuine restoration comes from low-stimulation rest: a slow walk without headphones, listening to calm instrumental music, stretching, daydreaming, or sharing an unhurried chat with a loved one. Knowing the difference between numbing out and truly recharging transforms your evenings.',
    contentVi:
      'Sau một ca làm mệt nhoài, ngả lưng xuống ghế sofa và lướt video ngắn suốt hai tiếng có vẻ giống như đang nghỉ ngơi, nhưng nhiều người đứng dậy lại thấy nặng nề và bứt rứt hơn trước. Điều đó xảy ra vì việc lướt mạng thụ động vẫn khiến vùng thị giác và cảm xúc hoạt động dồn dập mà không mang lại sự phục hồi tinh thần thực sự. Sự tái tạo đích thực đến từ nghỉ ngơi ít kích thích: đi bộ chậm không đeo tai nghe, nghe nhạc không lời êm dịu, giãn cơ, thả hồn mơ mộng hoặc trò chuyện thong thả với người thân. Phân biệt rõ giữa việc tự làm tê liệt cảm giác mệt với việc thực sự nạp lại năng lượng sẽ thay đổi hoàn toàn các buổi tối của bạn.',
    keyPhrases: [
      { phrase: 'passive scrolling', meaningVi: 'lướt mạng một cách thụ động' },
      { phrase: 'low-stimulation rest', meaningVi: 'nghỉ ngơi ít tác nhân kích thích' },
      { phrase: 'numb out', meaningVi: 'tạm quên/tê liệt cảm giác mệt mỏi' },
      { phrase: 'genuine restoration', meaningVi: 'sự phục hồi đích thực' },
    ],
    estimatedMinutes: 4,
    order: 126,
    isPublished: true,
  },
  {
    passageId: 'read_hb_strength_training_longevity',
    titleEn: 'Building Physical Strength for Every Decade Ahead',
    titleVi: 'Rèn Luyện Sức Mạnh Thể Chất Cho Nhiều Thập Kỷ Phía Trước',
    levelId: 'B2',
    category: CATEGORY,
    contentEn:
      'For decades, strength training was viewed mainly as a pursuit for young athletes chasing big muscles. Today, medical research shows that maintaining muscle mass and bone density through simple resistance exercises is one of the strongest predictors of healthy aging for everyone. Twice a week, twenty-five minutes of bodyweight squats, push-ups, or light dumbbells protects joints, stabilizes posture, improves blood sugar control, and makes carrying groceries or climbing stairs effortless well into older age. Strength is not about aesthetics alone; it is practical independence stored inside your body.',
    contentVi:
      'Suốt nhiều thập kỷ, tập kháng lực thường chỉ được xem là bộ môn của vận động viên trẻ muốn tăng cơ bắp lớn. Ngày nay, nghiên cứu y học chỉ ra rằng duy trì khối cơ và mật độ xương thông qua các bài tập sức mạnh đơn giản là một trong những yếu tố dự báo mạnh mẽ nhất cho quá trình lão hóa khỏe mạnh ở mọi lứa tuổi. Hai lần mỗi tuần, hai mươi lăm phút tập squat, chống đẩy hoặc tạ nhẹ giúp bảo vệ khớp, ổn định tư thế, cải thiện đường huyết và giúp việc xách đồ hay leo cầu thang luôn nhẹ nhàng ngay cả khi lớn tuổi. Sức mạnh không chỉ vì ngoại hình; đó là sự tự chủ thiết thực được tích trữ ngay trong cơ thể bạn.',
    keyPhrases: [
      { phrase: 'bone density', meaningVi: 'mật độ xương' },
      { phrase: 'resistance exercises', meaningVi: 'các bài tập kháng lực' },
      { phrase: 'healthy aging', meaningVi: 'lão hóa khỏe mạnh' },
      { phrase: 'practical independence', meaningVi: 'sự tự chủ thiết thực' },
    ],
    estimatedMinutes: 4,
    order: 127,
    isPublished: true,
  },
  {
    passageId: 'read_hb_gut_brain_connection',
    titleEn: 'The Surprising Link Between Diet and Mental Clarity',
    titleVi: 'Mối Liên Hệ Bất Ngờ Giữa Chế Độ Ăn Và Sự Minh Mẫn Tinh Thần',
    levelId: 'B2',
    category: CATEGORY,
    contentEn:
      'We tend to think of nutrition strictly in terms of weight or athletic performance, yet the brain consumes roughly twenty percent of the body’s daily energy and depends heavily on steady fuel. Meals loaded with refined sugar trigger quick bursts of alertness followed by sharp crashes that fuel irritability and brain fog. Conversely, whole grains, fermented foods, leafy greens, nuts, and omega-rich fish nourish beneficial gut bacteria that communicate directly with the nervous system. Eating balanced, minimally processed meals is one of the quietest yet most effective ways to support emotional steadiness.',
    contentVi:
      'Chúng ta thường chỉ nghĩ tới dinh dưỡng dưới góc độ cân nặng hay thể lực, nhưng bộ não tiêu thụ khoảng hai mươi phần trăm năng lượng hằng ngày của cơ thể và phụ thuộc chặt chẽ vào nguồn nhiên liệu ổn định. Những bữa ăn chứa nhiều đường tinh luyện tạo ra đợt tỉnh táo ngắn ngủi rồi nhanh chóng tụt dốc, kéo theo sự cáu gắt và trạng thái mờ mịt đầu óc. Ngược lại, ngũ cốc nguyên hạt, thực phẩm lên men, rau xanh, các loại hạt và cá giàu omega nuôi dưỡng lợi khuẩn đường ruột — hệ thống giao tiếp trực tiếp với thần kinh trung ương. Ăn uống cân bằng, ít chế biến sẵn là một trong những cách âm thầm mà hiệu quả nhất để nâng đỡ sự ổn định cảm xúc.',
    keyPhrases: [
      { phrase: 'refined sugar', meaningVi: 'đường tinh luyện' },
      { phrase: 'brain fog', meaningVi: 'tình trạng sương mù não / kém minh mẫn' },
      { phrase: 'minimally processed', meaningVi: 'ít qua chế biến công nghiệp' },
      { phrase: 'emotional steadiness', meaningVi: 'sự ổn định về mặt cảm xúc' },
    ],
    estimatedMinutes: 4,
    order: 128,
    isPublished: true,
  },
  {
    passageId: 'read_hb_work_life_rhythm',
    titleEn: 'Rethinking Work-Life Balance as a Living Rhythm',
    titleVi: 'Nhìn Nhận Lại Cân Bằng Công Việc – Cuộc Sống Như Một Nhịp Điệu Sống',
    levelId: 'B2',
    category: CATEGORY,
    contentEn:
      'Many people feel frustrated when they cannot divide every single day into a neat fifty-fifty split between career and personal life. Viewing balance as a rigid daily scale sets us up for constant guilt during busy launch weeks or family emergencies. It is often healthier to think in terms of rhythm across a month or season. There will be demanding weeks when work naturally requires extra energy, provided they are deliberately followed by lighter stretches dedicated to rest, loved ones, and personal renewal. Sustainable balance is less about symmetry every hour and more about honoring recovery after every sprint.',
    contentVi:
      'Nhiều người cảm thấy bứt rứt khi không thể chia đều mỗi ngày theo tỷ lệ năm mươi – năm mươi hoàn hảo giữa sự nghiệp và đời sống cá nhân. Coi sự cân bằng như một chiếc cân cứng nhắc hằng ngày dễ khiến ta luôn mang cảm giác tội lỗi vào những tuần chạy dự án cao điểm hay khi gia đình có việc đột xuất. Sẽ lành mạnh hơn nếu nhìn nó như một nhịp điệu xuyên suốt cả tháng hay cả mùa. Sẽ có những tuần bận rộn mà công việc cần thêm năng lượng, miễn là ngay sau đó bạn chủ động dành những khoảng nhẹ nhàng cho nghỉ ngơi, người thân và tái tạo bản thân. Cân bằng bền vững không nằm ở sự đối xứng từng giờ mà ở việc tôn trọng giai đoạn phục hồi sau mỗi chặng nước rút.',
    keyPhrases: [
      { phrase: 'rigid daily scale', meaningVi: 'thước đo cứng nhắc từng ngày' },
      { phrase: 'living rhythm', meaningVi: 'nhịp điệu linh hoạt' },
      { phrase: 'personal renewal', meaningVi: 'sự tái tạo năng lượng cá nhân' },
      { phrase: 'honor recovery', meaningVi: 'tôn trọng thời gian phục hồi' },
    ],
    estimatedMinutes: 4,
    order: 129,
    isPublished: true,
  },
  {
    passageId: 'read_hb_social_connection_longevity',
    titleEn: 'Why Warm Relationships Are Vital to Physical Health',
    titleVi: 'Vì Sao Những Mối Quan Hệ Ấm Áp Rất Quan Trọng Với Sức Khỏe Thể Chất',
    levelId: 'B2',
    category: CATEGORY,
    contentEn:
      'When doctors discuss longevity, we expect to hear about cholesterol, steps per day, and blood pressure. Yet some of the longest-running studies on human aging have uncovered an equally decisive factor: the quality of our close relationships. Chronic loneliness places sustained stress on the cardiovascular and immune systems, whereas having even two or three people you can truly rely on buffers the body against illness and anxiety. Making time to share dinner with friends, volunteer locally, or check in on neighbors is not a luxury after health goals are met—it is a core pillar of health itself.',
    contentVi:
      'Khi bác sĩ bàn về tuổi thọ, ta thường nghĩ ngay đến chỉ số mỡ máu, số bước chân mỗi ngày hay huyết áp. Thế nhưng một số nghiên cứu dài hơi nhất về quá trình lão hóa con người đã phát hiện ra một yếu tố quyết định không kém: chất lượng của những mối quan hệ gần gũi. Sự cô đơn kéo dài gây áp lực liên tục lên hệ tim mạch và miễn dịch, trong khi chỉ cần có hai hoặc ba người bạn thực sự tin cậy cũng đủ che chở cơ thể trước bệnh tật và lo âu. Dành thời gian ăn tối cùng bạn bè, tham gia hoạt động cộng đồng hay hỏi thăm hàng xóm không phải điều xa xỉ làm sau khi khỏe mạnh — đó chính là một trụ cột cốt lõi của sức khỏe.',
    keyPhrases: [
      { phrase: 'decisive factor', meaningVi: 'yếu tố quyết định' },
      { phrase: 'chronic loneliness', meaningVi: 'sự cô đơn kéo dài' },
      { phrase: 'buffer against', meaningVi: 'che chở, làm dịu tác động trước' },
      { phrase: 'core pillar', meaningVi: 'trụ cột cốt lõi' },
    ],
    estimatedMinutes: 4,
    order: 130,
    isPublished: true,
  },
  {
    passageId: 'read_hb_neuroscience_of_solitude',
    titleEn: 'The Restorative Difference Between Solitude and Loneliness',
    titleVi: 'Sự Khác Biệt Chữa Lành Giữa Tĩnh Tại Một Mình Và Cô Đơn',
    levelId: 'C1',
    category: CATEGORY,
    contentEn:
      'Though often confused in everyday speech, loneliness and solitude inhabit opposite emotional worlds. Loneliness is the painful perception of unwanted isolation, even inside a crowded room; solitude is the chosen, nourishing stillness of being alone with one’s own thoughts. Without occasional periods of deliberate solitude—free from notifications, expectations, and social performance—our sense of self gradually frays under external noise. Stepping quietly into an hour of solitary walking or reflection restores emotional equilibrium and paradoxically makes us far more generous and grounded when we return to others.',
    contentVi:
      'Dù thường bị nhầm lẫn trong đời sống hằng ngày, cô đơn và sự tĩnh tại một mình thuộc về hai thế giới cảm xúc trái ngược. Cô đơn là cảm giác đau đáu của sự tách biệt không mong muốn, ngay cả giữa căn phòng đông người; còn tĩnh tại một mình là sự yên lặng chủ động và giàu dưỡng chất khi ở bên những suy nghĩ của chính mình. Nếu thiếu đi những khoảng thời gian chủ động ở một mình — tách khỏi thông báo, kỳ vọng và màn trình diễn xã hội — bản sắc nội tâm của ta sẽ dần xơ xác dưới tiếng ồn bên ngoài. Dành ra một giờ đi bộ tĩnh lặng hay chiêm nghiệm một mình giúp khôi phục cân bằng cảm xúc, và thật kỳ diệu là khiến ta trở nên rộng lượng, vững vàng hơn hẳn khi quay về với mọi người.',
    keyPhrases: [
      { phrase: 'deliberate solitude', meaningVi: 'sự ở một mình có chủ đích, tĩnh tại' },
      { phrase: 'social performance', meaningVi: 'sự gồng mình/trình diễn trước xã hội' },
      { phrase: 'emotional equilibrium', meaningVi: 'trạng thái cân bằng cảm xúc' },
      { phrase: 'paradoxically', meaningVi: 'một cách nghịch lý nhưng đầy thú vị' },
    ],
    estimatedMinutes: 4,
    order: 131,
    isPublished: true,
  },
  {
    passageId: 'read_hb_stress_as_signal_not_enemy',
    titleEn: 'Reframing Stress from Enemy to Information',
    titleVi: 'Nhìn Nhận Lại Áp Lực: Từ Kẻ Thù Thành Tín Hiệu Hữu Ích',
    levelId: 'C1',
    category: CATEGORY,
    contentEn:
      'Health headlines routinely portray stress as a pure toxin to be eliminated completely, yet a completely stress-free life is neither achievable nor desirable. Acute, short-term stress mobilizes oxygen, sharpens focus, and signals that something we care deeply about is at stake. The true hazard is unrelenting chronic stress without physiological release or psychological meaning. When we reinterpret a racing pulse before a demanding talk as our body supplying energy rather than predicting failure—and pair intense stretches with deliberate recovery—stress transforms from a silent saboteur into a disciplined ally.',
    contentVi:
      'Các bài báo sức khỏe thường mô tả căng thẳng như một chất độc thuần túy cần loại bỏ hoàn toàn, nhưng một cuộc sống hoàn toàn không có áp lực vừa không khả thi vừa không hẳn lý tưởng. Căng thẳng cấp tính ngắn hạn giúp huy động oxy, làm sắc bén sự tập trung và báo hiệu rằng điều ta thực sự trân trọng đang đứng trước thử thách. Mối nguy thực sự nằm ở căng thẳng mạn tính triền miên thiếu sự giải tỏa sinh lý lẫn ý nghĩa tinh thần. Khi ta diễn giải lại nhịp tim dồn dập trước một buổi nói chuyện quan trọng như cách cơ thể đang tiếp thêm năng lượng chứ không phải điềm báo thất bại — và kết hợp giai đoạn cao độ với nghỉ ngơi chủ đích — áp lực sẽ chuyển hóa từ kẻ phá hoại thầm lặng thành đồng minh kỷ luật.',
    keyPhrases: [
      { phrase: 'acute stress', meaningVi: 'căng thẳng ngắn hạn / cấp tính' },
      { phrase: 'unrelenting', meaningVi: 'triền miên, không ngừng nghỉ' },
      { phrase: 'physiological release', meaningVi: 'sự giải tỏa về mặt sinh lý' },
      { phrase: 'silent saboteur', meaningVi: 'kẻ phá hoại thầm lặng' },
    ],
    estimatedMinutes: 4,
    order: 132,
    isPublished: true,
  },
  {
    passageId: 'read_hb_mindfulness_in_ordinary_acts',
    titleEn: 'Practicing Mindfulness Beyond the Cushion',
    titleVi: 'Thực Hành Chánh Niệm Ngay Trong Những Việc Đời Thường',
    levelId: 'C1',
    category: CATEGORY,
    contentEn:
      'Mindfulness is frequently marketed as an aesthetic ritual requiring silent mountain retreats, scented candles, and thirty-minute meditation timers. While formal sitting practice is genuinely beneficial, limiting presence to a quiet cushion misses its most practical power. Real mindfulness thrives in the middle of messy everyday life: feeling the warmth of soapy water while washing dishes, noticing tension in your jaw during a difficult email, or fully tasting the first sip of morning coffee before checking headlines. Anchoring attention to sensory reality for even ten seconds interrupts anxious rumination and restores quiet steadiness.',
    contentVi:
      'Chánh niệm thường được quảng bá như một nghi thức thẩm mỹ đòi hỏi những khóa tu trên núi vắng, nến thơm và đồng hồ thiền ba mươi phút. Dù thực hành ngồi thiền chính quy thực sự hữu ích, việc giới hạn sự tỉnh thức trên chiếc đệm yên tĩnh lại bỏ lỡ sức mạnh thiết thực nhất của nó. Chánh niệm đích thực nảy nở ngay giữa đời sống bộn bề: cảm nhận hơi ấm làn nước khi rửa bát, nhận ra quai hàm đang siết chặt khi đọc một email khó chịu hay thưởng thức trọn vẹn ngụm cà phê sáng đầu tiên trước khi xem tin tức. Neo sự chú tâm vào trải nghiệm giác quan hiện tại dù chỉ mười giây cũng đủ ngắt dòng suy tư lo âu và khôi phục sự vững vàng tĩnh lặng.',
    keyPhrases: [
      { phrase: 'sensory reality', meaningVi: 'thực tại cảm nhận qua giác quan' },
      { phrase: 'anxious rumination', meaningVi: 'sự suy diễn lo âu lặp đi lặp lại' },
      { phrase: 'anchor attention', meaningVi: 'neo giữ sự chú tâm' },
      { phrase: 'quiet steadiness', meaningVi: 'sự vững vàng tĩnh lặng' },
    ],
    estimatedMinutes: 4,
    order: 133,
    isPublished: true,
  },
  {
    passageId: 'read_hb_sleep_architecture_memory',
    titleEn: 'What Your Brain Quietly Builds While You Sleep',
    titleVi: 'Điều Bộ Não Âm Thầm Kiến Tạo Trong Lúc Bạn Ngủ',
    levelId: 'C1',
    category: CATEGORY,
    contentEn:
      'Far from being an idle shutdown, human sleep is an intricately choreographed night shift essential to cognitive and emotional vitality. During deep slow-wave phases, cerebrospinal fluid washes through neural pathways to clear metabolic waste accumulated throughout waking hours. Later, in REM sleep, the brain integrates newly learned vocabulary and skills into long-term memory while stripping raw emotional sting from stressful experiences. Chronically sacrificing sleep to squeeze in extra productivity is therefore a self-defeating bargain: you trade tomorrow’s creativity, judgment, and immune defense for a few fatigued hours tonight.',
    contentVi:
      'Hoàn toàn không phải trạng thái tắt máy nhàn rỗi, giấc ngủ con người là một ca trực đêm được điều phối vô cùng tinh vi, thiết yếu cho sinh lực nhận thức và cảm xúc. Trong giai đoạn ngủ sâu sóng chậm, dịch não tủy len lỏi qua các mạng lưới thần kinh để thanh lọc chất thải chuyển hóa tích tụ suốt những giờ thức. Sau đó, trong giấc ngủ REM, bộ não hợp nhất từ vựng và kỹ năng mới học vào trí nhớ dài hạn, đồng thời làm dịu bớt nỗi đau cảm xúc sắc nhọn của những trải nghiệm căng thẳng. Vì thế, hy sinh giấc ngủ triền miên để vắt thêm chút năng suất là một cuộc đánh đổi tự thua thiệt: bạn đang đổi lấy sự sáng tạo, phán đoán và hệ miễn dịch của ngày mai chỉ vì vài giờ làm việc mệt mỏi đêm nay.',
    keyPhrases: [
      { phrase: 'intricately choreographed', meaningVi: 'được điều phối vô cùng tinh vi' },
      { phrase: 'metabolic waste', meaningVi: 'chất thải chuyển hóa' },
      { phrase: 'self-defeating bargain', meaningVi: 'sự đánh đổi tự gây bất lợi' },
      { phrase: 'long-term memory', meaningVi: 'trí nhớ dài hạn' },
    ],
    estimatedMinutes: 4,
    order: 134,
    isPublished: true,
  },
  {
    passageId: 'read_hb_compassionate_self_talk',
    titleEn: 'Replacing Harsh Self-Criticism with Steady Accountability',
    titleVi: 'Thay Thế Sự Tự Chỉ Trích Khắc Nghiệt Bằng Tinh Thần Trách Nhiệm Ôn Hòa',
    levelId: 'C1',
    category: CATEGORY,
    contentEn:
      'Many high achievers cling to a harsh inner critic out of fear that self-compassion will make them lazy or complacent. Empirical psychology consistently demonstrates the opposite. Relentless self-condemnation triggers shame and threat responses that actually heighten procrastination and avoidance, whereas compassionate accountability acknowledges a mistake clearly while preserving the courage to repair it. Speaking to yourself during a stumble with the same calm honesty you would offer a respected friend lowers emotional volatility and sustains motivation far longer than fear ever could.',
    contentVi:
      'Nhiều người đạt thành tích cao thường bám víu vào giọng nói tự chỉ trích khắc nghiệt vì sợ rằng lòng trắc ẩn với bản thân sẽ khiến mình lười biếng hay tự mãn. Tâm lý học thực nghiệm lại liên tục chứng minh điều ngược lại. Tự dằn vặt không ngừng kích hoạt cảm giác xấu hổ và phản ứng phòng vệ, thực chất càng làm tăng sự trì hoãn và né tránh, trong khi tinh thần trách nhiệm ôn hòa nhìn nhận lỗi sai rõ ràng nhưng vẫn giữ nguyên dũng khí để sửa chữa. Tự trò chuyện với chính mình trong lúc vấp ngã bằng sự thẳng thắn điềm tĩnh hệt như cách bạn an ủi một người bạn đáng quý sẽ giảm biến động cảm xúc và duy trì động lực bền bỉ hơn nỗi sợ rất nhiều.',
    keyPhrases: [
      { phrase: 'inner critic', meaningVi: 'giọng nói tự phê phán bên trong' },
      { phrase: 'complacent', meaningVi: 'tự mãn, chủ quan' },
      { phrase: 'compassionate accountability', meaningVi: 'tinh thần trách nhiệm đi kèm sự bao dung' },
      { phrase: 'emotional volatility', meaningVi: 'sự bất ổn/biến động cảm xúc' },
    ],
    estimatedMinutes: 4,
    order: 135,
    isPublished: true,
  },
  {
    passageId: 'read_hb_sustainable_pace_marathon',
    titleEn: 'Treating Health as a Lifelong Craft, Not a Thirty-Day Challenge',
    titleVi: 'Xem Sức Khỏe Là Nghệ Thuật Cả Đời, Không Phải Thử Thách Ba Mươi Ngày',
    levelId: 'C1',
    category: CATEGORY,
    contentEn:
      'Extreme thirty-day diets and punishing boot camps capture headlines because they promise dramatic before-and-after transformations. Yet most extreme regimens collapse within months, leaving behind physical fatigue and a quiet cynicism toward healthy living altogether. True vitality is rarely forged through short bursts of perfection; it is built through unglamorous, repeatable practices that fit harmoniously inside an ordinary life—wholesome home meals, daily walking, reliable sleep, meaningful community, and periodic medical care. When wellness becomes a calm lifelong craft rather than a frantic temporary project, both body and mind flourish effortlessly.',
    contentVi:
      'Những chế độ ăn kiêng cực đoan ba mươi ngày hay các khóa tập luyện khắc nghiệt dễ thu hút truyền thông vì hứa hẹn màn lột xác ngoạn mục. Tuy nhiên, phần lớn lịch trình cực đoan đều sụp đổ chỉ sau vài tháng, để lại sự mệt mỏi thể chất cùng nỗi hoài nghi âm thầm đối với chính lối sống lành mạnh. Sinh lực đích thực hiếm khi được tạo nên từ những đợt hoàn hảo ngắn ngủi; nó được xây đắp qua những thực hành giản dị, lặp lại được và hòa hợp nhịp nhàng trong đời sống thường nhật — bữa cơm nhà lành mạnh, đi bộ mỗi ngày, giấc ngủ đều đặn, cộng đồng gắn bó và thăm khám định kỳ. Khi chăm sóc sức khỏe trở thành một nghệ thuật bền bỉ suốt đời thay vì dự án vội vã ngắn hạn, cả thân lẫn tâm đều tự nhiên thăng hoa.',
    keyPhrases: [
      { phrase: 'extreme regimens', meaningVi: 'những chế độ/lịch trình cực đoan' },
      { phrase: 'unglamorous practices', meaningVi: 'những thực hành giản dị, không hào nhoáng' },
      { phrase: 'fit harmoniously', meaningVi: 'hòa hợp một cách nhịp nhàng' },
      { phrase: 'lifelong craft', meaningVi: 'nghệ thuật rèn luyện suốt đời' },
    ],
    estimatedMinutes: 4,
    order: 136,
    isPublished: true,
  },
];
