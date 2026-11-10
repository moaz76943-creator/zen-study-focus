import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DESCRIPTIONS = {
  // 1. الإسبانية (إسبانيا وأمريكا اللاتينية)
  'es-ES': `Deep Focus — Estudio Soberano y Dominio Académico (Versión 439.0.0)

Domina tus metas de estudio y recupera tu flujo mental en un santuario sin distracciones, 100% offline y diseñado para estudiantes universitarios y académicos.

✦ 100% Offline y Privado (Cero Rastreo)
Sin servidores en la nube ni telemetría. Todas tus notas, planes de estudio y tarjetas de memoria permanecen estrictamente cifrados en tu dispositivo.

✦ Repetición Espaciada de Vanguardia FSRS-4.5
Aprovecha el algoritmo Free Spaced Repetition Scheduler para optimizar los intervalos de retención con curvas personalizadas de estabilidad y dificultad.

✦ Paisajes Sonoros Neuronales y Procedurales (Zero-Music)
Síntesis matemática en tiempo real mediante Web Audio de ruido rosa puro, resonancia de lluvia y ondas gamma de 40 Hz sin archivos de audio en bucle.

✦ Estructura de Notas Cornell de Tres Zonas
Organiza tus apuntes sistemáticamente en Pistas, Notas y Resúmenes, con enlaces bidireccionales hacia tus tarjetas de memoria.

✦ Estudio de Lectura Rápida RSVP
Procesa lecturas y libros a velocidades de 100 a 1000 palabras por minuto mediante el Punto de Reconocimiento Óptico (ORP).

✦ Tipografía Matemática y Científica (STEM)
Visualiza fórmulas complejas, matrices y derivadas paso a paso mediante gráficos vectoriales SVG sin librerías externas.

✦ Jardín Zen Botánico y Matriz de Hábitos
Observa cómo crecen árboles bonsái y bambúes generados proceduralmente a medida que completas sesiones de estudio continuo.`,

  // 2. الفرنسية (فرنسا وكندا)
  'fr-FR': `Deep Focus — Sanctuaire d'Étude Hors-Ligne & Maîtrise Académique (Version 439.0.0)

Atteignez vos objectifs académiques et retrouvez votre clarté d'esprit dans un espace d'étude souverain, 100% hors-ligne et sans distraction.

✦ 100% Hors-Ligne & Privé (Zéro Télémétrie)
Aucun serveur distant. Aucun pistage. Vos fiches, notes et plannings d'étude restent strictement chiffrés sur votre appareil.

✦ Répétition Espacée Nouvelle Génération FSRS-4.5
Bénéficiez du dernier algorithme FSRS-4.5 pour optimiser la mémorisation à long terme selon des courbes personnalisées de difficulté et de stabilité.

✦ Paysages Sonores Procéduraux & Ondes Cérébrales (Zero-Music)
Synthèse mathématique en temps réel via Web Audio : bruit rose pur, pluie apaisante et ondes gamma à 40 Hz sans boucles musicales préenregistrées.

✦ Prise de Notes Cornell Tri-Zone
Structurez méthodiquement vos réflexions en Indices, Notes et Résumés, avec liens bidirectionnels vers vos fiches d'apprentissage.

✦ Studio de Lecture Rapide RSVP
Parcourez vos articles scientifiques et manuels de 100 à 1000 mots par minute grâce au Point de Reconnaissance Optique (ORP).

✦ Rendu Mathématique & Scientifique SVG (STEM)
Affichage vectoriel fluide et net des équations, fractions et matrices sans dépendance externe.

✦ Jardin Botanique Zen & Matrice d'Habitudes
Visualisez vos progrès à travers la croissance procédurale de bonsaïs et de bambous au fil de vos sessions de travail régulières.`,

  // 3. الألمانية
  'de-DE': `Deep Focus — Autonomer Offline-Lernbereich & Akademische Meisterschaft (Version 439.0.0)

Erreichen Sie Ihre akademischen Ziele und vertiefen Sie Ihren Lernfokus in einem ablenkungsfreien, 100% Offline-Lernbereich.

✦ 100% Offline & Privat (Keine Telemetrie)
Keine Cloud-Abhängigkeit und kein Benutzertracking. Alle Karteikarten, Notizen und Lernpläne bleiben lokal und sicher auf Ihrem Gerät.

✦ Modernste FSRS-4.5 Spaced Repetition
Nutzen Sie den fortschrittlichen FSRS-4.5 Algorithmus für maximale Langzeit-Erinnerung bei minimalem Wiederholungsaufwand.

✦ Prozedurale Natur- & Fokus-Klanglandschaften (Zero-Music)
Echtzeit-Synthese via Web Audio: Reines rosa Rauschen, Regenresonanz und 40 Hz Gamma-Wellen ohne statische Audioschleifen.

✦ Tri-Zone Cornell-Notizarchitektur
Strukturieren Sie Ihre Vorlesungsnotizen in Stichpunkte, Notizen und Zusammenfassungen mit direkter Verknüpfung zu Karteikarten.

✦ RSVP-Schnelllesestudio
Erfassen Sie Fachliteratur mit 100 bis 1000 Wörtern pro Minute durch optische Fokuspunkt-Führung (ORP).

✦ Mathematischer & Technischer SVG-Formelsatz (STEM)
Kristallklare Vektordarstellung von Gleichungen, Wurzeln und Matrizen ohne externe Frameworks.

✦ Botanischer Zen-Garten & Gewohnheitsmatrix
Beobachten Sie das prozedurale Wachstum von Bonsai- und Bambusbäumen als Spiegelbild Ihrer täglichen Disziplin.`,

  // 4. البرتغالية (البرازيل والبرتغال)
  'pt-BR': `Deep Focus — Estudo Soberano Offline & Excelência Acadêmica (Versão 439.0.0)

Conquiste seus objetivos de estudo e recupere o foco absoluto em um ambiente sem distrações, 100% offline e privativo.

✦ 100% Offline & Seguro (Zero Rastreamento)
Sem servidores em nuvem. Todas as suas notas, cronogramas e flashcards ficam estritamente salvos e criptografados em seu dispositivo.

✦ Repetição Espaçada Avançada FSRS-4.5
Algoritmo de ponta para fixação do conhecimento a longo prazo com curvas adaptativas de estabilidade e retenção.

✦ Paisagens Sonoras Procedurais & Frequências Neurais (Zero-Music)
Síntese matemática em tempo real via Web Audio com ruído rosa, chuva e ondas gama de 40 Hz sem loops estáticos.

✦ Estrutura de Notas Cornell Tri-Zone
Organize ideias de forma inteligente em Tópicos, Anotações e Sínteses, integradas aos seus flashcards.

✦ Leitor Rápido RSVP com Foco Óptico
Leia livros e artigos acadêmicos de 100 a 1000 palavras por minuto com alinhamento pelo Ponto Óptico de Reconhecimento (ORP).

✦ Tipografia Científica e Matemática SVG (STEM)
Renderização vetorial de equações e frações com nitidez total e sem bibliotecas externas pesadas.

✦ Jardim Botânico Zen & Matriz de Produtividade
Cultive árvores de bonsai e bambus virtuais que crescem dinamicamente a cada sessão de foco concluída.`,

  // 5. التركية
  'tr-TR': `Deep Focus — Çevrimdışı Akademik Odaklanma ve Çalışma Alanı (Sürüm 439.0.0)

Dikkatinizi dağıtan unsurlardan uzak, tamamen çevrimdışı ve bilimsel temellere dayalı bir alanda ders çalışma veriminizi en üst seviyeye çıkarın.

✦ %100 Çevrimdışı ve Gizli (Sıfır Veri Takibi)
Bulut sunucusu veya kullanıcı izleme yok. Tüm ders notlarınız ve kartlarınız yalnızca kendi cihazınızda güvenle saklanır.

✦ Gelişmiş FSRS-4.5 Aralıklı Tekrar Sistemi
Bilgileri uzun süreli hafızaya kalıcı olarak yerleştirmek için kişiselleştirilmiş zorluk ve kararlılık eğrileri sunan modern algoritma.

✦ Bilimsel Odak Sesleri ve Nöral Dalgalar (Zero-Music)
Web Audio ile gerçek zamanlı üretilen saf pembe gürültü, yağmur tınısı ve 40 Hz gama dalgaları.

✦ Üç Bölgeli Cornell Not Tutma Sistemi
Fikirlerinizi İpuçları, Notlar ve Özet alanlarına ayırarak akıllı kartlarla iki yönlü bağlayın.

✦ RSVP Hızlı Okuma Stüdyosu
Optik Odak Noktası (ORP) desteğiyle akademik makaleleri ve kitapları dakikada 100 ila 1000 kelime hızında okuyun.

✦ Matematik ve STEM Formül Dizgisi
SVG vektör tabanlı net formüller, kökler ve matrislerle kesintisiz bilimsel çalışma deneyimi.

✦ Botanik Zen Bahçesi ve Alışkanlık Takibi
Düzenli odaklanma seanslarınızla orantılı olarak büyüyen usulsel bonsai ve bambu ağaçlarıyla motivasyonunuzu koruyun.`,

  // 6. الروسية
  'ru-RU': `Deep Focus — Автономное Пространство для Учебы и Концентрации (Версия 439.0.0)

Достигайте академических целей в защищенном пространстве для глубокого погружения в учебу без интернета и отвлекающих факторов.

✦ 100% Офлайн и Конфиденциальность (Без Слежки)
Никаких облачных серверов. Ваши заметки, графики и карточки надежно зашифрованы исключительно на вашем устройстве.

✦ Алгоритм Интервального Повторения FSRS-4.5
Передовая научная система для долговременного запоминания с адаптивной калибровкой сложности и стабильности знаний.

✦ Процедурные Звуковые Ландшафты (Zero-Music)
Генерация розового шума, шума дождя и гамма-волн 40 Гц в реальном времени через Web Audio API без повторяющихся треков.

✦ Трехзонная Система Заметок Корнелла
Структурируйте материал на Ключи, Конспекты и Выводы с двусторонней привязкой к карточкам для повторения.

✦ RSVP Скорочтение с Оптическим Фокусом
Изучайте научные статьи со скоростью от 100 до 1000 слов в минуту с помощью точки оптимального распознавания (ORP).

✦ Рендеринг Математических и STEM Формул
Четкое векторное отображение сложных уравнений и матриц на базе чистого SVG без внешних библиотек.

✦ Ботанический Дзен-Сад и Матрица Привычек
Наблюдайте за ростом процедурных деревьев бонсай и бамбука по мере накопления часов продуктивной учебы.`,

  // 7. اليابانية
  'ja-JP': `Deep Focus — 完全オフライン集中学習＆記憶術スペース（バージョン 439.0.0）

気を散らす要素を排除し、学術研究や試験勉強に没頭できる100%オフラインの自立型学習サンクチュアリ。

✦ 100% オフライン＆プライバシー保護（追跡ゼロ）
クラウド依存やデータ収集は一切ありません。学習記録、ノート、暗記カードはすべて端末内に安全に保持されます。

✦ 次世代間隔反復アルゴリズム FSRS-4.5
最適な難易度と安定度曲線に基づいて記憶の定着率を最大化し、復習の負担を最小限に抑えます。

✦ 手続き的ニューラル音響（Zero-Music）
Web Audio APIによるリアルタイム合成。ループ再生ではない純粋なピンクノイズ、雨の残響、40Hzガンマ波バイノーラルサウンド。

✦ 3ゾーン・コーネル式ノート術
キーワード、本文、要約に整理し、暗記カードと双方向リンクで効率的に復習。

✦ RSVP視覚誘導型スピードリーダー
視覚認識ポイント（ORP）の誘導により、毎分100〜1000文字のペースで学術文献やテキストを速読。

✦ 純粋SVGによるSTEM数式・図形描画
数式、分数、行列を高精度なベクターグラフィックで鮮明に表示。

✦ 手続き的植物ゼンガーデン＆習慣マトリックス
集中学習セッションを重ねるごとに美しく成長する盆栽や竹を眺めながら、学習習慣を確立。`
};

// نسخ للغات الإقليمية المتطابقة
DESCRIPTIONS['es-419'] = DESCRIPTIONS['es-ES'];
DESCRIPTIONS['fr-CA'] = DESCRIPTIONS['fr-FR'];
DESCRIPTIONS['pt-PT'] = DESCRIPTIONS['pt-BR'];

console.log("📝 جاري تحديث الأوصاف الكاملة للغات الكبرى...");

let count = 0;
for (const [code, desc] of Object.entries(DESCRIPTIONS)) {
  const filePath = path.resolve(`store_metadata/${code}/full_description.txt`);
  if (fs.existsSync(path.dirname(filePath))) {
    fs.writeFileSync(filePath, desc.trim(), 'utf8');
    count++;
    console.log(`✓ تم تحديث الوصف الكامل للغة: [${code}]`);
  }
}

console.log(`\n🎉 تم بنجاح تحديث ${count} لغة عالمية كبرى بلغاتها الأم!`);

try {
  execSync('git add -A', { stdio: 'inherit' });
  execSync('git commit -m "feat(store): localize full descriptions for major global languages in native copy" || true', { stdio: 'inherit' });
  execSync('git push origin integration/master-qa-verified-v21', { stdio: 'inherit' });
  console.log("✓ تم رفع وتوثيق التحديثات إلى GitHub بنجاح تام!");
} catch (e) {
  console.error("Git error:", e.message);
}
