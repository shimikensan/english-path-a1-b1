import type { EnglishStory, StoryCollectionId } from '../types';

export interface StoryCollectionMeta {
  id: StoryCollectionId;
  name: string;
  nameVi: string;
  descriptionVi: string;
  coverImage: string;
}

export const STORY_COVER_IMAGES: Record<StoryCollectionId, string> = {
  grimm: '/src/assets/images/story_grimm_forest_1795743897384.jpg',
  andersen: '/src/assets/images/story_andersen_ocean_1795743897179.jpg',
  aesop: '/src/assets/images/story_aesop_meadow_1795743896724.jpg',
  perrault: '/src/assets/images/story_perrault_castle_1795743898905.jpg',
  originals: '/src/assets/images/story_pilot_journey_1795743900998.jpg',
};

export const STORY_COLLECTIONS: StoryCollectionMeta[] = [
  {
    id: 'grimm',
    name: 'Brothers Grimm',
    nameVi: 'Truyện cổ Anh em nhà Grimm',
    descriptionVi: 'Những câu chuyện cổ tích kinh điển châu Âu được viết lại chuẩn cấp độ CEFR.',
    coverImage: STORY_COVER_IMAGES.grimm,
  },
  {
    id: 'andersen',
    name: 'H.C. Andersen',
    nameVi: 'Truyện cổ H.C. Andersen',
    descriptionVi: 'Thế giới giàu cảm xúc của nhà văn Đan Mạch giúp nâng vốn từ miêu tả tự nhiên.',
    coverImage: STORY_COVER_IMAGES.andersen,
  },
  {
    id: 'aesop',
    name: "Aesop's Fables",
    nameVi: 'Truyện ngụ ngôn Aesop',
    descriptionVi: 'Các mẩu chuyện ngắn giàu bài học cuộc sống, lý tưởng cho người mới bắt đầu.',
    coverImage: STORY_COVER_IMAGES.aesop,
  },
  {
    id: 'perrault',
    name: 'Charles Perrault',
    nameVi: 'Truyện cổ Charles Perrault',
    descriptionVi: 'Truyện cổ tích Pháp lôi cuốn với đối thoại sinh động và cấu trúc kể chuyện mạch lạc.',
    coverImage: STORY_COVER_IMAGES.perrault,
  },
  {
    id: 'originals',
    name: 'Pilot Originals',
    nameVi: 'Truyện ngắn Hiện đại & Du hành',
    descriptionVi: 'Truyện ngắn đời sống, du lịch và hàng không giúp luyện tiếng Anh giao tiếp thực tế.',
    coverImage: STORY_COVER_IMAGES.originals,
  },
];

export const ENGLISH_STORIES: EnglishStory[] = [
  // ===================== A1 STORIES =====================
  {
    id: 'little-red-cap-a1',
    titleEn: 'Little Red Cap',
    titleVi: 'Cô bé Quàng khăn đỏ',
    author: 'Brothers Grimm',
    collection: 'grimm',
    levelId: 'A1',
    estimatedMinutes: 3,
    coverImage: STORY_COVER_IMAGES.grimm,
    summaryVi:
      'Cô bé quàng chiếc khăn nhung đỏ mang bánh và sữa đi thăm bà ngoại ốm trong rừng và cuộc gặp gỡ bất ngờ với con sói xám.',
    moralVi: 'Luôn nghe lời dặn của cha mẹ và cảnh giác khi nói chuyện với người lạ.',
    sentences: [
      {
        en: 'Once upon a time, there was a sweet little girl who lived near a green forest.',
        vi: 'Ngày xửa ngày xưa, có một cô bé dễ thương sống gần một khu rừng xanh.',
      },
      {
        en: 'Her grandmother gave her a bright red cap, and she wore it every single day.',
        vi: 'Bà ngoại tặng cô một chiếc mũ trùm màu đỏ tươi, và cô đội nó mỗi ngày.',
      },
      {
        en: 'One sunny morning, her mother asked her to take a basket of warm bread and honey to her grandmother.',
        vi: 'Một buổi sáng nắng đẹp, mẹ nhờ cô mang một giỏ bánh mì ấm và mật ong sang cho bà ngoại.',
      },
      {
        en: 'Her mother said gently, "Walk straight on the path and do not talk to strangers in the woods."',
        vi: 'Mẹ dặn dịu dàng: "Con hãy đi thẳng trên đường mòn và đừng nói chuyện với người lạ trong rừng nhé."',
      },
      {
        en: 'Along the quiet path, Little Red Cap met a big gray wolf with clever yellow eyes.',
        vi: 'Dọc theo con đường yên tĩnh, Cô bé Quàng khăn đỏ gặp một con sói xám to lớn có đôi mắt vàng ranh mãnh.',
      },
      {
        en: 'The wolf smiled politely and asked where the little girl was going with her heavy basket.',
        vi: 'Con sói mỉm cười lễ phép và hỏi cô bé đang đi đâu với chiếc giỏ nặng như vậy.',
      },
      {
        en: 'Little Red Cap forgot her promise and told the wolf about her grandmother’s cozy wooden house.',
        vi: 'Cô bé Quàng khăn đỏ quên mất lời hứa và kể cho con sói nghe về ngôi nhà gỗ ấm cúng của bà ngoại.',
      },
      {
        en: 'The wolf ran quickly ahead, reached the cottage first, and pretended to be the sick grandmother.',
        vi: 'Con sói chạy nhanh vượt lên trước, đến ngôi nhà nhỏ đầu tiên và giả làm bà ngoại đang ốm.',
      },
      {
        en: 'When Little Red Cap arrived, she noticed the huge ears, bright eyes, and sharp teeth of the wolf.',
        vi: 'Khi Cô bé Quàng khăn đỏ đến nơi, cô nhận ra đôi tai to, đôi mắt sáng và hàm răng sắc nhọn của con sói.',
      },
      {
        en: 'Luckily, a brave woodcutter heard her cry for help, chased the wolf away, and saved them both safely.',
        vi: 'May mắn thay, một bác tiều phu dũng cảm nghe thấy tiếng kêu cứu, đuổi con sói đi và cứu cả hai bà cháu an toàn.',
      },
    ],
    glossary: [
      { word: 'forest', ipa: '/ˈfɒr.ɪst/', partOfSpeech: 'danh từ (n)', meaningVi: 'khu rừng' },
      { word: 'basket', ipa: '/ˈbɑː.skɪt/', partOfSpeech: 'danh từ (n)', meaningVi: 'cái giỏ' },
      { word: 'path', ipa: '/pɑːθ/', partOfSpeech: 'danh từ (n)', meaningVi: 'con đường mòn' },
      { word: 'strangers', ipa: '/ˈstreɪn.dʒərz/', partOfSpeech: 'danh từ (n)', meaningVi: 'những người lạ' },
      { word: 'pretended', ipa: '/prɪˈten.dɪd/', partOfSpeech: 'động từ (v)', meaningVi: 'giả vờ' },
      { word: 'woodcutter', ipa: '/ˈwʊdˌkʌt.ər/', partOfSpeech: 'danh từ (n)', meaningVi: 'bác tiều phu, người đốn củi' },
      { word: 'brave', ipa: '/breɪv/', partOfSpeech: 'tính từ (adj)', meaningVi: 'dũng cảm' },
    ],
    grammarPoints: [
      {
        title: 'Thì quá khứ đơn (Past Simple) trong kể chuyện',
        formula: 'S + V2/V-ed',
        explanationVi:
          'Các câu chuyện cổ tích thường dùng thì quá khứ đơn để kể chuỗi hành động đã xảy ra trong quá khứ (lived, gave, wore, met, ran).',
        exampleEn: 'The wolf ran quickly ahead and reached the cottage first.',
        exampleVi: 'Con sói chạy nhanh vượt lên trước và đến ngôi nhà đầu tiên.',
      },
      {
        title: 'Câu mệnh lệnh phủ định (Negative Imperative)',
        formula: 'Do not (Don’t) + V-nguyên mẫu',
        explanationVi: 'Dùng để khuyên nhủ hoặc căn dặn ai đó không nên làm việc gì.',
        exampleEn: 'Walk straight on the path and do not talk to strangers in the woods.',
        exampleVi: 'Hãy đi thẳng trên đường mòn và đừng nói chuyện với người lạ trong rừng.',
      },
    ],
    quiz: [
      {
        question: 'What did Little Red Cap carry in her basket?',
        options: ['Apples and water', 'Warm bread and honey', 'Flowers and tea', 'Books and clothes'],
        correctIndex: 1,
        explanationVi: 'Mẹ nhờ cô bé mang một giỏ bánh mì ấm và mật ong ("warm bread and honey") cho bà ngoại.',
      },
      {
        question: 'What warning did her mother give her?',
        options: [
          'Do not run in the rain',
          'Do not open the window',
          'Walk straight on the path and do not talk to strangers',
          'Come home before noon',
        ],
        correctIndex: 2,
        explanationVi: 'Mẹ dặn cô đi thẳng trên đường mòn và không nói chuyện với người lạ trong rừng.',
      },
      {
        question: 'Who saved Little Red Cap and her grandmother?',
        options: ['A village baker', 'A brave woodcutter', 'Her neighbor', 'A friendly hunter dog'],
        correctIndex: 1,
        explanationVi: 'Một bác tiều phu dũng cảm ("a brave woodcutter") đã nghe tiếng kêu cứu và đuổi con sói đi.',
      },
    ],
  },
  {
    id: 'tortoise-and-hare-a1',
    titleEn: 'The Tortoise and the Hare',
    titleVi: 'Thỏ và Rùa',
    author: "Aesop's Fables",
    collection: 'aesop',
    levelId: 'A1',
    estimatedMinutes: 2,
    coverImage: STORY_COVER_IMAGES.aesop,
    summaryVi:
      'Chú Thỏ kiêu ngạo chế giễu tốc độ chậm chạp của Rùa và thách thi chạy, nhưng sự kiên trì bền bỉ đã mang lại kết quả bất ngờ.',
    moralVi: 'Chậm mà chắc sẽ giành chiến thắng (Slow and steady wins the race).',
    sentences: [
      {
        en: 'A speedy hare loved to boast about how fast he could run across the sunny meadow.',
        vi: 'Một chú thỏ nhanh nhẹn rất thích khoe khoang rằng mình có thể chạy nhanh đến mức nào trên cánh đồng đầy nắng.',
      },
      {
        en: 'One day, he laughed at a quiet tortoise for having such short legs and moving so slowly.',
        vi: 'Một ngày nọ, chú cười nhạo một chú rùa điềm đạm vì có đôi chân ngắn và di chuyển quá chậm chạp.',
      },
      {
        en: 'The tortoise smiled calmly and invited the hare to a friendly race to the big oak tree.',
        vi: 'Chú rùa bình tĩnh mỉm cười và mời thỏ tham gia một cuộc đua thân thiện đến cây sồi lớn.',
      },
      {
        en: 'The hare agreed immediately because he was completely sure he would win in a few minutes.',
        vi: 'Thỏ đồng ý ngay lập tức vì chắc chắn rằng mình sẽ thắng chỉ trong vài phút.',
      },
      {
        en: 'As soon as the race started, the hare dashed far ahead and left the tortoise behind in a cloud of dust.',
        vi: 'Ngay khi cuộc đua bắt đầu, thỏ phóng vút lên phía trước và bỏ lại rùa trong đám bụi mù.',
      },
      {
        en: 'Feeling overly confident, the hare lay down under a shady olive tree to take a short nap.',
        vi: 'Cảm thấy quá tự tin, thỏ nằm xuống dưới bóng râm cây ô liu để chợp mắt một lát.',
      },
      {
        en: 'Meanwhile, the tortoise kept walking step by step without stopping for even a single second.',
        vi: 'Trong lúc đó, rùa vẫn kiên trì bước từng bước một mà không dừng lại dù chỉ một giây.',
      },
      {
        en: 'When the hare finally woke up and raced to the finish line, the tortoise was already waiting there with a gentle smile.',
        vi: 'Khi thỏ cuối cùng tỉnh dậy và chạy nước rút về đích, rùa đã đứng chờ sẵn ở đó với nụ cười hiền hòa.',
      },
    ],
    glossary: [
      { word: 'boast', ipa: '/bəʊst/', partOfSpeech: 'động từ (v)', meaningVi: 'khoe khoang, khoác lác' },
      { word: 'meadow', ipa: '/ˈmed.əʊ/', partOfSpeech: 'danh từ (n)', meaningVi: 'đồng cỏ' },
      { word: 'calmly', ipa: '/ˈkɑːm.li/', partOfSpeech: 'trạng từ (adv)', meaningVi: 'một cách bình tĩnh' },
      { word: 'dashed', ipa: '/dæʃt/', partOfSpeech: 'động từ (v)', meaningVi: 'lao vút đi' },
      { word: 'confident', ipa: '/ˈkɒn.fɪ.dənt/', partOfSpeech: 'tính từ (adj)', meaningVi: 'tự tin' },
      { word: 'nap', ipa: '/næp/', partOfSpeech: 'danh từ (n)', meaningVi: 'giấc ngủ ngắn' },
      { word: 'meanwhile', ipa: '/ˈmiːn.waɪl/', partOfSpeech: 'trạng từ (adv)', meaningVi: 'trong lúc đó' },
    ],
    grammarPoints: [
      {
        title: 'Cấu trúc keep + V-ing (tiếp tục làm gì)',
        formula: 'S + keep / kept + V-ing',
        explanationVi: 'Diễn tả một hành động được duy trì liên tục không ngừng nghỉ.',
        exampleEn: 'Meanwhile, the tortoise kept walking step by step without stopping.',
        exampleVi: 'Trong lúc đó, rùa vẫn tiếp tục bước từng bước một mà không dừng lại.',
      },
      {
        title: 'Liên từ As soon as (Ngay khi...)',
        formula: 'As soon as + S1 + V1, S2 + V2',
        explanationVi: 'Diễn tả hai hành động xảy ra nối tiếp nhau gần như lập tức.',
        exampleEn: 'As soon as the race started, the hare dashed far ahead.',
        exampleVi: 'Ngay khi cuộc đua bắt đầu, thỏ đã phóng vút lên phía trước.',
      },
    ],
    quiz: [
      {
        question: 'Why did the hare stop during the race?',
        options: [
          'He hurt his foot',
          'He felt overly confident and took a nap',
          'He lost the trail',
          'He wanted to eat carrots',
        ],
        correctIndex: 1,
        explanationVi: 'Thỏ quá chủ quan, tự tin rằng mình chắc thắng nên nằm dưới tán cây ngủ một giấc.',
      },
      {
        question: 'What helped the tortoise win the race?',
        options: ['A secret shortcut', 'Help from other animals', 'Steady effort without stopping', 'Running faster at the end'],
        correctIndex: 2,
        explanationVi: 'Rùa bước đều từng bước không nghỉ ("step by step without stopping").',
      },
      {
        question: 'What does the word "boast" mean in the story?',
        options: ['To whisper softly', 'To talk proudly about yourself', 'To run quickly', 'To sleep deeply'],
        correctIndex: 1,
        explanationVi: '"Boast" nghĩa là khoe khoang, nói đầy tự phụ về khả năng của bản thân.',
      },
    ],
  },
  {
    id: 'ugly-duckling-a1',
    titleEn: 'The Ugly Duckling',
    titleVi: 'Chú vịt con xấu xí',
    author: 'H.C. Andersen',
    collection: 'andersen',
    levelId: 'A1',
    estimatedMinutes: 3,
    coverImage: STORY_COVER_IMAGES.andersen,
    summaryVi:
      'Chú vịt con khác biệt bị mọi người xa lánh trong suốt mùa đông lạnh giá, cho đến khi mùa xuân tiết lộ thân phận thực sự của chú.',
    moralVi: 'Đừng đánh giá bản thân hay người khác qua vẻ bề ngoài; ai cũng có giá trị riêng chờ tỏa sáng.',
    sentences: [
      {
        en: 'On a warm summer morning, five tiny yellow ducklings hatched from their eggs near a quiet pond.',
        vi: 'Vào một buổi sáng mùa hè ấm áp, năm chú vịt con vàng óng nở ra từ trứng bên cạnh một cái ao yên tĩnh.',
      },
      {
        en: 'The last egg was much larger, and out stepped a clumsy gray bird with long feathers.',
        vi: 'Quả trứng cuối cùng to hơn nhiều, và bước ra là một chú chim xám vụng về với bộ lông dài.',
      },
      {
        en: 'Because he looked different from his brothers, the other farm animals teased him every day.',
        vi: 'Vì trông khác biệt với các anh chị em, những con vật khác trong trang trại trêu chọc chú mỗi ngày.',
      },
      {
        en: 'Feeling lonely and sad, the little bird walked far away from the farm to search for a place where he belonged.',
        vi: 'Cảm thấy cô đơn và buồn bã, chú chim nhỏ bỏ đi thật xa trang trại để tìm một nơi thuộc về mình.',
      },
      {
        en: 'Autumn winds turned cold, and snow soon covered the lonely marshes where he tried to survive.',
        vi: 'Gió thu trở lạnh, và tuyết chẳng mấy chốc phủ kín vùng đầm lầy hoang vắng nơi chú cố gắng sống sót.',
      },
      {
        en: 'At last, spring returned with golden sunshine, soft breezes, and blooming wildflowers along the river.',
        vi: 'Cuối cùng, mùa xuân cũng trở lại cùng ánh nắng vàng, làn gió dịu nhẹ và hoa dại nở rộ ven sông.',
      },
      {
        en: 'One morning, he saw three graceful white swans swimming peacefully across the clear water.',
        vi: 'Một buổi sáng, chú nhìn thấy ba con thiên nga trắng thanh tao đang bơi lội thanh bình trên mặt nước trong xanh.',
      },
      {
        en: 'When he looked down at his own reflection in the pond, he gasped in pure amazement.',
        vi: 'Khi cúi xuống nhìn hình ảnh phản chiếu của chính mình dưới mặt hồ, chú há hốc mồm kinh ngạc.',
      },
      {
        en: 'He was never an ugly duckling at all — he had grown into a magnificent white swan with strong wings.',
        vi: 'Chú chưa từng là một chú vịt con xấu xí — chú đã trưởng thành thành một chú thiên nga trắng tuyệt đẹp với đôi cánh vững chãi.',
      },
    ],
    glossary: [
      { word: 'hatched', ipa: '/hætʃt/', partOfSpeech: 'động từ (v)', meaningVi: 'nở ra từ trứng' },
      { word: 'clumsy', ipa: '/ˈklʌm.zi/', partOfSpeech: 'tính từ (adj)', meaningVi: 'vụng về, lóng ngóng' },
      { word: 'teased', ipa: '/tiːzd/', partOfSpeech: 'động từ (v)', meaningVi: 'trêu chọc' },
      { word: 'belonged', ipa: '/bɪˈlɒŋd/', partOfSpeech: 'động từ (v)', meaningVi: 'thuộc về' },
      { word: 'graceful', ipa: '/ˈɡreɪs.fəl/', partOfSpeech: 'tính từ (adj)', meaningVi: 'duyên dáng, thanh tao' },
      { word: 'reflection', ipa: '/rɪˈflek.ʃən/', partOfSpeech: 'danh từ (n)', meaningVi: 'hình ảnh phản chiếu' },
      { word: 'magnificent', ipa: '/mæɡˈnɪf.ɪ.sənt/', partOfSpeech: 'tính từ (adj)', meaningVi: 'lộng lẫy, tuyệt đẹp' },
    ],
    grammarPoints: [
      {
        title: 'Mệnh đề nguyên nhân với Because',
        formula: 'Because + S + V, S + V',
        explanationVi: 'Dùng để giải thích lý do trực tiếp cho một sự việc ở mệnh đề chính.',
        exampleEn: 'Because he looked different from his brothers, the other farm animals teased him.',
        exampleVi: 'Vì chú trông khác biệt với các anh em của mình, những con vật khác đã trêu chọc chú.',
      },
      {
        title: 'Thì quá khứ hoàn thành (Past Perfect)',
        formula: 'S + had + V3/V-ed',
        explanationVi: 'Diễn tả một sự thay đổi đã hoàn tất trước một thời điểm trong quá khứ (khi chú soi gương).',
        exampleEn: 'He had grown into a magnificent white swan with strong wings.',
        exampleVi: 'Chú đã lớn lên thành một chú thiên nga trắng tuyệt đẹp với đôi cánh khỏe khoắn.',
      },
    ],
    quiz: [
      {
        question: 'Why did the little gray bird leave the farm?',
        options: [
          'He wanted to find more food',
          'The other animals teased him and he felt lonely',
          'The pond dried up',
          'His mother told him to travel',
        ],
        correctIndex: 1,
        explanationVi: 'Các con vật khác trêu chọc khiến chú cảm thấy buồn bã, cô đơn nên chú đã rời đi.',
      },
      {
        question: 'How did he discover who he truly was?',
        options: [
          'A farmer told him',
          'He saw his reflection in the clear pond',
          'He found a mirror in the woods',
          'His brothers came to find him',
        ],
        correctIndex: 1,
        explanationVi: 'Chú cúi xuống nhìn hình ảnh phản chiếu ("reflection") của mình trên mặt hồ trong xanh.',
      },
      {
        question: 'What kind of bird was he really?',
        options: ['A wild duck', 'A snow owl', 'A white swan', 'A golden eagle'],
        correctIndex: 2,
        explanationVi: 'Chú thực chất là một chú thiên nga trắng tuyệt đẹp ("a magnificent white swan").',
      },
    ],
  },
  {
    id: 'fox-and-grapes-a1',
    titleEn: 'The Fox and the Grapes',
    titleVi: 'Con cáo và chùm nho',
    author: "Aesop's Fables",
    collection: 'aesop',
    levelId: 'A1',
    estimatedMinutes: 2,
    coverImage: STORY_COVER_IMAGES.aesop,
    summaryVi:
      'Một chú cáo đói bụng tìm thấy giàn nho chín mọng treo cao, nhưng khi nhảy mãi không tới, chú lại tự trấn an bằng lời chê bai.',
    moralVi: 'Con người thường dễ chê bai những thứ mình không thể đạt được thay vì thừa nhận giới hạn của bản thân.',
    sentences: [
      {
        en: 'On a hot summer afternoon, a hungry fox walked through a quiet vineyard looking for food.',
        vi: 'Vào một buổi chiều mùa hè nóng nực, một con cáo đói đi qua một vườn nho yên tĩnh để tìm thức ăn.',
      },
      {
        en: 'Suddenly, he spotted a bunch of juicy purple grapes hanging high on a wooden trellis.',
        vi: 'Bất chợt, nó phát hiện một chùm nho tím mọng nước treo tít trên cao ở giàn gỗ.',
      },
      {
        en: 'His mouth watered at the sight of the sweet fruit shining in the warm sunlight.',
        vi: 'Nó thèm nhỏ dãi trước cảnh chùm quả ngọt lịm lấp lánh dưới ánh nắng ấm áp.',
      },
      {
        en: 'The fox stepped back, ran forward, and jumped as high as he could, but he missed the grapes.',
        vi: 'Cáo lùi lại lấy đà, chạy tới và nhảy cao hết sức có thể, nhưng nó vẫn hụt chùm nho.',
      },
      {
        en: 'He tried again and again until his legs grew tired and his breath became heavy.',
        vi: 'Nó thử đi thử lại nhiều lần cho đến khi đôi chân rã rời và hơi thở trở nên nặng nhọc.',
      },
      {
        en: 'Finally, the fox stopped trying, turned his nose up in the air, and walked away slowly.',
        vi: 'Cuối cùng, con cáo ngừng cố gắng, hếch mũi lên trời và chậm rãi bỏ đi.',
      },
      {
        en: 'As he left the garden, he muttered to himself, "Those grapes are probably sour anyway!"',
        vi: 'Khi rời khỏi khu vườn, nó lẩm bẩm một mình: "Dù sao mấy quả nho đó chắc cũng chua loét thôi!"',
      },
    ],
    glossary: [
      { word: 'vineyard', ipa: '/ˈvɪn.jəd/', partOfSpeech: 'danh từ (n)', meaningVi: 'vườn nho' },
      { word: 'spotted', ipa: '/ˈspɒt.ɪd/', partOfSpeech: 'động từ (v)', meaningVi: 'phát hiện ra, trông thấy' },
      { word: 'juicy', ipa: '/ˈdʒuː.si/', partOfSpeech: 'tính từ (adj)', meaningVi: 'mọng nước' },
      { word: 'trellis', ipa: '/ˈtrel.ɪs/', partOfSpeech: 'danh từ (n)', meaningVi: 'giàn leo bằng gỗ' },
      { word: 'muttered', ipa: '/ˈmʌt.ərd/', partOfSpeech: 'động từ (v)', meaningVi: 'lẩm bẩm' },
      { word: 'sour', ipa: '/saʊər/', partOfSpeech: 'tính từ (adj)', meaningVi: 'chua' },
    ],
    grammarPoints: [
      {
        title: 'So sánh bằng với as ... as possible / as ... as S could',
        formula: 'as + adj/adv + as + S + could',
        explanationVi: 'Diễn tả mức độ nỗ lực tối đa ai đó có thể làm được.',
        exampleEn: 'The fox jumped as high as he could, but he missed the grapes.',
        exampleVi: 'Con cáo nhảy cao hết sức có thể, nhưng nó vẫn nhảy hụt chùm nho.',
      },
      {
        title: 'Thành ngữ "sour grapes"',
        formula: 'sour grapes (idiom)',
        explanationVi:
          'Bắt nguồn từ chính truyện ngụ ngôn này, chỉ thái độ chê bai thứ gì đó chỉ vì bản thân không có được nó.',
        exampleEn: 'Those grapes are probably sour anyway!',
        exampleVi: 'Dù sao thì mấy quả nho đó chắc cũng chua thôi!',
      },
    ],
    quiz: [
      {
        question: 'Where were the purple grapes hanging?',
        options: ['On the ground', 'High on a wooden trellis', 'In a farmer’s basket', 'Beside a river'],
        correctIndex: 1,
        explanationVi: 'Chùm nho tím mọng nước treo cao trên một giàn gỗ ("high on a wooden trellis").',
      },
      {
        question: 'Why did the fox stop jumping?',
        options: [
          'The farmer chased him away',
          'It started to rain',
          'His legs grew tired and he could not reach them',
          'He found better food',
        ],
        correctIndex: 2,
        explanationVi: 'Cáo nhảy nhiều lần đến mức mỏi nhừ chân và thở dốc nhưng vẫn không với tới.',
      },
      {
        question: 'What excuse did the fox make as he walked away?',
        options: [
          'The grapes were too small',
          'The grapes were probably sour',
          'He was not hungry anymore',
          'The garden was too dark',
        ],
        correctIndex: 1,
        explanationVi: 'Nó tự trấn an mình bằng cách nói rằng chùm nho chắc chắn bị chua ("probably sour").',
      },
    ],
  },

  // ===================== A2 STORIES =====================
  {
    id: 'cinderella-a2',
    titleEn: 'Cinderella',
    titleVi: 'Cô bé Lọ Lem',
    author: 'Brothers Grimm',
    collection: 'grimm',
    levelId: 'A2',
    estimatedMinutes: 4,
    coverImage: STORY_COVER_IMAGES.grimm,
    summaryVi:
      'Cô gái hiền lành bị mẹ kế và hai chị ghẻ đối xử bất công nhưng lòng tốt và sự kiên nhẫn đã dẫn cô tới vũ hội hoàng gia.',
    moralVi: 'Lòng nhân hậu, sự tử tế và niềm hy vọng chân thành sẽ luôn được đền đáp xứng đáng.',
    sentences: [
      {
        en: 'After her mother passed away, a kind young woman was forced by her stepmother to work from dawn until night.',
        vi: 'Sau khi mẹ qua đời, một cô gái trẻ hiền lành bị mẹ kế bắt làm việc từ sáng sớm đến tận đêm khuya.',
      },
      {
        en: 'Because she often rested beside the warm ashes of the fireplace, her cruel stepsisters nicknamed her Cinderella.',
        vi: 'Vì cô thường nghỉ ngơi bên đống tro ấm của lò sưởi, hai người chị ghẻ độc ác đặt biệt danh cho cô là Lọ Lem.',
      },
      {
        en: 'One autumn week, the king announced a grand three-day festival at the palace to find a bride for his son.',
        vi: 'Một tuần mùa thu nọ, nhà vua thông báo tổ chức lễ hội lớn kéo dài ba ngày tại cung điện để tìm vợ cho hoàng tử.',
      },
      {
        en: 'Cinderella longed to attend the royal ball, yet her stepmother gave her impossible chores to keep her at home.',
        vi: 'Lọ Lem khao khát được dự vũ hội hoàng gia, nhưng mẹ kế giao cho cô những công việc bất khả thi để giữ cô ở nhà.',
      },
      {
        en: 'With gentle help from white doves perched in a hazel tree she had planted, Cinderella finished every task on time.',
        vi: 'Nhờ sự giúp đỡ dịu dàng của đàn bồ câu trắng đậu trên cây phỉ cô tự tay trồng, Lọ Lem hoàn thành mọi việc đúng hạn.',
      },
      {
        en: 'The magic tree dropped a shimmering silver dress and delicate golden slippers at her feet.',
        vi: 'Cây phỉ kỳ diệu thả xuống chân cô một chiếc váy bạc lấp lánh và đôi hài vàng tinh xảo.',
      },
      {
        en: 'At the palace, the prince danced only with Cinderella all evening, captivated by her grace and kindness.',
        vi: 'Tại cung điện, hoàng tử chỉ khiêu vũ cùng Lọ Lem suốt buổi tối, hoàn toàn bị thu hút bởi vẻ thanh lịch và lòng tốt của cô.',
      },
      {
        en: 'As midnight approached, Cinderella hurried away and accidentally left one tiny slipper on the palace stairs.',
        vi: 'Khi nửa đêm gần điểm, Lọ Lem vội vã rời đi và vô tình đánh rơi một chiếc hài nhỏ trên bậc thang cung điện.',
      },
      {
        en: 'The next morning, the prince traveled across the kingdom declaring that he would marry whoever fit the slipper.',
        vi: 'Sáng hôm sau, hoàng tử đi khắp vương quốc tuyên bố sẽ cưới bất kỳ ai đi vừa chiếc hài đó.',
      },
      {
        en: 'When the slipper slid effortlessly onto Cinderella’s foot, the prince recognized her true heart and welcomed her to the palace.',
        vi: 'Khi chiếc hài trượt vừa vặn nhẹ nhàng vào chân Lọ Lem, hoàng tử nhận ra tấm lòng chân thành của cô và đón cô về cung điện.',
      },
    ],
    glossary: [
      { word: 'stepmother', ipa: '/ˈstepˌmʌð.ər/', partOfSpeech: 'danh từ (n)', meaningVi: 'mẹ kế' },
      { word: 'chores', ipa: '/tʃɔːrz/', partOfSpeech: 'danh từ (n)', meaningVi: 'việc nhà, việc vặt' },
      { word: 'shimmering', ipa: '/ˈʃɪm.ər.ɪŋ/', partOfSpeech: 'tính từ (adj)', meaningVi: 'lấp lánh, lung linh' },
      { word: 'delicate', ipa: '/ˈdel.ɪ.kət/', partOfSpeech: 'tính từ (adj)', meaningVi: 'tinh xảo, mỏng manh' },
      { word: 'captivated', ipa: '/ˈkæp.tɪ.veɪ.tɪd/', partOfSpeech: 'tính từ (adj)', meaningVi: 'bị mê hoặc, thu hút' },
      { word: 'effortlessly', ipa: '/ˈef.ət.ləs.li/', partOfSpeech: 'trạng từ (adv)', meaningVi: 'một cách nhẹ nhàng, dễ dàng' },
    ],
    grammarPoints: [
      {
        title: 'Câu bị động ở thì quá khứ đơn (Past Simple Passive)',
        formula: 'S + was / were + V3/V-ed (+ by O)',
        explanationVi: 'Nhấn mạnh đối tượng chịu tác động của hành động thay vì người thực hiện.',
        exampleEn: 'A kind young woman was forced by her stepmother to work from dawn until night.',
        exampleVi: 'Một cô gái trẻ hiền lành bị mẹ kế bắt phải làm việc từ sáng sớm đến đêm khuya.',
      },
      {
        title: 'Liên từ tương phản Yet',
        formula: 'Clause 1, yet Clause 2',
        explanationVi: 'Tương tự "but" nhưng mang sắc thái văn chương và nhấn mạnh sự đối lập mạnh hơn.',
        exampleEn: 'Cinderella longed to attend the royal ball, yet her stepmother gave her impossible chores.',
        exampleVi: 'Lọ Lem khao khát được dự vũ hội hoàng gia, ấy vậy mà mẹ kế lại giao những công việc bất khả thi.',
      },
    ],
    quiz: [
      {
        question: 'Why did her stepsisters call her Cinderella?',
        options: [
          'Because she loved dancing',
          'Because she often rested beside the fireplace ashes',
          'Because she planted a hazel tree',
          'Because she wore silver shoes',
        ],
        correctIndex: 1,
        explanationVi: 'Cô thường ngồi nghỉ bên đống tro ("ashes" / "cinders") cạnh lò sưởi nên bị đặt tên là Lọ Lem.',
      },
      {
        question: 'What did Cinderella leave behind on the palace stairs?',
        options: ['A silver necklace', 'A white glove', 'One tiny golden slipper', 'A red ribbon'],
        correctIndex: 2,
        explanationVi: 'Khi vội rời vũ hội lúc gần nửa đêm, cô đánh rơi một chiếc hài vàng nhỏ trên bậc thang.',
      },
      {
        question: 'How did the prince find Cinderella again?',
        options: [
          'He asked the white doves',
          'He traveled across the kingdom testing who fit the slipper',
          'Her stepmother sent him a letter',
          'He waited at the next festival',
        ],
        correctIndex: 1,
        explanationVi: 'Hoàng tử đi khắp vương quốc tìm người đi vừa chiếc hài ("whoever fit the slipper").',
      },
    ],
  },
  {
    id: 'boy-who-cried-wolf-a2',
    titleEn: 'The Boy Who Cried Wolf',
    titleVi: 'Cậu bé chăn cừu nói dối',
    author: "Aesop's Fables",
    collection: 'aesop',
    levelId: 'A2',
    estimatedMinutes: 3,
    coverImage: STORY_COVER_IMAGES.aesop,
    summaryVi:
      'Vì buồn chán trên đồi chăn cừu, cậu bé liên tục hô hoán có sói để trêu đùa dân làng, để rồi phải trả giá đắt khi sói xuất hiện thật.',
    moralVi: 'Khi bạn nói dối quá nhiều lần, mọi người sẽ không còn tin ngay cả khi bạn nói sự thật.',
    sentences: [
      {
        en: 'A young shepherd boy was responsible for watching the village sheep on a grassy hillside.',
        vi: 'Một cậu bé chăn cừu trẻ tuổi chịu trách nhiệm trông coi đàn cừu của cả làng trên một sườn đồi đầy cỏ.',
      },
      {
        en: 'After several quiet afternoons, the boy grew terribly bored and decided to play a trick on the villagers.',
        vi: 'Sau vài buổi chiều yên ắng, cậu bé cảm thấy vô cùng buồn chán và quyết định bày trò trêu chọc dân làng.',
      },
      {
        en: 'He cupped his hands around his mouth and shouted at the top of his voice, "Wolf! Wolf! A wolf is chasing the sheep!"',
        vi: 'Cậu khum tay quanh miệng và hét lớn hết sức có thể: "Sói! Sói! Có sói đang đuổi đàn cừu!"',
      },
      {
        en: 'Farmers dropped their tools and rushed up the hill to protect the flock, only to find the boy laughing loudly.',
        vi: 'Những người nông dân vội bỏ công cụ chạy lên đồi bảo vệ đàn cừu, nhưng chỉ thấy cậu bé đang cười phá lên.',
      },
      {
        en: 'The villagers warned him angrily never to call for help when there was no real danger.',
        vi: 'Dân làng giận dữ cảnh báo cậu đừng bao giờ kêu cứu khi không có mối nguy hiểm thật sự nào.',
      },
      {
        en: 'Two days later, the boy played the exact same prank again, and the villagers returned home feeling frustrated.',
        vi: 'Hai ngày sau, cậu bé lại giở đúng trò đùa cũ đó thêm lần nữa, và dân làng bực bội quay trở về nhà.',
      },
      {
        en: 'That evening, a real wolf actually crept out of the dark woods and frightened the entire flock.',
        vi: 'Tối hôm đó, một con sói thật sự lẻn ra từ khu rừng tối và làm cả đàn cừu hoảng loạn.',
      },
      {
        en: 'The boy screamed desperately for help, yet nobody climbed the hill because everyone assumed he was lying again.',
        vi: 'Cậu bé gào thét cầu cứu trong tuyệt vọng, nhưng chẳng ai leo lên đồi vì mọi người đều cho rằng cậu lại đang nói dối.',
      },
      {
        en: 'Sitting alone at sunset, the shepherd learned a painful lesson: a liar is rarely believed even when speaking the truth.',
        vi: 'Ngồi một mình lúc hoàng hôn, cậu bé chăn cừu thấm thía một bài học đau xót: kẻ hay nói dối hiếm khi được tin ngay cả lúc nói thật.',
      },
    ],
    glossary: [
      { word: 'shepherd', ipa: '/ˈʃep.əd/', partOfSpeech: 'danh từ (n)', meaningVi: 'người chăn cừu' },
      { word: 'flock', ipa: '/flɒk/', partOfSpeech: 'danh từ (n)', meaningVi: 'đàn (cừu, chim)' },
      { word: 'prank', ipa: '/præŋk/', partOfSpeech: 'danh từ (n)', meaningVi: 'trò đùa tinh nghịch, trò lừa' },
      { word: 'frustrated', ipa: '/frʌsˈtreɪ.tɪd/', partOfSpeech: 'tính từ (adj)', meaningVi: 'bực bội, thất vọng' },
      { word: 'crept', ipa: '/krept/', partOfSpeech: 'động từ (v)', meaningVi: 'lẻn, rón rén bò tới (quá khứ của creep)' },
      { word: 'desperately', ipa: '/ˈdes.pər.ət.li/', partOfSpeech: 'trạng từ (adv)', meaningVi: 'một cách tuyệt vọng' },
      { word: 'assumed', ipa: '/əˈsjuːmd/', partOfSpeech: 'động từ (v)', meaningVi: 'cho rằng, phỏng đoán' },
    ],
    grammarPoints: [
      {
        title: 'Cấu trúc only to + V (kết quả bất ngờ / thất vọng)',
        formula: 'Clause, only to + V-nguyên mẫu',
        explanationVi: 'Dùng để nhấn mạnh một kết quả trái ngược hoàn toàn với mong đợi ban đầu.',
        exampleEn: 'Farmers rushed up the hill to protect the flock, only to find the boy laughing loudly.',
        exampleVi: 'Nông dân vội chạy lên đồi bảo vệ đàn cừu, nhưng rốt cuộc chỉ thấy cậu bé cười lớn.',
      },
      {
        title: 'Cụm từ be responsible for + V-ing',
        formula: 'S + be + responsible for + Noun / V-ing',
        explanationVi: 'Diễn tả ai đó chịu trách nhiệm làm một nhiệm vụ cụ thể.',
        exampleEn: 'A young shepherd boy was responsible for watching the village sheep.',
        exampleVi: 'Một cậu bé chăn cừu chịu trách nhiệm trông coi đàn cừu của làng.',
      },
    ],
    quiz: [
      {
        question: 'Why did the shepherd boy cry "Wolf!" the first time?',
        options: [
          'He saw a fox near the trees',
          'He was bored and wanted to play a trick',
          'He lost one of his sheep',
          'He was testing his voice',
        ],
        correctIndex: 1,
        explanationVi: 'Cậu bé cảm thấy quá buồn chán ("terribly bored") nên bày trò trêu đùa dân làng.',
      },
      {
        question: 'Why did nobody come when the real wolf appeared?',
        options: [
          'The villagers were asleep',
          'The hill was too slippery',
          'Everyone assumed he was lying again',
          'They could not hear his voice',
        ],
        correctIndex: 2,
        explanationVi: 'Dân làng đều nghĩ cậu lại nói dối lần nữa ("everyone assumed he was lying again").',
      },
      {
        question: 'What is the main lesson of this fable?',
        options: [
          'Never work on a hillside alone',
          'Trust is hard to win back once you lie repeatedly',
          'Always carry a whistle',
          'Sheep are easily frightened',
        ],
        correctIndex: 1,
        explanationVi: 'Bài học cốt lõi là mất lòng tin vì nói dối sẽ khiến người khác không tin ngay cả khi bạn nói sự thật.',
      },
    ],
  },
  {
    id: 'princess-and-the-pea-a2',
    titleEn: 'The Princess and the Pea',
    titleVi: 'Nàng công chúa và hạt đậu',
    author: 'H.C. Andersen',
    collection: 'andersen',
    levelId: 'A2',
    estimatedMinutes: 3,
    coverImage: STORY_COVER_IMAGES.andersen,
    summaryVi:
      'Một vị hoàng tử muốn tìm công chúa đích thực; vào một đêm giông bão, hoàng hậu đã nghĩ ra phép thử tinh tế bằng một hạt đậu nhỏ.',
    moralVi: 'Đôi khi những chi tiết nhỏ bé nhất lại tiết lộ phẩm chất chân thật của một con người.',
    sentences: [
      {
        en: 'Once there was a young prince who wished to marry a real princess, not merely someone who claimed to be one.',
        vi: 'Ngày xưa có một vị hoàng tử trẻ mong muốn cưới một nàng công chúa thật sự, chứ không chỉ là người tự nhận.',
      },
      {
        en: 'He traveled around the world, yet something always felt slightly uncertain about every candidate he met.',
        vi: 'Chàng đi chu du khắp thế giới, nhưng ở mọi ứng viên chàng gặp luôn có điều gì đó chưa thật chắc chắn.',
      },
      {
        en: 'One stormy night, thunder boomed over the castle and heavy rain poured against the tall stone gates.',
        vi: 'Vào một đêm giông bão, sấm rền vang trên lâu đài và mưa lớn trút xuống cánh cổng đá cao vút.',
      },
      {
        en: 'A soaked young woman knocked at the entrance, insisting that she was a genuine princess caught in the storm.',
        vi: 'Một cô gái trẻ ướt sũng gõ cửa lối vào, khẳng định mình là một công chúa đích thực bị mắc kẹt trong cơn bão.',
      },
      {
        en: 'Water dripped from her hair and cloak, making the old queen silently curious about her story.',
        vi: 'Nước nhỏ giọt từ mái tóc và áo choàng của cô, khiến vị hoàng hậu lớn tuổi thầm tò mò về câu chuyện đó.',
      },
      {
        en: 'Without saying a word, the queen placed a single dried pea on the bedframe and stacked twenty soft mattresses on top of it.',
        vi: 'Không nói một lời, hoàng hậu đặt một hạt đậu khô duy nhất lên khung giường rồi xếp chồng hai mươi tấm nệm êm lên trên.',
      },
      {
        en: 'The next morning, the queen politely asked the visitor how comfortably she had slept through the night.',
        vi: 'Sáng hôm sau, hoàng hậu lịch sự hỏi vị khách đêm qua cô ngủ có thoải mái không.',
      },
      {
        en: 'The girl sighed softly and replied that she had barely closed her eyes because something hard beneath her had bruised her back.',
        vi: 'Cô gái khẽ thở dài và đáp rằng mình hầu như không chợp mắt nổi vì có vật gì đó cứng bên dưới làm đau cả lưng.',
      },
      {
        en: 'Hearing this, the royal family rejoiced, for only a true princess could feel one tiny pea through twenty mattresses.',
        vi: 'Nghe vậy, hoàng gia vui mừng khôn xiết, vì chỉ một công chúa đích thực mới có thể cảm nhận một hạt đậu nhỏ qua hai mươi lớp nệm.',
      },
    ],
    glossary: [
      { word: 'soaked', ipa: '/səʊkt/', partOfSpeech: 'tính từ (adj)', meaningVi: 'ướt sũng, ướt đẫm' },
      { word: 'genuine', ipa: '/ˈdʒen.ju.ɪn/', partOfSpeech: 'tính từ (adj)', meaningVi: 'thật sự, đích thực' },
      { word: 'mattresses', ipa: '/ˈmæt.rə.sɪz/', partOfSpeech: 'danh từ (n)', meaningVi: 'những tấm nệm' },
      { word: 'barely', ipa: '/ˈbeə.li/', partOfSpeech: 'trạng từ (adv)', meaningVi: 'hầu như không' },
      { word: 'rejoiced', ipa: '/rɪˈdʒɔɪst/', partOfSpeech: 'động từ (v)', meaningVi: 'vui mừng khôn xiết' },
    ],
    grammarPoints: [
      {
        title: 'Lời nói gián tiếp với Reported Questions (how...)',
        formula: 'S + asked + O + Wh-word + S + V (lùi thì)',
        explanationVi: 'Trong câu hỏi gián tiếp, trật tự câu trở về dạng khẳng định (S + V), không đảo trợ động từ.',
        exampleEn: 'The queen politely asked the visitor how comfortably she had slept.',
        exampleVi: 'Hoàng hậu lịch sự hỏi vị khách cô đã ngủ có thoải mái không.',
      },
      {
        title: 'Giới từ Without + V-ing',
        formula: 'Without + V-ing, S + V',
        explanationVi: 'Diễn tả hành động diễn ra mà không kèm theo việc gì khác.',
        exampleEn: 'Without saying a word, the queen placed a single dried pea on the bedframe.',
        exampleVi: 'Không nói một lời nào, hoàng hậu đặt một hạt đậu khô lên khung giường.',
      },
    ],
    quiz: [
      {
        question: 'What did the queen hide underneath the mattresses?',
        options: ['A golden coin', 'A small stone', 'A single dried pea', 'A wooden key'],
        correctIndex: 2,
        explanationVi: 'Hoàng hậu giấu một hạt đậu khô duy nhất ("a single dried pea") dưới hai mươi tấm nệm.',
      },
      {
        question: 'How did the visitor sleep during the night?',
        options: [
          'She slept deeply until noon',
          'She barely closed her eyes because something felt hard',
          'She stayed awake reading books',
          'She was scared of the thunder',
        ],
        correctIndex: 1,
        explanationVi: 'Cô hầu như không chợp mắt được vì cảm thấy vật cứng bên dưới nệm.',
      },
      {
        question: 'What does "soaked" mean in the story?',
        options: ['Very hungry', 'Completely wet', 'Very sleepy', 'Dressed in silk'],
        correctIndex: 1,
        explanationVi: '"Soaked" nghĩa là ướt sũng (do mắc mưa trong cơn bão).',
      },
    ],
  },
  {
    id: 'rapunzel-a2',
    titleEn: 'Rapunzel',
    titleVi: 'Công chúa tóc mây Rapunzel',
    author: 'Brothers Grimm',
    collection: 'grimm',
    levelId: 'A2',
    estimatedMinutes: 4,
    coverImage: STORY_COVER_IMAGES.grimm,
    summaryVi:
      'Cô gái có mái tóc vàng dài sống trong tòa tháp cao giữa rừng sâu tìm thấy tự do và tình yêu nhờ tiếng hát trong trẻo.',
    moralVi: 'Sự kiên trì, lòng dũng cảm và niềm tin sẽ mở ra lối thoát ngay cả trong hoàn cảnh tưởng chừng bế tắc.',
    sentences: [
      {
        en: 'Deep in a quiet forest stood a tall stone tower with no stairs and only one tiny window at the top.',
        vi: 'Sâu trong khu rừng yên tĩnh có một tòa tháp đá cao vút không có cầu thang và chỉ có một ô cửa sổ nhỏ trên đỉnh.',
      },
      {
        en: 'Inside lived Rapunzel, a young girl with sparkling eyes and magnificent golden hair as long as a rope.',
        vi: 'Bên trong là Rapunzel, một cô gái trẻ có đôi mắt long lanh và mái tóc vàng lộng lẫy dài như sợi dây thừng.',
      },
      {
        en: 'Whenever the old enchantress wanted to climb up, she called out, "Rapunzel, Rapunzel, let down your golden hair!"',
        vi: 'Mỗi khi mụ phù thủy già muốn trèo lên, mụ gọi lớn: "Rapunzel, Rapunzel, hãy thả mái tóc vàng của con xuống!"',
      },
      {
        en: 'Rapunzel spent her lonely afternoons singing sweet melodies that echoed gently across the pine trees.',
        vi: 'Rapunzel dành những buổi chiều cô đơn để hát những giai điệu ngọt ngào vang vọng dịu dàng qua rừng thông.',
      },
      {
        en: 'One afternoon, a traveling prince rode past the tower and stopped immediately, enchanted by her clear voice.',
        vi: 'Một buổi chiều, một vị hoàng tử du hành cưỡi ngựa ngang qua tòa tháp và dừng lại ngay, bị mê hoặc bởi giọng hát trong trẻo của cô.',
      },
      {
        en: 'Hiding behind a mossy oak, the prince watched how the enchantress climbed the tower and learned the secret words.',
        vi: 'Ẩn nấp sau gốc sồi phủ rêu, hoàng tử quan sát cách mụ phù thủy trèo lên tháp và học thuộc câu thần chú bí mật.',
      },
      {
        en: 'The next evening at dusk, he stepped beneath the window and called up to Rapunzel with a warm, steady voice.',
        vi: 'Chiều tối hôm sau lúc chạng vạng, chàng bước tới dưới ô cửa sổ và cất tiếng gọi Rapunzel bằng giọng nói ấm áp, điềm tĩnh.',
      },
      {
        en: 'At first Rapunzel felt startled, yet the prince’s kindness soon earned her trust, and they planned a clever escape.',
        vi: 'Ban đầu Rapunzel giật mình, nhưng sự tử tế của hoàng tử sớm chiếm được lòng tin của cô, và họ lên kế hoạch trốn thoát thông minh.',
      },
      {
        en: 'Though the enchantress later separated them across a wide desert, their devotion eventually reunited them in the kingdom.',
        vi: 'Dù mụ phù thủy sau đó chia cắt họ qua sa mạc rộng lớn, tình cảm chân thành cuối cùng đã giúp họ đoàn tụ tại vương quốc.',
      },
    ],
    glossary: [
      { word: 'tower', ipa: '/ˈtaʊ.ər/', partOfSpeech: 'danh từ (n)', meaningVi: 'tòa tháp' },
      { word: 'enchantress', ipa: '/ɪnˈtʃɑːn.trəs/', partOfSpeech: 'danh từ (n)', meaningVi: 'nữ phù thủy' },
      { word: 'melodies', ipa: '/ˈmel.ə.diz/', partOfSpeech: 'danh từ (n)', meaningVi: 'những giai điệu' },
      { word: 'dusk', ipa: '/dʌsk/', partOfSpeech: 'danh từ (n)', meaningVi: 'lúc chạng vạng, hoàng hôn' },
      { word: 'startled', ipa: '/ˈstɑː.təld/', partOfSpeech: 'tính từ (adj)', meaningVi: 'giật mình, sửng sốt' },
      { word: 'devotion', ipa: '/dɪˈvəʊ.ʃən/', partOfSpeech: 'danh từ (n)', meaningVi: 'sự tận tụy, lòng chung thủy' },
    ],
    grammarPoints: [
      {
        title: 'Đảo ngữ chỉ nơi chốn (Place Inversion)',
        formula: 'Cụm giới từ chỉ nơi chốn + V + S',
        explanationVi: 'Tạo sắc thái kể chuyện giàu hình ảnh khi mở đầu câu bằng cụm từ chỉ địa điểm.',
        exampleEn: 'Deep in a quiet forest stood a tall stone tower.',
        exampleVi: 'Sâu trong khu rừng yên tĩnh sừng sững một tòa tháp đá cao.',
      },
      {
        title: 'Liên từ nhượng bộ Though',
        formula: 'Though + S1 + V1, S2 + V2',
        explanationVi: 'Diễn tả hai vế tương phản ("Mặc dù... nhưng...").',
        exampleEn: 'Though the enchantress separated them, their devotion eventually reunited them.',
        exampleVi: 'Mặc dù mụ phù thủy chia cắt họ, lòng chung thủy cuối cùng vẫn giúp họ đoàn tụ.',
      },
    ],
    quiz: [
      {
        question: 'What made the tower unusual?',
        options: [
          'It was built on a lake',
          'It had no stairs and only one tiny window at the top',
          'It was made entirely of glass',
          'It had ten golden doors',
        ],
        correctIndex: 1,
        explanationVi: 'Tòa tháp đá không có cầu thang và chỉ có duy nhất một ô cửa sổ nhỏ trên đỉnh.',
      },
      {
        question: 'What first drew the prince’s attention to the tower?',
        options: ['A bright lantern', 'Rapunzel’s singing voice', 'A flock of birds', 'A map from his father'],
        correctIndex: 1,
        explanationVi: 'Hoàng tử dừng lại vì bị mê hoặc bởi tiếng hát trong trẻo của Rapunzel.',
      },
      {
        question: 'What does "dusk" mean?',
        options: ['Early morning sunrise', 'Noon', 'Early evening twilight', 'Midnight'],
        correctIndex: 2,
        explanationVi: '"Dusk" là thời điểm chạng vạng tối ngay sau khi mặt trời lặn.',
      },
    ],
  },

  // ===================== B1 STORIES =====================
  {
    id: 'hansel-and-gretel-b1',
    titleEn: 'Hansel and Gretel',
    titleVi: 'Hansel và Gretel',
    author: 'Brothers Grimm',
    collection: 'grimm',
    levelId: 'B1',
    estimatedMinutes: 4,
    coverImage: STORY_COVER_IMAGES.grimm,
    summaryVi:
      'Hai anh em bị bỏ lại giữa khu rừng sâu đã dùng trí thông minh và tình yêu thương lẫn nhau để thoát khỏi ngôi nhà bánh kẹo của mụ phù thủy.',
    moralVi: 'Sự bình tĩnh, đoàn kết và trí thông minh giúp ta vượt qua những thử thách hiểm nguy nhất.',
    sentences: [
      {
        en: 'During a harsh winter famine, a poor woodcutter and his children, Hansel and Gretel, struggled to find enough bread each day.',
        vi: 'Trong một mùa đông đói kém khắc nghiệt, người tiều phu nghèo cùng hai con là Hansel và Gretel chật vật kiếm đủ bánh mì mỗi ngày.',
      },
      {
        en: 'Overhearing a plan to leave them deep inside the woods, clever Hansel quietly filled his pockets with shiny white pebbles.',
        vi: 'Tình cờ nghe được kế hoạch bỏ họ lại sâu trong rừng, cậu bé thông minh Hansel lặng lẽ nhét đầy những viên sỏi trắng sáng vào túi.',
      },
      {
        en: 'As they walked through the dark trees, he dropped the pebbles one by one so the moonlight would guide them safely home.',
        vi: 'Khi đi xuyên qua những tán cây tối, cậu thả từng viên sỏi một để ánh trăng dẫn đường cho họ trở về nhà an toàn.',
      },
      {
        en: 'The second time, however, Hansel only had dry breadcrumbs, which hungry forest birds quickly ate before nightfall.',
        vi: 'Thế nhưng lần thứ hai, Hansel chỉ có vụn bánh mì khô, và lũ chim rừng đói bụng nhanh chóng ăn sạch trước khi trời tối.',
      },
      {
        en: 'Lost and exhausted after three days of wandering, the siblings stumbled upon a remarkable cottage built entirely of gingerbread and sugar.',
        vi: 'Lạc đường và kiệt sức sau ba ngày lang thang, hai anh em tình cờ bắt gặp một ngôi nhà kỳ lạ xây hoàn toàn bằng bánh gừng và đường.',
      },
      {
        en: 'An elderly woman invited them inside with honeyed words, yet she turned out to be a wicked witch who trapped travelers.',
        vi: 'Một bà lão mời họ vào trong bằng những lời ngọt ngào, nhưng hóa ra đó là một mụ phù thủy độc ác chuyên bẫy người qua đường.',
      },
      {
        en: 'She locked Hansel in a wooden cage and ordered Gretel to fetch water and prepare a hot baking oven.',
        vi: 'Mụ nhốt Hansel vào một chiếc lồng gỗ và ra lệnh cho Gretel đi lấy nước cùng nhóm lửa một lò nướng nóng rực.',
      },
      {
        en: 'Refusing to panic, quick-witted Gretel pretended she did not know how to check the oven’s heat and asked the witch to demonstrate.',
        vi: 'Không hề hoảng loạn, cô bé nhanh trí Gretel giả vờ không biết cách kiểm tra độ nóng của lò và nhờ mụ phù thủy làm mẫu.',
      },
      {
        en: 'The moment the witch leaned forward, Gretel pushed the iron door shut, freed her brother, and escaped back across the river to their tearful father.',
        vi: 'Ngay khoảnh khắc mụ phù thủy cúi người về phía trước, Gretel đẩy sập cánh cửa sắt, giải thoát anh trai rồi vượt sông trở về bên người cha đang rơi lệ.',
      },
    ],
    glossary: [
      { word: 'famine', ipa: '/ˈfæm.ɪn/', partOfSpeech: 'danh từ (n)', meaningVi: 'nạn đói' },
      { word: 'pebbles', ipa: '/ˈpeb.əlz/', partOfSpeech: 'danh từ (n)', meaningVi: 'những viên sỏi nhỏ' },
      { word: 'stumbled upon', ipa: '/ˈstʌm.bəld əˈpɒn/', partOfSpeech: 'cụm động từ', meaningVi: 'tình cờ bắt gặp' },
      { word: 'siblings', ipa: '/ˈsɪb.lɪŋz/', partOfSpeech: 'danh từ (n)', meaningVi: 'anh chị em ruột' },
      { word: 'quick-witted', ipa: '/ˌkwɪkˈwɪt.ɪd/', partOfSpeech: 'tính từ (adj)', meaningVi: 'nhanh trí, lanh lợi' },
      { word: 'demonstrate', ipa: '/ˈdem.ən.streɪt/', partOfSpeech: 'động từ (v)', meaningVi: 'làm mẫu, minh họa' },
    ],
    grammarPoints: [
      {
        title: 'Mệnh đề phân từ hiện tại (Present Participle Clause)',
        formula: 'V-ing ..., S + V',
        explanationVi: 'Rút gọn mệnh đề trạng ngữ cùng chủ ngữ để câu văn cô đọng, giàu nhịp điệu hơn.',
        exampleEn: 'Overhearing a plan to leave them in the woods, clever Hansel quietly filled his pockets with pebbles.',
        exampleVi: 'Tình cờ nghe được kế hoạch bỏ họ lại trong rừng, cậu bé thông minh Hansel lặng lẽ nhét sỏi vào túi.',
      },
      {
        title: 'Cụm động từ turn out to be (hóa ra là)',
        formula: 'S + turn out to be + Noun/Adj',
        explanationVi: 'Diễn tả sự thật bất ngờ khác với ấn tượng ban đầu.',
        exampleEn: 'She turned out to be a wicked witch who trapped travelers.',
        exampleVi: 'Bà ta hóa ra là một mụ phù thủy độc ác chuyên bẫy du khách.',
      },
    ],
    quiz: [
      {
        question: 'Why did the breadcrumb trail fail the second time?',
        options: [
          'The rain washed it away',
          'Forest birds ate the breadcrumbs',
          'Snow covered the path',
          'Hansel forgot to drop them',
        ],
        correctIndex: 1,
        explanationVi: 'Những chú chim rừng đói bụng đã ăn sạch vụn bánh mì trước khi trời tối.',
      },
      {
        question: 'How did Gretel outsmart the witch?',
        options: [
          'She hid the key to the cottage',
          'She asked the witch to demonstrate how to check the oven',
          'She called the villagers for help',
          'She broke the cage with an iron rod',
        ],
        correctIndex: 1,
        explanationVi: 'Gretel giả vờ không biết kiểm tra lò nướng và nhờ mụ phù thủy làm mẫu để đánh lừa mụ.',
      },
      {
        question: 'What does the phrasal verb "stumbled upon" mean?',
        options: ['Carefully planned', 'Found by accident', 'Walked past without noticing', 'Built from scratch'],
        correctIndex: 1,
        explanationVi: '"Stumbled upon" có nghĩa là tình cờ phát hiện hoặc bắt gặp điều gì đó.',
      },
    ],
  },
  {
    id: 'snow-white-b1',
    titleEn: 'Snow-White',
    titleVi: 'Nàng Bạch Tuyết',
    author: 'Brothers Grimm',
    collection: 'grimm',
    levelId: 'B1',
    estimatedMinutes: 4,
    coverImage: STORY_COVER_IMAGES.grimm,
    summaryVi:
      'Bị hoàng hậu ghen tị truy đuổi, nàng công chúa Bạch Tuyết tìm thấy mái ấm cùng bảy chú lùn tốt bụng trước khi vượt qua lời nguyền quả táo độc.',
    moralVi: 'Lòng đố kỵ tự hủy hoại bản thân, còn sự chân thành sẽ mang lại những người bạn trung thành nhất.',
    sentences: [
      {
        en: 'In a mountain kingdom lived a gentle princess named Snow-White, admired by everyone for her bright spirit.',
        vi: 'Tại một vương quốc miền núi có nàng công chúa dịu dàng tên Bạch Tuyết, được mọi người yêu mến nhờ tâm hồn tươi sáng.',
      },
      {
        en: 'Her vain stepmother consulted a magic mirror every morning, demanding to hear that she remained the fairest in the land.',
        vi: 'Người mẹ kế kiêu ngạo mỗi sáng đều hỏi chiếc gương thần, đòi nghe rằng bà vẫn là người xinh đẹp nhất vương quốc.',
      },
      {
        en: 'When the mirror honestly named Snow-White instead, bitter jealousy consumed the queen’s heart.',
        vi: 'Khi chiếc gương thành thật gọi tên Bạch Tuyết, lòng ghen tị cay đắng đã xâm chiếm trái tim hoàng hậu.',
      },
      {
        en: 'Warned by a compassionate huntsman who refused to harm her, Snow-White fled across the misty hills.',
        vi: 'Được một người thợ săn giàu lòng trắc ẩn cảnh báo và từ chối làm hại, Bạch Tuyết chạy trốn qua những ngọn đồi mù sương.',
      },
      {
        en: 'At twilight, she discovered a neat timber cottage belonging to seven hardworking dwarfs who mined precious ore in the mountains.',
        vi: 'Lúc hoàng hôn, nàng phát hiện một ngôi nhà gỗ gọn gàng của bảy chú lùn chăm chỉ làm nghề khai thác quặng quý trên núi.',
      },
      {
        en: 'The dwarfs warmly offered her shelter in exchange for helping keep their cozy household tidy while they worked.',
        vi: 'Bảy chú lùn nồng hậu cho nàng trú ẩn, đổi lại nàng giúp giữ gìn ngôi nhà ấm cúng ngăn nắp trong lúc họ đi làm.',
      },
      {
        en: 'Discovering Snow-White was still alive, the disguised queen arrived at the cottage window carrying a glossy poisoned apple.',
        vi: 'Phát hiện Bạch Tuyết vẫn còn sống, hoàng hậu cải trang đến bên cửa sổ mang theo một quả táo tẩm độc bóng bẩy.',
      },
      {
        en: 'After one bite, Snow-White fell into a deep enchanted sleep, leaving the seven dwarfs heartbroken beside her crystal resting place.',
        vi: 'Chỉ sau một miếng cắn, Bạch Tuyết chìm vào giấc ngủ phép thuật sâu thẳm, khiến bảy chú lùn đau lòng bên nơi an nghỉ bằng pha lê của nàng.',
      },
      {
        en: 'When a visiting prince lifted the crystal lid to honor her, the poisoned piece dislodged, breaking the spell and restoring Snow-White to life.',
        vi: 'Khi một vị hoàng tử ghé thăm nâng nắp pha lê lên để bày tỏ lòng kính trọng, miếng táo độc bật ra, hóa giải lời nguyền và đưa Bạch Tuyết tỉnh lại.',
      },
    ],
    glossary: [
      { word: 'vain', ipa: '/veɪn/', partOfSpeech: 'tính từ (adj)', meaningVi: 'kiêu ngạo, tự phụ về nhan sắc' },
      { word: 'jealousy', ipa: '/ˈdʒel.ə.si/', partOfSpeech: 'danh từ (n)', meaningVi: 'lòng ghen tị, đố kỵ' },
      { word: 'compassionate', ipa: '/kəmˈpæʃ.ən.ət/', partOfSpeech: 'tính từ (adj)', meaningVi: 'giàu lòng trắc ẩn, nhân ái' },
      { word: 'shelter', ipa: '/ˈʃel.tər/', partOfSpeech: 'danh từ (n)', meaningVi: 'nơi trú ẩn' },
      { word: 'disguised', ipa: '/dɪsˈɡaɪzd/', partOfSpeech: 'tính từ (adj)', meaningVi: 'cải trang, ngụy trang' },
      { word: 'dislodged', ipa: '/dɪsˈlɒdʒd/', partOfSpeech: 'động từ (v)', meaningVi: 'bật ra, rời khỏi vị trí' },
    ],
    grammarPoints: [
      {
        title: 'Mệnh đề phân từ quá khứ (Past Participle Clause)',
        formula: 'V3/V-ed + by ..., S + V',
        explanationVi: 'Diễn tả ý nghĩa bị động một cách ngắn gọn ở đầu câu.',
        exampleEn: 'Warned by a compassionate huntsman, Snow-White fled across the misty hills.',
        exampleVi: 'Được một người thợ săn nhân hậu cảnh báo, Bạch Tuyết chạy trốn qua những ngọn đồi mù sương.',
      },
      {
        title: 'Cụm từ in exchange for + V-ing/Noun',
        formula: 'in exchange for + Noun / V-ing',
        explanationVi: 'Mang nghĩa "đổi lại việc gì đó" trong các thỏa thuận giao tiếp.',
        exampleEn: 'The dwarfs offered her shelter in exchange for helping keep their household tidy.',
        exampleVi: 'Bảy chú lùn cho nàng trú ẩn đổi lại việc giúp giữ nhà cửa ngăn nắp.',
      },
    ],
    quiz: [
      {
        question: 'Why did Snow-White manage to escape from the palace?',
        options: [
          'The magic mirror helped her',
          'A compassionate huntsman warned her and refused to harm her',
          'The dwarfs rescued her from the castle',
          'She disguised herself as a merchant',
        ],
        correctIndex: 1,
        explanationVi: 'Người thợ săn nhân hậu đã từ chối làm hại nàng và cảnh báo để nàng chạy trốn.',
      },
      {
        question: 'What work did the seven dwarfs do?',
        options: ['Baking bread', 'Sailing ships', 'Mining precious ore in the mountains', 'Weaving silk'],
        correctIndex: 2,
        explanationVi: 'Bảy chú lùn làm nghề khai thác quặng quý trên núi ("mined precious ore").',
      },
      {
        question: 'What broke the enchanted sleep spell?',
        options: [
          'The poisoned piece of apple dislodged',
          'A song from the forest birds',
          'Rain falling on the glass',
          'The mirror shattering',
        ],
        correctIndex: 0,
        explanationVi: 'Miếng táo độc bật ra ("the poisoned piece dislodged") đã hóa giải lời nguyền.',
      },
    ],
  },
  {
    id: 'puss-in-boots-b1',
    titleEn: 'Puss in Boots',
    titleVi: 'Chú mèo đi hia',
    author: 'Charles Perrault',
    collection: 'perrault',
    levelId: 'B1',
    estimatedMinutes: 4,
    coverImage: STORY_COVER_IMAGES.perrault,
    summaryVi:
      'Chàng trai út chỉ thừa kế một chú mèo, nhưng với đôi hia da và trí tuệ sắc sảo, chú mèo đã biến chủ nhân thành Hầu tước giàu có.',
    moralVi: 'Trí tuệ, sự tự tin và óc sáng tạo đôi khi còn giá trị hơn cả tài sản thừa kế.',
    sentences: [
      {
        en: 'When an old miller died, his youngest son inherited nothing except a remarkably clever tomcat.',
        vi: 'Khi một người thợ xay già qua đời, người con trai út chẳng thừa kế gì ngoài một chú mèo đực thông minh lạ thường.',
      },
      {
        en: 'Before the boy could despair, the cat stood upright and calmly asked for a pair of leather boots and a canvas sack.',
        vi: 'Trước khi chàng trai kịp tuyệt vọng, chú mèo đứng thẳng dậy và bình tĩnh xin một đôi hia da cùng một chiếc túi vải.',
      },
      {
        en: 'Dressed neatly in his new boots, Puss caught fresh game in the meadow and delivered it directly to the royal palace.',
        vi: 'Đi đôi hia mới chỉnh tề, chú mèo bắt thú rừng tươi trên đồng cỏ rồi mang thẳng tới dâng lên cung điện hoàng gia.',
      },
      {
        en: 'He bowed gracefully before the king and announced that the gifts came from his noble master, the Marquis of Carabas.',
        vi: 'Chú cúi chào đầy thanh lịch trước nhà vua và tuyên bố món quà đến từ vị chủ nhân cao quý của mình, Hầu tước xứ Carabas.',
      },
      {
        en: 'Weeks later, hearing that the king’s carriage would pass by the river, Puss persuaded his master to swim in the stream.',
        vi: 'Vài tuần sau, nghe tin xe ngựa nhà vua sẽ đi ngang bờ sông, chú mèo thuyết phục chủ nhân xuống suối tắm.',
      },
      {
        en: 'As the royal coach approached, Puss cried out that thieves had stolen the Marquis’s fine clothes, prompting the king to offer splendid royal garments.',
        vi: 'Khi xe ngựa hoàng gia tiến lại gần, chú mèo kêu lớn rằng bọn trộm đã lấy mất trang phục của Hầu tước, khiến nhà vua lập tức ban cho bộ lễ phục lộng lẫy.',
      },
      {
        en: 'Racing ahead to a magnificent chateau owned by a shape-shifting ogre, Puss flattered the giant into proving his magical skills.',
        vi: 'Chạy vượt lên trước tới một tòa lâu đài tráng lệ thuộc về một gã chằn tinh biết biến hình, chú mèo khéo léo tâng bốc để gã chứng minh phép thuật.',
      },
      {
        en: 'The proud ogre boasted that he could shrink into a tiny mouse — and the instant he did, Puss swiftly pounced and ended the threat.',
        vi: 'Gã chằn tinh kiêu ngạo khoe rằng mình có thể thu nhỏ thành một con chuột bé xíu — và ngay khoảnh khắc gã biến hình, chú mèo nhanh chóng vồ lấy và chấm dứt mối họa.',
      },
      {
        en: 'When the king arrived at the grand estate, he was deeply impressed, and the miller’s son began a bright new life as a respected nobleman.',
        vi: 'Khi nhà vua tới dinh thự rộng lớn, ngài vô cùng ấn tượng, và con trai người thợ xay bắt đầu cuộc đời mới rạng rỡ như một vị quý tộc đáng kính.',
      },
    ],
    glossary: [
      { word: 'inherited', ipa: '/ɪnˈher.ɪ.tɪd/', partOfSpeech: 'động từ (v)', meaningVi: 'thừa kế' },
      { word: 'despair', ipa: '/dɪˈspeər/', partOfSpeech: 'động từ (v)', meaningVi: 'tuyệt vọng' },
      { word: 'persuaded', ipa: '/pəˈsweɪ.dɪd/', partOfSpeech: 'động từ (v)', meaningVi: 'thuyết phục' },
      { word: 'garments', ipa: '/ˈɡɑː.mənts/', partOfSpeech: 'danh từ (n)', meaningVi: 'trang phục, quần áo' },
      { word: 'flattered', ipa: '/ˈflæt.ərd/', partOfSpeech: 'động từ (v)', meaningVi: 'tâng bốc, nịnh khéo' },
      { word: 'pounced', ipa: '/paʊnst/', partOfSpeech: 'động từ (v)', meaningVi: 'vồ lấy, chồm lên' },
    ],
    grammarPoints: [
      {
        title: 'Cấu trúc prompt + O + to V (thúc đẩy ai làm gì)',
        formula: 'prompt + O + to + V-nguyên mẫu',
        explanationVi: 'Diễn tả một sự việc dẫn trực tiếp đến phản ứng hoặc hành động của người khác.',
        exampleEn: 'Puss cried out that thieves had stolen the clothes, prompting the king to offer splendid royal garments.',
        exampleVi: 'Chú mèo kêu lên rằng kẻ trộm đã lấy quần áo, khiến nhà vua lập tức ban cho bộ lễ phục lộng lẫy.',
      },
      {
        title: 'Cấu trúc flatter/persuade + O + into + V-ing',
        formula: 'flatter / persuade + O + into + V-ing',
        explanationVi: 'Khéo léo thuyết phục hoặc tâng bốc ai đó khiến họ làm theo ý mình.',
        exampleEn: 'Puss flattered the giant into proving his magical skills.',
        exampleVi: 'Chú mèo khéo tâng bốc gã khổng lồ khiến gã chịu chứng minh phép thuật.',
      },
    ],
    quiz: [
      {
        question: 'What two items did the cat ask his master for at the beginning?',
        options: [
          'A sword and a hat',
          'A pair of leather boots and a canvas sack',
          'A horse and a cloak',
          'A silver bell and a basket',
        ],
        correctIndex: 1,
        explanationVi: 'Chú mèo xin một đôi hia da và một chiếc túi vải ("a pair of leather boots and a canvas sack").',
      },
      {
        question: 'How did Puss defeat the shape-shifting ogre?',
        options: [
          'He locked the castle doors',
          'He flattered the ogre into turning into a tiny mouse',
          'He called the royal guards',
          'He stole the ogre’s wand',
        ],
        correctIndex: 1,
        explanationVi: 'Chú mèo tâng bốc gã chằn tinh để gã chứng minh phép biến thành chuột nhỏ rồi lập tức vồ lấy.',
      },
      {
        question: 'What does "inherited" mean?',
        options: ['Sold at a market', 'Received after someone passed away', 'Borrowed from a friend', 'Built by hand'],
        correctIndex: 1,
        explanationVi: '"Inherited" nghĩa là được thừa kế tài sản sau khi ai đó qua đời.',
      },
    ],
  },

  // ===================== B2 STORIES =====================
  {
    id: 'sleeping-beauty-b2',
    titleEn: 'Sleeping Beauty',
    titleVi: 'Người đẹp Ngủ trong rừng',
    author: 'Brothers Grimm',
    collection: 'grimm',
    levelId: 'B2',
    estimatedMinutes: 5,
    coverImage: STORY_COVER_IMAGES.grimm,
    summaryVi:
      'Lời nguyền từ bà tiên thứ mười ba khiến cả tòa lâu đài chìm vào giấc ngủ trăm năm giữa rừng hoa hồng gai, chờ ngày thời khắc định mệnh điểm.',
    moralVi: 'Sự cẩn trọng có thể giảm nhẹ tai họa, nhưng lòng kiên nhẫn và thời điểm chín muồi mới hóa giải được định mệnh.',
    sentences: [
      {
        en: 'Overjoyed by the birth of their daughter, the king and queen arranged a lavish banquet and invited twelve wise fairies of the realm.',
        vi: 'Vui sướng khôn xiết trước sự ra đời của con gái, nhà vua và hoàng hậu tổ chức đại tiệc xa hoa và mời mười hai bà tiên thông thái của vương quốc.',
      },
      {
        en: 'Because the royal treasury held only twelve golden plates, the thirteenth fairy was omitted from the invitation list.',
        vi: 'Vì kho báu hoàng gia chỉ có mười hai chiếc đĩa vàng, bà tiên thứ mười ba đã bị bỏ sót khỏi danh sách khách mời.',
      },
      {
        en: 'Just as eleven fairies had bestowed virtues of grace, wisdom, and joy upon the child, the uninvited guest stormed into the hall.',
        vi: 'Đúng lúc mười một bà tiên vừa ban tặng phẩm chất duyên dáng, trí tuệ và niềm vui cho đứa trẻ, vị khách không mời xông vào đại sảnh.',
      },
      {
        en: 'Stung by the slight, she pronounced a chilling curse: on her fifteenth birthday, the princess would prick her finger on a spindle and perish.',
        vi: 'Tổn thương vì bị xem nhẹ, bà ta tuyên bố một lời nguyền lạnh người: vào sinh nhật lần thứ mười lăm, công chúa sẽ đâm tay vào con thoi và qua đời.',
      },
      {
        en: 'Fortunately, the twelfth fairy had not yet spoken; though unable to erase the spell entirely, she softened it into a peaceful century-long slumber.',
        vi: 'May mắn thay, bà tiên thứ mười hai vẫn chưa ban phép; dù không thể xóa hoàn toàn lời nguyền, bà đã làm dịu nó thành giấc ngủ yên bình kéo dài trăm năm.',
      },
      {
        en: 'Despite the king’s decree to burn every spinning wheel across the kingdom, curiosity drew the fifteen-year-old princess up a forgotten tower stair.',
        vi: 'Bất chấp sắc lệnh của nhà vua đốt bỏ mọi guồng quay sợi khắp vương quốc, sự tò mò vẫn dẫn công chúa mười lăm tuổi leo lên cầu thang một ngọn tháp bị lãng quên.',
      },
      {
        en: 'The instant her fingertip touched the spindle, an uncanny stillness swept through the entire palace — guards, courtiers, and even hearth flames froze in place.',
        vi: 'Ngay khoảnh khắc đầu ngón tay nàng chạm vào con thoi, sự tĩnh lặng kỳ bí lan khắp tòa cung điện — lính gác, triều thần và cả ngọn lửa lò sưởi đều đông cứng lại.',
      },
      {
        en: 'Over the decades, an impenetrable hedge of thorny briar roses grew around the battlements, shielding the sleeping court from the outside world.',
        vi: 'Qua nhiều thập kỷ, một hàng rào hoa hồng gai dày đặc không thể xuyên qua mọc kín quanh tường thành, che chở triều đình đang ngủ khỏi thế giới bên ngoài.',
      },
      {
        en: 'Exactly one hundred years later, a courageous prince approached the hedge; miraculously, the tangled thorns parted into blooming blossoms to welcome him.',
        vi: 'Đúng tròn một trăm năm sau, một vị hoàng tử dũng cảm tiến tới hàng rào gai; kỳ diệu thay, những bụi gai chằng chịt tự tách ra thành hoa nở rộ đón chàng.',
      },
      {
        en: 'Upon waking the princess in the quiet chamber, life surged back through the castle halls as though not a single afternoon had passed.',
        vi: 'Khi chàng đánh thức công chúa trong căn phòng yên tĩnh, sức sống ùa trở lại khắp đại sảnh lâu đài như thể chưa từng có buổi chiều nào trôi qua.',
      },
    ],
    glossary: [
      { word: 'lavish', ipa: '/ˈlæv.ɪʃ/', partOfSpeech: 'tính từ (adj)', meaningVi: 'xa hoa, thịnh soạn' },
      { word: 'omitted', ipa: '/əˈmɪt.ɪd/', partOfSpeech: 'động từ (v)', meaningVi: 'bỏ sót, loại ra' },
      { word: 'bestowed', ipa: '/bɪˈstəʊd/', partOfSpeech: 'động từ (v)', meaningVi: 'ban tặng (phẩm chất, ân huệ)' },
      { word: 'slumber', ipa: '/ˈslʌm.bər/', partOfSpeech: 'danh từ (n)', meaningVi: 'giấc ngủ say' },
      { word: 'impenetrable', ipa: '/ɪmˈpen.ɪ.trə.bəl/', partOfSpeech: 'tính từ (adj)', meaningVi: 'không thể xuyên qua' },
      { word: 'surged', ipa: '/sɜːdʒd/', partOfSpeech: 'động từ (v)', meaningVi: 'dâng trào, ùa trở lại' },
    ],
    grammarPoints: [
      {
        title: 'Mệnh đề nhượng bộ với Despite + Noun Phrase',
        formula: 'Despite + Noun / V-ing, S + V',
        explanationVi: 'Khác với "Although" (theo sau là mệnh đề), "Despite" luôn đi kèm cụm danh từ hoặc danh động từ.',
        exampleEn: 'Despite the king’s decree to burn every spinning wheel, curiosity drew the princess up a forgotten stair.',
        exampleVi: 'Bất chấp sắc lệnh của nhà vua đốt bỏ mọi guồng quay sợi, sự tò mò vẫn dẫn công chúa lên cầu thang bị lãng quên.',
      },
      {
        title: 'Cấu trúc giả định as though + Past Perfect',
        formula: 'S + V + as though / as if + S + had + V3',
        explanationVi: 'So sánh giả định trái ngược với thực tế đã xảy ra ("như thể là...").',
        exampleEn: 'Life surged back through the castle halls as though not a single afternoon had passed.',
        exampleVi: 'Sức sống ùa trở lại khắp lâu đài như thể chưa từng có một buổi chiều nào trôi qua.',
      },
    ],
    quiz: [
      {
        question: 'Why was the thirteenth fairy not invited to the banquet?',
        options: [
          'She lived too far away',
          'The royal treasury held only twelve golden plates',
          'She had argued with the queen',
          'The palace hall was too small',
        ],
        correctIndex: 1,
        explanationVi: 'Kho báu hoàng gia chỉ có đúng mười hai chiếc đĩa vàng ("only twelve golden plates").',
      },
      {
        question: 'How did the twelfth fairy soften the curse?',
        options: [
          'She canceled it completely',
          'She turned death into a hundred-year slumber',
          'She protected the princess with armor',
          'She hid the princess in another country',
        ],
        correctIndex: 1,
        explanationVi: 'Bà tiên thứ mười hai chuyển cái chết thành một giấc ngủ yên bình kéo dài 100 năm.',
      },
      {
        question: 'What happened to the thorny hedge when the hundred years ended?',
        options: [
          'It dried up in winter',
          'The prince burned it down',
          'The thorns parted into blooming blossoms',
          'It grew twice as tall',
        ],
        correctIndex: 2,
        explanationVi: 'Đúng tròn 100 năm, hàng rào gai kỳ diệu tự tách ra thành hoa nở rộ đón vị hoàng tử.',
      },
    ],
  },
  {
    id: 'little-mermaid-b2',
    titleEn: 'The Little Mermaid',
    titleVi: 'Nàng tiên cá',
    author: 'H.C. Andersen',
    collection: 'andersen',
    levelId: 'B2',
    estimatedMinutes: 5,
    coverImage: STORY_COVER_IMAGES.andersen,
    summaryVi:
      'Nàng tiên cá út say mê thế giới loài người, cứu sống vị hoàng tử sau cơn bão và đánh đổi giọng hát tuyệt đẹp của mình vì một tình yêu cao thượng.',
    moralVi: 'Tình yêu chân thành không bao giờ ích kỷ mà biết hy sinh vì hạnh phúc của người khác.',
    sentences: [
      {
        en: 'Far beneath the deepest indigo waves stood the coral palace of the Sea King, where six mermaid princesses grew up in quiet splendor.',
        vi: 'Sâu dưới những con sóng xanh thẫm là cung điện san hô của Thủy Tề, nơi sáu nàng công chúa tiên cá lớn lên trong vẻ huy hoàng tĩnh lặng.',
      },
      {
        en: 'Unlike her sisters, the youngest mermaid was endlessly fascinated by the sunlit world above the ocean surface.',
        vi: 'Khác với các chị mình, nàng tiên cá út say mê khôn nguôi trước thế giới ngập tràn ánh nắng phía trên mặt đại dương.',
      },
      {
        en: 'On her fifteenth birthday, she finally rose to the surface under a starry sky and witnessed a grand ship celebrating a young prince.',
        vi: 'Vào sinh nhật lần thứ mười lăm, nàng cuối cùng cũng ngoi lên mặt nước dưới bầu trời đầy sao và chứng kiến một con tàu lớn mừng sinh nhật một vị hoàng tử trẻ.',
      },
      {
        en: 'Suddenly, a violent tempest shattered the vessel’s mast, throwing the unconscious prince into the churning dark water.',
        vi: 'Bất ngờ, một cơn bão dữ dội làm gãy nát cột buồm con tàu, hất văng vị hoàng tử bất tỉnh xuống làn nước đen cuộn sóng.',
      },
      {
        en: 'Braving the towering waves, the little mermaid held him safely above the foam and carried him to a sheltered sandy cove by morning.',
        vi: 'Bất chấp những con sóng cao ngất, nàng tiên cá giữ chàng an toàn trên bọt sóng và đưa chàng vào một vịnh cát kín gió lúc rạng sáng.',
      },
      {
        en: 'Longing to walk beside him, she ventured into the shadowed whirlpools to strike a heartbreaking bargain with the Sea Witch.',
        vi: 'Khao khát được sánh bước bên chàng, nàng mạo hiểm tiến vào vùng xoáy nước u tối để thực hiện một giao kèo đau lòng với Phù thủy Biển cả.',
      },
      {
        en: 'In return for human legs, she surrendered her enchanting singing voice, knowing that every step on land would feel like treading on sharp blades.',
        vi: 'Đổi lấy đôi chân con người, nàng đánh đổi giọng hát mê hoặc của mình, biết rõ rằng mỗi bước đi trên đất liền sẽ đau buốt như giẫm lên lưỡi dao sắc.',
      },
      {
        en: 'Though the prince cherished her loyal companionship, he mistakenly believed another maiden had rescued him from the storm and chose to marry her.',
        vi: 'Dù hoàng tử trân trọng sự đồng hành trung thành của nàng, chàng lại lầm tưởng một cô gái khác đã cứu mình khỏi cơn bão và chọn kết hôn với người ấy.',
      },
      {
        en: 'Rather than harming the prince to reclaim her mermaid form, she chose selfless love at dawn and dissolved into luminous sea foam, rising toward the bright morning breeze.',
        vi: 'Thay vì làm hại hoàng tử để lấy lại hình hài tiên cá, nàng chọn tình yêu vị tha lúc bình minh và tan thành bọt biển sáng lấp lánh, bay lên cùng làn gió sớm mai rạng rỡ.',
      },
    ],
    glossary: [
      { word: 'splendor', ipa: '/ˈsplen.dər/', partOfSpeech: 'danh từ (n)', meaningVi: 'vẻ huy hoàng, lộng lẫy' },
      { word: 'tempest', ipa: '/ˈtem.pɪst/', partOfSpeech: 'danh từ (n)', meaningVi: 'cơn bão dữ dội' },
      { word: 'bargain', ipa: '/ˈbɑː.ɡɪn/', partOfSpeech: 'danh từ (n)', meaningVi: 'cuộc giao kèo, thỏa thuận' },
      { word: 'surrendered', ipa: '/səˈren.dəd/', partOfSpeech: 'động từ (v)', meaningVi: 'từ bỏ, giao nộp' },
      { word: 'companionship', ipa: '/kəmˈpæn.jən.ʃɪp/', partOfSpeech: 'danh từ (n)', meaningVi: 'sự đồng hành, bầu bạn' },
      { word: 'selfless', ipa: '/ˈself.ləs/', partOfSpeech: 'tính từ (adj)', meaningVi: 'vị tha, không ích kỷ' },
      { word: 'luminous', ipa: '/ˈluː.mɪ.nəs/', partOfSpeech: 'tính từ (adj)', meaningVi: 'phát sáng, rạng rỡ' },
    ],
    grammarPoints: [
      {
        title: 'Cấu trúc lựa chọn Rather than + V-ing',
        formula: 'Rather than + V-ing, S + V',
        explanationVi: 'Nhấn mạnh sự từ chối một phương án để chọn một hành động cao đẹp hoặc hợp lý hơn.',
        exampleEn: 'Rather than harming the prince to reclaim her form, she chose selfless love at dawn.',
        exampleVi: 'Thay vì làm hại hoàng tử để lấy lại hình hài cũ, nàng đã chọn tình yêu vị tha lúc bình minh.',
      },
      {
        title: 'Cụm giới từ In return for (Đổi lấy)',
        formula: 'In return for + Noun, S + V',
        explanationVi: 'Diễn tả sự đánh đổi trực tiếp giữa hai giá trị.',
        exampleEn: 'In return for human legs, she surrendered her enchanting singing voice.',
        exampleVi: 'Đổi lấy đôi chân con người, nàng đã từ bỏ giọng hát mê hoặc của mình.',
      },
    ],
    quiz: [
      {
        question: 'What did the little mermaid give up to receive human legs?',
        options: ['Her coral crown', 'Her enchanting singing voice', 'Her memories of home', 'A pearl necklace'],
        correctIndex: 1,
        explanationVi: 'Nàng đã đánh đổi giọng hát mê hoặc của mình ("surrendered her enchanting singing voice").',
      },
      {
        question: 'Why did the prince marry someone else?',
        options: [
          'He disliked the ocean',
          'He mistakenly believed another maiden had rescued him from the storm',
          'His father forced him to',
          'The little mermaid left the palace early',
        ],
        correctIndex: 1,
        explanationVi: 'Hoàng tử lầm tưởng một cô gái khác chính là người đã cứu mình sau cơn bão.',
      },
      {
        question: 'What does "selfless" mean in the final sentence?',
        options: [
          'Caring more about others than yourself',
          'Feeling lonely at sea',
          'Being afraid of storms',
          'Speaking very quietly',
        ],
        correctIndex: 0,
        explanationVi: '"Selfless" nghĩa là vị tha, đặt hạnh phúc của người khác lên trên bản thân mình.',
      },
    ],
  },
  {
    id: 'midnight-flight-london-b2',
    titleEn: 'The Midnight Flight to London',
    titleVi: 'Chuyến bay nửa đêm tới London',
    author: 'Pilot Originals',
    collection: 'originals',
    levelId: 'B2',
    estimatedMinutes: 4,
    coverImage: STORY_COVER_IMAGES.originals,
    summaryVi:
      'Trên chuyến bay đêm xuyên lục địa đầy sương mù tới London, một nữ kỹ sư trẻ vượt qua nỗi sợ nói tiếng Anh nhờ cuộc trò chuyện ấm áp với cơ trưởng nghỉ phép.',
    moralVi: 'Sự tự tin trong ngoại ngữ không đến từ sự hoàn hảo tuyệt đối, mà từ dũng khí mở lời giao tiếp.',
    sentences: [
      {
        en: 'At eleven thirty in the evening, Minh sat by Gate 14 clutching her boarding pass and rehearsing her first international presentation.',
        vi: 'Lúc mười một giờ ba mươi đêm, Minh ngồi bên Cổng 14 nắm chặt thẻ lên máy bay và tập duyệt lại bài thuyết trình quốc tế đầu tiên của mình.',
      },
      {
        en: 'Although she had studied technical English for years, speaking spontaneously with native colleagues still made her pulse quicken.',
        vi: 'Dù đã học tiếng Anh chuyên ngành suốt nhiều năm, việc nói chuyện ứng biến với đồng nghiệp bản xứ vẫn khiến tim cô đập nhanh.',
      },
      {
        en: 'Once the cabin lights dimmed above the clouds, the elderly gentleman in the aisle seat noticed her glowing laptop slides.',
        vi: 'Khi đèn khoang hành khách dịu xuống phía trên tầng mây, quý ông lớn tuổi ngồi ghế lối đi để ý thấy những trang trình chiếu sáng rực trên máy tính của cô.',
      },
      {
        en: 'With a reassuring smile, he introduced himself as a retired airline captain flying home to visit his grandchildren in Surrey.',
        vi: 'Với nụ cười đầy khích lệ, ông tự giới thiệu mình là một cơ trưởng hàng không đã nghỉ hưu đang bay về thăm các cháu ở Surrey.',
      },
      {
        en: 'He asked thoughtful questions about her renewable energy project, listening patiently whenever she paused to search for an exact phrase.',
        vi: 'Ông đặt những câu hỏi sâu sắc về dự án năng lượng tái tạo của cô, kiên nhẫn lắng nghe mỗi khi cô ngừng lại tìm đúng cụm từ.',
      },
      {
        en: '"In aviation," he remarked warmly, "clarity matters far more than sounding poetic — breathe steadily and let your ideas lead."',
        vi: '"Trong ngành hàng không," ông nhận xét ấm áp, "sự rõ ràng quan trọng hơn nhiều so với việc nói hoa mỹ — hãy thở đều và để ý tưởng dẫn dắt cháu."',
      },
      {
        en: 'For the next two hours, Minh practiced explaining complex charts in plain, vivid English while the captain offered gentle phrasing tips.',
        vi: 'Suốt hai giờ tiếp theo, Minh luyện giải thích những biểu đồ phức tạp bằng thứ tiếng Anh giản dị, sinh động trong khi vị cơ trưởng góp ý cách diễn đạt nhẹ nhàng.',
      },
      {
        en: 'By the time London’s golden runway lights appeared through the dawn mist, her nervousness had transformed into calm readiness.',
        vi: 'Đến khi ánh đèn đường băng vàng rực của London hiện ra qua lớp sương sớm, nỗi lo lắng của cô đã chuyển hóa thành sự sẵn sàng điềm tĩnh.',
      },
    ],
    glossary: [
      { word: 'rehearsing', ipa: '/rɪˈhɜː.sɪŋ/', partOfSpeech: 'động từ (v)', meaningVi: 'tập duyệt, diễn tập' },
      { word: 'spontaneously', ipa: '/spɒnˈteɪ.ni.əs.li/', partOfSpeech: 'trạng từ (adv)', meaningVi: 'một cách tự phát, ứng biến' },
      { word: 'reassuring', ipa: '/ˌriː.əˈʃʊə.rɪŋ/', partOfSpeech: 'tính từ (adj)', meaningVi: 'mang lại cảm giác yên tâm, khích lệ' },
      { word: 'clarity', ipa: '/ˈklær.ə.ti/', partOfSpeech: 'danh từ (n)', meaningVi: 'sự rõ ràng, mạch lạc' },
      { word: 'runway', ipa: '/ˈrʌn.weɪ/', partOfSpeech: 'danh từ (n)', meaningVi: 'đường băng sân bay' },
      { word: 'readiness', ipa: '/ˈred.i.nəs/', partOfSpeech: 'danh từ (n)', meaningVi: 'trạng thái sẵn sàng' },
    ],
    grammarPoints: [
      {
        title: 'Cấu trúc By the time + Past Simple, Past Perfect',
        formula: 'By the time + S1 + V2, S2 + had + V3',
        explanationVi: 'Diễn tả một sự thay đổi đã hoàn tất trước khi một mốc sự kiện khác xảy ra trong quá khứ.',
        exampleEn: 'By the time London’s runway lights appeared, her nervousness had transformed into calm readiness.',
        exampleVi: 'Đến khi ánh đèn đường băng London hiện ra, nỗi lo của cô đã biến thành sự sẵn sàng điềm tĩnh.',
      },
      {
        title: 'So sánh hơn nhấn mạnh với far more than',
        formula: 'S + V + far more than + Noun / V-ing',
        explanationVi: 'Dùng trạng từ "far" (hoặc "much") trước "more" để tăng mức độ nhấn mạnh trong lập luận.',
        exampleEn: 'Clarity matters far more than sounding poetic.',
        exampleVi: 'Sự rõ ràng quan trọng hơn nhiều so với việc nghe có vẻ hoa mỹ.',
      },
    ],
    quiz: [
      {
        question: 'Why was Minh feeling nervous at Gate 14?',
        options: [
          'Her flight was canceled',
          'She was preparing for her first international presentation in English',
          'She misplaced her boarding pass',
          'She was afraid of flying at night',
        ],
        correctIndex: 1,
        explanationVi: 'Cô đang tập duyệt cho bài thuyết trình quốc tế đầu tiên và lo lắng khi phải ứng biến tiếng Anh.',
      },
      {
        question: 'What advice did the retired captain give Minh?',
        options: [
          'Memorize every single sentence word for word',
          'Speak as fast as possible',
          'Clarity matters far more than sounding poetic',
          'Avoid using charts in presentations',
        ],
        correctIndex: 2,
        explanationVi: 'Vị cơ trưởng khuyên rằng sự rõ ràng quan trọng hơn nhiều so với việc nói hoa mỹ.',
      },
      {
        question: 'What does "spontaneously" mean?',
        options: ['With weeks of rehearsal', 'Naturally and without prior planning', 'Very loudly', 'In written form'],
        correctIndex: 1,
        explanationVi: '"Spontaneously" nghĩa là một cách tự phát, ứng biến ngay lập tức không chuẩn bị kịch bản trước.',
      },
    ],
  },

  // ===================== C1 STORIES =====================
  {
    id: 'snow-queen-c1',
    titleEn: 'The Snow Queen',
    titleVi: 'Bà chúa Tuyết',
    author: 'H.C. Andersen',
    collection: 'andersen',
    levelId: 'C1',
    estimatedMinutes: 5,
    coverImage: STORY_COVER_IMAGES.andersen,
    summaryVi:
      'Hành trình kiên cường vượt qua băng giá phương Bắc của cô bé Gerda để giải cứu người bạn thân Kay khỏi cung điện băng lạnh lẽo của Bà chúa Tuyết.',
    moralVi: 'Tình bạn chân thành và trái tim ấm áp có sức mạnh làm tan chảy cả sự vô cảm băng giá nhất.',
    sentences: [
      {
        en: 'High above a bustling Nordic town, two inseparable childhood friends, Kay and Gerda, tended blooming red roses in adjoining window boxes.',
        vi: 'Phía trên một thị trấn Bắc Âu nhộn nhịp, hai người bạn thơ ấu không thể tách rời là Kay và Gerda cùng chăm sóc những khóm hồng đỏ thắm bên hai bậu cửa sổ liền kề.',
      },
      {
        en: 'Their idyllic days shattered when two microscopic splinters from a distorted mirror lodged in Kay’s eye and heart, rendering him cold and cynical.',
        vi: 'Những ngày êm đềm của họ tan vỡ khi hai mảnh vụn li ti từ một chiếc gương méo mó găm vào mắt và tim Kay, khiến cậu trở nên lạnh lùng và hoài nghi.',
      },
      {
        en: 'Enchanted by geometric perfection yet numb to affection, Kay vanished one blizzard evening aboard the gleaming sleigh of the Snow Queen.',
        vi: 'Say mê sự hoàn hảo hình học nhưng vô cảm trước tình thương, Kay biến mất vào một buổi tối bão tuyết trên chiếc xe trượt tuyết lấp lánh của Bà chúa Tuyết.',
      },
      {
        en: 'Refusing to accept the townsfolk’s assumption that Kay had perished in the frozen river, Gerda embarked alone on a perilous northward pilgrimage.',
        vi: 'Từ chối chấp nhận suy đoán của dân thị trấn rằng Kay đã bỏ mạng dưới dòng sông đóng băng, Gerda một mình dấn thân vào cuộc hành trình hiểm trở về phương Bắc.',
      },
      {
        en: 'Across enchanted gardens, windswept mountain passes, and shimmering auroras, her unwavering sincerity won the allegiance of woodland creatures and travelers alike.',
        vi: 'Băng qua những khu vườn mê hoặc, những con đèo lộng gió và màn cực quang rực rỡ, sự chân thành kiên định của cô chinh phục được sự trợ giúp của cả muông thú lẫn người lữ hành.',
      },
      {
        en: 'Inside the vast glacial palace, she discovered Kay huddled silently over sharp ice shards, desperately attempting to spell the word "Eternity."',
        vi: 'Bên trong cung điện băng rộng lớn, cô tìm thấy Kay đang co ro lặng lẽ bên những mảnh băng sắc nhọn, miệt mài cố ghép nên chữ "Vĩnh Cửu".',
      },
      {
        en: 'Moved beyond words, Gerda embraced her friend; her warm tears fell onto his chest, penetrating the frost and dissolving the bitter mirror splinter.',
        vi: 'Xúc động không nói nên lời, Gerda ôm chầm lấy bạn mình; những giọt nước mắt ấm nóng của cô rơi xuống ngực cậu, xuyên qua lớp băng giá và làm tan biến mảnh gương cay nghiệt.',
      },
      {
        en: 'As Kay wept in sudden recognition, the ice pieces miraculously rearranged themselves into the elusive word, granting him freedom at last.',
        vi: 'Khi Kay òa khóc trong sự nhận ra đột ngột, các mảnh băng kỳ diệu tự sắp xếp lại thành từ ngữ khó nắm bắt ấy, cuối cùng trả lại tự do cho cậu.',
      },
      {
        en: 'Hand in hand they journeyed back to their sunlit rooftop garden, realizing that though they had grown older, the warmth of childhood remained untouched in their hearts.',
        vi: 'Tay trong tay họ trở về khu vườn trên mái ngập tràn ánh nắng, nhận ra rằng dù cả hai đã trưởng thành hơn, hơi ấm tuổi thơ vẫn vẹn nguyên trong trái tim họ.',
      },
    ],
    glossary: [
      { word: 'inseparable', ipa: '/ɪnˈsep.ər.ə.bəl/', partOfSpeech: 'tính từ (adj)', meaningVi: 'không thể tách rời' },
      { word: 'splinters', ipa: '/ˈsplɪn.tərz/', partOfSpeech: 'danh từ (n)', meaningVi: 'những mảnh vỡ sắc nhỏ' },
      { word: 'cynical', ipa: '/ˈsɪn.ɪ.kəl/', partOfSpeech: 'tính từ (adj)', meaningVi: 'hoài nghi, lạnh lùng cay nghiệt' },
      { word: 'pilgrimage', ipa: '/ˈpɪl.ɡrɪ.mɪdʒ/', partOfSpeech: 'danh từ (n)', meaningVi: 'cuộc hành hương, hành trình gian khổ' },
      { word: 'unwavering', ipa: '/ʌnˈweɪ.vər.ɪŋ/', partOfSpeech: 'tính từ (adj)', meaningVi: 'kiên định, không lay chuyển' },
      { word: 'elusive', ipa: '/ɪˈluː.sɪv/', partOfSpeech: 'tính từ (adj)', meaningVi: 'khó nắm bắt, khó đạt được' },
    ],
    grammarPoints: [
      {
        title: 'Động từ render + O + Adjective (C1)',
        formula: 'render + O + Adjective',
        explanationVi: 'Cách diễn đạt trang trọng, súc tích tương đương "make someone/something become...".',
        exampleEn: 'Two microscopic splinters lodged in Kay’s eye and heart, rendering him cold and cynical.',
        exampleVi: 'Hai mảnh vỡ li ti găm vào mắt và tim Kay, khiến cậu trở nên lạnh lùng và hoài nghi.',
      },
      {
        title: 'Phân từ tuyệt đối / Phân từ bổ ngữ đầu câu (Moved beyond words)',
        formula: 'Past Participle Phrase, S + V',
        explanationVi: 'Nén trạng thái cảm xúc mạnh mẽ vào đầu câu văn miêu tả văn học ở trình độ C1.',
        exampleEn: 'Moved beyond words, Gerda embraced her friend.',
        exampleVi: 'Xúc động không nói nên lời, Gerda ôm chầm lấy người bạn của mình.',
      },
    ],
    quiz: [
      {
        question: 'What caused Kay’s sudden change into a cold and cynical boy?',
        options: [
          'A spell cast by a mountain giant',
          'Two microscopic splinters from a distorted mirror in his eye and heart',
          'An argument with Gerda',
          'Losing his way in a forest',
        ],
        correctIndex: 1,
        explanationVi: 'Hai mảnh vỡ nhỏ từ chiếc gương méo mó găm vào mắt và tim đã làm Kay trở nên vô cảm.',
      },
      {
        question: 'What word was Kay trying to form with the sharp ice shards?',
        options: ['Freedom', 'Winter', 'Eternity', 'Courage'],
        correctIndex: 2,
        explanationVi: 'Kay cố gắng ghép chữ "Eternity" (Vĩnh cửu) từ các mảnh băng sắc nhọn.',
      },
      {
        question: 'What ultimately melted the frost inside Kay’s heart?',
        options: [
          'The summer sun',
          'Gerda’s warm tears as she embraced him',
          'A fire lit by travelers',
          'The Snow Queen’s apology',
        ],
        correctIndex: 1,
        explanationVi: 'Những giọt nước mắt ấm áp của Gerda đã xuyên qua lớp băng giá và làm tan mảnh gương.',
      },
    ],
  },
  {
    id: 'quiet-coffee-shop-paris-c1',
    titleEn: 'A Quiet Coffee Shop in Paris',
    titleVi: 'Quán cà phê nhỏ ở Paris',
    author: 'Pilot Originals',
    collection: 'originals',
    levelId: 'C1',
    estimatedMinutes: 4,
    coverImage: STORY_COVER_IMAGES.originals,
    summaryVi:
      'Một buổi tối mưa nhẹ ở Paris, một nhà văn trẻ tìm lại cảm hứng sáng tác từ cuốn sổ tay bị bỏ quên và cuộc đối thoại đầy chiêm nghiệm với người chủ quán.',
    moralVi: 'Đôi khi việc sống chậm lại và lắng nghe những câu chuyện bình dị xung quanh chính là nguồn cảm hứng lớn nhất.',
    sentences: [
      {
        en: 'Rain tapped rhythmically against the arched glass windows of a tucked-away café overlooking a cobbled street in Paris.',
        vi: 'Mưa gõ nhịp đều đặn lên ô cửa kính vòm của một quán cà phê nhỏ khuất nẻo nhìn xuống con phố lát đá cuội ở Paris.',
      },
      {
        en: 'Seated beneath a warm brass lamp, Clara stared blankly at her untouched notebook, paralyzed by weeks of persistent writer’s block.',
        vi: 'Ngồi dưới ánh đèn đồng ấm áp, Clara nhìn trân trân vào cuốn sổ tay chưa viết chữ nào, bế tắc suốt nhiều tuần vì chứng bí ý tưởng.',
      },
      {
        en: 'As she set down her porcelain cup, she noticed a weathered linen journal resting quietly beside the velvet cushion next to her.',
        vi: 'Khi đặt chiếc tách sứ xuống, cô nhận thấy một cuốn nhật ký bìa vải cũ kỹ nằm lặng lẽ bên chiếc gối nhung cạnh mình.',
      },
      {
        en: 'Assuming a previous patron had inadvertently left it behind, she brought the journal to the silver-haired proprietor behind the counter.',
        vi: 'Cho rằng một vị khách trước đó vô tình để quên, cô mang cuốn nhật ký đến đưa cho ông chủ quán tóc bạc sau quầy.',
      },
      {
        en: 'He chuckled softly and explained that the café kept a communal chronicle where passing travelers recorded one unforgettable conversation.',
        vi: 'Ông khẽ bật cười và giải thích rằng quán lưu giữ một cuốn biên niên chung, nơi những người lữ hành ghé qua ghi lại một cuộc trò chuyện khó quên.',
      },
      {
        en: 'Curious, Clara flipped through pages inked in dozens of languages — heartfelt confessions from musicians, architects, and solitary students.',
        vi: 'Tò mò, Clara lật giở những trang giấy viết bằng hàng chục thứ tiếng — những tâm sự chân thành của nhạc sĩ, kiến trúc sư và những sinh viên sống xa nhà.',
      },
      {
        en: 'No entry aspired to literary grandeur; rather, every anecdote resonated precisely because it captured an honest, fleeting human moment.',
        vi: 'Không một dòng ghi chép nào cố tỏ ra văn chương cao siêu; trái lại, mỗi mẩu chuyện đều chạm tới lòng người chính vì nó ghi lại một khoảnh khắc nhân văn chân thật và thoáng qua.',
      },
      {
        en: 'Realizing she had been chasing perfection instead of authenticity, Clara picked up her fountain pen and wrote effortlessly until closing time.',
        vi: 'Nhận ra mình bấy lâu cứ mải chạy theo sự hoàn hảo thay vì tính chân thật, Clara cầm cây bút máy lên và viết tuôn trào cho tới tận giờ đóng cửa.',
      },
    ],
    glossary: [
      { word: 'paralyzed', ipa: '/ˈpær.ə.laɪzd/', partOfSpeech: 'tính từ (adj)', meaningVi: 'tê liệt, bế tắc hoàn toàn' },
      { word: 'inadvertently', ipa: '/ˌɪn.ədˈvɜː.tənt.li/', partOfSpeech: 'trạng từ (adv)', meaningVi: 'vô tình, không cố ý' },
      { word: 'proprietor', ipa: '/prəˈpraɪ.ə.tər/', partOfSpeech: 'danh từ (n)', meaningVi: 'chủ quán, người sở hữu' },
      { word: 'chronicle', ipa: '/ˈkrɒn.ɪ.kəl/', partOfSpeech: 'danh từ (n)', meaningVi: 'cuốn biên niên sử, sổ ghi chép' },
      { word: 'resonated', ipa: '/ˈrez.ə.neɪ.tɪd/', partOfSpeech: 'động từ (v)', meaningVi: 'tạo sự đồng cảm, vang vọng' },
      { word: 'authenticity', ipa: '/ˌɔː.θenˈtɪs.ə.ti/', partOfSpeech: 'danh từ (n)', meaningVi: 'tính chân thật, nguyên bản' },
    ],
    grammarPoints: [
      {
        title: 'Liên từ đối lập trang trọng ...; rather, ...',
        formula: 'Negative Clause; rather, Contrasting Clause',
        explanationVi: 'Dùng trong văn viết C1 để phủ định một quan điểm rồi đưa ra nhận định chính xác hơn thay thế.',
        exampleEn: 'No entry aspired to literary grandeur; rather, every anecdote resonated because it was honest.',
        exampleVi: 'Không dòng nào cố tỏ ra hoa mỹ cao siêu; trái lại, mỗi câu chuyện đều chạm tới lòng người vì nó chân thật.',
      },
      {
        title: 'Cụm trạng từ nhấn mạnh nguyên nhân precisely because',
        formula: 'Clause + precisely because + Clause',
        explanationVi: 'Nhấn mạnh lý do cốt lõi nhất ("chính xác là bởi vì...").',
        exampleEn: 'Every anecdote resonated precisely because it captured an honest, fleeting human moment.',
        exampleVi: 'Mỗi mẩu chuyện đều tạo sự đồng cảm chính bởi vì nó ghi lại khoảnh khắc chân thật của con người.',
      },
    ],
    quiz: [
      {
        question: 'What was the weathered linen journal actually used for?',
        options: [
          'The café’s daily recipe book',
          'A communal chronicle where travelers wrote memorable conversations',
          'A private diary lost by Clara’s friend',
          'A list of Paris tourist spots',
        ],
        correctIndex: 1,
        explanationVi: 'Đó là cuốn sổ biên niên chung ("communal chronicle") nơi du khách ghé quán ghi lại một cuộc trò chuyện khó quên.',
      },
      {
        question: 'Why did the entries in the journal resonate with Clara?',
        options: [
          'They used rare academic vocabulary',
          'They captured honest, fleeting human moments without chasing perfection',
          'They were written by famous novelists',
          'They included watercolor sketches',
        ],
        correctIndex: 1,
        explanationVi: 'Mỗi dòng ghi chép tạo đồng cảm chính nhờ sự chân thật thay vì cố gắng viết cho hoàn hảo.',
      },
      {
        question: 'What does "inadvertently" mean?',
        options: ['On purpose', 'By accident / unintentionally', 'With great care', 'Every afternoon'],
        correctIndex: 1,
        explanationVi: '"Inadvertently" đồng nghĩa với "accidentally" / "unintentionally" (vô tình, không cố ý).',
      },
    ],
  },
];
